const { GoogleGenerativeAI } = require('@google/generative-ai');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

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
    
    // Clean up markdown code blocks if the AI ignored instructions
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
