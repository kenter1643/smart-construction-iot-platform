const path = require('node:path');
const { randomUUID } = require('node:crypto');

class VideoStoragePlaybackService {
  constructor(options = {}) {
    this.storageRoot = options.storageRoot || '/var/video-recordings';
    this.recordings = new Map();
    this.recordingsByCamera = new Map();
  }

  createRecording({ cameraId, startedAt = new Date().toISOString() }) {
    if (!cameraId || typeof cameraId !== 'string') {
      throw new Error('cameraId is required');
    }
    const recordingId = randomUUID();
    const outputDir = path.join(this.storageRoot, cameraId, recordingId);
    const recording = {
      recordingId,
      cameraId,
      outputDir,
      startedAt,
      endedAt: null,
      status: 'recording',
      segments: [],
      duration: 0
    };
    this.recordings.set(recordingId, recording);
    if (!this.recordingsByCamera.has(cameraId)) {
      this.recordingsByCamera.set(cameraId, []);
    }
    this.recordingsByCamera.get(cameraId).push(recordingId);
    return recording;
  }

  appendSegment(recordingId, segment) {
    const rec = this.#getRecording(recordingId);
    if (rec.status !== 'recording') {
      throw new Error('Recording is not active');
    }
    if (!segment || !segment.fileName || !Number.isFinite(segment.duration)) {
      throw new Error('Invalid segment');
    }
    const startTime = segment.startTime || this.#deriveNextSegmentStart(rec);
    const enriched = {
      fileName: segment.fileName,
      duration: Number(segment.duration),
      startTime,
      endTime: new Date(new Date(startTime).getTime() + segment.duration * 1000).toISOString()
    };
    rec.segments.push(enriched);
    rec.duration = rec.segments.reduce((sum, s) => sum + s.duration, 0);
    return rec;
  }

  finalizeRecording(recordingId, endedAt = new Date().toISOString()) {
    const rec = this.#getRecording(recordingId);
    rec.status = 'completed';
    rec.endedAt = endedAt;
    if (rec.segments.length > 0) {
      rec.startedAt = rec.segments[0].startTime;
      rec.duration = rec.segments.reduce((sum, s) => sum + s.duration, 0);
    }
    return rec;
  }

  listRecordings(cameraId) {
    const ids = this.recordingsByCamera.get(cameraId) || [];
    return ids.map((id) => this.recordings.get(id));
  }

  getRecording(recordingId) {
    return this.recordings.get(recordingId) || null;
  }

  queryPlayback({ cameraId, from, to }) {
    if (!cameraId) {
      throw new Error('cameraId is required');
    }
    const fromTs = from ? new Date(from).getTime() : Number.NEGATIVE_INFINITY;
    const toTs = to ? new Date(to).getTime() : Number.POSITIVE_INFINITY;
    if (Number.isNaN(fromTs) || Number.isNaN(toTs)) {
      throw new Error('Invalid time range');
    }

    const records = this.listRecordings(cameraId).filter((rec) => rec.status === 'completed');
    const matched = [];
    for (const rec of records) {
      const segments = rec.segments.filter((seg) => {
        const segStart = new Date(seg.startTime).getTime();
        const segEnd = new Date(seg.endTime).getTime();
        return segEnd >= fromTs && segStart <= toTs;
      });
      if (segments.length > 0) {
        matched.push({
          recordingId: rec.recordingId,
          cameraId: rec.cameraId,
          segments
        });
      }
    }
    return matched;
  }

  buildPlaybackManifest(recordingId) {
    const rec = this.#getRecording(recordingId);
    if (rec.segments.length === 0) {
      throw new Error('Recording has no segments');
    }
    const targetDuration = Math.max(1, Math.ceil(rec.segments.reduce((m, s) => Math.max(m, s.duration), 0)));
    const lines = [
      '#EXTM3U',
      '#EXT-X-VERSION:3',
      `#EXT-X-TARGETDURATION:${targetDuration}`,
      '#EXT-X-MEDIA-SEQUENCE:0'
    ];
    for (const segment of rec.segments) {
      lines.push(`#EXTINF:${segment.duration.toFixed(3)},`);
      lines.push(segment.fileName);
    }
    if (rec.status === 'completed') {
      lines.push('#EXT-X-ENDLIST');
    }
    return lines.join('\n');
  }

  #getRecording(recordingId) {
    const rec = this.recordings.get(recordingId);
    if (!rec) {
      throw new Error(`Recording "${recordingId}" not found`);
    }
    return rec;
  }

  #deriveNextSegmentStart(recording) {
    if (recording.segments.length === 0) {
      return recording.startedAt;
    }
    return recording.segments[recording.segments.length - 1].endTime;
  }
}

module.exports = VideoStoragePlaybackService;
