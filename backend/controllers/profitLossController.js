const Sale = require('../models/sale');

// Get profit/loss summary
exports.getProfitLossSummary = async (req, res) => {
  try {
    const { startDate, endDate, salesChannel } = req.query;
    
    const filter = { status: { $ne: 'Cancelled' } };
    
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    if (salesChannel && salesChannel !== 'All') {
      filter.salesChannel = salesChannel;
    }
    
    const sales = await Sale.find(filter);
    
    const summary = {
      totalSales: sales.length,
      totalRevenue: 0,
      totalCosts: 0,
      totalAdjustments: 0,
      grossProfit: 0,
      netProfit: 0,
      averageProfitPerSale: 0,
      profitMargin: 0,
      bySalesChannel: {},
      byMonth: {}
    };
    
    sales.forEach(sale => {
      const fin = sale.financials;
      summary.totalRevenue += fin.subtotal || 0;
      summary.totalCosts += (fin.totalCosts || 0) + sale.items.reduce((sum, item) => sum + (item.costPrice || 0), 0);
      summary.totalAdjustments += fin.totalAdjustments || 0;
      summary.grossProfit += fin.grossProfit || 0;
      summary.netProfit += fin.netProfit || 0;
      
      // By sales channel
      const channel = sale.salesChannel || 'Unknown';
      if (!summary.bySalesChannel[channel]) {
        summary.bySalesChannel[channel] = { sales: 0, revenue: 0, profit: 0 };
      }
      summary.bySalesChannel[channel].sales += 1;
      summary.bySalesChannel[channel].revenue += fin.subtotal || 0;
      summary.bySalesChannel[channel].profit += fin.netProfit || 0;
      
      // By month
      const month = new Date(sale.createdAt).toISOString().slice(0, 7);
      if (!summary.byMonth[month]) {
        summary.byMonth[month] = { sales: 0, revenue: 0, profit: 0 };
      }
      summary.byMonth[month].sales += 1;
      summary.byMonth[month].revenue += fin.subtotal || 0;
      summary.byMonth[month].profit += fin.netProfit || 0;
    });
    
    if (summary.totalSales > 0) {
      summary.averageProfitPerSale = summary.netProfit / summary.totalSales;
      summary.profitMargin = (summary.netProfit / summary.totalRevenue) * 100;
    }
    
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Profit/Loss summary error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get detailed sales report
exports.getDetailedReport = async (req, res) => {
  try {
    const { startDate, endDate, salesChannel, page = 1, limit = 50 } = req.query;
    
    const filter = { status: { $ne: 'Cancelled' } };
    
    if (startDate && endDate) {
      filter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    
    if (salesChannel && salesChannel !== 'All') {
      filter.salesChannel = salesChannel;
    }
    
    const sales = await Sale.find(filter)
      .populate('customer', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const total = await Sale.countDocuments(filter);
    
    res.json({
      success: true,
      data: {
        sales,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalSales: total
        }
      }
    });
  } catch (error) {
    console.error('Detailed report error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = exports;
