const Tesseract = require('tesseract.js');
const sharp = require('sharp');

async function processInvoiceImage(imageBuffer) {
  try {
    // Optimize image for OCR
    const optimizedImage = await sharp(imageBuffer)
      .resize({ width: 1200 })
      .greyscale()
      .normalize()
      .toBuffer();

    // Perform OCR
    const { data: { text } } = await Tesseract.recognize(
      optimizedImage,
      'eng'
    );

    // Extract structured data
    const extracted = extractInvoiceData(text);
    
    return {
      success: true,
      rawText: text,
      extractedData: extracted
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

function extractInvoiceData(text) {
  const data = {
    items: [],
    invoiceNumber: null,
    date: null,
    supplier: null
  };

  // Extract invoice number
  const invoiceMatch = text.match(/(?:Invoice|INV)[:\s#-]*([A-Z0-9-]+)/i);
  if (invoiceMatch) data.invoiceNumber = invoiceMatch[1];

  // Extract date
  const dateMatch = text.match(/(?:Date|Dated)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
  if (dateMatch) data.date = dateMatch[1];

  // Extract phone models and prices
  const phonePatterns = [
    /iPhone\s+\d+\s*(?:Pro|Max|Plus)?/gi,
    /Samsung\s+Galaxy\s+[A-Z0-9\s]+/gi,
    /Google\s+Pixel\s+\d+\s*(?:Pro)?/gi
  ];

  const lines = text.split('\n');
  
  lines.forEach(line => {
    phonePatterns.forEach(pattern => {
      const matches = line.match(pattern);
      if (matches) {
        const model = matches[0].trim();
        
        // Look for price on same line
        const priceMatch = line.match(/\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/);
        const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '')) : 0;
        
        // Look for quantity
        const qtyMatch = line.match(/(?:qty|quantity|x)[\s:]*(\d+)/i);
        const quantity = qtyMatch ? parseInt(qtyMatch[1]) : 1;

        data.items.push({
          model: model,
          quantity: quantity,
          price: price
        });
      }
    });
  });

  // Extract IMEIs (15 digits)
  const imeiPattern = /\b(\d{15})\b/g;
  const imeis = [];
  let match;
  while ((match = imeiPattern.exec(text)) !== null) {
    imeis.push(match[1]);
  }

  // Distribute IMEIs to items
  if (imeis.length > 0 && data.items.length > 0) {
    let imeiIndex = 0;
    data.items.forEach(item => {
      item.imeis = imeis.slice(imeiIndex, imeiIndex + item.quantity);
      imeiIndex += item.quantity;
    });
  }

  return data;
}

module.exports = { processInvoiceImage };
