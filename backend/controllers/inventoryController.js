const Inventory = require('../models/Inventory');

exports.getInventory = async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const query = {};
    
    if (search) {
      const searchTerms = search.split(' ').filter(term => term.trim() !== '');
      query.$and = searchTerms.map(term => {
        const searchNum = parseFloat(term);
        const termRegex = { $regex: term, $options: 'i' };
        
        const orConditions = [
          { model: termRegex },
          { brand: termRegex },
          { barcode: termRegex },
          { 'specifications.storage': termRegex },
          { 'specifications.color': termRegex },
          { 'specifications.ram': termRegex },
          { 'devices.imei': termRegex },
          { 'devices.imei2': termRegex },
          { 'devices.serialNumber': termRegex },
          { 'devices.condition': termRegex },
          { 'devices.unlockStatus': termRegex },
          { 'devices.grade': termRegex },
          { 'devices.batteryHealth': termRegex },
          { 'devices.history.action': termRegex },
          { 'devices.history.details': termRegex },
          { 'devices.history.user': termRegex },
          { supplierName: termRegex }
        ];

        if (!isNaN(searchNum)) {
          orConditions.push({ 'price.retail': searchNum });
          orConditions.push({ 'price.cost': searchNum });
          orConditions.push({ quantity: searchNum });
        }

        return { $or: orConditions };
      });
    }

    const inventory = await Inventory.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await Inventory.countDocuments(query);

    res.json({
      success: true,
      data: inventory,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getInventoryItem = async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createInventory = async (req, res) => {
  try {
    const inventoryData = req.body;
    
    if (!inventoryData.barcode) {
      const timestamp = Date.now().toString();
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      inventoryData.barcode = `INV${timestamp}${random}`;
    }

    const inventory = await Inventory.create(inventoryData);
    
    if (inventory.devices && inventory.devices.length > 0) {
      const newImeisToSubmit = inventory.devices
        .filter(d => d.imei)
        .map(d => ({
           imei: d.imei,
           brand: inventory.brand,
           model: inventory.model,
           inventoryId: inventory._id
        }));
        
      if (newImeisToSubmit.length > 0) {
        imeiLabController.autoSubmitImeiLab(newImeisToSubmit).catch(e => console.error('Failed auto IMEI Lab in createInventory:', e));
      }
    }

    res.status(201).json({ success: true, data: inventory });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const imeiLabController = require('./imeiLabController');

exports.updateInventory = async (req, res) => {
  try {
    const { devices, ...topLevelFields } = req.body;

    const oldInventory = await Inventory.findById(req.params.id);

    // Build update: always $set top-level fields; replace devices array if provided
    const updateOp = { $set: topLevelFields };
    if (devices !== undefined) {
      updateOp.$set.devices = devices;
    }

    const inventory = await Inventory.findByIdAndUpdate(
      req.params.id,
      updateOp,
      { new: true, runValidators: false }
    );

    if (!inventory) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    if (devices !== undefined && oldInventory) {
       const newImeisToSubmit = devices
         .filter(d => {
            if (!d.imei) return false;
            const oldDev = oldInventory.devices.find(od => od._id && d._id && od._id.toString() === d._id.toString());
            if (!oldDev) return true; // Brand new device added to the array
            if (oldDev.imei !== d.imei) return true; // IMEI was changed
            if (!d.labData && oldDev.labData == null) return true; // Retry if labData never populated
            return false;
         })
         .map(d => ({
            imei: d.imei,
            brand: inventory.brand,
            model: inventory.model,
            inventoryId: inventory._id
         }));
       
       if (newImeisToSubmit.length > 0) {
         imeiLabController.autoSubmitImeiLab(newImeisToSubmit).catch(e => console.error('Failed auto IMEI Lab in updateInventory:', e));
       }
    }

    res.json({ success: true, data: inventory });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Surgically update one device inside an inventory item
exports.updateDevice = async (req, res) => {
  try {
    const { inventoryId, deviceId } = req.params;
    const body = req.body;

    const inventory = await Inventory.findById(inventoryId);
    if (!inventory) {
      return res.status(404).json({ success: false, message: 'Inventory item not found' });
    }

    const device = inventory.devices.id(deviceId);
    if (!device) {
      return res.status(404).json({ success: false, message: 'Device not found' });
    }

    // Update fields if provided in body
    const fields = [
      'imei', 'imei2', 'serialNumber', 'unlockStatus', 'condition', 'grade', 'batteryHealth', 'isSold',
      'originalCarrier', 'modelNumber', 'partNumber', 'osVersion', 'dataCleared', 'cosmeticsGrade',
      'functionalityStatus', 'imeiStatus', 'fmiStatus', 'mdmStatus', 'labelNotes', 'internalNotes'
    ];
    let imeiChanged = false;
    fields.forEach(field => {
      if (body[field] !== undefined) {
        if (field === 'imei' && device.imei !== body[field]) imeiChanged = true;
        device[field] = body[field];
      }
    });

    await inventory.save();
    
    if ((imeiChanged || !device.labData) && device.imei) {
        imeiLabController.autoSubmitImeiLab([{
           imei: device.imei,
           brand: inventory.brand,
           model: inventory.model,
           inventoryId: inventory._id
        }]).catch(e => console.error('Failed auto IMEI Lab in updateDevice:', e));
    }

    res.json({ success: true, data: device });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteInventory = async (req, res) => {
  try {
    const inventory = await Inventory.findByIdAndDelete(req.params.id);
    if (!inventory) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    res.json({ success: true, message: 'Item deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.searchByCode = async (req, res) => {
  try {
    const { code } = req.params;
    let item;
    
    if (/^\d{15}$/.test(code)) {
      item = await Inventory.findOne({ 
        $or: [
          { 'devices.imei': code },
          { 'devices.imei2': code }
        ]
      });
    } else {
      item = await Inventory.findOne({ 
        $or: [
          { barcode: code },
          { 'devices.serialNumber': code }
        ]
      });
    }

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getInventoryStats = async (req, res) => {
  try {
    const all = await Inventory.find({}).select('brand model quantity price devices specifications createdAt');

    // ── Totals ──────────────────────────────────────────────────
    const totalItems    = all.length;
    const totalUnits    = all.reduce((s, i) => s + (i.quantity || 0), 0);
    const totalDevices  = all.reduce((s, i) => s + (i.devices?.length || 0), 0);
    const soldDevices   = all.reduce((s, i) => s + (i.devices?.filter(d => d.isSold).length || 0), 0);
    const availDevices  = totalDevices - soldDevices;
    const totalCostVal  = all.reduce((s, i) => s + ((i.price?.cost || 0) * (i.quantity || 0)), 0);
    const totalRetailVal= all.reduce((s, i) => s + ((i.price?.retail || 0) * (i.quantity || 0)), 0);

    // Low stock (available < 10 or < lowStockThreshold)
    const lowStock = all.filter(i => {
      const avail = i.devices?.filter(d => !d.isSold).length ?? i.quantity;
      return avail < 10;
    }).length;

    // ── Brand breakdown ──────────────────────────────────────────
    const brandMap = {};
    all.forEach(i => {
      const b = i.brand || 'Unknown';
      if (!brandMap[b]) brandMap[b] = { brand: b, units: 0, items: 0, costValue: 0 };
      brandMap[b].units    += i.quantity || 0;
      brandMap[b].items    += 1;
      brandMap[b].costValue+= (i.price?.cost || 0) * (i.quantity || 0);
    });
    const brandBreakdown = Object.values(brandMap)
      .sort((a, b) => b.units - a.units)
      .slice(0, 8);

    // ── Condition breakdown (across all devices) ─────────────────
    const condMap = { new: 0, refurbished: 0, used: 0 };
    all.forEach(i => i.devices?.forEach(d => { if (condMap[d.condition] !== undefined) condMap[d.condition]++; }));

    // ── Unlock status breakdown ──────────────────────────────────
    const lockMap = { unlocked: 0, locked: 0, carrier_locked: 0 };
    all.forEach(i => i.devices?.forEach(d => { if (lockMap[d.unlockStatus] !== undefined) lockMap[d.unlockStatus]++; }));

    // ── Stock level distribution ─────────────────────────────────
    const stockBuckets = { 'Out of Stock': 0, '1-5': 0, '6-20': 0, '21-50': 0, '50+': 0 };
    all.forEach(i => {
      const qty = i.devices?.filter(d => !d.isSold).length ?? i.quantity;
      if (qty === 0)       stockBuckets['Out of Stock']++;
      else if (qty <= 5)   stockBuckets['1-5']++;
      else if (qty <= 20)  stockBuckets['6-20']++;
      else if (qty <= 50)  stockBuckets['21-50']++;
      else                 stockBuckets['50+']++;
    });

    // ── Top 10 items by quantity ─────────────────────────────────
    const topItems = all
      .map(i => ({
        name: `${i.brand} ${i.model}`.trim(),
        qty:  i.devices?.filter(d => !d.isSold).length ?? i.quantity,
        retail: i.price?.retail || 0,
      }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    // ── Added per month (last 6 months) ──────────────────────────
    const monthlyAdded = {};
    const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    all.filter(i => new Date(i.createdAt) >= sixMonthsAgo).forEach(i => {
      const key = new Date(i.createdAt).toLocaleString('default', { month: 'short', year: '2-digit' });
      monthlyAdded[key] = (monthlyAdded[key] || 0) + (i.quantity || 0);
    });

    res.json({
      success: true,
      data: {
        totals: { totalItems, totalUnits, totalDevices, soldDevices, availDevices, totalCostVal, totalRetailVal, lowStock },
        brandBreakdown,
        conditionBreakdown: Object.entries(condMap).map(([k, v]) => ({ name: k, value: v })),
        lockBreakdown: Object.entries(lockMap).map(([k, v]) => ({ name: k.replace('_', ' '), value: v })),
        stockBuckets: Object.entries(stockBuckets).map(([k, v]) => ({ name: k, value: v })),
        topItems,
        monthlyAdded: Object.entries(monthlyAdded).map(([month, units]) => ({ month, units })),
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

