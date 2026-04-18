const Joi = require('joi');

class SensorMetadata {
  constructor(data) {
    this.id = data.id;
    this.deviceId = data.deviceId;
    this.sensorName = data.sensorName;
    this.sensorType = data.sensorType;
    this.unit = data.unit;
    this.createdAt = data.createdAt;
  }

  static validate(data) {
    const schema = Joi.object({
      deviceId: Joi.number().integer().positive().required(),
      sensorName: Joi.string().required().max(255),
      sensorType: Joi.string().required().max(100),
      unit: Joi.string().allow('').max(50)
    });

    return schema.validate(data);
  }

  toJSON() {
    return {
      id: this.id,
      deviceId: this.deviceId,
      sensorName: this.sensorName,
      sensorType: this.sensorType,
      unit: this.unit,
      createdAt: this.createdAt
    };
  }
}

module.exports = SensorMetadata;
