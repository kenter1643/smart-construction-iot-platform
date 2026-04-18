const Joi = require('joi');

// 设备类型枚举
const DeviceType = {
  SENSOR: 'sensor',
  CAMERA: 'camera',
  ACTUATOR: 'actuator',
  CONTROLLER: 'controller'
};

// 通讯协议枚举
const ProtocolType = {
  MODBUS_TCP: 'modbus-tcp',
  MQTT: 'mqtt',
  HTTP: 'http'
};

// 设备状态枚举
const DeviceStatus = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  DISCONNECTED: 'disconnected',
  ERROR: 'error'
};

// 设备验证模式
const deviceValidationSchema = Joi.object({
  deviceId: Joi.string().required().pattern(/^[a-zA-Z0-9-_.]+$/).max(255),
  name: Joi.string().required().max(255),
  type: Joi.string().required().valid(...Object.values(DeviceType)),
  protocol: Joi.string().required().valid(...Object.values(ProtocolType)),
  configuration: Joi.object().default({}),
  status: Joi.string().valid(...Object.values(DeviceStatus)).default(DeviceStatus.OFFLINE)
});

// 设备配置验证模式
const deviceConfigValidationSchema = Joi.object({
  protocol: Joi.object({
    host: Joi.string().required(),
    port: Joi.number().integer().min(1).max(65535).required(),
    timeout: Joi.number().integer().min(1000).max(60000).default(10000),
    retryCount: Joi.number().integer().min(0).max(10).default(3),
    retryDelay: Joi.number().integer().min(1000).max(10000).default(1000)
  }).required(),
  pollingInterval: Joi.number().integer().min(1000).max(3600000).default(10000),
  tags: Joi.array().items(Joi.string()).default([])
});

class Device {
  constructor(data) {
    this.id = data.id;
    this.deviceId = data.deviceId;
    this.name = data.name;
    this.type = data.type;
    this.protocol = data.protocol;
    this.configuration = data.configuration || {};
    this.status = data.status || DeviceStatus.OFFLINE;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static validate(data) {
    return deviceValidationSchema.validate(data);
  }

  static validateConfig(config) {
    return deviceConfigValidationSchema.validate(config);
  }

  static get DeviceType() {
    return DeviceType;
  }

  static get ProtocolType() {
    return ProtocolType;
  }

  static get DeviceStatus() {
    return DeviceStatus;
  }

  toJSON() {
    return {
      id: this.id,
      deviceId: this.deviceId,
      name: this.name,
      type: this.type,
      protocol: this.protocol,
      configuration: this.configuration,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = Device;
