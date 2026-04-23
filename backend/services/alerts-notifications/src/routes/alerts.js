const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const validate = require('../middleware/validate');
const { alertValidationSchema } = require('../models/validators');
const {
  authenticateToken,
  attachAccessProfile,
  requirePermission,
  requireScopedDeviceIdInQuery,
  requireScopedDeviceIdInBody,
  requireAlertRuleScope,
  requireAlertRuleScopeByBody,
  requireAlertHistoryScope,
  requireNotificationScope
} = require('../middleware/auth');

router.use(authenticateToken, attachAccessProfile);

// 获取所有告警规则
router.get('/rules', requirePermission('alert.read'), validate(alertValidationSchema.listRules), requireScopedDeviceIdInQuery('deviceId'), alertController.getAlertRules);

// 创建告警规则
router.post('/rules', requirePermission('alert.manage'), validate(alertValidationSchema.createRule), requireScopedDeviceIdInBody('deviceId'), alertController.createAlertRule);

// 更新告警规则
router.put('/rules/:id', requirePermission('alert.manage'), requireAlertRuleScope('id'), validate(alertValidationSchema.updateRule), alertController.updateAlertRule);

// 删除告警规则
router.delete('/rules/:id', requirePermission('alert.manage'), requireAlertRuleScope('id'), alertController.deleteAlertRule);

// 启用/禁用告警规则
router.patch('/rules/:id/toggle', requirePermission('alert.manage'), requireAlertRuleScope('id'), alertController.toggleAlertRule);

// 获取告警历史
router.get('/history', requirePermission('alert.read'), validate(alertValidationSchema.listHistory), requireScopedDeviceIdInQuery('deviceId'), alertController.getAlertHistory);

// 获取未处理的告警
router.get('/unresolved', requirePermission('alert.read'), requireScopedDeviceIdInQuery('deviceId'), alertController.getUnresolvedAlerts);

// 处理告警
router.patch('/history/:id/resolve', requirePermission('alert.manage'), requireAlertHistoryScope('id'), alertController.resolveAlert);

// 创建通知配置
router.post('/notifications', requirePermission('alert.manage'), validate(alertValidationSchema.createNotification), requireAlertRuleScopeByBody('alertRuleId'), alertController.createNotification);

// 获取通知配置
router.get('/notifications', requirePermission('alert.read'), validate(alertValidationSchema.listNotifications), requireScopedDeviceIdInQuery('deviceId'), alertController.getNotifications);

// 删除通知配置
router.delete('/notifications/:id', requirePermission('alert.manage'), requireNotificationScope('id'), alertController.deleteNotification);

// 启用/禁用通知配置
router.patch('/notifications/:id/toggle', requirePermission('alert.manage'), requireNotificationScope('id'), alertController.toggleNotification);

// 测试通知
router.post('/test-notification', requirePermission('alert.manage'), validate(alertValidationSchema.testNotification), alertController.testNotification);

// 获取告警统计
router.get('/stats', requirePermission('alert.read'), validate(alertValidationSchema.getStats), requireScopedDeviceIdInQuery('deviceId'), alertController.getAlertStats);

module.exports = router;
