const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const Invoice = require('../models/Invoice');
const Inventory = require('../models/Inventory');
const Supplier = require('../models/Supplier');

const preprocessImage = async (buffer) => {
  return await sharp(buffer).grayscale().normalize().sharpen().toBuffer();
};

const extractInvoiceData = (text) => {
  const extractFirst = (text, patterns) => {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return null;
  };

  const parseNumber = (str) => {
    if (!str) return null;
    return parseFloat(str.replace(/[,\s]/g, ''));
  };

  const parseDate = (str) => {
    if (!str) return null;
    const parsed = new Date(str);
    return isNaN(parsed) ? null : parsed;
  };

  const detectCurrency = (text) => {
    if (text.includes('€') || /EUR/i.test(text)) return 'EUR';
    if (text.includes('£') || /GB.test(text)) return 'GBP';
    if (/CAD/i.test(text)) return 'CAD';
    if (/INR|₹/i.test(text)) return 'INR';
    return 'USD';
  };

  const extractSupplier = (text) => {
    const lines = text.split('\n').filter(l => l.trim());
    for (const line of lines.slice(0, 5)) {
      const cleaned = line.trim();
      if (cleaned.length > 3 && !/invoice|date|to:|bill|ship|address/i.test(cleaned)) {
        return cleaned;
      }
    }
    return 'Unknown Supplier';
  };

  const extractProducts = (text) => {
    const products = [];
    const linePattern = /([A-Za-z0-9\s\-\.]+?)\s+(\d+(?:\.\d+)?)\s+[\$€£]?([\d,]+\.?\d*)\s+[\$€£]?([\d,]+\.?\d*)/g;
    let match;
    while ((match = linePattern.exec(text)) !== null) {
      const name = match[1].trim();
      if (/description|quantity|price|total|subtotal|tax/i.test(name)) continue;
      if (name.length < 2) continue;
      products.push({
        name,
        quantity: parseFloat(match[2]),
        unitPrice: parseNumber(match[3]),
        lineTotal: ber(match[4]),
      });
    }
    return products;
  };

  const invoicePatterns = [/(?:Invoice|Inv|Invoice\s*#|Invoice\s*No\.?)\s*[:\s]*([A-Z0-9\-]+)/i];
  const datePatterns = [/(?:Date|Invoice\s*Date)\s*[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i, /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/];
  const totalPatterns = [/(?:Total|Grand\s*Total|Amount\s*Due)\s*[:\s]*[\$€£]?\s*([\d,]+\.?\d*)/i];
  const subtotalPatterns = [/(?:Subtotal|Sub\s*Total)\s*[:\s]*[\$€£]?\s*([\d,]+\.?\d*)/i];
  const taxPatterns = [/(?:Tax|VAT|GST)\s*[:\s]*[\$€£]?\s*([\d,]+\.?\d*)/i];

  return {
    invoiceNumber: extractFirst(text, invoicePatterns),
    invoiceDate: parseDate(extractFirst(text, datePatterns)),
    supplierName: extractSupplier(text),
    subtotal: parseNumber(extractFirst(text, subtotalPatterns)),
    tax: parseNumber(extractFirst(text, taxPatterns)),
    totalAmount: parseNumber(extractFirst(text, totalPatterns)),
    currency: detectCurrency(text),
    products: extractProducts(text),
    rawText: tex;

exports.scanInvoice = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const processedBuffer = await preprocessImage(req.file.buffer);
    const { data: { text } } = await Tesseract.recognize(processedBuffer, 'eng');
    const extractedData = extractInvoiceData(text);
    res.json({
      success: true,
      message: 'Invoice scanned successfully',
      data: { ...extractedData, confidence: text.length > 100 ? 'high' : text.length > 50 ? 'medium' : 'low' }
    });
  } catch (error) {
    console.error('Invoice scan error:', error);
    res.status(500).json({ success: false, message: 'Failed to scan invoice', error: error.message });
  }
};

exports.saveInvoice = async (req, res) => {
  try {
    const { invoiceNumber, invoiceDate, supplierName, supplierId, products, subtotal, tax, totalAmount, currency, addToInventory } = req.body;
    let supplier = supplierId ? await Supplier.findById(supplierId) : null;
    if (!supplier && supplierName) {
      supplier = await Supplier.findOne({ name: { $regex: new RegExp(supplierName, 'i') } });
      if (!supplier) {
        supplier = await Supplier.create({ name: supplierName, createdBy: req.user._id });
      }
    }
    const invoice = await Invoice.create({
      invoiceNumber, invoiceDate, supplier: supplier?._id, supplierName: supplier?.name || supplierName,
      products, subtotal, tax, totalAmount, currency, createdBy: req.user._id, status: 'processed'
    });
    if (addToInventory && products?.length > 0) {
      for (const product of products) {
        let inventoryItem = await Inventory.findOne({ name: { $regex: new RegExp(product.name, 'i') }, createdBy: req.user._id });
        if (inventoryItem) {
          inventoryItem.quantity += product.quantity;
          inventoryItem.lastPurchasePrice = product.unitPrice;
          inventoryItem.supplier = supplier?._id;
          await inventoryItem.save();
        } else {
          await Inventory.create({
            name: product.name, quantity: product.quantity, purchasePrice: product.unitPrice,
            lastPurchasePrice: product.unitPrice, supplier: supplier?._id, createdBy: req.user._id,
            source: 'invoice_scan', invoiceRef: invoice._id
          });
        }
      }
    }
    res.status(201).json({ success: true, message: 'Invoice saved successfully', data: invoice });
  } catch (error) {
    console.error('Save invoice error:', error);
    res.status(500).json({ success: false, message: 'Failed to save invoice', error: error.message });
  }
};

exports.getInvoices = async (req, res) => {
  try {
    const { page = 1, limit = 10, supplier, startDate, endDate } = req.query;
    const query = { createdBy: req.user._id };
    if (supplier) query.supplier = supplier;
    if (startDate || endDate) {
      query.invoiceDate = {};
      if (startDate) query.invoiceDate.$gte = new Date(startDate);
      if (endDate) query.invoiceDate.$lte = new Date(endDate);
    }
    const invoices = await Invoice.find(query).populate('supplier', 'name email').sort({ createdAt: -1 }).limit(limit * 1).skip((page - 1) * limit);
    const total = await Invoice.countDocuments(query);
    res.json({ success: true, data: invoices, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch invoices', error: error.message });
  }
};

exports.getInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, createdBy: req.user._id }).populate('supplier', 'name email phone');
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch invoice', error: error.message });
  }
};

exports.deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, message: 'Invoice deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete invoice', error: error.message });
  }
};
