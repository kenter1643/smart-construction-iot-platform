const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const validate = require('../middleware/validate');
const { alertValidationSchema } = require('../models/validators');

// 获取所有告警规则
router.get('/rules', validate(alertValidationSchema.listRules), alertController.getAlertRules);

// 创建告警规则
router.post('/rules', validate(alertValidationSchema.createRule), alertController.createAlertRule);

// 更新告警规则
router.put('/rules/:id', validate(alertValidationSchema.updateRule), alertController.updateAlertRule);

// 删除告警规则
router.delete('/rules/:id', alertController.deleteAlertRule);

// 启用/禁用告警规则
router.patch('/rules/:id/toggle', alertController.toggleAlertRule);

// 获取告警历史
router.get('/history', validate(alertValidationSchema.listHistory), alertController.getAlertHistory);

// 获取未处理的告警
router.get('/unresolved', alertController.getUnresolvedAlerts);

// 处理告警
router.patch('/history/:id/resolve', alertController.resolveAlert);

// 创建通知配置
router.post('/notifications', validate(alertValidationSchema.createNotification), alertController.createNotification);

// 获取通知配置
router.get('/notifications', validate(alertValidationSchema.listNotifications), alertController.getNotifications);

// 删除通知配置
router.delete('/notifications/:id', alertController.deleteNotification);

// 启用/禁用通知配置
router.patch('/notifications/:id/toggle', alertController.toggleNotification);

// 测试通知
router.post('/test-notification', validate(alertValidationSchema.testNotification), alertController.testNotification);

// 获取告警统计
router.get('/stats', validate(alertValidationSchema.getStats), alertController.getAlertStats);

module.exports = router;
