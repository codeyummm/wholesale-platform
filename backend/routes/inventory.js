const express = require('express');
const router = express.Router();
const {
  getInventory,
  getInventoryItem,
  createInventory,
  updateInventory,
  updateDevice,
  deleteInventory,
  searchByCode,
  getInventoryStats
} = require('../controllers/inventoryController');
const { protect } = require('../middleware/auth');

router.get('/stats', getInventoryStats);
router.get('/', getInventory);
router.get('/search/:code', searchByCode);
router.get('/:id', getInventoryItem);
router.post('/', protect, createInventory);
router.put('/:id', protect, updateInventory);
router.patch('/:inventoryId/device/:deviceId', protect, updateDevice);
router.delete('/:id', protect, deleteInventory);

module.exports = router;
