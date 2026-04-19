const test = require('node:test');
const assert = require('node:assert/strict');

const { VideoForwardingService } = require('../src/forwarding/videoForwardingService');

test('客户端请求流后返回网页兼容端点（HLS）', () => {
  const service = new VideoForwardingService();
  const stream = service.registerStream({
    cameraId: 'camera-forward-1',
    format: 'hls'
  });

  const client = service.requestClientStream({
    streamId: stream.streamId,
    clientId: 'web-client-1'
  });

  assert.equal(client.format, 'hls');
  assert.equal(client.endpoint.includes('/streams/hls/'), true);
  assert.equal(service.getStream(stream.streamId).status, 'forwarding');
});

test('转发帧时所有订阅客户端都能收到数据', async () => {
  const service = new VideoForwardingService();
  const stream = service.registerStream({
    cameraId: 'camera-forward-2',
    format: 'webrtc'
  });

  const clientA = service.requestClientStream({ streamId: stream.streamId, clientId: 'client-a' });
  const clientB = service.requestClientStream({ streamId: stream.streamId, clientId: 'client-b' });

  const aReceived = new Promise((resolve) => clientA.sink.once('frame', resolve));
  const bReceived = new Promise((resolve) => clientB.sink.once('frame', resolve));

  const forwardedCount = service.forwardFrame({
    streamId: stream.streamId,
    frame: { seq: 1, pts: 1200, payload: 'frame-data' }
  });

  assert.equal(forwardedCount, 2);
  const [frameA, frameB] = await Promise.all([aReceived, bReceived]);
  assert.equal(frameA.frame.seq, 1);
  assert.equal(frameB.frame.payload, 'frame-data');
});

test('断开客户端后不再接收转发数据', async () => {
  const service = new VideoForwardingService();
  const stream = service.registerStream({ cameraId: 'camera-forward-3', format: 'hls' });
  const client = service.requestClientStream({ streamId: stream.streamId, clientId: 'client-c' });

  const closed = new Promise((resolve) => client.sink.once('close', resolve));
  const disconnected = service.disconnectClient({ streamId: stream.streamId, clientId: 'client-c' });
  const closeEvent = await closed;

  assert.equal(disconnected, true);
  assert.equal(closeEvent.clientId, 'client-c');
  const forwardedCount = service.forwardFrame({
    streamId: stream.streamId,
    frame: { seq: 2 }
  });
  assert.equal(forwardedCount, 0);
  assert.equal(service.getStream(stream.streamId).status, 'ready');
});

test('非法格式或不存在流会抛错', () => {
  const service = new VideoForwardingService();
  assert.throws(
    () => service.registerStream({ cameraId: 'x', format: 'rtsp' }),
    /Unsupported stream format/
  );
  assert.throws(
    () => service.requestClientStream({ streamId: 'missing', clientId: 'any' }),
    /not found/
  );
});
