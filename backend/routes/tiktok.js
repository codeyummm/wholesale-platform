const express = require('express');
const router = express.Router();

// Mock Auth Route
router.get('/auth', (req, res) => {
  // In a real implementation, redirect to TikTok Shop OAuth URL
  res.redirect('http://localhost:5178/sales-channels?tiktokAuth=success');
});

// Mock Status Route
router.get('/status', (req, res) => {
  res.json({ success: true, connected: false });
});

// Mock Sync Orders
router.get('/sync-orders', (req, res) => {
  res.json({ success: true, message: 'TikTok Shop orders synced successfully.' });
});

module.exports = router;
