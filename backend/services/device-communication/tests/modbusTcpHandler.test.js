const test = require('node:test');
const assert = require('node:assert/strict');

const {
  ModbusTcpHandler,
  EXCEPTION_ILLEGAL_FUNCTION,
  EXCEPTION_ILLEGAL_DATA_ADDRESS,
  EXCEPTION_ILLEGAL_DATA_VALUE
} = require('../src/modbus/modbusTcpHandler');

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

function buildWriteRequest(transactionId, unitId, address, value) {
  const buffer = Buffer.alloc(12);
  buffer.writeUInt16BE(transactionId, 0);
  buffer.writeUInt16BE(0, 2);
  buffer.writeUInt16BE(6, 4);
  buffer.writeUInt8(unitId, 6);
  buffer.writeUInt8(0x06, 7);
  buffer.writeUInt16BE(address, 8);
  buffer.writeUInt16BE(value, 10);
  return buffer;
}

test('读取保持寄存器：返回有效 Modbus TCP 响应', () => {
  const handler = new ModbusTcpHandler();
  handler.registerStore.seed([[10, 111], [11, 222]]);
  const request = buildReadRequest(1, 1, 10, 2);

  const response = handler.handleRequest(request);

  assert.equal(response.readUInt16BE(0), 1);
  assert.equal(response.readUInt8(7), 0x03);
  assert.equal(response.readUInt8(8), 4);
  assert.equal(response.readUInt16BE(9), 111);
  assert.equal(response.readUInt16BE(11), 222);
});

test('写单寄存器后可读回：写入确认 + 数据更新', () => {
  const handler = new ModbusTcpHandler();
  const writeRequest = buildWriteRequest(9, 1, 88, 4321);

  const writeResponse = handler.handleRequest(writeRequest);
  const readResponse = handler.handleRequest(buildReadRequest(10, 1, 88, 1));

  assert.equal(writeResponse.readUInt8(7), 0x06);
  assert.equal(writeResponse.readUInt16BE(8), 88);
  assert.equal(writeResponse.readUInt16BE(10), 4321);
  assert.equal(readResponse.readUInt16BE(9), 4321);
});

test('非法功能码：返回 exception code 0x01', () => {
  const handler = new ModbusTcpHandler();
  const request = Buffer.alloc(12);
  request.writeUInt16BE(3, 0);
  request.writeUInt16BE(0, 2);
  request.writeUInt16BE(6, 4);
  request.writeUInt8(1, 6);
  request.writeUInt8(0x45, 7);
  request.writeUInt16BE(0, 8);
  request.writeUInt16BE(1, 10);

  const response = handler.handleRequest(request);

  assert.equal(response.readUInt8(7), 0xC5);
  assert.equal(response.readUInt8(8), EXCEPTION_ILLEGAL_FUNCTION);
});

test('非法读数量：返回 exception code 0x03', () => {
  const handler = new ModbusTcpHandler();
  const request = buildReadRequest(4, 1, 0, 0);

  const response = handler.handleRequest(request);

  assert.equal(response.readUInt8(7), 0x83);
  assert.equal(response.readUInt8(8), EXCEPTION_ILLEGAL_DATA_VALUE);
});

test('越界地址：返回 exception code 0x02', () => {
  const handler = new ModbusTcpHandler();
  const request = buildReadRequest(5, 1, 65535, 2);

  const response = handler.handleRequest(request);

  assert.equal(response.readUInt8(7), 0x83);
  assert.equal(response.readUInt8(8), EXCEPTION_ILLEGAL_DATA_ADDRESS);
});
