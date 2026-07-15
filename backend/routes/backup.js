const express = require('express');
const router = express.Router();
const runBackup = require('../scripts/runBackup');
const { protect } = require('../middleware/auth');
const { s3Client } = require('../utils/storage');
const { ListObjectsV2Command } = require('@aws-sdk/client-s3');

// Trigger a manual backup
router.post('/trigger', protect, async (req, res) => {
  try {
    // Run backup asynchronously (it might take some time depending on DB size)
    runBackup().catch(err => console.error("Background Backup Error:", err));
    
    res.json({ success: true, message: 'Backup started in the background.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const runRestore = require('../scripts/runRestore');

// Trigger Doomsday Restore from External DigitalOcean UI
router.post('/restore', async (req, res) => {
  try {
    const secret = req.headers['x-doomsday-secret'] || req.body.secret;
    const envSecret = process.env.DOOMSDAY_SECRET;

    if (!envSecret || secret !== envSecret) {
      return res.status(401).json({ success: false, message: 'Invalid or missing doomsday secret.' });
    }

    // Pass the specific key if provided, else it will auto-fetch latest
    const { targetKey } = req.body;
    
    // Run restore asynchronously so request doesn't timeout if it takes a long time
    runRestore(targetKey).catch(err => console.error("Background Restore Error:", err));
    
    res.json({ success: true, message: 'Doomsday restore initiated in the background.' });
  } catch (error) {
    console.error('Restore endpoint error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// List available backups in DO Spaces
router.get('/list', protect, async (req, res) => {
  try {
    const command = new ListObjectsV2Command({
      Bucket: process.env.DO_SPACES_BUCKET,
      Prefix: 'backups/'
    });

    const response = await s3Client.send(command);
    
    if (!response.Contents) {
      return res.json({ success: true, backups: [] });
    }

    const backups = response.Contents
      .filter(item => item.Key.endsWith('.tar.gz'))
      .map(item => ({
        key: item.Key,
        size: item.Size,
        lastModified: item.LastModified
      }))
      .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

    res.json({ success: true, backups });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
