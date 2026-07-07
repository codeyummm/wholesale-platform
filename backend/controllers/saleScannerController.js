const GeminiOCRService = require('../utils/geminiOCR');
const fs = require('fs');
const path = require('path');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyD1E_MIHvPxKe1PYPPhZFTq5p1sGyvQsRs';
const geminiService = new GeminiOCRService(GEMINI_API_KEY);

exports.scanLabel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image uploaded' });
    }

    console.log('Processing with Gemini Vision...');
    console.log('File:', req.file.originalname, 'Size:', req.file.size);

    let processBuffer = req.file.buffer;
    let ext = req.file.mimetype.split('/')[1] || 'jpg';
    let mimeType = req.file.mimetype;
    const isHeic = ext === 'heic' || ext === 'heif' || (req.file.originalname && req.file.originalname.toLowerCase().endsWith('.heic'));

    if (isHeic) {
      console.log('🔄 Converting HEIC to JPEG on backend...');
      try {
        const heicConvert = require('heic-convert');
        processBuffer = await heicConvert({ buffer: req.file.buffer, format: 'JPEG', quality: 0.8 });
        ext = 'jpg';
        mimeType = 'image/jpeg';
        console.log('✅ HEIC converted via heic-convert');
      } catch (err) {
        console.error('❌ heic-convert failed:', err.message);
        try {
          const { execSync } = require('child_process');
          const os = require('os');
          const tmpFile = path.join(os.tmpdir(), `temp_${Date.now()}.heic`);
          const tmpOut = path.join(os.tmpdir(), `temp_${Date.now()}.jpg`);
          fs.writeFileSync(tmpFile, req.file.buffer);
          execSync(`sips -s format jpeg "${tmpFile}" --out "${tmpOut}"`, { stdio: 'ignore' });
          processBuffer = fs.readFileSync(tmpOut);
          ext = 'jpg';
          mimeType = 'image/jpeg';
          fs.unlinkSync(tmpFile);
          fs.unlinkSync(tmpOut);
          console.log('✅ HEIC converted via native macOS sips');
        } catch (sipsErr) {
          console.error('❌ native sips conversion also failed');
        }
      }
    }

    // Standardize orientation physically to match what OpenCV expects (stripping EXIF)
    try {
      const sharp = require('sharp');
      processBuffer = await sharp(processBuffer).rotate().toBuffer();
    } catch (e) {
      console.error('Failed to auto-rotate processBuffer:', e);
    }

    // Now process the standardized image with Gemini
    const result = await geminiService.extractLabelData(processBuffer, mimeType);
    console.log('Gemini extraction successful:', result.data);

    // Save image to disk
    const uploadsDir = path.join(__dirname, '../uploads/labels');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Save full original image
    const fullFilename = `full_${Date.now()}_${Math.round(Math.random()*1000)}.${ext}`;
    const fullPath = path.join(uploadsDir, fullFilename);
    fs.writeFileSync(fullPath, processBuffer);
    const fullImageUrl = `/uploads/labels/${fullFilename}`;
    
    // Prepare Gemini OCR bounding box for label extraction
    let geminiBoxStr = "";
    if (result.data.label_box && Array.isArray(result.data.label_box) && result.data.label_box.length === 4) {
      geminiBoxStr = result.data.label_box.join(',');
      console.log('📐 Using OCR bounding box for label extraction:', geminiBoxStr);
    }

    // Extract, enhance, and straighten label using Python + OpenCV
    let labelFilename = `label_${Date.now()}_${Math.round(Math.random()*1000)}.jpg`;
    let labelPath = path.join(uploadsDir, labelFilename);
    let cropSuccess = false;

    try {
      const { execFileSync } = require('child_process');
      const scriptPath = path.join(__dirname, '../scripts/straighten.py');

      console.log('🔍 Extracting & enhancing label...');
      let pythonOutput = '';
      try {
        pythonOutput = execFileSync('python3', [scriptPath, fullPath, labelPath, geminiBoxStr], {
          encoding: 'utf-8',
          stdio: ['ignore', 'pipe', 'pipe']
        });
      } catch (pyErr) {
        pythonOutput = pyErr.stdout || '';
        console.error('Script stderr:', pyErr.stderr || '');
      }

      const pyResult = JSON.parse(pythonOutput.trim());
      if (pyResult.success) {
        console.log(`✅ Label extracted via: ${pyResult.method}`);
        cropSuccess = true;
      } else {
        console.error('❌ Extraction failed:', pyResult.error);
      }
    } catch (err) {
      console.error('❌ Script error:', err.message);
    }

    // Fallback to full image if extraction completely failed
    if (!cropSuccess) {
      fs.writeFileSync(labelPath, processBuffer);
    }
    const labelImageUrl = `/uploads/labels/${labelFilename}`;

    // Format response to match frontend expectations
    const formattedResponse = {
      success: true,
      data: {
        device: {
          imei: result.data.imei,
          model: result.data.model,
          storage: result.data.storage,
          color: result.data.color
        },
        shipping: {
          tracking_number: result.data.tracking_number,
          carrier: result.data.carrier ? result.data.carrier.toLowerCase() : null,
          recipient_name: result.data.recipient,
          street_address: result.data.address,
          city: result.data.city,
          state: result.data.state,
          zip: result.data.zip,
          labelImage: labelImageUrl,
          scannedLabel: labelImageUrl,
          fullImage: fullImageUrl
        }
      }
    };

    console.log('Formatted response:', formattedResponse);
    res.json(formattedResponse);
  } catch (error) {
    console.error('Scan error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to scan label' });
  }
};

