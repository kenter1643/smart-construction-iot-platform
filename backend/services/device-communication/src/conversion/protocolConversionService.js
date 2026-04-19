function nowIso() {
  return new Date().toISOString();
}

class ProtocolConversionService {
  toUnifiedFromModbus(input) {
    const {
      deviceId,
      unitId,
      functionCode,
      address,
      values
    } = input || {};

    if (!deviceId || !Array.isArray(values)) {
      throw new Error('Invalid modbus input');
    }

    return {
      protocol: 'modbus-tcp',
      deviceId: String(deviceId),
      source: {
        unitId: Number(unitId ?? 1),
        functionCode: Number(functionCode ?? 0x03),
        address: Number(address ?? 0)
      },
      metrics: values.map((value, index) => ({
        key: `register_${Number(address ?? 0) + index}`,
        value: Number(value),
        type: 'number'
      })),
      timestamp: input.timestamp || nowIso()
    };
  }

  toUnifiedFromMqtt(input) {
    const { topic, payload, deviceId } = input || {};
    if (!topic) {
      throw new Error('Invalid mqtt input');
    }

    const parsed = this.#parsePayload(payload);
    const resolvedDeviceId = deviceId || this.#resolveDeviceIdFromTopic(topic) || 'unknown-device';

    return {
      protocol: 'mqtt',
      deviceId: String(resolvedDeviceId),
      source: { topic: String(topic) },
      metrics: this.#payloadToMetrics(parsed),
      timestamp: input.timestamp || nowIso(),
      raw: parsed
    };
  }

  toUnifiedFromHttp(input) {
    const { deviceId, payload, path } = input || {};
    if (!deviceId) {
      throw new Error('Invalid http input');
    }
    const parsed = this.#parsePayload(payload);

    return {
      protocol: 'http',
      deviceId: String(deviceId),
      source: { path: String(path || '/api/v1/http/devices/data') },
      metrics: this.#payloadToMetrics(parsed),
      timestamp: input.timestamp || nowIso(),
      raw: parsed
    };
  }

  toMqttMessage(unifiedEvent, options = {}) {
    this.#assertUnifiedEvent(unifiedEvent);
    const topic = options.topic || `devices/${unifiedEvent.deviceId}/telemetry`;
    return {
      topic,
      payload: {
        deviceId: unifiedEvent.deviceId,
        metrics: unifiedEvent.metrics,
        timestamp: unifiedEvent.timestamp
      }
    };
  }

  toHttpPayload(unifiedEvent) {
    this.#assertUnifiedEvent(unifiedEvent);
    return {
      deviceId: unifiedEvent.deviceId,
      payload: {
        metrics: unifiedEvent.metrics,
        timestamp: unifiedEvent.timestamp
      }
    };
  }

  toModbusWriteCommands(unifiedEvent, baseAddress = 0) {
    this.#assertUnifiedEvent(unifiedEvent);
    if (!Number.isInteger(baseAddress) || baseAddress < 0) {
      throw new Error('Invalid base address');
    }
    return unifiedEvent.metrics
      .filter((metric) => Number.isFinite(metric.value))
      .map((metric, index) => ({
        functionCode: 0x06,
        address: baseAddress + index,
        value: this.#sanitizeRegisterValue(metric.value)
      }));
  }

  #assertUnifiedEvent(event) {
    if (!event || !event.deviceId || !Array.isArray(event.metrics)) {
      throw new Error('Invalid unified event');
    }
  }

  #resolveDeviceIdFromTopic(topic) {
    const segments = String(topic).split('/');
    if (segments.length >= 2 && segments[0] === 'devices') {
      return segments[1];
    }
    return null;
  }

  #parsePayload(payload) {
    if (payload === null || payload === undefined) {
      return {};
    }
    if (Buffer.isBuffer(payload)) {
      const text = payload.toString('utf8');
      try {
        return JSON.parse(text);
      } catch {
        return { value: text };
      }
    }
    if (typeof payload === 'string') {
      try {
        return JSON.parse(payload);
      } catch {
        return { value: payload };
      }
    }
    if (typeof payload === 'object') {
      return payload;
    }
    return { value: payload };
  }

  #payloadToMetrics(payload) {
    if (Array.isArray(payload)) {
      return payload.map((item, index) => ({
        key: `value_${index}`,
        value: this.#normalizeMetricValue(item),
        type: typeof item
      }));
    }
    return Object.entries(payload).map(([key, value]) => ({
      key,
      value: this.#normalizeMetricValue(value),
      type: typeof value
    }));
  }

  #normalizeMetricValue(value) {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'boolean') {
      return value ? 1 : 0;
    }
    if (typeof value === 'string') {
      const num = Number(value);
      return Number.isFinite(num) ? num : value;
    }
    return JSON.stringify(value);
  }

  #sanitizeRegisterValue(value) {
    const n = Math.round(Number(value));
    if (!Number.isFinite(n)) {
      return 0;
    }
    if (n < 0) {
      return 0;
    }
    if (n > 0xFFFF) {
      return 0xFFFF;
    }
    return n;
  }
}

module.exports = ProtocolConversionService;
