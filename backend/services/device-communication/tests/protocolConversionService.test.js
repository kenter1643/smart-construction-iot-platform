const test = require('node:test');
const assert = require('node:assert/strict');

const ProtocolConversionService = require('../src/conversion/protocolConversionService');

test('Modbus -> unified event', () => {
  const service = new ProtocolConversionService();
  const event = service.toUnifiedFromModbus({
    deviceId: 'modbus-01',
    unitId: 1,
    functionCode: 0x03,
    address: 10,
    values: [100, 200]
  });

  assert.equal(event.protocol, 'modbus-tcp');
  assert.equal(event.deviceId, 'modbus-01');
  assert.equal(event.metrics.length, 2);
  assert.equal(event.metrics[0].key, 'register_10');
  assert.equal(event.metrics[1].value, 200);
});

test('MQTT -> unified event with topic deviceId inference', () => {
  const service = new ProtocolConversionService();
  const event = service.toUnifiedFromMqtt({
    topic: 'devices/d-100/telemetry',
    payload: { temperature: 27.5, online: true }
  });

  assert.equal(event.protocol, 'mqtt');
  assert.equal(event.deviceId, 'd-100');
  assert.equal(event.metrics.find((m) => m.key === 'temperature').value, 27.5);
  assert.equal(event.metrics.find((m) => m.key === 'online').value, 1);
});

test('HTTP -> unified event', () => {
  const service = new ProtocolConversionService();
  const event = service.toUnifiedFromHttp({
    deviceId: 'http-9',
    path: '/ingest',
    payload: { humidity: '61.2' }
  });

  assert.equal(event.protocol, 'http');
  assert.equal(event.source.path, '/ingest');
  assert.equal(event.metrics[0].value, 61.2);
});

test('Unified -> MQTT/HTTP/Modbus command conversion', () => {
  const service = new ProtocolConversionService();
  const unified = {
    protocol: 'http',
    deviceId: 'device-a',
    metrics: [
      { key: 'temperature', value: 21.7, type: 'number' },
      { key: 'humidity', value: 54.2, type: 'number' }
    ],
    timestamp: '2026-04-19T00:00:00.000Z'
  };

  const mqtt = service.toMqttMessage(unified);
  const http = service.toHttpPayload(unified);
  const modbus = service.toModbusWriteCommands(unified, 30);

  assert.equal(mqtt.topic, 'devices/device-a/telemetry');
  assert.equal(http.deviceId, 'device-a');
  assert.equal(modbus.length, 2);
  assert.deepEqual(modbus[0], { functionCode: 0x06, address: 30, value: 22 });
});

test('Invalid inputs should throw errors', () => {
  const service = new ProtocolConversionService();
  assert.throws(() => service.toUnifiedFromModbus({ deviceId: 'x' }), /Invalid modbus input/);
  assert.throws(() => service.toUnifiedFromMqtt({ payload: {} }), /Invalid mqtt input/);
  assert.throws(() => service.toUnifiedFromHttp({ payload: {} }), /Invalid http input/);
  assert.throws(() => service.toModbusWriteCommands(null), /Invalid unified event/);
});
