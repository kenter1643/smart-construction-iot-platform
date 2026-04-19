const { EventEmitter } = require('events');

const MQTT_PROTOCOLS = Object.freeze({
  '3.1': 3,
  '3.1.1': 4,
  '5.0': 5
});

class InMemoryMqttClient extends EventEmitter {
  constructor() {
    super();
    this.connected = false;
    this.subscriptions = new Set();
  }

  connect() {
    this.connected = true;
    this.emit('connect');
  }

  end() {
    this.connected = false;
    this.emit('close');
  }

  subscribe(topic) {
    this.subscriptions.add(topic);
  }

  unsubscribe(topic) {
    this.subscriptions.delete(topic);
  }

  publish(topic, payload) {
    for (const pattern of this.subscriptions) {
      if (topicMatches(pattern, topic)) {
        this.emit('message', topic, Buffer.from(payload));
      }
    }
  }
}

function topicMatches(pattern, topic) {
  const patternLevels = String(pattern).split('/');
  const topicLevels = String(topic).split('/');

  for (let i = 0; i < patternLevels.length; i += 1) {
    const level = patternLevels[i];
    const topicLevel = topicLevels[i];

    if (level === '#') {
      return true;
    }
    if (level === '+') {
      if (topicLevel === undefined) {
        return false;
      }
      continue;
    }
    if (level !== topicLevel) {
      return false;
    }
  }

  return patternLevels.length === topicLevels.length;
}

class MqttCommunicationHandler {
  constructor(options = {}) {
    this.protocolVersion = options.protocolVersion || '3.1.1';
    if (!MQTT_PROTOCOLS[this.protocolVersion]) {
      throw new Error(`Unsupported MQTT protocol version: ${this.protocolVersion}`);
    }
    this.client = options.client || new InMemoryMqttClient();
    this.isConnected = false;
    this.handlers = new Map();
    this.#bindClientEvents();
  }

  connect() {
    if (this.isConnected) {
      return;
    }
    if (typeof this.client.connect === 'function') {
      this.client.connect();
    }
    this.isConnected = true;
  }

  disconnect() {
    if (!this.isConnected) {
      return;
    }
    if (typeof this.client.end === 'function') {
      this.client.end();
    }
    this.isConnected = false;
  }

  subscribe(topic, handler) {
    this.#assertConnected();
    if (!topic || typeof topic !== 'string') {
      throw new Error('Topic is required');
    }
    if (typeof handler !== 'function') {
      throw new Error('Message handler must be a function');
    }
    if (!this.handlers.has(topic)) {
      this.handlers.set(topic, new Set());
      this.client.subscribe(topic);
    }
    this.handlers.get(topic).add(handler);
  }

  unsubscribe(topic, handler) {
    const topicHandlers = this.handlers.get(topic);
    if (!topicHandlers) {
      return;
    }
    if (handler) {
      topicHandlers.delete(handler);
    } else {
      topicHandlers.clear();
    }
    if (topicHandlers.size === 0) {
      this.handlers.delete(topic);
      this.client.unsubscribe(topic);
    }
  }

  publish(topic, message, options = {}) {
    this.#assertConnected();
    if (!topic || typeof topic !== 'string') {
      throw new Error('Topic is required');
    }
    const payload = Buffer.isBuffer(message) ? message : Buffer.from(JSON.stringify(message));
    if (typeof this.client.publish === 'function') {
      this.client.publish(topic, payload, options);
    }
  }

  getConnectOptions() {
    return {
      protocolVersion: MQTT_PROTOCOLS[this.protocolVersion],
      clean: true
    };
  }

  #bindClientEvents() {
    this.client.on('message', (topic, payload) => {
      for (const [pattern, handlers] of this.handlers.entries()) {
        if (!topicMatches(pattern, topic)) {
          continue;
        }
        for (const handler of handlers) {
          handler({
            topic,
            payload: this.#decodePayload(payload)
          });
        }
      }
    });
  }

  #decodePayload(payload) {
    const text = Buffer.isBuffer(payload) ? payload.toString('utf8') : String(payload);
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  #assertConnected() {
    if (!this.isConnected) {
      throw new Error('MQTT client is not connected');
    }
  }
}

module.exports = {
  MqttCommunicationHandler,
  InMemoryMqttClient,
  MQTT_PROTOCOLS,
  topicMatches
};
