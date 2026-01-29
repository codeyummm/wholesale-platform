const express = require('express');
const router = express.Router();
const {
  getInventory,
  getInventoryItem,
  createInventory,
  updateInventory,
  deleteInventory,
  searchByCode
} = require('../controllers/inventoryController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getInventory);
router.get('/search/:code', protect, searchByCode);
router.get('/:id', protect, getInventoryItem);
router.post('/', protect, createInventory);
router.put('/:id', protect, updateInventory);
router.delete('/:id', protect, deleteInventory);

module.exports = router;
