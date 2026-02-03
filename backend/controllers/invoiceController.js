const Tesseract = require('tesseract.js');
const Invoice = require('../models/Invoice');
const Supplier = require('../models/Supplier');

const extractInvoiceData = (text) => {
  console.log('Raw text to parse:', text.substring(0, 500));
  
  const parseNumber = (str) => {
    if (!str) return null;
    const cleaned = str.replace(/[,\s\$]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  };

  const detectCurrency = (text) => {
    if (text.includes('EUR')) return 'EUR';
    if (text.includes('GBP')) return 'GBP';
    if (text.includes('INR')) return 'INR';
    return 'USD';
  };

  const extractSupplier = (text) => {
    const lines = text.split('\n').filter(l => l.trim().length > 2);
    for (const line of lines.slice(0, 8)) {
      const cleaned = line.trim();
      const isHeader = /^(invoice|date|bill|ship|order|to:|from:|phone|fax|email|www\.|http)/i.test(cleaned);
      const isNumber = /^\d+$/.test(cleaned);
      const isPhone = /^[\d\-\(\)\s]+$/.test(cleaned);
      if (cleaned.length > 3 && !isHeader && !isNumber && !isPhone) {
        return cleaned;
      }
    }
    return 'Unknown Supplier';
  };

  let invoiceNumber = null;
  const invMatch = text.match(/Invoice\s*#[:\s]*(\d+)/i) || 
                   text.match(/Invoice\s*Number[:\s]*([A-Z0-9\-]+)/i) ||
                   text.match(/Order\s*#[:\s]*(\d+)/i);
  if (invMatch) invoiceNumber = invMatch[1];

  let invoiceDate = null;
  const dateMatch = text.match(/([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})/) ||
                    text.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
  if (dateMatch) {
    const parsed = new Date(dateMatch[1]);
    if (!isNaN(parsed)) invoiceDate = parsed;
  }

  let totalAmount = null;
  const totalMatch = text.match(/(?:Grand\s*)?Total[:\s]*\$?\s*([\d,]+\.?\d*)/i) ||
                     text.match(/Amount\s*Due[:\s]*\$?\s*([\d,]+\.?\d*)/i);
  if (totalMatch) totalAmount = parseNumber(totalMatch[1]);

  const subtotalMatch = text.match(/Sub\s*total[:\s]*\$?\s*([\d,]+\.?\d*)/i);
  const taxMatch = text.match(/(?:Tax|VAT|GST)[:\s]*\$?\s*([\d,]+\.?\d*)/i);

  const products = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 5) continue;
    if (/^(item|description|qty|quantity|price|total|subtotal|tax|ship|bill|invoice|date|order)/i.test(trimmed)) continue;
    
    const match = trimmed.match(/^(.+?)\s+(\d+)\s+\$?([\d,]+\.?\d{2})\s+\$?([\d,]+\.?\d{2})$/);
    if (match) {
      const name = match[1].trim();
      const qty = parseInt(match[2]);
      const price = parseNumber(match[3]);
      const total = parseNumber(match[4]);
      
      if (name && qty && price && name.length > 2) {
        products.push({
          name: name,
          quantity: qty,
          unitPrice: price,
          lineTotal: total || (qty * price)
        });
      }
    }
  }

  console.log('Extracted:', { invoiceNumber, invoiceDate, totalAmount, productsCount: products.length });

  return {
    invoiceNumber: invoiceNumber,
    invoiceDate: invoiceDate,
    supplierName: extractSupplier(text),
    subtotal: subtotalMatch ? parseNumber(subtotalMatch[1]) : null,
    tax: taxMatch ? parseNumber(taxMatch[1]) : null,
    totalAmount: totalAmount || 0,
    currency: detectCurrency(text),
    products: products,
    rawText: text
  };
};

const parsePDF = async (buffer) => {
  const pdfParse = require('pdf-parse');
  const data = await pdfParse(buffer);
  return data.text;
};

exports.scanInvoice = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    
    console.log('File received:', req.file.mimetype, req.file.size, 'bytes');
    
    let text = '';
    
    if (req.file.mimetype === 'application/pdf') {
      console.log('Processing PDF...');
      text = await parsePDF(req.file.buffer);
      console.log('PDF text extracted, length:', text.length);
    } 
    else if (req.file.mimetype.startsWith('image/')) {
      console.log('Processing image with OCR...');
      const result = await Tesseract.recognize(req.file.buffer, 'eng');
      text = result.data.text;
      console.log('OCR completed, text length:', text.length);
    } 
    else {
      return res.status(400).json({ success: false, message: 'Unsupported file format. Use PDF, JPEG, or PNG.' });
    }
    
    if (!text || text.trim().length < 10) {
      return res.status(400).json({ success: false, message: 'Could not extract text from file.' });
    }
    
    const extractedData = extractInvoiceData(text);
    const confidence = text.length > 500 ? 'high' : text.length > 100 ? 'medium' : 'low';
    
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
      invoiceNumber,
      invoiceDate,
      supplier: supplier ? supplier._id : null,
      supplierName: supplier ? supplier.name : supplierName,
      products,
      subtotal,
      tax,
      totalAmount,
      currency,
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
    res.json({ success: true, data: invoices, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
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
// updated
