const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Inventory = require('../models/Inventory');
const Invoice = require('../models/Invoice');
const Sale = require('../models/Sale');
const DeviceTest = require('../models/DeviceTest');

// @route GET /api/imei/:imei
// @desc Get full lifecycle of a device by IMEI
router.get('/:imei', protect, async (req, res) => {
  try {
    const { imei } = req.params;

    if (!imei || imei.length < 5) {
      return res.status(400).json({ success: false, message: 'Valid IMEI required' });
    }

    // Find in inventory
    const inventoryItem = await Inventory.findOne({ 'devices.imei': imei });
    let deviceInfo = null;
    if (inventoryItem) {
      const device = inventoryItem.devices.find(d => d.imei === imei);
      deviceInfo = {
        inventoryId: inventoryItem._id,
        model: inventoryItem.model,
        brand: inventoryItem.brand,
        storage: inventoryItem.specifications?.storage || '',
        color: inventoryItem.specifications?.color || '',
        costPrice: inventoryItem.price?.cost || 0,
        retailPrice: inventoryItem.price?.retail || 0,
        imei: device?.imei,
        unlockStatus: device?.unlockStatus,
        condition: device?.condition,
        grade: device?.grade,
        isSold: device?.isSold || false,
        soldDate: device?.soldDate,
        addedDate: inventoryItem.createdAt
      };
    }

    // Find in invoices (purchase history)
    const invoices = await Invoice.find({
      $or: [
        { 'products.fullDescription': { $regex: imei, $options: 'i' } },
        { rawText: { $regex: imei, $options: 'i' } }
      ]
    }).select('invoiceNumber invoiceDate supplierName totalAmount status createdAt').sort({ createdAt: -1 }).limit(5);

    // Find in sales
    const sales = await Sale.find({ 'items.imei': imei })
      .select('saleNumber customerName totalAmount totalProfit status paymentMethod createdAt items')
      .sort({ createdAt: -1 }).limit(5);

    const saleInfo = sales.map(sale => {
      const item = sale.items.find(i => i.imei === imei);
      return {
        saleId: sale._id,
        saleNumber: sale.saleNumber,
        customerName: sale.customerName,
        salePrice: item?.salePrice || 0,
        profit: item?.profit || 0,
        status: sale.status,
        paymentMethod: sale.paymentMethod,
        date: sale.createdAt
      };
    });

    // Find device tests
    const tests = await DeviceTest.find({ imei: imei })
      .select('overallStatus summary testedBy createdAt notes')
      .sort({ createdAt: -1 }).limit(10);

    // Build timeline
    const timeline = [];

    if (deviceInfo) {
      timeline.push({
        type: 'inventory',
        title: 'Added to Inventory',
        description: `${deviceInfo.brand} ${deviceInfo.model} ${deviceInfo.storage}`,
        date: deviceInfo.addedDate,
        status: 'info'
      });
    }

    invoices.forEach(inv => {
      timeline.push({
        type: 'invoice',
        title: `Invoice #${inv.invoiceNumber || 'N/A'}`,
        description: `From ${inv.supplierName} - $${inv.totalAmount}`,
        date: inv.invoiceDate || inv.createdAt,
        status: 'info'
      });
    });

    tests.forEach(test => {
      timeline.push({
        type: 'test',
        title: `Device Test - ${test.overallStatus}`,
        description: `${test.summary?.passedTests || 0}/${test.summary?.totalTests || 0} passed (${test.summary?.passRate || 0}%)`,
        date: test.createdAt,
        status: test.overallStatus === 'passed' ? 'success' : test.overallStatus === 'failed' ? 'error' : 'warning'
      });
    });

    saleInfo.forEach(sale => {
      timeline.push({
        type: 'sale',
        title: `Sold - ${sale.saleNumber}`,
        description: `To ${sale.customerName} for $${sale.salePrice} (profit: $${sale.profit})`,
        date: sale.date,
        status: 'success'
      });
    });

    // Sort timeline by date
    timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      success: true,
      data: {
        imei,
        found: !!deviceInfo,
        device: deviceInfo,
        invoices,
        sales: saleInfo,
        tests,
        timeline
      }
    });
  } catch (error) {
    console.error('IMEI lookup error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
