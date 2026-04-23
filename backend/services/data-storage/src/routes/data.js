const express = require('express');
const router = express.Router();
const dataController = require('../controllers/dataController');
const validate = require('../middleware/validate');
const { dataValidationSchema } = require('../models/validators');
const {
  authenticateToken,
  attachAccessProfile,
  requirePermission,
  requireScopedDeviceIdInQuery,
  requireScopedDeviceIdInBody
} = require('../middleware/auth');

router.use(authenticateToken, attachAccessProfile);

// 获取传感器数据（查询参数支持时间范围和设备ID）
router.get('/sensor', requirePermission('device.read'), validate(dataValidationSchema.sensorDataQuery), requireScopedDeviceIdInQuery('deviceId'), dataController.getSensorData);

// 获取设备数据统计
router.get('/stats', requirePermission('device.read'), validate(dataValidationSchema.statsQuery), requireScopedDeviceIdInQuery('deviceId'), dataController.getDeviceStats);

// 存储传感器数据
router.post('/sensor', requirePermission('device.update'), validate(dataValidationSchema.sensorData), requireScopedDeviceIdInBody('deviceId'), dataController.storeSensorData);

// 存储设备数据
router.post('/device', requirePermission('device.update'), validate(dataValidationSchema.deviceData), requireScopedDeviceIdInBody('deviceId'), dataController.storeDeviceData);

// 获取传感器数据趋势
router.get('/trends', requirePermission('device.read'), validate(dataValidationSchema.trendQuery), requireScopedDeviceIdInQuery('deviceId'), dataController.getSensorTrends);

// 获取设备状态历史
router.get('/history', requirePermission('device.read'), validate(dataValidationSchema.historyQuery), requireScopedDeviceIdInQuery('deviceId'), dataController.getDeviceHistory);

// 执行数据分析
router.post('/analyze', requirePermission('device.read'), validate(dataValidationSchema.analysisQuery), requireScopedDeviceIdInBody('deviceId'), dataController.analyzeData);

// 导出数据
router.get('/export', requirePermission('data.export'), validate(dataValidationSchema.exportQuery), requireScopedDeviceIdInQuery('deviceId'), dataController.exportData);

module.exports = router;
