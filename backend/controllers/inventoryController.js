const Inventory = require('../models/Inventory');

exports.getInventory = async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const query = {};
    
    if (search) {
      query.$or = [
        { model: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { 'devices.imei': search }
      ];
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
    res.status(201).json({ success: true, data: inventory });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateInventory = async (req, res) => {
  try {
    const inventory = await Inventory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!inventory) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    
    res.json({ success: true, data: inventory });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
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
      item = await Inventory.findOne({ 'devices.imei': code });
    } else {
      item = await Inventory.findOne({ barcode: code });
    }

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
