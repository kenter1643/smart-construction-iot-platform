const Joi = require('joi');

// 传感器数据查询参数验证
const sensorDataQuery = Joi.object({
  deviceId: Joi.string().required(),
  startTime: Joi.date().iso(),
  endTime: Joi.date().iso(),
  limit: Joi.number().integer().min(1).max(1000).default(100),
  offset: Joi.number().integer().min(0).default(0),
  aggregate: Joi.string().valid('1m', '5m', '1h', '1d')
});

// 设备统计查询参数验证
const statsQuery = Joi.object({
  deviceId: Joi.string(),
  startTime: Joi.date().iso().required(),
  endTime: Joi.date().iso().required()
});

// 传感器数据验证
const sensorData = Joi.object({
  deviceId: Joi.string().required(),
  type: Joi.string().required(),
  location: Joi.string(),
  value: Joi.number().required(),
  unit: Joi.string(),
  timestamp: Joi.date().iso()
});

// 设备数据验证
const deviceData = Joi.object({
  deviceId: Joi.string().required(),
  status: Joi.string().valid('online', 'offline', 'disconnected', 'error').required(),
  metadata: Joi.object(),
  timestamp: Joi.date().iso()
});

// 趋势查询参数验证
const trendQuery = Joi.object({
  deviceId: Joi.string().required(),
  startTime: Joi.date().iso().required(),
  endTime: Joi.date().iso().required(),
  interval: Joi.string().valid('1m', '5m', '1h', '1d').default('1h')
});

// 历史查询参数验证
const historyQuery = Joi.object({
  deviceId: Joi.string().required(),
  startTime: Joi.date().iso(),
  endTime: Joi.date().iso(),
  limit: Joi.number().integer().min(1).max(500).default(100)
});

// 分析查询参数验证
const analysisQuery = Joi.object({
  deviceId: Joi.string().required(),
  startTime: Joi.date().iso().required(),
  endTime: Joi.date().iso().required(),
  analysisType: Joi.string().valid('basic', 'statistics', 'anomalies', 'all').default('basic')
});

// 导出数据查询参数验证
const exportQuery = Joi.object({
  deviceId: Joi.string(),
  startTime: Joi.date().iso().required(),
  endTime: Joi.date().iso().required(),
  format: Joi.string().valid('json', 'csv').default('json')
});

module.exports = {
  dataValidationSchema: {
    sensorDataQuery,
    statsQuery,
    sensorData,
    deviceData,
    trendQuery,
    historyQuery,
    analysisQuery,
    exportQuery
  }
};
