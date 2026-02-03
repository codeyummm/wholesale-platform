const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/auth');
const { scanInvoice, saveInvoice, getInvoices, getInvoice, deleteInvoice } = require('../controllers/invoiceController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and PDF are allowed.'));
  },
});

router.post('/scan', auth, upload.single('invoice'), scanInvoice);
router.post('/save', auth, saveInvoice);
router.get('/', auth, getInvoices);
router.get('/:id', auth, getInvoice);
router.delete('/:id', auth, deleteInvoice);

module.exports = router;
