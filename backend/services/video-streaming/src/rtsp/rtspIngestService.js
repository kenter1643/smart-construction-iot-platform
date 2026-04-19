const { randomUUID } = require('node:crypto');

class MockRtspTransport {
  async describe(rtspUrl) {
    return {
      statusCode: 200,
      contentType: 'application/sdp',
      sdp: `v=0
o=- 0 0 IN IP4 127.0.0.1
s=Mock Camera
t=0 0
m=video 0 RTP/AVP 96
a=rtpmap:96 H264/90000
a=control:${rtspUrl}`
    };
  }

  async teardown() {
    return { statusCode: 200 };
  }
}

class RtspIngestService {
  constructor(options = {}) {
    this.transport = options.transport || new MockRtspTransport();
    this.sessions = new Map();
  }

  async startIngest({ cameraId, rtspUrl }) {
    if (!cameraId || typeof cameraId !== 'string') {
      throw new Error('cameraId is required');
    }
    this.#validateRtspUrl(rtspUrl);

    const describeResult = await this.transport.describe(rtspUrl);
    if (!describeResult || describeResult.statusCode !== 200 || !describeResult.sdp) {
      throw new Error('Failed to ingest RTSP stream');
    }

    const session = {
      sessionId: randomUUID(),
      cameraId,
      rtspUrl,
      status: 'ingesting',
      codec: this.#extractCodec(describeResult.sdp),
      startedAt: new Date().toISOString(),
      sdp: describeResult.sdp
    };
    this.sessions.set(session.sessionId, session);
    return session;
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId) || null;
  }

  listSessions() {
    return Array.from(this.sessions.values());
  }

  async stopIngest(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session "${sessionId}" not found`);
    }
    await this.transport.teardown(session.rtspUrl);
    session.status = 'stopped';
    session.stoppedAt = new Date().toISOString();
    return session;
  }

  #validateRtspUrl(rtspUrl) {
    if (!rtspUrl || typeof rtspUrl !== 'string') {
      throw new Error('rtspUrl is required');
    }
    let parsed;
    try {
      parsed = new URL(rtspUrl);
    } catch {
      throw new Error('Invalid RTSP URL');
    }
    if (parsed.protocol !== 'rtsp:') {
      throw new Error('RTSP ingest only supports rtsp:// URLs');
    }
    if (!parsed.hostname) {
      throw new Error('RTSP URL hostname is required');
    }
  }

  #extractCodec(sdp) {
    const lines = String(sdp).split('\n').map((line) => line.trim());
    const rtpMap = lines.find((line) => line.startsWith('a=rtpmap:'));
    if (!rtpMap) {
      return 'unknown';
    }
    const match = rtpMap.match(/a=rtpmap:\d+\s+([^/]+)/i);
    return match ? match[1].toUpperCase() : 'unknown';
  }
}

module.exports = {
  RtspIngestService,
  MockRtspTransport
};
