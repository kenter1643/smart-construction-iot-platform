const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const videoRoutes = require('./routes/video');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: 'Too many requests',
    details: 'Please try again later.'
  }
});

app.use(limiter);

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      service: 'video-streaming',
      status: 'healthy',
      timestamp: new Date().toISOString()
    }
  });
});

app.use('/api/v1/video', videoRoutes);

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: err.name || 'Internal Server Error',
    details: err.message
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    details: `The requested path "${req.originalUrl}" was not found on this server.`
  });
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`Video Streaming Service listening on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API documentation: http://localhost:${PORT}/api/v1/video`);
});