exports.scanReceipt = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No receipt image uploaded' });
    }

    console.log('Processing receipt with Gemini...');
    let processBuffer = req.file.buffer;
    let ext = req.file.mimetype.split('/')[1] || 'jpg';
    let mimeType = req.file.mimetype;
    const isHeic = ext === 'heic' || ext === 'heif' || (req.file.originalname && req.file.originalname.toLowerCase().endsWith('.heic'));

    if (isHeic) {
      console.log('🔄 Converting HEIC to JPEG on backend for receipt...');
      try {
        const heicConvert = require('heic-convert');
        processBuffer = await heicConvert({ buffer: req.file.buffer, format: 'JPEG', quality: 0.8 });
        ext = 'jpg';
        mimeType = 'image/jpeg';
        console.log('✅ HEIC converted via heic-convert');
      } catch (err) {
        console.error('❌ heic-convert failed:', err.message);
        try {
          const { execSync } = require('child_process');
          const os = require('os');
          const tmpFile = path.join(os.tmpdir(), `temp_receipt_${Date.now()}.heic`);
          const tmpOut = path.join(os.tmpdir(), `temp_receipt_${Date.now()}.jpg`);
          fs.writeFileSync(tmpFile, req.file.buffer);
          execSync(`sips -s format jpeg "${tmpFile}" --out "${tmpOut}"`, { stdio: 'ignore' });
          processBuffer = fs.readFileSync(tmpOut);
          ext = 'jpg';
          mimeType = 'image/jpeg';
          fs.unlinkSync(tmpFile);
          fs.unlinkSync(tmpOut);
          console.log('✅ HEIC converted via native macOS sips');
        } catch (sipsErr) {
          console.error('❌ native sips conversion also failed');
        }
      }
    }

    console.log('Processing receipt with local Tesseract OCR...');
    const Tesseract = require('tesseract.js');
    const ocrResult = await Tesseract.recognize(processBuffer, 'eng');
    const text = ocrResult.data.text;
    
    // Fetch all active tracking numbers from the database to fuzzy match against
    const Sale = require('../models/Sale');
    const recentSales = await Sale.find({ 'shipping.trackingNumber': { $exists: true, $ne: null, $ne: '' } }).select('shipping.trackingNumber');
    const activeTrackings = recentSales.map(s => s.shipping.trackingNumber.toUpperCase());

    // Levenshtein distance function for fuzzy matching
    const lev = (a, b) => {
        if(a.length === 0) return b.length;
        if(b.length === 0) return a.length;
        let matrix = [];
        for(let i=0; i<=b.length; i++) matrix[i] = [i];
        for(let j=0; j<=a.length; j++) matrix[0][j] = j;
        for(let i=1; i<=b.length; i++){
            for(let j=1; j<=a.length; j++){
                if(b.charAt(i-1) === a.charAt(j-1)) matrix[i][j] = matrix[i-1][j-1];
                else matrix[i][j] = Math.min(matrix[i-1][j-1]+1, Math.min(matrix[i][j-1]+1, matrix[i-1][j]+1));
            }
        }
        return matrix[b.length][a.length];
    };

    let trackingNumbers = [];
    
    // Split the OCR text into isolated tokens
    const tokens = text.split(/\s+/);
    
    // Compare every token against every active tracking number in the database
    tokens.forEach(token => {
       const cleanToken = token.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
       
       // Skip tokens that are too short to be tracking numbers (optimizes performance)
       if (cleanToken.length < 10) return;
       
       let bestMatch = null;
       let bestDist = Infinity;
       
       activeTrackings.forEach(dbTrack => {
          // If lengths are wildly different, skip Levenshtein (optimizes performance)
          if (Math.abs(cleanToken.length - dbTrack.length) > 4) return;
          
          const d = lev(cleanToken, dbTrack);
          if (d < bestDist) { 
             bestDist = d; 
             bestMatch = dbTrack; 
          }
       });
       
       // If the token is within 3 typos/edits of an actual tracking number, it's a match!
       if (bestMatch && bestDist <= 3) {
          trackingNumbers.push(bestMatch);
       }
    });

    trackingNumbers = [...new Set(trackingNumbers)];
    
    if (trackingNumbers.length === 0) {
      return res.status(400).json({ success: false, message: 'Could not extract any matching tracking numbers from the receipt.' });
    }
    console.log('Extracted Tracking Numbers:', trackingNumbers);

    // Save image to disk
    const uploadsDir = path.join(__dirname, '../uploads/receipts');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const receiptFilename = `receipt_${Date.now()}_${Math.round(Math.random()*1000)}.${ext}`;
    const receiptPath = path.join(uploadsDir, receiptFilename);
    fs.writeFileSync(receiptPath, processBuffer);
    const receiptUrl = `/uploads/receipts/${receiptFilename}`;

    // Bulk Update Sales Database
    const updateResult = await Sale.updateMany(
      { 'shipping.trackingNumber': { $in: trackingNumbers } },
      { 
        $set: { 
          'shipping.dropoffReceipt': receiptUrl,
          deliveryStatus: 'in_transit'
        }
      }
    );

    // Find which tracking numbers were successfully matched
    const matchedSales = await Sale.find({ 'shipping.trackingNumber': { $in: trackingNumbers } }, 'shipping.trackingNumber saleNumber');
    const matchedTrackingNumbers = matchedSales.map(s => s.shipping.trackingNumber);
    const unmatchedTrackingNumbers = trackingNumbers.filter(t => !matchedTrackingNumbers.includes(t));

    res.json({
      success: true,
      data: {
        receiptUrl,
        totalExtracted: trackingNumbers.length,
        totalUpdated: updateResult.modifiedCount,
        matchedSales,
        unmatchedTrackingNumbers
      }
    });

  } catch (error) {
    console.error('Receipt Scan error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to process receipt' });
  }
};

