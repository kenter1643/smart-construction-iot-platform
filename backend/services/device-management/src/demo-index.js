const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// 创建 Express 应用
const app = express();

// 中间件
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 请求限流
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100, // 每个 IP 15 分钟内最多 100 个请求
  message: {
    error: 'Too many requests',
    details: 'Please try again later.'
  }
});

app.use(limiter);

// 内存中的模拟设备数据
let devices = [
  {
    id: 1,
    deviceId: 'demo-camera-001',
    name: '演示摄像头 001',
    type: 'camera',
    protocol: 'http',
    configuration: {},
    status: 'online',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 2,
    deviceId: 'demo-sensor-temp-001',
    name: '温度传感器 001',
    type: 'sensor',
    protocol: 'mqtt',
    configuration: {},
    status: 'online',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      service: 'device-management',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      mode: 'demo'
    }
  });
});

// 获取设备列表
app.get('/api/v1/devices', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      devices,
      pagination: {
        page: 1,
        limit: 10,
        total: devices.length,
        totalPages: 1
      }
    }
  });
});

// 获取单个设备
app.get('/api/v1/devices/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const device = devices.find(d => d.id === id);

  if (!device) {
    return res.status(404).json({
      error: 'Device not found',
      details: `Device with ID "${id}" not found`
    });
  }

  res.status(200).json({
    success: true,
    data: device
  });
});

// 创建新设备
app.post('/api/v1/devices', (req, res) => {
  const newDevice = {
    id: devices.length + 1,
    ...req.body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  devices.push(newDevice);

  res.status(201).json({
    success: true,
    data: newDevice
  });
});

// 更新设备
app.put('/api/v1/devices/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = devices.findIndex(d => d.id === id);

  if (index === -1) {
    return res.status(404).json({
      error: 'Device not found',
      details: `Device with ID "${id}" not found`
    });
  }

  devices[index] = {
    ...devices[index],
    ...req.body,
    updatedAt: new Date().toISOString()
  };

  res.status(200).json({
    success: true,
    data: devices[index]
  });
});

// 删除设备
app.delete('/api/v1/devices/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = devices.findIndex(d => d.id === id);

  if (index === -1) {
    return res.status(404).json({
      error: 'Device not found',
      details: `Device with ID "${id}" not found`
    });
  }

  devices.splice(index, 1);

  res.status(200).json({
    success: true,
    data: { message: 'Device deleted successfully' }
  });
});

// 获取设备状态
app.get('/api/v1/devices/:id/status', (req, res) => {
  const id = parseInt(req.params.id);
  const device = devices.find(d => d.id === id);

  if (!device) {
    return res.status(404).json({
      error: 'Device not found',
      details: `Device with ID "${id}" not found`
    });
  }

  res.status(200).json({
    success: true,
    data: {
      id: device.id,
      deviceId: device.deviceId,
      status: device.status
    }
  });
});

// 更新设备状态
app.put('/api/v1/devices/:id/status', (req, res) => {
  const id = parseInt(req.params.id);
  const { status } = req.body;
  const device = devices.find(d => d.id === id);

  if (!device) {
    return res.status(404).json({
      error: 'Device not found',
      details: `Device with ID "${id}" not found`
    });
  }

  device.status = status;
  device.updatedAt = new Date().toISOString();

  res.status(200).json({
    success: true,
    data: device
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  res.status(err.status || 500).json({
    error: err.name || 'Internal Server Error',
    details: err.message
  });
});

// 404 处理
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    details: `The requested path "${req.originalUrl}" was not found on this server.`
  });
});

// 启动服务器
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('  智慧工地物联网平台 - 设备管理服务 (演示模式)');
  console.log('='.repeat(60));
  console.log(`  服务运行在: http://localhost:${PORT}`);
  console.log('');
  console.log('  可用的 API 端点:');
  console.log('  - GET  /health           - 健康检查');
  console.log('  - GET  /api/v1/devices  - 获取设备列表');
  console.log('  - POST /api/v1/devices  - 创建新设备');
  console.log('  - GET  /api/v1/devices/:id - 获取单个设备');
  console.log('  - PUT  /api/v1/devices/:id - 更新设备');
  console.log('  - DELETE /api/v1/devices/:id - 删除设备');
  console.log('  - GET  /api/v1/devices/:id/status - 获取设备状态');
  console.log('  - PUT  /api/v1/devices/:id/status - 更新设备状态');
  console.log('');
  console.log('  提示: 使用 curl 或浏览器访问 http://localhost:3001/health');
  console.log('='.repeat(60));
});
