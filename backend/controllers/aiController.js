const { GoogleGenerativeAI } = require('@google/generative-ai');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const axios = require('axios');
const { uploadBuffer } = require('../utils/storage');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const stripHtml = (html) => {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
};

const getConversationContext = async (conversationId) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw new Error('Conversation not found');

  const messages = await Message.find({ conversationId })
    .sort({ createdAt: 1 }) // oldest to newest
    .limit(10); // get last 10 messages for context

  let contextString = `Conversation Subject: ${conversation.name || 'No Subject'}\n\n`;
  messages.forEach(msg => {
    const sender = msg.externalSender ? msg.externalSender.name || msg.externalSender.email : 'Staff';
    contextString += `[${sender}]: ${stripHtml(msg.content)}\n\n`;
  });

  return contextString;
};

exports.suggestReply = async (req, res) => {
  try {
    const { conversationId } = req.body;
    if (!conversationId) return res.status(400).json({ success: false, message: 'conversationId required' });
    if (!GEMINI_API_KEY) return res.status(500).json({ success: false, message: 'GEMINI_API_KEY not configured' });

    const contextString = await getConversationContext(conversationId);
    
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
You are an AI assistant helping a wholesale company's customer support agent reply to an email.
Read the following email conversation thread:

${contextString}

Generate exactly 3 short, professional, and helpful suggested responses that the agent could use to reply to the latest message.
Each suggestion should be a complete sentence or two, ready to be sent.
Do not include any placeholders like [Your Name].

Return the result STRICTLY as a JSON array of strings. Do not include markdown formatting or the word JSON.
Example format:
["Thank you for your inquiry, we will look into this.", "Yes, that item is currently in stock.", "Could you please provide your order number?"]
`;

    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    
    if (text.startsWith('```json')) {
      text = text.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (text.startsWith('```')) {
      text = text.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    const suggestions = JSON.parse(text);
    res.json({ success: true, data: suggestions });
  } catch (error) {
    console.error('AI suggestReply error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.autocompleteDraft = async (req, res) => {
  try {
    const { conversationId, currentDraft } = req.body;
    if (!conversationId) return res.status(400).json({ success: false, message: 'conversationId required' });
    if (!GEMINI_API_KEY) return res.status(500).json({ success: false, message: 'GEMINI_API_KEY not configured' });
    let contextString = '';
    if (conversationId && conversationId !== 'new') {
      contextString = await getConversationContext(conversationId);
    }
    
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
You are an AI assistant helping a wholesale company's customer support agent write an email reply.
Here is the email conversation thread for context:

${contextString}

The agent has started drafting a reply, but they want you to finish it for them.
Here is what they have typed so far:
"${currentDraft}"

Please seamlessly complete the draft. 
- Maintain the tone of what they have already written.
- Ensure the completion logically follows their text.
- Do NOT output the text they already wrote. ONLY output the continuation that should be appended to their text.
- Keep the completion concise, helpful, and professional.
`;

    const result = await model.generateContent(prompt);
    const completion = result.response.text().trim();

    res.json({ success: true, data: completion });
  } catch (error) {
    console.error('AI autocompleteDraft error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.rewriteDraft = async (req, res) => {
  try {
    const { currentDraft } = req.body;
    if (!currentDraft) return res.status(400).json({ success: false, message: 'currentDraft required' });
    if (!GEMINI_API_KEY) return res.status(500).json({ success: false, message: 'GEMINI_API_KEY not configured' });

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
You are an AI assistant helping a wholesale company's customer support agent refine an email draft.
The agent wants you to fix grammar, spelling, and phrasing to make it professional and clear.

Here is what they have typed:
"${currentDraft}"

Please provide a rewritten version of their draft. 
- Maintain their core message and meaning.
- Fix all grammatical and spelling errors.
- Ensure the tone is helpful and professional.
- Do NOT add any extra introductory or concluding remarks outside the rewritten text itself.
- ONLY output the rewritten text.
`;

    const result = await model.generateContent(prompt);
    const rewritten = result.response.text().trim();

    res.json({ success: true, data: rewritten });
  } catch (error) {
    console.error('AI rewriteDraft error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Original single-output SEO (preserved for backwards compatibility)
exports.generateListingSEO = async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!GEMINI_API_KEY) return res.status(500).json({ success: false, message: 'GEMINI_API_KEY not configured' });

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are an expert e-commerce SEO specialist. Optimize the provided product title and description for maximum visibility and ranking across eBay, Etsy, Amazon, Shopify, and Google Search.

Current Title: ${title || 'N/A'}
Current Description: ${description || 'N/A'}

Generate a highly SEO-optimized title (max 80 characters) and a detailed, persuasive description with bullet points, key features, and relevant keywords. Format description with basic HTML tags (p, b, br).

Return ONLY a JSON object with two keys "title" and "description". No markdown.
Example: {"title": "Optimized Title Here", "description": "<p>Optimized Description</p>"}`;

    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) text = text.substring(jsonStart, jsonEnd + 1);
    const suggestions = JSON.parse(text);
    res.json({ success: true, data: suggestions });
  } catch (error) {
    console.error('AI generateListingSEO error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// NEW: Platform-aware SEO - returns optimized content per platform
exports.generatePlatformSEO = async (req, res) => {
  try {
    const { title, description, brand, condition, category, barcode } = req.body;
    if (!GEMINI_API_KEY) return res.status(500).json({ success: false, message: 'GEMINI_API_KEY not configured' });

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are a world-class multi-platform e-commerce SEO specialist. Generate optimized listing content for each marketplace following their exact rules, character limits, and ranking algorithms. Maximize organic search on each platform AND Google/AI search.

PRODUCT:
Title: ${title || 'Unknown Product'}
Description: ${description || 'No description'}
Brand: ${brand || 'Unknown'}
Condition: ${condition || 'used'}
Category: ${category || 'General'}
GTIN/Barcode: ${barcode || 'Not provided'}

PLATFORM RULES:
- eBay: Max 80 chars. No promo language ("best", "sale", "free"). Include brand, model, key specs. Accurate only.
- Etsy: Max 140 chars. Comma-separated searchable terms. Describe materials, style, use-case. No all-caps. Handmade/vintage/supply feel.
- Shopify: No hard limit. Conversational brand-focused. Primary keyword at start. Google Shopping optimized.
- Amazon: Max 200 chars. Start with brand name. Key specs/size/color. No subjective claims. Spec-focused bullet points.
- TikTok: Max 255 chars. Trending/engaging language. Young audience. Exciting but accurate.

For descriptions, use HTML (p, b, ul, li). Include: primary keywords in opening, bullet points for features, benefits-focused language, natural keyword use (no stuffing).

Return ONLY valid JSON (no markdown, no extra text) in this exact structure:
{"master":{"title":"master title max 80 chars","description":"<p>HTML master description with features and keywords</p>","keywords":["kw1","kw2","kw3","kw4","kw5"]},"platforms":{"ebay":{"title":"ebay title max 80 chars","description":"<p>eBay HTML description</p>","compliance":["✅ Under 80 chars","✅ No promo language","✅ Accurate condition"]},"etsy":{"title":"etsy title max 140 chars","description":"<p>Etsy HTML description</p>","compliance":["✅ Under 140 chars","✅ Comma-separated terms","✅ Handmade language"]},"shopify":{"title":"shopify title","description":"<p>Shopify HTML description</p>","compliance":["✅ Google Shopping optimized","✅ Brand-focused"]},"amazon":{"title":"Brand ProductName - key spec","description":"<p>Amazon HTML description</p>","compliance":["✅ Starts with brand","✅ No subjective claims","✅ Spec-focused"]},"tiktok":{"title":"viral friendly title","description":"<p>TikTok HTML description</p>","compliance":["✅ Trending language","✅ Engaging format","✅ Accurate"]}}}`;

    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) text = text.substring(jsonStart, jsonEnd + 1);

    const suggestions = JSON.parse(text);
    res.json({ success: true, data: suggestions });
  } catch (error) {
    console.error('AI generatePlatformSEO error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.processNanoBanan = async (req, res) => {
  try {
    const { prompt, settings, images } = req.body;
    if (!images || !images.length) return res.status(400).json({ success: false, message: 'Images are required' });

    const processedImages = [];
    
    for (const imgUrl of images) {
      // 1. Fetch original image and convert to base64
      let base64Image = '';
      let mimeType = 'image/jpeg';
      try {
        const imageResponse = await axios.get(imgUrl, { responseType: 'arraybuffer' });
        base64Image = Buffer.from(imageResponse.data, 'binary').toString('base64');
        mimeType = imageResponse.headers['content-type'] || 'image/jpeg';
      } catch (err) {
        console.error('Error fetching image to process:', err);
        throw new Error('Failed to fetch original image for processing.');
      }

      // 2. Build the Nano Banana (Gemini) Prompt
      let instructionText = "Professionally edit this product photo of a smartphone.";
      
      if (settings?.background === 'white') {
        instructionText += " Remove the current background completely and replace it with a pure, solid #FFFFFF white background.";
      } else if (settings?.background === 'studio') {
        instructionText += " Remove the current background and replace it with a premium, soft grey studio gradient background.";
      } else if (settings?.background === 'remove') {
        instructionText += " Remove the background perfectly so the background is completely transparent.";
      }

      if (settings?.removeGlare) {
        instructionText += " Fix and remove any harsh screen glare or reflections on the glass.";
      }
      
      if (settings?.enhanceLighting) {
        instructionText += " Enhance the overall device lighting to look like a professional studio product shot.";
      }

      if (settings?.autoCenter) {
        instructionText += " Auto-center and crop the device so it fills the frame beautifully.";
      }

      if (prompt) {
        instructionText += ` Additional user instruction: ${prompt}`;
      }

      // 3. Call the Nano Banana interactions REST API
      const aiResponse = await axios.post(
        'https://generativelanguage.googleapis.com/v1beta/interactions',
        {
          model: 'gemini-3.1-flash-image',
          input: [
            { type: 'text', text: instructionText },
            { type: 'image', mime_type: mimeType, data: base64Image }
          ]
        },
        {
          headers: {
            'x-goog-api-key': GEMINI_API_KEY,
            'Content-Type': 'application/json'
          }
        }
      );

      // The REST API returns the generated image in candidates[0].content.parts[0].data
      // The REST API returns the generated image in candidates[0].content.parts[0].data or in steps
      let generatedImageData = null;

      if (aiResponse.data?.steps) {
        for (const step of aiResponse.data.steps) {
          if (step.type === 'model_output' && step.content) {
            const imageContent = step.content.find(c => c.type === 'image');
            if (imageContent && (imageContent.data || imageContent.base64_data)) {
              generatedImageData = imageContent.data || imageContent.base64_data;
              break;
            }
          }
        }
      }

      if (!generatedImageData && aiResponse.data?.candidates && aiResponse.data.candidates.length > 0) {
        const parts = aiResponse.data.candidates[0].content?.parts;
        if (parts && parts.length > 0) {
          // Find the first part that is an image
          const imagePart = parts.find(p => p.type === 'image' || p.data);
          if (imagePart) {
            generatedImageData = imagePart.data;
          }
        }
      }
      
      // Fallback for different API versions just in case
      if (!generatedImageData) {
        generatedImageData = aiResponse.data?.output_image?.data || aiResponse.data?.[0]?.output_image?.data;
      }
      
      if (!generatedImageData) {
         console.error('Nano Banana API Full Response:', JSON.stringify(aiResponse.data, null, 2));
         throw new Error('Nano Banana API did not return an image. It might have rejected the prompt.');
      }

      // 4. Upload result to DigitalOcean Spaces
      const buffer = Buffer.from(generatedImageData, 'base64');
      const uniqueName = `processed/nanobanan-${Date.now()}-${Math.round(Math.random() * 1E9)}.png`;
      const uploadedUrl = await uploadBuffer(buffer, uniqueName, 'image/png');
      
      processedImages.push(uploadedUrl);
    }

    res.json({ success: true, data: processedImages });
  } catch (error) {
    console.error('NanoBanan AI processing error:', error.response?.data || error);
    res.status(500).json({ success: false, message: error.response?.data?.error?.message || error.message });
  }
};
