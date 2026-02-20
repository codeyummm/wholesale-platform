const GeminiOCRService = require('../utils/geminiOCR');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyD1E_MIHvPxKe1PYPPhZFTq5p1sGyvQsRs';
const geminiService = new GeminiOCRService(GEMINI_API_KEY);

exports.scanLabel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image uploaded' });
    }

    console.log('Processing with Gemini Vision...');
    console.log('File:', req.file.originalname, 'Size:', req.file.size);

    const result = await geminiService.extractLabelData(req.file.buffer, req.file.mimetype);

    console.log('Gemini extraction successful:', result.data);

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
          zip: result.data.zip
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
