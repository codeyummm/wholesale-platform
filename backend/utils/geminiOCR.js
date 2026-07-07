const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiOCRService {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
  }

  async extractLabelData(imageBuffer, mimeType) {
    const prompt = `You are analyzing a photo of a shipping package. Your job is to find the SHIPPING LABEL (the rectangular white paper sticker with carrier info, tracking number, barcodes, and recipient address) and extract ALL its data.

CRITICAL BOUNDING BOX RULE:
- "label_box" must be the tight rectangle of ONLY the main carrier shipping label (UPS/USPS/FedEx/DHL label)
- Do NOT include device stickers, IMEI stickers, grade stickers, bubble wrap, or hands in the bounding box
- The shipping label is typically larger, with bold text like "UPS GROUND", "USPS TRACKING #", carrier barcodes
- Coordinates are normalized: 0 = top/left edge, 1000 = bottom/right edge of the image
- Format: [ymin, xmin, ymax, xmax] — be PRECISE and TIGHT to the label edges

Return ONLY valid JSON (no markdown, no explanation):
{
  "tracking_number": "full tracking number without spaces",
  "carrier": "UPS or USPS or FedEx or DHL",
  "recipient_name": "full recipient name",
  "street_address": "street address line",
  "city": "city name",
  "state": "2-letter state code",
  "zip": "zip code",
  "imei": "15-digit IMEI number from device sticker (NOT from label)",
  "model": "device model from device sticker",
  "storage": "storage capacity",
  "color": "device color",
  "label_box": [ymin, xmin, ymax, xmax]
}`;

    try {
      const imagePart = {
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType: mimeType
        }
      };

      console.log('📸 Processing image:', mimeType, 'Size:', imageBuffer.length, 'bytes');

      const result = await this.model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();
      
      let cleanText = text.replace(/```json|```/g, "").trim();
      let data = JSON.parse(cleanText);
      
      if (Array.isArray(data)) {
        data = data[0] || {};
      }
      
      if (data.tracking_number) {
        data.tracking_number = data.tracking_number.replace(/\s+/g, '');
      }
      
      return {
        success: true,
        data: {
          tracking_number: data.tracking_number,
          carrier: data.carrier ? data.carrier.toLowerCase() : null,
          recipient: data.recipient_name,
          address: data.street_address,
          city: data.city,
          state: data.state,
          zip: data.zip,
          imei: data.imei,
          model: data.model,
          storage: data.storage,
          color: data.color,
          label_box: data.label_box
        }
      };
    } catch (error) {
      console.error('❌ Gemini OCR Error:', error.message);
      console.error('Full error:', error);
      throw error;
    }
  }

  /**
   * AI Edge Detection: Ask Gemini to identify the exact 4 corners of the shipping label.
   * Returns pixel coordinates for precise perspective warp.
   */
  async detectLabelCorners(imageBuffer, mimeType) {
    const prompt = `You are a precision document scanner AI. Look at this image and find the SHIPPING LABEL (the white rectangular sticker with tracking info, barcodes, and addresses).

IMPORTANT: Identify the exact 4 CORNER POINTS of just the shipping label paper. Ignore any device stickers, bubble wrap, hands, or box surfaces. Only the main shipping label.

Return the corners as pixel coordinates normalized to 0-1000 range (where 0,0 is top-left and 1000,1000 is bottom-right of the image).

Return ONLY valid JSON in this exact format:
{
  "corners": {
    "top_left": [x, y],
    "top_right": [x, y],
    "bottom_right": [x, y],
    "bottom_left": [x, y]
  },
  "confidence": 0.95
}

Be extremely precise. The corners should be exactly where the white label paper meets the background/box.`;

    try {
      const imagePart = {
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType: mimeType
        }
      };

      console.log('🔍 AI Edge Detection: Requesting label corner coordinates...');

      const result = await this.model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();
      
      let cleanText = text.replace(/```json|```/g, "").trim();
      let data = JSON.parse(cleanText);

      if (data.corners && data.corners.top_left && data.corners.top_right && 
          data.corners.bottom_right && data.corners.bottom_left) {
        console.log('✅ AI Edge Detection corners:', JSON.stringify(data.corners));
        console.log('   Confidence:', data.confidence);
        return { success: true, corners: data.corners, confidence: data.confidence || 0 };
      }

      return { success: false, error: 'AI did not return valid corners' };
    } catch (error) {
      console.error('❌ AI Edge Detection Error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async extractReceiptData(imageBuffer, mimeType) {
    const prompt = `You are an AI document scanner. You are analyzing a shipping carrier Drop-Off Receipt (e.g. from UPS, USPS, FedEx).
Your job is to read the receipt and extract EVERY tracking number listed on it.

Return ONLY valid JSON in this exact format (no markdown, no explanations):
{
  "tracking_numbers": ["1Z9...", "94001...", "EX123..."]
}

Make sure to strip any whitespace inside the tracking numbers. If no tracking numbers are found, return an empty array.`;

    try {
      const imagePart = {
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType: mimeType
        }
      };

      console.log('📄 AI Receipt Scanning: Requesting tracking numbers...');

      const result = await this.model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();
      
      let cleanText = text.replace(/```json|```/g, "").trim();
      let data = JSON.parse(cleanText);

      if (data.tracking_numbers && Array.isArray(data.tracking_numbers)) {
        console.log(`✅ AI found ${data.tracking_numbers.length} tracking numbers on receipt.`);
        return { success: true, tracking_numbers: data.tracking_numbers };
      }

      return { success: false, error: 'AI did not return a valid tracking_numbers array' };
    } catch (error) {
      console.error('❌ AI Receipt Scan Error:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = GeminiOCRService;
