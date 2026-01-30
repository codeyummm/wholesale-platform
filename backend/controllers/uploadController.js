const { processInvoiceImage } = require('../utils/ocrService');
const Inventory = require('../models/Inventory');

exports.scanInvoice = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image'
      });
    }

    // Process image with OCR
    const result = await processInvoiceImage(req.file.buffer);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'OCR processing failed: ' + result.error
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.saveScannedItems = async (req, res) => {
  try {
    const { items } = req.body;
    const createdItems = [];

    for (const item of items) {
      // Create devices array from IMEIs
      const devices = (item.imeis || []).map(imei => ({
        imei,
        unlockStatus: 'unlocked',
        condition: 'new',
        grade: 'A+'
      }));

      // Determine brand from model
      const brand = extractBrand(item.model);

      const inventory = await Inventory.create({
        model: item.model,
        brand: brand,
        quantity: item.quantity || devices.length || 1,
        price: {
          cost: item.price || 0,
          retail: (item.price || 0) * 1.3
        },
        devices: devices
      });

      createdItems.push(inventory);
    }

    res.status(201).json({
      success: true,
      data: createdItems
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

function extractBrand(modelName) {
  const brands = {
    'iPhone': 'Apple',
    'Samsung': 'Samsung',
    'Galaxy': 'Samsung',
    'Pixel': 'Google',
    'OnePlus': 'OnePlus',
    'Xiaomi': 'Xiaomi'
  };

  for (const [key, value] of Object.entries(brands)) {
    if (modelName.includes(key)) {
      return value;
    }
  }
  return 'Unknown';
}
