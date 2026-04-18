const express = require('express');
const router = express.Router();
const DeviceController = require('../controllers/deviceController');

// 设备管理路由
router.post('/', DeviceController.registerDevice);
router.get('/', DeviceController.getDevices);
router.get('/:id', DeviceController.getDeviceById);
router.put('/:id', DeviceController.updateDevice);
router.delete('/:id', DeviceController.deleteDevice);

// 设备状态路由
router.get('/:id/status', DeviceController.getDeviceStatus);
router.put('/:id/status', DeviceController.updateDeviceStatus);

// 传感器元数据路由
router.post('/:deviceId/sensors', DeviceController.addSensorMetadata);
router.get('/:deviceId/sensors', DeviceController.getSensorMetadata);

module.exports = router;
