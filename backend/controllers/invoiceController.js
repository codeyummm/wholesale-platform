const Tesseract = require('tesseract.js');
const Invoice = require('../models/Invoice');
const Supplier = require('../models/Supplier');
const Inventory = require('../models/Inventory');

const parseProductDescription = (description) => {
  const parts = description.split('/').map(p => p.trim()).filter(p => p);
  
  let brand = '';
  let model = '';
  let modelNumber = '';
  let color = '';
  let lockStatus = '';
  let storage = '';
  let grade = '';
  
  for (const part of parts) {
    const lower = part.toLowerCase();
    
    if (/^(apple|samsung|google|motorola|lg|oneplus|xiaomi|huawei|sony|nokia)$/i.test(part)) {
      brand = part;
    }
    else if (/iphone|galaxy|pixel|moto|redmi/i.test(part)) {
      model = part;
    }
    else if (/^[A-Z]{1,3}\d{3,4}[A-Z]?$/i.test(part) || /^SM-/i.test(part) || /^GG/i.test(part)) {
      modelNumber = part;
    }
    else if (/^\d+\s*(GB|TB)$/i.test(part)) {
      storage = part;
    }
    else if (/grade\s*\d/i.test(part)) {
      grade = part;
    }
    else if (/unlocked|locked|verizon|at&t|t-mobile|sprint/i.test(lower)) {
      if (!lockStatus) lockStatus = part;
    }
    else if (/^(black|white|blue|red|green|purple|pink|gold|silver|gray|grey|midnight|starlight|graphite|sierra|alpine|pacific|coral|yellow|orange|cream|lavender|mint|porcelain)$/i.test(part)) {
      color = part;
    }
  }
  
  return {
    brand: brand || 'Unknown',
    model: model || '',
    modelNumber: modelNumber || '',
    color: color || '',
    lockStatus: lockStatus || '',
    storage: storage || '',
    grade: grade || '',
    fullDescription: description
  };
};

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

  const extractSupplier = (text) => {
    const lines = text.split('\n').filter(l => l.trim().length > 2);
    for (const line of lines.slice(0, 5)) {
      const cleaned = line.trim();
      if (/LLC|Inc|Corp|Ltd|Company/i.test(cleaned)) {
        return cleaned;
      }
    }
    return lines[0]?.trim() || 'Unknown Supplier';
  };

  const extractPhone = (text) => {
    const phoneMatch = text.match(/Phone\s*#?\s*:?\s*([\d\-\(\)\s]+)/i);
    return phoneMatch ? phoneMatch[1].trim() : '';
  };

  let invoiceNumber = null;
  const invMatch = text.match(/Invoice\s*#[:\s]*(\d+)/i);
  const orderMatch = text.match(/Order\s*#[:\s]*(\d+)/i);
  invoiceNumber = invMatch ? invMatch[1] : (orderMatch ? orderMatch[1] : null);

  let invoiceDate = null;
  const dateMatch = text.match(/([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})/);
  if (dateMatch) {
    const parsed = new Date(dateMatch[1]);
    if (!isNaN(parsed)) invoiceDate = parsed;
  }

  const subtotalMatch = text.match(/Subtotal[:\s]*\$?([\d,]+\.?\d*)/i);
  const taxMatch = text.match(/Tax[:\s]*\$?([\d,]+\.?\d*)/i);
  const totalMatch = text.match(/Total[:\s]*\$?([\d,]+\.?\d*)/i);
  
  let subtotal = subtotalMatch ? parseNumber(subtotalMatch[1]) : null;
  let tax = taxMatch ? parseNumber(taxMatch[1]) : null;
  let totalAmount = totalMatch ? parseNumber(totalMatch[1]) : null;

  const products = [];
  const lines = text.split('\n');
  const priceLinePattern = /^(\d+)\$([\d,]+\.?\d{2})\$([\d,]+\.?\d{2})$/;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    const priceMatch = line.match(priceLinePattern);
    if (priceMatch) {
      const qty = parseInt(priceMatch[1]) || 1;
      const price = parseNumber(priceMatch[2]) || 0;
      const extPrice = parseNumber(priceMatch[3]) || 0;
      
      let description = '';
      let itemCode = '';
      
      for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
        const prevLine = lines[j].trim();
        
        if (!prevLine) continue;
        
        if (/^[A-Z]\d+[\-\d\.]+\s*\.?\d*$/i.test(prevLine)) {
          itemCode = prevLine;
          break;
        }
        
        if (prevLine.includes('/') || /Apple|iPhone|Samsung|Galaxy|Google|Pixel|Grade/i.test(prevLine)) {
          description = prevLine + ' ' + description;
        }
        
        if (priceLinePattern.test(prevLine) || /^(Item|Description|Ship Qty|Price)/i.test(prevLine)) {
          break;
        }
      }
      
      description = description.trim();
      
      if (description && price > 0) {
        const parsed = parseProductDescription(description);
        products.push({
          itemCode: itemCode,
          name: `${parsed.brand} ${parsed.model} ${parsed.storage} ${parsed.color}`.trim(),
          brand: parsed.brand,
          model: parsed.model,
          modelNumber: parsed.modelNumber,
          color: parsed.color,
          lockStatus: parsed.lockStatus,
          storage: parsed.storage,
          grade: parsed.grade,
          fullDescription: description,
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
    products: products.map(p => ({ brand: p.brand, model: p.model, qty: p.quantity, price: p.unitPrice }))
  });

  return {
    invoiceNumber,
    invoiceDate,
    supplierName: extractSupplier(text),
    supplierPhone: extractPhone(text),
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
    
    // Check if supplier exists
    const existingSupplier = await Supplier.findOne({ 
      name: new RegExp(extractedData.supplierName, 'i') 
    });
    
    res.json({
      success: true,
      message: 'Invoice scanned successfully',
      data: { 
        ...extractedData, 
        confidence,
        existingSupplier: existingSupplier ? {
          _id: existingSupplier._id,
          name: existingSupplier.name
        } : null,
        isNewSupplier: !existingSupplier
      }
    });
  } catch (error) {
    console.error('Invoice scan error:', error);
    res.status(500).json({ success: false, message: 'Failed to scan invoice', error: error.message });
  }
};

exports.saveInvoice = async (req, res) => {
  try {
    console.log('=== SAVE INVOICE ===');
    const { 
      invoiceNumber, 
      invoiceDate, 
      supplierName, 
      supplierId, 
      supplierPhone,
      products, 
      subtotal, 
      tax, 
      totalAmount, 
      currency, 
      addToInventory
    } = req.body;
    
    console.log('Save request:', { invoiceNumber, supplierName, supplierId, productsCount: products?.length, addToInventory });
    
    let supplier = null;
    
    // Find existing supplier by ID
    if (supplierId) {
      supplier = await Supplier.findById(supplierId);
      console.log('Found supplier by ID:', supplier?.name);
    }
    
    // Find or create supplier by name
    if (!supplier && supplierName) {
      supplier = await Supplier.findOne({ name: new RegExp(`^${supplierName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
      console.log('Found supplier by name:', supplier?.name);
      
      if (!supplier) {
        console.log('Creating new supplier:', supplierName);
        supplier = await Supplier.create({ 
          name: supplierName,
          contact: { 
            phone: supplierPhone || ''
          }
        });
        console.log('New supplier created:', supplier._id);
      }
    }
    
    // Create invoice record
    const invoice = await Invoice.create({
      invoiceNumber: invoiceNumber || 'N/A',
      invoiceDate: invoiceDate || new Date(),
      supplier: supplier ? supplier._id : null,
      supplierName: supplier ? supplier.name : supplierName,
      products: products || [],
      subtotal: subtotal || 0,
      tax: tax || 0,
      totalAmount: totalAmount || 0,
      currency: currency || 'USD',
      createdBy: req.user._id,
      status: 'processed'
    });
    console.log('Invoice created:', invoice._id);
    
    // Add invoice to supplier's invoices array
    if (supplier && invoiceNumber) {
      try {
        const supplierInvoiceData = {
          invoiceNumber: invoiceNumber || 'N/A',
          invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
          totalAmount: totalAmount || 0,
          items: (products || []).map(p => ({
            model: p.model || p.name || 'Unknown',
            brand: p.brand || 'Unknown',
            quantity: p.quantity || 1,
            unitPrice: p.unitPrice || 0
          })),
          createdAt: new Date()
        };
        
        await Supplier.findByIdAndUpdate(supplier._id, {
          $push: { invoices: supplierInvoiceData }
        });
        console.log('Invoice added to supplier record');
      } catch (supplierErr) {
        console.error('Error adding invoice to supplier:', supplierErr.message);
      }
    }
    
    // Add products to inventory
    if (addToInventory && products && products.length > 0) {
      console.log('Adding', products.length, 'products to inventory...');
      
      for (const product of products) {
        try {
          const modelName = `${product.brand || ''} ${product.model || ''}`.trim() || product.name || 'Unknown';
          const brandName = product.brand || 'Unknown';
          const storage = product.storage || '';
          const color = product.color || '';
          const costPrice = product.unitPrice || 0;
          const retailPrice = Math.round(costPrice * 1.2);
          
          console.log('Processing inventory item:', { modelName, brandName, qty: product.quantity });
          
          // Check if product exists in inventory
          const existingItem = await Inventory.findOne({
            model: modelName,
            brand: brandName,
            'specifications.storage': storage,
            'specifications.color': color
          });
          
          if (existingItem) {
            // Update existing inventory
            existingItem.quantity += product.quantity || 1;
            existingItem.price.cost = costPrice;
            existingItem.price.retail = retailPrice;
            await existingItem.save();
            console.log('Updated inventory item:', existingItem._id, 'New qty:', existingItem.quantity);
          } else {
            // Create new inventory item
            const newInventoryItem = new Inventory({
              model: modelName,
              brand: brandName,
              quantity: product.quantity || 1,
              price: {
                cost: costPrice,
                retail: retailPrice
              },
              specifications: {
                storage: storage,
                color: color
              }
            });
            
            await newInventoryItem.save();
            console.log('Created new inventory item:', newInventoryItem._id);
          }
        } catch (invError) {
          console.error('Inventory error for product:', product.name, invError.message);
        }
      }
      console.log('Finished adding products to inventory');
    }
    
    res.status(201).json({ 
      success: true, 
      message: 'Invoice saved successfully', 
      data: {
        invoice,
        supplier: supplier ? { _id: supplier._id, name: supplier.name } : null
      }
    });
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
