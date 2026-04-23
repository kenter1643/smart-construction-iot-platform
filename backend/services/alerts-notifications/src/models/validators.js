const Joi = require('joi');

// 列出告警规则查询参数验证
const listRules = Joi.object({
  deviceId: Joi.string(),
  severity: Joi.string().valid('low', 'medium', 'high', 'critical'),
  enabled: Joi.boolean(),
  limit: Joi.number().integer().min(1).max(1000).default(100),
  offset: Joi.number().integer().min(0).default(0)
});

// 创建告警规则验证
const createRule = Joi.object({
  deviceId: Joi.string().required(),
  ruleName: Joi.string().required(),
  conditionType: Joi.string().valid('threshold', 'range', 'status_change').required(),
  conditionValue: Joi.object().required(),
  severity: Joi.string().valid('low', 'medium', 'high', 'critical').required(),
  enabled: Joi.boolean().default(true)
});

// 更新告警规则验证
const updateRule = Joi.object({
  ruleName: Joi.string(),
  conditionType: Joi.string().valid('threshold', 'range', 'status_change'),
  conditionValue: Joi.object(),
  severity: Joi.string().valid('low', 'medium', 'high', 'critical'),
  enabled: Joi.boolean()
});

// 列出告警历史查询参数验证
const listHistory = Joi.object({
  deviceId: Joi.string(),
  severity: Joi.string().valid('low', 'medium', 'high', 'critical'),
  startTime: Joi.date().iso(),
  endTime: Joi.date().iso(),
  limit: Joi.number().integer().min(1).max(1000).default(100),
  offset: Joi.number().integer().min(0).default(0)
});

// 创建通知配置验证
const createNotification = Joi.object({
  alertRuleId: Joi.number().integer().required(),
  notificationType: Joi.string().valid('email', 'sms').required(),
  recipient: Joi.string().required(),
  enabled: Joi.boolean().default(true)
});

// 列出通知配置查询参数验证
const listNotifications = Joi.object({
  deviceId: Joi.string(),
  alertRuleId: Joi.number().integer(),
  notificationType: Joi.string().valid('email', 'sms'),
  enabled: Joi.boolean(),
  limit: Joi.number().integer().min(1).max(1000).default(100),
  offset: Joi.number().integer().min(0).default(0)
});

// 测试通知验证
const testNotification = Joi.object({
  notificationType: Joi.string().valid('email', 'sms').required(),
  recipient: Joi.string().required(),
  message: Joi.string().default('Test notification from Smart Construction IoT Platform')
});

// 获取告警统计查询参数验证
const getStats = Joi.object({
  deviceId: Joi.string(),
  startTime: Joi.date().iso().required(),
  endTime: Joi.date().iso().required()
});

module.exports = {
  alertValidationSchema: {
    listRules,
    createRule,
    updateRule,
    listHistory,
    createNotification,
    listNotifications,
    testNotification,
    getStats
  }
};
