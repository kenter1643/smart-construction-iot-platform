const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const deviceRoutes = require('./routes/devices');
const { testConnections, ensureDeviceSchema } = require('./utils/db');

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

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      service: 'device-management',
      status: 'healthy',
      timestamp: new Date().toISOString()
    }
  });
});

// API 路由
app.use('/api/v1/devices', deviceRoutes);

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

const startServer = async () => {
  try {
    await ensureDeviceSchema();

    // 测试数据库连接
    const connectionsOk = await testConnections();

    if (!connectionsOk) {
      console.warn('Warning: Not all database connections were successful.');
    }

    app.listen(PORT, () => {
      console.log(`Device Management Service listening on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`API documentation: http://localhost:${PORT}/api/v1/devices`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
