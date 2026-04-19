const { EventEmitter } = require('node:events');
const { randomUUID } = require('node:crypto');

const WEB_FORMATS = new Set(['hls', 'webrtc']);

class VideoForwardingService {
  constructor() {
    this.streams = new Map();
    this.clients = new Map();
  }

  registerStream({ cameraId, format = 'hls', source }) {
    if (!cameraId || typeof cameraId !== 'string') {
      throw new Error('cameraId is required');
    }
    if (!WEB_FORMATS.has(format)) {
      throw new Error(`Unsupported stream format: ${format}`);
    }
    const streamId = randomUUID();
    const stream = {
      streamId,
      cameraId,
      format,
      source: source || null,
      status: 'ready',
      createdAt: new Date().toISOString(),
      forwardedFrames: 0
    };
    this.streams.set(streamId, stream);
    this.clients.set(streamId, new Map());
    return stream;
  }

  requestClientStream({ streamId, clientId }) {
    const stream = this.#getStream(streamId);
    if (!clientId || typeof clientId !== 'string') {
      throw new Error('clientId is required');
    }
    const sink = new EventEmitter();
    const client = {
      clientId,
      streamId,
      format: stream.format,
      connectedAt: new Date().toISOString(),
      sink
    };
    this.clients.get(streamId).set(clientId, client);
    stream.status = 'forwarding';
    return {
      clientId,
      streamId,
      format: stream.format,
      endpoint: this.#buildEndpoint(stream, clientId),
      sink
    };
  }

  forwardFrame({ streamId, frame }) {
    const stream = this.#getStream(streamId);
    const streamClients = this.clients.get(streamId);
    if (!streamClients || streamClients.size === 0) {
      return 0;
    }
    stream.forwardedFrames += 1;
    const payload = {
      streamId,
      cameraId: stream.cameraId,
      format: stream.format,
      frame,
      forwardedAt: new Date().toISOString()
    };
    for (const client of streamClients.values()) {
      client.sink.emit('frame', payload);
    }
    return streamClients.size;
  }

  disconnectClient({ streamId, clientId }) {
    this.#getStream(streamId);
    const streamClients = this.clients.get(streamId);
    if (!streamClients || !streamClients.has(clientId)) {
      return false;
    }
    const client = streamClients.get(clientId);
    streamClients.delete(clientId);
    client.sink.emit('close', { streamId, clientId });
    if (streamClients.size === 0) {
      this.streams.get(streamId).status = 'ready';
    }
    return true;
  }

  getStream(streamId) {
    return this.streams.get(streamId) || null;
  }

  listClients(streamId) {
    this.#getStream(streamId);
    const streamClients = this.clients.get(streamId);
    return Array.from(streamClients.values()).map((client) => ({
      clientId: client.clientId,
      streamId: client.streamId,
      format: client.format,
      connectedAt: client.connectedAt
    }));
  }

  #getStream(streamId) {
    const stream = this.streams.get(streamId);
    if (!stream) {
      throw new Error(`Stream "${streamId}" not found`);
    }
    return stream;
  }

  #buildEndpoint(stream, clientId) {
    if (stream.format === 'hls') {
      return `/streams/hls/${stream.streamId}/index.m3u8?clientId=${encodeURIComponent(clientId)}`;
    }
    return `/streams/webrtc/${stream.streamId}?clientId=${encodeURIComponent(clientId)}`;
  }
}

module.exports = {
  VideoForwardingService,
  WEB_FORMATS
};
