const FormData = require('form-data');
const fetch = require('node-fetch');

const OCR_SERVICE_URL = process.env.OCR_SERVICE_URL || 'http://localhost:8080';

exports.scanLabel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image uploaded' });
    }

    const formData = new FormData();
    formData.append('image', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });

    console.log(`Calling OCR service at: ${OCR_SERVICE_URL}/scan`);

    // Increase timeout to 60 seconds
    const ocrResponse = await fetch(`${OCR_SERVICE_URL}/scan`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders(),
      timeout: 60000 // 60 second timeout
    });

    if (!ocrResponse.ok) {
      throw new Error(`OCR service returned ${ocrResponse.status}`);
    }

    const ocrData = await ocrResponse.json();
    console.log('OCR result:', JSON.stringify(ocrData));

    if (ocrData.success) {
      return res.json({
        success: true,
        data: ocrData
      });
    } else {
      throw new Error('OCR service returned unsuccessful result');
    }

  } catch (error) {
    console.error('OCR error:', error.message);
    
    // Fallback to mock data if OCR fails
    const mockResult = {
      device: {
        imei: "123456789012345",
        model: "iPhone 14 Pro (OCR timeout)",
        storage: "256GB",
        color: "Space Black"
      },
      shipping: {
        tracking_number: "1Z999AA10123456784",
        carrier: "UPS"
      }
    };

    return res.json({
      success: true,
      data: mockResult,
      note: `OCR failed: ${error.message}`
    });
  }
};
