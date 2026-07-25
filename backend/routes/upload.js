const express = require('express');
const router = express.Router();
const multer = require('multer');
const heicConvert = require('heic-convert');
const path = require('path');
const { uploadBuffer } = require('../utils/storage');
const { protect } = require('../middleware/auth');

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

const { GetObjectCommand } = require('@aws-sdk/client-s3');

const axios = require('axios');

router.get('/proxy', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).send('URL is required');
    
    // If it's a digitaloceanspaces URL, fetch via S3 client to handle permissions
    if (url.includes('digitaloceanspaces.com')) {
      let key = url;
      if (url.includes('.com/')) {
        key = url.split('.com/')[1];
      }
      if (key.includes('?')) {
        key = key.split('?')[0];
      }
      
      const command = new GetObjectCommand({
        Bucket: process.env.DO_SPACES_BUCKET || 'udstg',
        Key: key
      });

      const { s3Client } = require('../utils/storage');
      const s3Response = await s3Client.send(command);

      res.set('Content-Type', s3Response.ContentType || 'image/jpeg');
      res.set('Access-Control-Allow-Origin', '*');
      s3Response.Body.pipe(res);
    } else {
      // It's an external URL (like wonatrading.com)
      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/*'
        },
        timeout: 10000
      });
      
      res.set('Content-Type', response.headers['content-type'] || 'image/jpeg');
      res.set('Access-Control-Allow-Origin', '*');
      response.data.pipe(res);
    }
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).send('Proxy error');
  }
});

router.post('/', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    let buffer = req.file.buffer;
    let mimeType = req.file.mimetype;
    let originalName = req.file.originalname;
    
    const ext = path.extname(originalName).toLowerCase();
    const isHeic = mimeType === 'image/heic' || mimeType === 'image/heif' || ext === '.heic' || ext === '.heif';

    if (isHeic) {
      buffer = await heicConvert({
        buffer: req.file.buffer,
        format: 'JPEG',
        quality: 0.8
      });
      mimeType = 'image/jpeg';
      originalName = originalName.replace(/\.hei[cf]$/i, '.jpg');
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const key = `uploads/${uniqueSuffix}${path.extname(originalName)}`;
    
    const url = await uploadBuffer(buffer, key, mimeType, true);

    res.json({
      success: true,
      url: url,
      key: key
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ success: false, message: 'Server error during upload: ' + error.message });
  }
});

module.exports = router;
