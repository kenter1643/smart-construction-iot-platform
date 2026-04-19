const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const { ModbusTcpHandler } = require('../src/modbus/modbusTcpHandler');
const { MqttCommunicationHandler } = require('../src/mqtt/mqttHandler');
const { createHttpApiServer } = require('../src/http/httpApiServer');
const ProtocolConversionService = require('../src/conversion/protocolConversionService');

function buildReadRequest(transactionId, unitId, startAddress, quantity) {
  const buffer = Buffer.alloc(12);
  buffer.writeUInt16BE(transactionId, 0);
  buffer.writeUInt16BE(0, 2);
  buffer.writeUInt16BE(6, 4);
  buffer.writeUInt8(unitId, 6);
  buffer.writeUInt8(0x03, 7);
  buffer.writeUInt16BE(startAddress, 8);
  buffer.writeUInt16BE(quantity, 10);
  return buffer;
}

test('示例设备联调：Modbus + MQTT + HTTP 通讯全链路', async () => {
  const converter = new ProtocolConversionService();

  const modbusHandler = new ModbusTcpHandler();
  modbusHandler.registerStore.seed([
    [100, 512],
    [101, 1024]
  ]);
  const modbusResponse = modbusHandler.handleRequest(buildReadRequest(7, 1, 100, 2));
  const modbusValues = [modbusResponse.readUInt16BE(9), modbusResponse.readUInt16BE(11)];
  const modbusEvent = converter.toUnifiedFromModbus({
    deviceId: 'demo-modbus-01',
    unitId: 1,
    functionCode: 0x03,
    address: 100,
    values: modbusValues
  });

  const mqttHandler = new MqttCommunicationHandler();
  mqttHandler.connect();
  const mqttMsg = await new Promise((resolve) => {
    mqttHandler.subscribe('devices/demo-mqtt-01/telemetry', resolve);
    mqttHandler.publish('devices/demo-mqtt-01/telemetry', {
      vibration: 6.8,
      running: true
    });
  });
  const mqttEvent = converter.toUnifiedFromMqtt({
    topic: mqttMsg.topic,
    payload: mqttMsg.payload
  });

  const mockDeviceServer = http.createServer((req, res) => {
    if (req.url === '/snapshot') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ dust: 34.5, noise: 66.1 }));
      return;
    }
    res.writeHead(404);
    res.end();
  });
  await new Promise((resolve) => mockDeviceServer.listen(0, '127.0.0.1', resolve));
  const deviceAddr = mockDeviceServer.address();
  const deviceBaseUrl = `http://127.0.0.1:${deviceAddr.port}`;

  const httpService = createHttpApiServer();
  const apiAddr = await httpService.start(0);
  const apiBase = `http://127.0.0.1:${apiAddr.port}`;
  let httpEvent;

  try {
    await fetch(`${apiBase}/api/v1/http/devices/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: 'demo-http-01', baseUrl: deviceBaseUrl })
    });
    const pullResp = await fetch(`${apiBase}/api/v1/http/devices/demo-http-01/pull?path=/snapshot`);
    const pullBody = await pullResp.json();
    assert.equal(pullResp.status, 200);
    httpEvent = converter.toUnifiedFromHttp({
      deviceId: 'demo-http-01',
      path: '/snapshot',
      payload: pullBody.data.response
    });
  } finally {
    await httpService.stop();
    await new Promise((resolve, reject) => {
      mockDeviceServer.close((error) => (error ? reject(error) : resolve()));
    });
  }

  assert.equal(modbusEvent.protocol, 'modbus-tcp');
  assert.equal(modbusEvent.metrics[0].value, 512);
  assert.equal(mqttEvent.protocol, 'mqtt');
  assert.equal(mqttEvent.metrics.find((m) => m.key === 'running').value, 1);
  assert.equal(httpEvent.protocol, 'http');
  assert.equal(httpEvent.metrics.find((m) => m.key === 'dust').value, 34.5);
});
