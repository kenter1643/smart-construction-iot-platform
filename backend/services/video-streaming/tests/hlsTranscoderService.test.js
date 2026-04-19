const test = require('node:test');
const assert = require('node:assert/strict');

const HlsTranscoderService = require('../src/hls/hlsTranscoderService');

test('创建 HLS 转码作业并生成 ffmpeg 命令', () => {
  const service = new HlsTranscoderService({ outputRoot: '/var/hls' });
  const job = service.createJob({
    cameraId: 'cam-hls-1',
    inputRtspUrl: 'rtsp://192.168.1.20/live/main',
    segmentDuration: 3
  });

  const cmd = service.buildFfmpegCommand(job.jobId);
  assert.equal(job.status, 'created');
  assert.equal(cmd[0], 'ffmpeg');
  assert.equal(cmd.includes('-f'), true);
  assert.equal(cmd.includes('hls'), true);
  assert.equal(cmd.at(-1).endsWith('/index.m3u8'), true);
});

test('作业运行中可追加分片并生成 m3u8 播放列表', () => {
  const service = new HlsTranscoderService();
  const job = service.createJob({
    cameraId: 'cam-hls-2',
    inputRtspUrl: 'rtsp://10.0.0.20/stream'
  });

  service.startJob(job.jobId);
  service.appendSegment(job.jobId, { fileName: 'seg-0.ts', duration: 2.0 });
  service.appendSegment(job.jobId, { fileName: 'seg-1.ts', duration: 2.4 });

  const playlist = service.getPlaylist(job.jobId);
  assert.equal(playlist.includes('#EXTM3U'), true);
  assert.equal(playlist.includes('seg-0.ts'), true);
  assert.equal(playlist.includes('seg-1.ts'), true);
  assert.equal(playlist.includes('#EXT-X-ENDLIST'), false);
});

test('完成作业后播放列表包含 ENDLIST', () => {
  const service = new HlsTranscoderService();
  const job = service.createJob({
    cameraId: 'cam-hls-3',
    inputRtspUrl: 'rtsp://10.0.0.30/stream'
  });

  service.startJob(job.jobId);
  service.appendSegment(job.jobId, { fileName: 'seg-0.ts', duration: 1.9 });
  service.completeJob(job.jobId);
  const playlist = service.getPlaylist(job.jobId);

  assert.equal(service.getJob(job.jobId).status, 'completed');
  assert.equal(playlist.includes('#EXT-X-ENDLIST'), true);
});

test('错误 RTSP 输入与非法状态操作应报错', () => {
  const service = new HlsTranscoderService();
  assert.throws(
    () => service.createJob({ cameraId: 'cam-x', inputRtspUrl: 'http://x/stream' }),
    /must be rtsp/
  );

  const job = service.createJob({
    cameraId: 'cam-hls-4',
    inputRtspUrl: 'rtsp://10.0.0.40/stream'
  });
  assert.throws(
    () => service.appendSegment(job.jobId, { fileName: 'seg-0.ts', duration: 2.2 }),
    /must be running/
  );
  service.failJob(job.jobId, 'ffmpeg crashed');
  assert.equal(service.getJob(job.jobId).status, 'failed');
  assert.equal(service.getJob(job.jobId).failureReason, 'ffmpeg crashed');
});
