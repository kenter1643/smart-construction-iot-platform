const RegisterStore = require('./registerStore');

const FUNCTION_CODE_READ_HOLDING_REGISTERS = 0x03;
const FUNCTION_CODE_WRITE_SINGLE_REGISTER = 0x06;

const EXCEPTION_ILLEGAL_FUNCTION = 0x01;
const EXCEPTION_ILLEGAL_DATA_ADDRESS = 0x02;
const EXCEPTION_ILLEGAL_DATA_VALUE = 0x03;
const EXCEPTION_SERVER_DEVICE_FAILURE = 0x04;

class ModbusTcpHandler {
  constructor(registerStore = new RegisterStore()) {
    this.registerStore = registerStore;
  }

  handleRequest(requestBuffer) {
    let request;
    try {
      request = this.parseRequest(requestBuffer);
    } catch (error) {
      const transactionId = requestBuffer?.length >= 2 ? requestBuffer.readUInt16BE(0) : 0;
      const unitId = requestBuffer?.length >= 7 ? requestBuffer.readUInt8(6) : 0;
      const functionCode = requestBuffer?.length >= 8 ? requestBuffer.readUInt8(7) : 0;
      const exceptionCode = error.exceptionCode || EXCEPTION_SERVER_DEVICE_FAILURE;
      return this.buildExceptionResponse(transactionId, unitId, functionCode, exceptionCode);
    }

    try {
      switch (request.functionCode) {
        case FUNCTION_CODE_READ_HOLDING_REGISTERS:
          return this.#handleReadHoldingRegisters(request);
        case FUNCTION_CODE_WRITE_SINGLE_REGISTER:
          return this.#handleWriteSingleRegister(request);
        default:
          return this.buildExceptionResponse(
            request.transactionId,
            request.unitId,
            request.functionCode,
            EXCEPTION_ILLEGAL_FUNCTION
          );
      }
    } catch (error) {
      return this.buildExceptionResponse(
        request.transactionId,
        request.unitId,
        request.functionCode,
        error.exceptionCode || EXCEPTION_SERVER_DEVICE_FAILURE
      );
    }
  }

  parseRequest(buffer) {
    if (!Buffer.isBuffer(buffer)) {
      const error = new Error('Request must be a Buffer');
      error.exceptionCode = EXCEPTION_ILLEGAL_DATA_VALUE;
      throw error;
    }
    if (buffer.length < 8) {
      const error = new Error('Invalid Modbus TCP frame length');
      error.exceptionCode = EXCEPTION_ILLEGAL_DATA_VALUE;
      throw error;
    }

    const transactionId = buffer.readUInt16BE(0);
    const protocolId = buffer.readUInt16BE(2);
    const length = buffer.readUInt16BE(4);
    const unitId = buffer.readUInt8(6);
    const functionCode = buffer.readUInt8(7);

    if (protocolId !== 0) {
      const error = new Error('Unsupported protocol identifier');
      error.exceptionCode = EXCEPTION_ILLEGAL_DATA_VALUE;
      throw error;
    }

    if (buffer.length !== 6 + length) {
      const error = new Error('MBAP length field does not match payload size');
      error.exceptionCode = EXCEPTION_ILLEGAL_DATA_VALUE;
      throw error;
    }

    const request = { transactionId, unitId, functionCode };

    switch (functionCode) {
      case FUNCTION_CODE_READ_HOLDING_REGISTERS:
        if (buffer.length !== 12) {
          const error = new Error('Invalid read-holding-registers frame size');
          error.exceptionCode = EXCEPTION_ILLEGAL_DATA_VALUE;
          throw error;
        }
        request.startAddress = buffer.readUInt16BE(8);
        request.quantity = buffer.readUInt16BE(10);
        break;
      case FUNCTION_CODE_WRITE_SINGLE_REGISTER:
        if (buffer.length !== 12) {
          const error = new Error('Invalid write-single-register frame size');
          error.exceptionCode = EXCEPTION_ILLEGAL_DATA_VALUE;
          throw error;
        }
        request.address = buffer.readUInt16BE(8);
        request.value = buffer.readUInt16BE(10);
        break;
      default:
        break;
    }

    return request;
  }

  buildExceptionResponse(transactionId, unitId, functionCode, exceptionCode) {
    const safeFunctionCode = (functionCode || 0) & 0x7F;
    const payloadLength = 3;
    const response = Buffer.alloc(6 + payloadLength);
    response.writeUInt16BE(transactionId, 0);
    response.writeUInt16BE(0, 2);
    response.writeUInt16BE(payloadLength, 4);
    response.writeUInt8(unitId, 6);
    response.writeUInt8(safeFunctionCode | 0x80, 7);
    response.writeUInt8(exceptionCode, 8);
    return response;
  }

  #handleReadHoldingRegisters(request) {
    const values = this.registerStore.readHoldingRegisters(request.startAddress, request.quantity);
    const byteCount = values.length * 2;
    const pduLength = 1 + 1 + byteCount;
    const lengthField = 1 + pduLength;
    const response = Buffer.alloc(6 + lengthField);

    response.writeUInt16BE(request.transactionId, 0);
    response.writeUInt16BE(0, 2);
    response.writeUInt16BE(lengthField, 4);
    response.writeUInt8(request.unitId, 6);
    response.writeUInt8(request.functionCode, 7);
    response.writeUInt8(byteCount, 8);

    for (let i = 0; i < values.length; i += 1) {
      response.writeUInt16BE(values[i], 9 + i * 2);
    }

    return response;
  }

  #handleWriteSingleRegister(request) {
    this.registerStore.writeSingleRegister(request.address, request.value);
    const pduLength = 1 + 2 + 2;
    const lengthField = 1 + pduLength;
    const response = Buffer.alloc(6 + lengthField);

    response.writeUInt16BE(request.transactionId, 0);
    response.writeUInt16BE(0, 2);
    response.writeUInt16BE(lengthField, 4);
    response.writeUInt8(request.unitId, 6);
    response.writeUInt8(request.functionCode, 7);
    response.writeUInt16BE(request.address, 8);
    response.writeUInt16BE(request.value, 10);

    return response;
  }
}

module.exports = {
  ModbusTcpHandler,
  RegisterStore,
  FUNCTION_CODE_READ_HOLDING_REGISTERS,
  FUNCTION_CODE_WRITE_SINGLE_REGISTER,
  EXCEPTION_ILLEGAL_FUNCTION,
  EXCEPTION_ILLEGAL_DATA_ADDRESS,
  EXCEPTION_ILLEGAL_DATA_VALUE,
  EXCEPTION_SERVER_DEVICE_FAILURE
};
