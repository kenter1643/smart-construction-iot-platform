class RegisterStore {
  constructor(size = 65536) {
    if (!Number.isInteger(size) || size <= 0) {
      throw new Error('Register size must be a positive integer');
    }
    this.registers = new Uint16Array(size);
  }

  get size() {
    return this.registers.length;
  }

  seed(values) {
    for (const [address, value] of values) {
      this.writeSingleRegister(address, value);
    }
  }

  readHoldingRegisters(startAddress, quantity) {
    this.#validateAddressRange(startAddress, quantity);
    if (quantity < 1 || quantity > 125) {
      const error = new Error('Quantity must be between 1 and 125');
      error.exceptionCode = 0x03;
      throw error;
    }
    return Array.from(this.registers.slice(startAddress, startAddress + quantity));
  }

  writeSingleRegister(address, value) {
    this.#validateAddressRange(address, 1);
    if (!Number.isInteger(value) || value < 0 || value > 0xFFFF) {
      const error = new Error('Register value must be in range 0..65535');
      error.exceptionCode = 0x03;
      throw error;
    }
    this.registers[address] = value;
  }

  #validateAddressRange(startAddress, quantity) {
    if (!Number.isInteger(startAddress) || !Number.isInteger(quantity)) {
      const error = new Error('Address and quantity must be integers');
      error.exceptionCode = 0x03;
      throw error;
    }
    if (startAddress < 0 || quantity < 0) {
      const error = new Error('Address and quantity cannot be negative');
      error.exceptionCode = 0x03;
      throw error;
    }
    if (startAddress + quantity > this.size) {
      const error = new Error('Address out of range');
      error.exceptionCode = 0x02;
      throw error;
    }
  }
}

module.exports = RegisterStore;
