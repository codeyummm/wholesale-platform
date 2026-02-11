const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Sale = require('../models/Sale');
const Inventory = require('../models/Inventory');
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');

// @route GET /api/reports/overview
router.get('/overview', protect, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);

    // Sales stats
    const [thisMonthSales, lastMonthSales, allTimeSales] = await Promise.all([
      Sale.aggregate([
        { $match: { createdAt: { $gte: thisMonth }, status: 'completed' } },
        { $group: { _id: null, revenue: { $sum: '$totalAmount' }, profit: { $sum: '$totalProfit' }, count: { $sum: 1 } } }
      ]),
      Sale.aggregate([
        { $match: { createdAt: { $gte: lastMonth, $lte: lastMonthEnd }, status: 'completed' } },
        { $group: { _id: null, revenue: { $sum: '$totalAmount' }, profit: { $sum: '$totalProfit' }, count: { $sum: 1 } } }
      ]),
      Sale.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, revenue: { $sum: '$totalAmount' }, profit: { $sum: '$totalProfit' }, count: { $sum: 1 } } }
      ])
    ]);

    // Inventory stats
    const inventory = await Inventory.find({});
    let totalInventoryValue = 0;
    let totalRetailValue = 0;
    let totalDevices = 0;
    let availableDevices = 0;
    let soldDevices = 0;

    inventory.forEach(item => {
      const avail = item.devices?.filter(d => !d.isSold).length || 0;
      const sold = item.devices?.filter(d => d.isSold).length || 0;
      totalDevices += item.quantity || 0;
      availableDevices += avail;
      soldDevices += sold;
      totalInventoryValue += avail * (item.price?.cost || 0);
      totalRetailValue += avail * (item.price?.retail || 0);
    });

    // Daily sales for chart (last 30 days)
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailySales = await Sale.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo }, status: 'completed' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$totalAmount' },
          profit: { $sum: '$totalProfit' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Top selling products
    const topProducts = await Sale.aggregate([
      { $match: { status: 'completed' } },
      { $unwind: '$items' },
      {
        $group: {
          _id: { model: '$items.model', brand: '$items.brand' },
          totalSold: { $sum: 1 },
          totalRevenue: { $sum: '$items.salePrice' },
          totalProfit: { $sum: '$items.profit' }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 }
    ]);

    // Top customers
    const topCustomers = await Customer.find({ totalSpent: { $gt: 0 } })
      .sort({ totalSpent: -1 })
      .limit(10)
      .select('name company type totalPurchases totalSpent');

    // Sales by payment method
    const paymentBreakdown = await Sale.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: '$paymentMethod',
          total: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const thisMonthData = thisMonthSales[0] || { revenue: 0, profit: 0, count: 0 };
    const lastMonthData = lastMonthSales[0] || { revenue: 0, profit: 0, count: 0 };

    const revenueGrowth = lastMonthData.revenue > 0
      ? (((thisMonthData.revenue - lastMonthData.revenue) / lastMonthData.revenue) * 100).toFixed(1)
      : 0;

    res.json({
      success: true,
      data: {
        sales: {
          thisMonth: thisMonthData,
          lastMonth: lastMonthData,
          allTime: allTimeSales[0] || { revenue: 0, profit: 0, count: 0 },
          revenueGrowth: parseFloat(revenueGrowth)
        },
        inventory: {
          totalProducts: inventory.length,
          totalDevices,
          availableDevices,
          soldDevices,
          costValue: totalInventoryValue,
          retailValue: totalRetailValue,
          potentialProfit: totalRetailValue - totalInventoryValue
        },
        charts: {
          dailySales,
          topProducts,
          topCustomers,
          paymentBreakdown
        }
      }
    });
  } catch (error) {
    console.error('Reports error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
