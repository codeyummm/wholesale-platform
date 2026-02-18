const express = require('express');
const router = express.Router();
const multer = require('multer');
const { scanLabel } = require('../controllers/saleScannerController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
      'application/pdf'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: JPG, PNG, HEIC, PDF`));
    }
  },
});

router.post('/scan-label', upload.single('image'), scanLabel);

module.exports = router;
