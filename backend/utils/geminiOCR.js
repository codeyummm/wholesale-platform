const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiOCRService {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  }

  async extractLabelData(imageBuffer, mimeType) {
    const prompt = `Extract ALL information from this shipping label.

Return ONLY valid JSON:
{
  "tracking_number": "tracking without spaces",
  "carrier": "UPS/USPS/FedEx/DHL",
  "recipient_name": "full name",
  "street_address": "street address",
  "city": "city",
  "state": "2-letter state",
  "zip": "zip code",
  "imei": "15-digit IMEI",
  "model": "device model",
  "storage": "storage",
  "color": "color"
}`;

    try {
      const imagePart = {
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType: mimeType
        }
      };

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
          carrier: data.carrier,
          recipient: data.recipient_name,
          address: data.street_address,
          city: data.city,
          state: data.state,
          zip: data.zip,
          imei: data.imei,
          model: data.model,
          storage: data.storage,
          color: data.color
        }
      };
    } catch (error) {
      console.error('Gemini OCR Error:', error);
      throw error;
    }
  }
}

module.exports = GeminiOCRService;
