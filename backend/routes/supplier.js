const express = require('express');
const router = express.Router();
const {
  getSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  addInvoice
} = require('../controllers/supplierController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getSuppliers);
router.get('/:id', protect, getSupplier);
router.post('/', protect, createSupplier);
router.put('/:id', protect, updateSupplier);
router.delete('/:id', protect, deleteSupplier);
router.post('/:id/invoices', protect, addInvoice);

module.exports = router;
