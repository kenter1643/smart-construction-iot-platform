const test = require('node:test');
const assert = require('node:assert/strict');

const VideoStoragePlaybackService = require('../src/storage/videoStoragePlaybackService');

test('创建录制并追加分片后可生成回放清单', () => {
  const service = new VideoStoragePlaybackService({ storageRoot: '/tmp/video' });
  const rec = service.createRecording({
    cameraId: 'cam-rec-01',
    startedAt: '2026-04-19T01:00:00.000Z'
  });

  service.appendSegment(rec.recordingId, {
    fileName: 'seg-0.ts',
    duration: 2.0,
    startTime: '2026-04-19T01:00:00.000Z'
  });
  service.appendSegment(rec.recordingId, {
    fileName: 'seg-1.ts',
    duration: 2.5,
    startTime: '2026-04-19T01:00:02.000Z'
  });
  service.finalizeRecording(rec.recordingId, '2026-04-19T01:00:05.000Z');

  const manifest = service.buildPlaybackManifest(rec.recordingId);
  assert.equal(manifest.includes('#EXTM3U'), true);
  assert.equal(manifest.includes('seg-0.ts'), true);
  assert.equal(manifest.includes('#EXT-X-ENDLIST'), true);
});

test('按摄像机和时间范围查询回放片段', () => {
  const service = new VideoStoragePlaybackService();
  const rec = service.createRecording({
    cameraId: 'cam-rec-02',
    startedAt: '2026-04-19T02:00:00.000Z'
  });

  service.appendSegment(rec.recordingId, {
    fileName: 'part-0.ts',
    duration: 3.0,
    startTime: '2026-04-19T02:00:00.000Z'
  });
  service.appendSegment(rec.recordingId, {
    fileName: 'part-1.ts',
    duration: 3.0,
    startTime: '2026-04-19T02:00:03.000Z'
  });
  service.finalizeRecording(rec.recordingId, '2026-04-19T02:00:06.000Z');

  const result = service.queryPlayback({
    cameraId: 'cam-rec-02',
    from: '2026-04-19T02:00:02.500Z',
    to: '2026-04-19T02:00:03.500Z'
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].segments.length, 2);
});

test('列表查询仅返回指定摄像机录制', () => {
  const service = new VideoStoragePlaybackService();
  const recA = service.createRecording({ cameraId: 'cam-a' });
  const recB = service.createRecording({ cameraId: 'cam-b' });

  assert.equal(service.listRecordings('cam-a').length, 1);
  assert.equal(service.listRecordings('cam-a')[0].recordingId, recA.recordingId);
  assert.equal(service.listRecordings('cam-b')[0].recordingId, recB.recordingId);
});

test('非法输入和不存在记录应抛错', () => {
  const service = new VideoStoragePlaybackService();
  assert.throws(() => service.createRecording({ cameraId: '', startedAt: '' }), /cameraId is required/);
  assert.throws(() => service.appendSegment('missing', { fileName: 'x.ts', duration: 1 }), /not found/);

  const rec = service.createRecording({ cameraId: 'cam-c' });
  assert.throws(() => service.buildPlaybackManifest(rec.recordingId), /no segments/);
  assert.throws(
    () => service.queryPlayback({ cameraId: 'cam-c', from: 'bad-time', to: '2026-04-19T00:00:00.000Z' }),
    /Invalid time range/
  );
});
