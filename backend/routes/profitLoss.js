const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getProfitLossSummary, getDetailedReport } = require('../controllers/profitLossController');

router.get('/summary', protect, getProfitLossSummary);
router.get('/detailed', protect, getDetailedReport);

module.exports = router;
