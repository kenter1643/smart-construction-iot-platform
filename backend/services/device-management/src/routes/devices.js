const express = require('express');
const router = express.Router();
const DeviceController = require('../controllers/deviceController');
const { authenticateToken, attachAccessProfile, requirePermission } = require('../middleware/auth');

router.use(authenticateToken, attachAccessProfile);

// 设备管理路由
router.post('/', requirePermission('device.create'), DeviceController.registerDevice);
router.get('/', requirePermission('device.read'), DeviceController.getDevices);
router.get('/:id', requirePermission('device.read'), DeviceController.getDeviceById);
router.put('/:id', requirePermission('device.update'), DeviceController.updateDevice);
router.delete('/:id', requirePermission('device.delete'), DeviceController.deleteDevice);

// 设备状态路由
router.get('/:id/status', requirePermission('device.read'), DeviceController.getDeviceStatus);
router.put('/:id/status', requirePermission('device.control'), DeviceController.updateDeviceStatus);

// 传感器元数据路由
router.post('/:deviceId/sensors', requirePermission('device.update'), DeviceController.addSensorMetadata);
router.get('/:deviceId/sensors', requirePermission('device.read'), DeviceController.getSensorMetadata);

module.exports = router;
