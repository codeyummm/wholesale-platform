const express = require('express');
const router = express.Router();
const imeiLabController = require('../controllers/imeiLabController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/account', imeiLabController.getAccountInfo);
router.get('/services', imeiLabController.getServiceList);
router.post('/order', imeiLabController.placeOrder);
router.get('/orders', imeiLabController.getOrders);
router.get('/stats', imeiLabController.getStats);
router.post('/order/:id/sync', imeiLabController.syncOrder);
router.get('/order/:id', imeiLabController.getOrderStatus);

module.exports = router;
