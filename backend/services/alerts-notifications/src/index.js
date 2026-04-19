const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const alertRoutes = require('./routes/alerts');
const { initMySQL, testConnections, initAlertTables } = require('./utils/db');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

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
      service: 'alerts-notifications',
      status: 'healthy',
      timestamp: new Date().toISOString()
    }
  });
});

// API 路由
app.use('/api/v1/alerts', alertRoutes);

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
const PORT = process.env.PORT || 3004;
const HTTPS_ENABLED = process.env.HTTPS_ENABLED === 'true';
const HTTPS_PORT = process.env.HTTPS_PORT || 8443;
const SSL_KEY_PATH = process.env.SSL_KEY_PATH || '';
const SSL_CERT_PATH = process.env.SSL_CERT_PATH || '';

const startServer = async () => {
  try {
    // 初始化 MySQL 连接
    const mysqlOk = await initMySQL();

    if (!mysqlOk) {
      console.error('Failed to initialize MySQL connection');
      process.exit(1);
    }

    // 初始化告警表
    await initAlertTables();

    // 测试连接
    const connectionsOk = await testConnections();

    if (!connectionsOk) {
      console.warn('Warning: Not all database connections were successful.');
    }

    // 启动 HTTP 服务器
    const httpServer = http.createServer(app);
    httpServer.listen(PORT, () => {
      console.log(`Alerts and Notifications Service (HTTP) listening on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`API documentation: http://localhost:${PORT}/api/v1/alerts`);
    });

    // 如果启用 HTTPS，启动 HTTPS 服务器
    if (HTTPS_ENABLED && SSL_KEY_PATH && SSL_CERT_PATH) {
      try {
        const key = fs.readFileSync(path.resolve(__dirname, SSL_KEY_PATH));
        const cert = fs.readFileSync(path.resolve(__dirname, SSL_CERT_PATH));

        const credentials = { key, cert };
        const httpsServer = https.createServer(credentials, app);

        httpsServer.listen(HTTPS_PORT, () => {
          console.log(`Alerts and Notifications Service (HTTPS) listening on port ${HTTPS_PORT}`);
          console.log(`Health check: https://localhost:${HTTPS_PORT}/health`);
          console.log(`API documentation: https://localhost:${HTTPS_PORT}/api/v1/alerts`);
        });
      } catch (sslError) {
        console.error('Failed to start HTTPS server:', sslError);
        console.warn('HTTPS server not started, but HTTP server is running');
      }
    }
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('Received SIGINT signal, shutting down gracefully');
  try {
    await require('./utils/db').closeDB();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM signal, shutting down gracefully');
  try {
    await require('./utils/db').closeDB();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});
