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
    if (text.includes('€') || /EUR/i.test(text)) return 'EUR';
    if (text.includes('£') || /GBP/i.test(text)) return 'GBP';
    if (text.includes('₹') || /INR/i.test(text)) return 'INR';
    return 'USD';
  };

  const extractSupplier = (text) => {
    const lines = text.split('\n').filter(l => l.trim().length > 2);
    for (const line of lines.slice(0, 8)) {
      const cleaned = line.trim();
      if (cleaned.length > 3 && 
          !/^(invoice|date|bill|ship|order|to:|from:|phone|fax|email|www\.|http)/i.test(cleaned) &&
          !/^\d+$/.cleaned) &&
          !/^[\d\-\(\)\s]+$/.test(cleaned)) {
        return cleaned;
      }
    }
    return 'Unknown Supplier';
  };

  // Extract invoice number - multiple patterns
  const invoicePatterns = [
    /Invoice\s*#[:\s]*(\d+)/i,
    /Invoice\s*Number[:\s]*([A-Z0-9\-]+)/i,
    /Invoice[:\s]*#?\s*([A-Z0-9\-]+)/i,
    /Inv\s*#[:\s]*([A-Z0-9\-]+)/i,
    /Order\s*#[:\s]*(\d+)/i,
    /Reference[:\s]*([A-Z0-9\-]+)/i,
  ];
  
  let invoiceNumber = null;
  for (const pattern of invoicePatterns) {
    const match = text.match(pattern);
    if (match) {
      invoiceNumber = match[1];
      break;
    }
  }

  // Extract date - multiple formats
  const datePatterns = [
    /Invoice\s*Date[:\s]*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
    /Date[:\s]*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
    /Date[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/,
    /([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})/,
  ];
  
  let invoiceDate = null;
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      const parsed = new Date(match[1]);
      if (!isNaN(parsed)) {
        invoiceDate = parsed;
        break;
      }
    }
  }

  // Extract totals
  const totalPatterns = [
    /(?:Grand\s*)?Total[:\s]*\$?\s*([\d,]+\.?\d*)/i,
    /Amount\s*Due[:\s]*\$?\s*([\d,]+\.?\d*)/i,
    /Balance\s*Due[:\s]*\$?\s*([\d,]+\.?\d*)/i,
    /Total\s*Amount[:\s]*\$?\s*([\d,]+\.?\d*)/i,
  ];
  
  let totalAmount = null;
  for (const pattern of totalPatterns) {
    const match = text.match(pattern);
    if (match) {
      totalAmount = parseNumber(match[1]);
      if (totalAmount) break;
    }
  }

  const subtotalMatch = text.match(/Sub\s*total[:\s]*\$?\s*([\d,]+\.?\d*)/i);
  const taxMatch = text.match(/(?:Tax|VAT|GST)[:\s]*\$?\s*([\d,]+\.?\d*)/i);

  // Extract products/line items
  const products = [];
  const lines = text.split('\n');
  
  // Pattern for line items: Item/Description followed by quantity, price, total
  const itemPatterns = [
    // Pattern: Description ... Qty ... Price ... Total
    /^(.+?)\s+(\d+)\s+\$?([\d,]+\.?\d{2})\s+\$?([\d,]+\.?\d{2})$/,
    // Pattern: Item Number Description Qty Price Total  
    /^([A-Z0-9\-]+)\s+(.+?)\s+(\d+)\s+\$?([\d,]+\.?\d{2})\s+\$?([\d,]+\.?\d{2})$/,
    // Pattern: Qty x Price format
    /^(.+?)\s+(\d+)\s*[xX]\s*\$?([\d,]+\.?\d{2})\s+\$?([\d,]+\.?\d{2})$/,
  ];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 5) continue;
    
    // Skip header/footer lines
    if (/^(item|description|qty|quantity|price|total|subtotal|tax|ship|bill|invoice|date|order)/i.test(trimmed)) continue;
    
    for (const pattern of itemPatterns) {
      const match = trimmed.match(pattern);
      if (match) {
        let name, qty, price, total;
        
        if (match.length === 5) {
          // First pattern or third pattern
          name = match[1].trim();
          qty = parseInt(match[2]);
          price = parseNumber(match[3]);
          total = parseNumber(match[4]);
        } else if (match.length === 6) {
          // Second pattern with item number
          name = match[2].trim();
          qty = parseInt(match[3]);
          price = parseNumber(match[4]);
          total = parseNumber(match[5]);
        }
        
        if (name && qty && price && name.length > 2) {
          products.push({
            name: name,
            quantity: qty,
            unitPrice: price,
            lineTotal: total || (qty * price)
          });
        }
        break;
      }
    }
  }

  // Try alternative extraction if no products found
  if (products.length === 0) {
    // Look for price patterns in text
    const priceLines = text.match(/^.+\$[\d,]+\.?\d{2}.*$/gm);
    if (priceLines) {
      for (const line of priceLines.slice(0, 10)) {
        const priceMatch = line.match(/(.+?)\s+\$?([\d,]+\.?\d{2})\s*$/);
        if (priceMatch) {
          const name = priceMatch[1].trim();
          const price = parseNumber(priceMatch[2]);
          if (name.length > 3 && price && !/total|subtotal|tax|shipping/i.test(name)) {
            products.push({
              name: name,
              quantity: 1,
              unitPrice: price,
              lineTotal: price
            });
          }
        }
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
      const result = await Tesseract.recognize(req.file.buffer, 'eng', {
        logger: m => console.log('OCR:', m.status, Math.round(m.progress * 100) + '%')
      });
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
