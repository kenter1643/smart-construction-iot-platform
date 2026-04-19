const express = require('express');
const router = express.Router();
const dataController = require('../controllers/dataController');
const validate = require('../middleware/validate');
const { dataValidationSchema } = require('../models/validators');

// 获取传感器数据（查询参数支持时间范围和设备ID）
router.get('/sensor', validate(dataValidationSchema.sensorDataQuery), dataController.getSensorData);

// 获取设备数据统计
router.get('/stats', validate(dataValidationSchema.statsQuery), dataController.getDeviceStats);

// 存储传感器数据
router.post('/sensor', validate(dataValidationSchema.sensorData), dataController.storeSensorData);

// 存储设备数据
router.post('/device', validate(dataValidationSchema.deviceData), dataController.storeDeviceData);

// 获取传感器数据趋势
router.get('/trends', validate(dataValidationSchema.trendQuery), dataController.getSensorTrends);

// 获取设备状态历史
router.get('/history', validate(dataValidationSchema.historyQuery), dataController.getDeviceHistory);

// 执行数据分析
router.post('/analyze', validate(dataValidationSchema.analysisQuery), dataController.analyzeData);

// 导出数据
router.get('/export', validate(dataValidationSchema.exportQuery), dataController.exportData);

module.exports = router;
