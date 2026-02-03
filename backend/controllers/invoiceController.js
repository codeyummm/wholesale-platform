const Tesseract = require('tesseract.js');
const Invoice = require('../models/Invoice');
const Supplier = require('../models/Supplier');

const extractInvoiceData = (text) => {
  console.log('=== RAW TEXT ===');
  console.log(text);
  console.log('=================');
  
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

  // Extract supplier (first line usually)
  const extractSupplier = (text) => {
    const lines = text.split('\n').filter(l => l.trim().length > 2);
    for (const line of lines.slice(0, 5)) {
      const cleaned = line.trim();
      if (cleaned.length > 3 && 
          /LLC|Inc|Corp|Ltd|Company/i.test(cleaned)) {
        return cleaned;
      }
    }
    return lines[0]?.trim() || 'Unknown Supplier';
  };

  // Extract order/invoice number
  let invoiceNumber = null;
  const invMatch = text.match(/Invoice\s*#[:\s]*(\d+)/i);
  const orderMatch = text.match(/Order\s*#[:\s]*(\d+)/i);
  invoiceNumber = invMatch ? invMatch[1] : (orderMatch ? orderMatch[1] : null);

  // Extract date - format: "Aug 22 2025" or similar
  let invoiceDate = null;
  const dateMatch = text.match(/([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})/);
  if (dateMatch) {
    const parsed = new Date(dateMatch[1]);
    if (!isNaN(parsed)) invoiceDate = parsed;
  }

  // Extract totals
  const subtotalMatch = text.match(/Subtotal[:\s]*\$?([\d,]+\.?\d*)/i);
  const taxMatch = text.match(/Tax[:\s]*\$?([\d,]+\.?\d*)/i);
  const totalMatch = text.match(/Total[:\s]*\$?([\d,]+\.?\d*)/i);
  
  let subtotal = subtotalMatch ? parseNumber(subtotalMatch[1]) : null;
  let tax = taxMatch ? parseNumber(taxMatch[1]) : null;
  let totalAmount = totalMatch ? parseNumber(totalMatch[1]) : null;

  // Extract products from the invoice
  const products = [];
  
  // Pattern for Mannapov-style invoices:
  // Item Number | Description (with /) | Qty | Price | Ext Price
  // Example: M35-3133 .1 Apple / iPhone 14 / A2649 / Blue / Unlocked / Unlocked / 128GB / Grade 5 10 $226.00 $2,260.00
  
  // First, try to find lines that contain iPhone/Samsung etc with prices
  const productPattern = /([A-Z0-9\-\.]+\s*\.?\d*)\s+(Apple|Samsung|Google|Motorola|LG)?\s*\/?\s*(iPhone|Galaxy|Pixel)?[^$]*?(\d+)\s+\$?([\d,]+\.?\d{2})\s+\$?([\d,]+\.?\d{2})/gi;
  
  let match;
  while ((match = productPattern.exec(text)) !== null) {
    const fullMatch = match[0];
    const itemCode = match[1]?.trim();
    const qty = parseInt(match[4]) || 1;
    const price = parseNumber(match[5]) || 0;
    const extPrice = parseNumber(match[6]) || 0;
    
    // Extract description between item code and qty
    const descMatch = fullMatch.match(/(?:Apple|Samsung|Google)?\s*\/?\s*(?:iPhone|Galaxy|Pixel)[^$]+/i);
    let description = descMatch ? descMatch[0].trim() : fullMatch;
    
    // Clean up description
    description = description.replace(/\d+\s+\$[\d,]+\.?\d*\s+\$[\d,]+\.?\d*$/, '').trim();
    
    if (price > 0) {
      products.push({
        name: description || `Item ${itemCode}`,
        quantity: qty,
        unitPrice: price,
        lineTotal: extPrice || (qty * price)
      });
    }
  }

  // If no products found with first pattern, try alternative
  if (products.length === 0) {
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Look for lines with dollar amounts
      const priceMatch = line.match(/(\d+)\s+\$?([\d,]+\.?\d{2})\s+\$?([\d,]+\.?\d{2})/);
      if (priceMatch) {
        const qty = parseInt(priceMatch[1]) || 1;
        const price = parseNumber(priceMatch[2]) || 0;
        const extPrice = parseNumber(priceMatch[3]) || 0;
        
        // Get description from before the numbers
        let desc = line.substring(0, line.indexOf(priceMatch[0])).trim();
        
        // Skip if it's a header or total line
        if (/subtotal|total|tax|freight|fees|ship qty|price|ext price/i.test(desc)) continue;
        
        // Check previous line for more description
        if (i > 0 && desc.length < 20) {
          const prevLine = lines[i-1].trim();
          if (prevLine && !/item number|description|qty|price/i.test(prevLine)) {
            desc = prevLine + ' ' + desc;
          }
        }
        
        if (desc.length > 3 && price > 0) {
          products.push({
            name: desc,
            quantity: qty,
            unitPrice: price,
            lineTotal: extPrice
          });
        }
      }
    }
  }

  // Alternative: Look for iPhone/Apple product lines specifically
  if (products.length === 0) {
    const iphonePattern = /Apple\s*\/\s*iPhone\s*\d+[^$]*?(\d+)\s+\$?([\d,]+\.?\d{2})\s+\$?([\d,]+\.?\d{2})/gi;
    while ((match = iphonePattern.exec(text)) !== null) {
      const fullLine = match[0];
      const qty = parseInt(match[1]) || 1;
      const price = parseNumber(match[2]) || 0;
      const extPrice = parseNumber(match[3]) || 0;
      
      let desc = fullLine.replace(/(\d+)\s+\$[\d,]+\.?\d{2}\s+\$[\d,]+\.?\d{2}$/, '').trim();
      
      if (price > 0) {
        products.push({
          name: desc,
          quantity: qty,
          unitPrice: price,
          lineTotal: extPrice
        });
      }
    }
  }

  console.log('Extracted:', { 
    invoiceNumber, 
    invoiceDate, 
    totalAmount, 
    subtotal,
    productsCount: products.length,
    products: products.map(p => ({ name: p.name.substring(0, 50), qty: p.quantity, price: p.unitPrice }))
  });

  return {
    invoiceNumber,
    invoiceDate,
    supplierName: extractSupplier(text),
    subtotal,
    tax,
    totalAmount: totalAmount || 0,
    currency: detectCurrency(text),
    products,
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
      text = await parsePDF(req.file.buffer);
    } else if (req.file.mimetype.startsWith('image/')) {
      const result = await Tesseract.recognize(req.file.buffer, 'eng');
      text = result.data.text;
    } else {
      return res.status(400).json({ success: false, message: 'Unsupported file format.' });
    }
    
    if (!text || text.trim().length < 10) {
      return res.status(400).json({ success: false, message: 'Could not extract text from file.' });
    }
    
    const extractedData = extractInvoiceData(text);
    const confidence = text.length > 500 ? 'high' : text.length > 100 ? 'medium' : 'low';
    
    res.json({
      success: true,
      message: 'Invoice scanned successfully',
      data: { ...extractedData, confidence }
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
        supplier = await Supplier.create({ 
          name: supplierName, 
          createdBy: req.user._id,
          contact: { phone: '', email: '' }
        });
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
