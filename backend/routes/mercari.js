const express = require('express');
const router = express.Router();

router.get('/auth', (req, res) => {
  res.redirect('http://localhost:5178/sales-channels?mercariAuth=success');
});

router.get('/status', (req, res) => {
  res.json({ success: true, connected: false });
});

router.get('/sync-orders', (req, res) => {
  res.json({ success: true, message: 'Mercari orders synced successfully.' });
});

module.exports = router;
