const test = require('node:test');
const assert = require('node:assert/strict');

const { RtspIngestService } = require('../src/rtsp/rtspIngestService');

test('从 IP 摄像机接入 RTSP 视频流并创建会话', async () => {
  const service = new RtspIngestService();
  const session = await service.startIngest({
    cameraId: 'cam-001',
    rtspUrl: 'rtsp://192.168.1.10/live/main'
  });

  assert.equal(session.cameraId, 'cam-001');
  assert.equal(session.status, 'ingesting');
  assert.equal(session.codec, 'H264');
  assert.ok(session.sessionId);
  assert.equal(service.getSession(session.sessionId).cameraId, 'cam-001');
});

test('非法协议 URL 会拒绝接入', async () => {
  const service = new RtspIngestService();
  await assert.rejects(
    () => service.startIngest({ cameraId: 'cam-002', rtspUrl: 'http://example.com/stream' }),
    /only supports rtsp/
  );
});

test('摄像机返回无效描述时接入失败', async () => {
  const service = new RtspIngestService({
    transport: {
      async describe() {
        return { statusCode: 404 };
      },
      async teardown() {
        return { statusCode: 200 };
      }
    }
  });

  await assert.rejects(
    () => service.startIngest({ cameraId: 'cam-003', rtspUrl: 'rtsp://10.0.0.3/live' }),
    /Failed to ingest/
  );
});

test('停止 RTSP 摄入会更新会话状态', async () => {
  const service = new RtspIngestService();
  const session = await service.startIngest({
    cameraId: 'cam-004',
    rtspUrl: 'rtsp://10.0.0.4/stream'
  });

  const stopped = await service.stopIngest(session.sessionId);
  assert.equal(stopped.status, 'stopped');
  assert.ok(stopped.stoppedAt);
});
