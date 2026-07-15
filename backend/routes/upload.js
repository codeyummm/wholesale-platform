const express = require('express');
const router = express.Router();
const { uploadToSpace } = require('../utils/storage');
const { protect } = require('../middleware/auth');

router.post('/', protect, uploadToSpace.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }
    
    // multer-s3 attaches the location to req.file
    res.json({
      success: true,
      url: req.file.location,
      key: req.file.key
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ success: false, message: 'Server error during upload.' });
  }
});

module.exports = router;
