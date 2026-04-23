const express = require('express');
const router = express.Router();
const RtspIngestService = require('../rtsp/rtspIngestService');
const VideoStoragePlaybackService = require('../storage/videoStoragePlaybackService');
const HlsTranscoderService = require('../hls/hlsTranscoderService');
const {
  authenticateToken,
  attachAccessProfile,
  requirePermission
} = require('../middleware/auth');

router.use(authenticateToken, attachAccessProfile);

router.get('/live', requirePermission('video.view'), async (req, res) => {
  const testRtspUrl = process.env.DEMO_RTSP_URL || 'rtsp://demo.local/live';
  const streamInfo = await RtspIngestService.ingestRtspStream(testRtspUrl);
  return res.status(200).json({ success: true, data: streamInfo });
});

router.get('/playback', requirePermission('video.view'), async (req, res) => {
  const from = req.query.from || new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const to = req.query.to || new Date().toISOString();
  const streamInfo = await VideoStoragePlaybackService.getPlaybackStream(req.query.deviceId || 'DEV-001', from, to);
  return res.status(200).json({ success: true, data: streamInfo });
});

router.post('/transcode', requirePermission('video.view'), async (req, res) => {
  const inputStream = req.body?.inputStream || 'rtsp://demo.local/live';
  const outputPath = req.body?.outputPath || '/tmp/video-demo';
  const profile = req.body?.profile || 'medium';
  const result = await HlsTranscoderService.transcodeToHls(inputStream, outputPath, profile);
  return res.status(200).json({ success: true, data: result });
});

module.exports = router;
