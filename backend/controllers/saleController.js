const Sale = require('../models/Sale');
const Inventory = require('../models/Inventory');
const Customer = require('../models/Customer');


// Update sale customer and add to purchase history
exports.updateSaleCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { customer } = req.body;
    
    const sale = await Sale.findByIdAndUpdate(id, { customer }, { new: true });
    console.log("📖 Sale from DB has costs:", sale?.costs);
    
    if (customer && sale) {
      // Add to customer purchase history
      const totalAmount = sale.items.reduce((sum, item) => sum + item.salePrice, 0) - (sale.discount || 0) + (sale.tax || 0);
      await Customer.findByIdAndUpdate(customer, {
        $inc: { totalPurchases: 1, totalSpent: totalAmount },
        $push: {
          purchaseHistory: {
            saleId: sale._id,
            date: sale.createdAt,
            amount: totalAmount,
            items: sale.items.map(item => ({ model: item.model, imei: item.imei }))
          }
        }
      });
    }
    
    res.json({ success: true, data: sale });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSales = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status, channel, startDate, endDate } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { saleNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { salesChannel: { $regex: search, $options: 'i' } },
        { status: { $regex: search, $options: 'i' } },
        { 'items.imei': { $regex: search, $options: 'i' } },
        { 'items.brand': { $regex: search, $options: 'i' } },
        { 'items.model': { $regex: search, $options: 'i' } },
        { 'shipping.trackingNumber': { $regex: search, $options: 'i' } }
      ];
    }
    if (channel) query.salesChannel = channel;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate + 'T23:59:59');
    }

    const sales = await Sale.find(query)
      .populate('customer', 'name company contact')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Sale.countDocuments(query);

    res.json({
      success: true,
      data: sales,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSale = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id).populate('customer', 'name company contact address');
    console.log("📖 Sale from DB has costs:", sale?.costs);
    if (!sale) return res.status(404).json({ success: false, message: 'Sale not found' });
    res.json({ success: true, data: sale });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createSale = async (req, res) => {
  try {
    const { customerId, customerName, items, discount, tax, paymentMethod, paymentStatus, amountPaid, notes, salesChannel, shipping, costs } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one item is required' });
    }

    // Process each item - mark devices as sold in inventory
    const processedItems = [];
    for (const item of items) {
      const processedItem = { ...item };

      if (item.inventoryId && item.imei) {
        const inventoryItem = await Inventory.findById(item.inventoryId);
        if (inventoryItem) {
          const deviceIndex = inventoryItem.devices.findIndex(
            d => d.imei === item.imei && !d.isSold
          );
          if (deviceIndex !== -1) {
            inventoryItem.devices[deviceIndex].isSold = true;
            inventoryItem.devices[deviceIndex].soldDate = new Date();
            await inventoryItem.save();

            processedItem.inventory = item.inventoryId;
            processedItem.costPrice = inventoryItem.price?.cost || 0;
            processedItem.profit = (item.salePrice || 0) - (inventoryItem.price?.cost || 0);
          }
        }
      } else {
        processedItem.profit = (item.salePrice || 0) - (item.costPrice || 0);
      }

      processedItems.push(processedItem);
    }

    // Update customer stats and purchase history
    if (customerId) {
      const totalAmount = processedItems.reduce((sum, item) => sum + item.salePrice, 0) - (discount || 0) + (tax || 0);
      await Customer.findByIdAndUpdate(customerId, {
        $inc: { totalPurchases: 1, totalSpent: totalAmount },
        $push: {
          purchaseHistory: {
            date: new Date(),
            amount: totalAmount,
            items: processedItems.map(item => ({
              model: item.model,
              imei: item.imei
            }))
          }
        }
      });
    }

    console.log("💰 Received costs from frontend:", costs);
    const sale = await Sale.create({
      customer: customerId || null,
      customerName: customerName || 'Walk-in Customer',
      items: processedItems,
      discount: discount || 0,
      tax: tax || 0,
      paymentMethod: paymentMethod || 'cash',
      paymentStatus: paymentStatus || 'paid',
      amountPaid: amountPaid || 0,
      salesChannel: salesChannel || 'in_store',
      shipping: shipping || {},
      costs: costs || { handling: 0, packaging: 0, marketplaceFees: 0, other: 0 },
      notes,
      createdBy: req.user._id
    });

    const populated = await Sale.findById(sale._id).populate('customer', 'name company contact');

    res.status(201).json({ success: true, data: populated, message: 'Sale created successfully' });
  } catch (error) {
    console.error('Create sale error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateSale = async (req, res) => {
  try {
    const oldSale = await Sale.findById(req.params.id);
    if (!oldSale) return res.status(404).json({ success: false, message: 'Sale not found' });
    

    // Recalculate subtotal and totals if items changed
    if (req.body.items) {
      req.body.subtotal = req.body.items.reduce((sum, item) => sum + (item.salePrice || 0), 0);
      req.body.totalAmount = req.body.subtotal - (req.body.discount || 0) + (req.body.tax || 0);
      
      const totalCost = req.body.items.reduce((sum, item) => sum + (item.costPrice || 0), 0);
      const grossProfit = req.body.subtotal - totalCost;
      const totalExpenses = (req.body.costs?.marketplaceFees || 0) + (req.body.costs?.handling || 0) + (req.body.costs?.packaging || 0) + (req.body.costs?.other || 0) + (req.body.shipping?.shippingCost || 0);
      req.body.totalProfit = grossProfit - totalExpenses - (req.body.discount || 0);
    }

    // Track detailed changes
    const changes = [];
    
    // Basic sale info
    if (req.body.salesChannel && req.body.salesChannel !== oldSale.salesChannel) {
      changes.push(`Channel: ${oldSale.salesChannel} → ${req.body.salesChannel}`);
    }
    if (req.body.subtotal && req.body.subtotal !== oldSale.subtotal) {
      changes.push(`Sale Price: $${oldSale.subtotal} → $${req.body.subtotal}`);
    }
    if (req.body.totalAmount && req.body.totalAmount !== oldSale.totalAmount) {
      changes.push(`Total: $${oldSale.totalAmount} → $${req.body.totalAmount}`);
    }
    if (req.body.status && req.body.status !== oldSale.status) {
      changes.push(`Status: ${oldSale.status} → ${req.body.status}`);
    }
    
    // Shipping details
    if (req.body.shipping?.shippingCost !== undefined && req.body.shipping.shippingCost !== oldSale.shipping?.shippingCost) {
      changes.push(`Shipping Cost: $${oldSale.shipping?.shippingCost || 0} → $${req.body.shipping.shippingCost}`);
    }
    if (req.body.shipping?.trackingNumber && req.body.shipping.trackingNumber !== oldSale.shipping?.trackingNumber) {
      changes.push(`Tracking: ${oldSale.shipping?.trackingNumber || 'None'} → ${req.body.shipping.trackingNumber}`);
    }
    if (req.body.shipping?.carrier && req.body.shipping.carrier !== oldSale.shipping?.carrier) {
      changes.push(`Carrier: ${oldSale.shipping?.carrier || 'None'} → ${req.body.shipping.carrier}`);
    }
    if (req.body.shipping?.address?.name && req.body.shipping.address.name !== oldSale.shipping?.address?.name) {
      changes.push(`Ship To: ${oldSale.shipping?.address?.name || 'None'} → ${req.body.shipping.address.name}`);
    }
    if (req.body.shipping?.address?.street && req.body.shipping.address.street !== oldSale.shipping?.address?.street) {
      changes.push(`Address: ${oldSale.shipping?.address?.street || 'None'} → ${req.body.shipping.address.street}`);
    }
    
    // Costs
    if (req.body.costs?.marketplaceFees !== undefined && req.body.costs.marketplaceFees !== oldSale.costs?.marketplaceFees) {
      changes.push(`Marketplace Fees: $${oldSalemarketplaceFees || 0} → $${req.body.costs.marketplaceFees}`);
    }
    if (req.body.costs?.handling !== undefined && req.body.costs.handling !== oldSale.costs?.handling) {
      changes.push(`Handling: $${oldSale.costs?.handling || 0} → $${req.body.costs.handling}`);
    }
    if (req.body.costs?.packaging !== undefined && req.body.costs.packaging !== oldSale.costs?.packaging) {
      changes.push(`Packaging: $${oldSale.costs?.packaging || 0} → $${req.body.costs.packaging}`);
    }
    if (req.body.costs?.other !== undefined && req.body.costs.other !== oldSale.costs?.other) {
      changes.push(`Other Costs: $${oldSale.costs?.other || 0} → $${req.body.costs.other}`);
    }
    
    // Payment
    if (req.body.paymentMethod && req.body.paymentMethod !== oldSale.paymentMethod) {
      changes.push(`Payment Method: ${oldSale.paymentMethod} → ${req.body.paymentMethod}`);
    }
    if (req.body.paymentStatus && req.body.paymentStatus !== oldSale.paymentStatus) {
      changes.push(`Payment Status: ${omentStatus} → ${req.body.paymentStatus}`);
    }
    
    // Discount & Tax
    if (req.body.discount !== undefined && req.body.discount !== oldSale.discount) {
      changes.push(`Discount: $${oldSale.discount || 0} → $${req.body.discount}`);
    }
    if (req.body.tax !== undefined && req.body.tax !== oldSale.tax) {
      changes.push(`Tax: $${oldSale.tax || 0} → $${req.body.tax}`);
    }
    
    // Notes
    if (req.body.notes && req.body.notes !== oldSale.notes) {
      changes.push(`Notes updated`);
    }
    const changesSummary = changes.length > 0 ? changes.join(', ') : 'Sale details updated';
    
    const editEntry = {
      editedBy: req.user?.name || 'System',
      editedAt: new Date(),
      changes: changesSummary
    };
    
    
    // Recalculate totals
    if (req.body.items) {
      req.body.subtotal = req.body.items.reduce((sum, item) => sum + (item.salePrice || 0), 0);
      req.body.totalAmount = req.body.subtotal - (req.body.discount || 0) + (req.body.tax || 0);
      
      const totalCost = req.body.items.reduce((sum, item) => sum + (item.costPrice || 0), 0);
      const grossProfit = req.body.subtotal - totalCost;
      const totalExpenses = (req.body.costs?.marketplaceFees || 0) + 
                           (req.body.costs?.handling || 0) + 
                           (req.body.costs?.packaging || 0) + 
                           (req.body.costs?.other || 0) + 
                           (req.body.shipping?.shippingCost || 0);
      req.body.totalProfit = grossProfit - totalExpenses - (req.body.discount || 0);
    }

    await Sale.findByIdAndUpdate(req.params.id, { $push: { editHistory: editEntry } });
    const sale = await Sale.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    
    // Update IMEI history for all items in the sale
    const Inventory = require('../models/Inventory');
    for (const item of sale.items) {
      if (item.imei) {
        await Inventory.updateOne(
          { 'devices.imei': item.imei },
          { 
            $push: { 
              'devices.$.history': {
                action: 'Sale Edited',
                date: new Date(),
                details: `Sale #${sale.saleNumber}: ${changesSummary}`,
                user: req.user?.name || 'System'
              }
            }
          }
        );
      }
    }
    
    res.json({ success: true, data: sale });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteSale = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    console.log("📖 Sale from DB has costs:", sale?.costs);
    if (!sale) return res.status(404).json({ success: false, message: 'Sale not found' });

    // Unmark devices as sold
    for (const item of sale.items) {
      if (item.inventory && item.imei) {
        const inventoryItem = await Inventory.findById(item.inventory);
        if (inventoryItem) {
          const device = inventoryItem.devices.find(d => d.imei === item.imei);
          if (device) {
            device.isSold = false;
            device.soldDate = null;
            await inventoryItem.save();
          }
        }
      }
    }

    await Sale.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Sale deleted and inventory restored' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSaleStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [todaySales, monthSales, allSales] = await Promise.all([
      Sale.aggregate([
        { $match: { createdAt: { $gte: today }, status: { $in: ['completed', 'shipped', 'delivered'] } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 }, profit: { $sum: '$totalProfit' } } }
      ]),
      Sale.aggregate([
        { $match: { createdAt: { $gte: thisMonth }, status: { $in: ['completed', 'shipped', 'delivered'] } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 }, profit: { $sum: '$totalProfit' } } }
      ]),
      Sale.aggregate([
        { $match: { status: { $in: ['completed', 'shipped', 'delivered'] } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 }, profit: { $sum: '$totalProfit' } } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        today: todaySales[0] || { total: 0, count: 0, profit: 0 },
        thisMonth: monthSales[0] || { total: 0, count: 0, profit: 0 },
        allTime: allSales[0] || { total: 0, count: 0, profit: 0 }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
