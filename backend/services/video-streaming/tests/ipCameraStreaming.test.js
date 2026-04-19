const test = require('node:test');
const assert = require('node:assert/strict');

const { RtspIngestService } = require('../src/rtsp/rtspIngestService');
const HlsTranscoderService = require('../src/hls/hlsTranscoderService');
const { VideoForwardingService } = require('../src/forwarding/videoForwardingService');
const VideoStoragePlaybackService = require('../src/storage/videoStoragePlaybackService');

class MockIpCameraTransport {
  async describe(rtspUrl) {
    return {
      statusCode: 200,
      contentType: 'application/sdp',
      sdp: `v=0
o=- 0 0 IN IP4 192.168.10.88
s=IP Camera Stream
t=0 0
m=video 0 RTP/AVP 96
a=rtpmap:96 H264/90000
a=framerate:25
a=control:${rtspUrl}`
    };
  }

  async teardown() {
    return { statusCode: 200 };
  }
}

test('IP 摄像机流测试：RTSP 接入 -> HLS -> 转发 -> 录制回放', async () => {
  const camera = {
    cameraId: 'ip-cam-001',
    rtspUrl: 'rtsp://192.168.10.88/live/main'
  };

  const rtsp = new RtspIngestService({ transport: new MockIpCameraTransport() });
  const hls = new HlsTranscoderService({ outputRoot: '/tmp/hls' });
  const forwarding = new VideoForwardingService();
  const storage = new VideoStoragePlaybackService({ storageRoot: '/tmp/video-recordings' });

  const ingestSession = await rtsp.startIngest(camera);
  assert.equal(ingestSession.status, 'ingesting');
  assert.equal(ingestSession.codec, 'H264');

  const hlsJob = hls.createJob({
    cameraId: camera.cameraId,
    inputRtspUrl: camera.rtspUrl
  });
  hls.startJob(hlsJob.jobId);
  hls.appendSegment(hlsJob.jobId, {
    fileName: 'seg-000.ts',
    duration: 2.0
  });
  hls.appendSegment(hlsJob.jobId, {
    fileName: 'seg-001.ts',
    duration: 2.1
  });
  hls.completeJob(hlsJob.jobId);
  const hlsPlaylist = hls.getPlaylist(hlsJob.jobId);
  assert.equal(hlsPlaylist.includes('#EXT-X-ENDLIST'), true);

  const stream = forwarding.registerStream({
    cameraId: camera.cameraId,
    format: 'hls',
    source: hlsJob.playlistPath
  });
  const client = forwarding.requestClientStream({
    streamId: stream.streamId,
    clientId: 'dashboard-client-01'
  });

  const frameReceived = new Promise((resolve) => client.sink.once('frame', resolve));
  const pushed = forwarding.forwardFrame({
    streamId: stream.streamId,
    frame: {
      segment: 'seg-001.ts',
      playlist: hlsJob.playlistPath
    }
  });
  assert.equal(pushed, 1);
  const framePayload = await frameReceived;
  assert.equal(framePayload.frame.segment, 'seg-001.ts');

  const rec = storage.createRecording({
    cameraId: camera.cameraId,
    startedAt: '2026-04-19T04:20:00.000Z'
  });
  storage.appendSegment(rec.recordingId, {
    fileName: 'seg-000.ts',
    duration: 2.0,
    startTime: '2026-04-19T04:20:00.000Z'
  });
  storage.appendSegment(rec.recordingId, {
    fileName: 'seg-001.ts',
    duration: 2.1,
    startTime: '2026-04-19T04:20:02.000Z'
  });
  storage.finalizeRecording(rec.recordingId, '2026-04-19T04:20:04.100Z');

  const playback = storage.queryPlayback({
    cameraId: camera.cameraId,
    from: '2026-04-19T04:20:01.000Z',
    to: '2026-04-19T04:20:03.000Z'
  });
  assert.equal(playback.length, 1);
  assert.equal(playback[0].segments.length, 2);

  await rtsp.stopIngest(ingestSession.sessionId);
  assert.equal(rtsp.getSession(ingestSession.sessionId).status, 'stopped');
});
