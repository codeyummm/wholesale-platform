const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const Invoice = require('../models/Invoice');
const Supplier = require('../models/Supplier');

const preprocessImage = async (buffer) => {
  return await sharp(buffer).grayscale().normalize().sharpen().toBuffer();
};

const extractInvoiceData = (text) => {
  const parseNumber = (str) => {
    if (!str) return null;
    return parseFloat(str.replace(/[,\s]/g, ''));
  };

  const detectCurrency = (text) => {
    if (text.includes('EUR')) return 'EUR';
    if (text.includes('GBP')) return 'GBP';
    if (text.includes('INR')) return 'INR';
    return 'USD';
  };

  const extractSupplier = (text) => {
    const lines = text.split('\n').filter(l => l.trim());
    for (const line of lines.slice(0, 5)) {
      const cleaned = line.trim();
      if (cleaned.length > 3) {
        return cleaned;
      }
    }
    return 'Unknown Supplier';
  };

  const totalMatch = text.match(/(?:Total|Amount Due)[:\s]*[\$]?\s*([\d,]+\.?\d*)/i);
  const subtotalMatch = text.match(/(?:Subtotal)[:\s]*[\$]?\s*([\d,]+\.?\d*)/i);
  const taxMatch = text.match(/(?:Tax|VAT)[:\s]*[\$]?\s*([\d,]+\.?\d*)/i);
  const invoiceMatch = text.match(/(?:Invoice|Inv)[\s#:]*([A-Z0-9\-]+)/i);
  const dateMatch = text.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);

  return {
    invoiceNumber: invoiceMatch ? invoiceMatch[1] : null,
    invoiceDate: dateMatch ? new Date(dateMatch[1]) : null,
    supplierName: extractSupplier(text),
    subtotal: subtotalMatch ? parseNumber(subtotalMatch[1]) : null,
    tax: taxMatch ? parseNumber(taxMatch[1]) : null,
    totalAmount: totalMatch ? parseNumber(totalMatch[1]) : 0,
    currency: detectCurrency(text),
    products: [],
    rawText: text
  };
};

exports.scanInvoice = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const processedBuffer = await preprocessImage(req.file.buffer);
    const result = await Tesseract.recognize(processedBuffer, 'eng');
    const text = result.data.text;
    const extractedData = extractInvoiceData(text);
    const confidence = text.length > 100 ? 'high' : text.length > 50 ? 'medium' : 'low';
    res.json({
      success: true,
      message: 'Invoice scanned successfully',
      data: { ...extractedData, confidence: confidence }
    });
  } catch (error) {
    console.error('Invoice scan error:', error);
    res.status(500).json({ success: false, message: 'Failed to scan invoice', error: error.message });
  }
};

exports.saveInvoice = async (req, res) => {
  try {
    const { invoiceNumber, invoiceDate, supplierName, supplierId, products, subtotal, tax, totalAmount, currency } = req.body;
    let supplier = null;
    if (supplierId) {
      supplier = await Supplier.findById(supplierId);
    }
    if (!supplier && supplierName) {
      supplier = await Supplier.findOne({ name: new RegExp(supplierName, 'i') });
      if (!supplier) {
        supplier = await Supplier.create({ name: supplierName, createdBy: req.user._id });
      }
    }
    const invoice = await Invoice.create({
      invoiceNumber: invoiceNumber,
      invoiceDate: invoiceDate,
      supplier: supplier ? supplier._id : null,
      supplierName: supplier ? supplier.name : supplierName,
      products: products,
      subtotal: subtotal,
      tax: tax,
      totalAmount: totalAmount,
      currency: currency,
      createdBy: req.user._id,
      status: 'processed'
    });
    res.status(201).json({ success: true, message: 'Invoice saved successfully', data: invoice });
  } catch (error) {
    console.error('Save invoice error:', error);
    res.status(500).json({ success: false, message: 'Failed to save invoice', error: error.message });
  }
};

exports.getInvoices = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const query = { createdBy: req.user._id };
    const invoices = await Invoice.find(query).populate('supplier', 'name email').sort({ createdAt: -1 }).limit(limit).skip((page - 1) * limit);
    const total = await Invoice.countDocuments(query);
    res.json({ success: true, data: invoices, pagination: { page: page, limit: limit, total: total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch invoices', error: error.message });
  }
};

exports.getInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, createdBy: req.user._id }).populate('supplier', 'name email');
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    res.json({ success: true, data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch invoice', error: error.message });
  }
};

exports.deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    res.json({ success: true, message: 'Invoice deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete invoice', error: error.message });
  }
};
