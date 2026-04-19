const path = require('node:path');
const { randomUUID } = require('node:crypto');

class HlsTranscoderService {
  constructor(options = {}) {
    this.outputRoot = options.outputRoot || '/tmp/hls';
    this.jobs = new Map();
  }

  createJob({ cameraId, inputRtspUrl, segmentDuration = 2 }) {
    if (!cameraId || !inputRtspUrl) {
      throw new Error('cameraId and inputRtspUrl are required');
    }
    const parsed = new URL(inputRtspUrl);
    if (parsed.protocol !== 'rtsp:') {
      throw new Error('HLS transcode input must be rtsp://');
    }

    const jobId = randomUUID();
    const outputDir = path.join(this.outputRoot, cameraId, jobId);
    const playlistPath = path.join(outputDir, 'index.m3u8');
    const job = {
      jobId,
      cameraId,
      inputRtspUrl,
      outputDir,
      playlistPath,
      segmentDuration,
      status: 'created',
      segments: [],
      createdAt: new Date().toISOString()
    };
    this.jobs.set(jobId, job);
    return job;
  }

  buildFfmpegCommand(jobId) {
    const job = this.#getJob(jobId);
    return [
      'ffmpeg',
      '-rtsp_transport', 'tcp',
      '-i', job.inputRtspUrl,
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-tune', 'zerolatency',
      '-c:a', 'aac',
      '-f', 'hls',
      '-hls_time', String(job.segmentDuration),
      '-hls_list_size', '6',
      '-hls_flags', 'delete_segments+append_list',
      job.playlistPath
    ];
  }

  startJob(jobId) {
    const job = this.#getJob(jobId);
    job.status = 'running';
    job.startedAt = new Date().toISOString();
    return job;
  }

  appendSegment(jobId, { fileName, duration }) {
    const job = this.#getJob(jobId);
    if (job.status !== 'running') {
      throw new Error('Job must be running');
    }
    if (!fileName || !Number.isFinite(duration)) {
      throw new Error('Invalid segment');
    }
    job.segments.push({ fileName, duration });
    return job;
  }

  completeJob(jobId) {
    const job = this.#getJob(jobId);
    job.status = 'completed';
    job.completedAt = new Date().toISOString();
    return job;
  }

  failJob(jobId, reason) {
    const job = this.#getJob(jobId);
    job.status = 'failed';
    job.failureReason = reason || 'unknown error';
    job.failedAt = new Date().toISOString();
    return job;
  }

  getPlaylist(jobId) {
    const job = this.#getJob(jobId);
    const targetDuration = Math.max(
      1,
      Math.ceil(job.segments.reduce((max, s) => Math.max(max, s.duration), 0))
    );
    const lines = [
      '#EXTM3U',
      '#EXT-X-VERSION:3',
      `#EXT-X-TARGETDURATION:${targetDuration}`,
      '#EXT-X-MEDIA-SEQUENCE:0'
    ];
    for (const segment of job.segments) {
      lines.push(`#EXTINF:${segment.duration.toFixed(3)},`);
      lines.push(segment.fileName);
    }
    if (job.status === 'completed') {
      lines.push('#EXT-X-ENDLIST');
    }
    return lines.join('\n');
  }

  getJob(jobId) {
    return this.jobs.get(jobId) || null;
  }

  #getJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job "${jobId}" not found`);
    }
    return job;
  }
}

module.exports = HlsTranscoderService;
