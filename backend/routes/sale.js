const express = require('express');
const router = express.Router();
const { getSales, getSale, createSale, updateSale, deleteSale, getSaleStats } = require('../controllers/saleController');
const { protect } = require('../middleware/auth');

router.get('/stats', protect, getSaleStats);
router.get('/', protect, getSales);
router.get('/:id', protect, getSale);
router.post('/', protect, createSale);
router.put('/:id', protect, updateSale);
router.delete('/:id', protect, deleteSale);

module.exports = router;
