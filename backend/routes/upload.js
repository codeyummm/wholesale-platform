const express = require('express');
const router = express.Router();
const multer = require('multer');
const { scanInvoice, saveScannedItems } = require('../controllers/uploadController');
const { protect } = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images allowed'));
    }
  }
});

router.post('/scan-invoice', protect, upload.single('invoice'), scanInvoice);
router.post('/save-scanned', protect, saveScannedItems);

module.exports = router;
