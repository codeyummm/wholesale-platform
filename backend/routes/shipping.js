const express = require('express');
const router = express.Router();
const { getRates, createLabel, bulkLabel, bulkPrint, voidLabel, getWarehouses, getCarriers, getServices, getPackages, addFunds, scaleLabel } = require('../controllers/shippingController');

// All shipping routes require valid ShipStation API keys in the .env file
router.post('/rates', getRates);
router.post('/label', createLabel);
router.post('/bulk-label', bulkLabel);
router.post('/bulk-print', bulkPrint);
router.post('/void', voidLabel);
router.post('/addfunds', addFunds);
router.post('/scale-pdf', scaleLabel);
router.get('/warehouses', getWarehouses);
router.get('/carriers', getCarriers);
router.get('/services', getServices);
router.get('/packages', getPackages);

module.exports = router;
