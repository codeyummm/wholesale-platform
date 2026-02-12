const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/auth');
const { scanLabel } = require('../controllers/saleScannerController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type.'));
  },
});

router.post('/scan-label', protect, upload.single('image'), scanLabel);

module.exports = router;