exports.uploadDirectReceipt = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No receipt image uploaded' });
    }

    const { id } = req.params;
    const Sale = require('../models/Sale');
    const sale = await Sale.findById(id);
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }

    let processBuffer = req.file.buffer;
    let ext = req.file.mimetype.split('/')[1] || 'jpg';
    const isHeic = ext === 'heic' || ext === 'heif' || (req.file.originalname && req.file.originalname.toLowerCase().endsWith('.heic'));

    if (isHeic) {
      console.log('🔄 Converting HEIC to JPEG on backend for direct receipt...');
      try {
        const heicConvert = require('heic-convert');
        processBuffer = await heicConvert({ buffer: req.file.buffer, format: 'JPEG', quality: 0.8 });
        ext = 'jpg';
      } catch (err) {
        try {
          const { execSync } = require('child_process');
          const os = require('os');
          const tmpFile = path.join(os.tmpdir(), `temp_receipt_dir_${Date.now()}.heic`);
          const tmpOut = path.join(os.tmpdir(), `temp_receipt_dir_${Date.now()}.jpg`);
          const fs = require('fs');
          fs.writeFileSync(tmpFile, req.file.buffer);
          execSync(`sips -s format jpeg "${tmpFile}" --out "${tmpOut}"`, { stdio: 'ignore' });
          processBuffer = fs.readFileSync(tmpOut);
          ext = 'jpg';
          fs.unlinkSync(tmpFile);
          fs.unlinkSync(tmpOut);
        } catch (sipsErr) {
          console.error('❌ native sips conversion also failed');
        }
      }
    }

    const fs = require('fs');
    const path = require('path');
    const uploadsDir = path.join(__dirname, '../uploads/receipts');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const receiptFilename = `receipt_${Date.now()}_${Math.round(Math.random()*1000)}.${ext}`;
    const receiptPath = path.join(uploadsDir, receiptFilename);
    fs.writeFileSync(receiptPath, processBuffer);
    const receiptUrl = `/uploads/receipts/${receiptFilename}`;

    sale.shipping = sale.shipping || {};
    sale.shipping.dropoffReceipt = receiptUrl;
    sale.deliveryStatus = 'in_transit';
    await sale.save();

    res.json({ success: true, receiptUrl });
  } catch (error) {
    console.error('Direct receipt upload error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to upload receipt' });
  }
};
