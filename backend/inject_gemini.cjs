const fs = require('fs');

// 1. Inject into aiController.js
let aiController = fs.readFileSync('backend/controllers/aiController.js', 'utf8');

const newFunction = `
exports.extractItemSpecifics = async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title is required' });
    if (!GEMINI_API_KEY) return res.status(500).json({ success: false, message: 'Gemini API Key missing' });

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    // Use gemini-1.5-flash for fast text tasks
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = \`
You are an expert mobile phone and electronics cataloger.
Extract standard specifications from the following product title: "\${title}"
Infer missing details if the exact model is well-known (e.g. knowing a Google Pixel 9 Pro XL runs Android, or has a specific screen size if standard). 
Only return the JSON object, NO markdown formatting, NO backticks.

Strictly adhere to this JSON format and use these exact keys if you can find or infer the data. Omit the key entirely if you cannot reasonably infer it.
{
  "Brand": "string",
  "Model": "string",
  "Storage Capacity": "string",
  "Color": "string",
  "UPC": "string",
  "Network": "string",
  "Screen Size": "string",
  "RAM": "string",
  "Processor": "string",
  "Operating System": "string"
}\`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const responseText = result.response.text();
    let specs = {};
    try {
       specs = JSON.parse(responseText);
    } catch(e) {
       console.error("Gemini JSON parse error:", e);
    }

    res.json({ success: true, itemSpecifics: specs });
  } catch (error) {
    console.error('Gemini Spec Extraction Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to extract specs via AI' });
  }
};
`;

aiController += newFunction;
fs.writeFileSync('backend/controllers/aiController.js', aiController);
console.log('Injected aiController.js');

// 2. Inject into ai.js
let aiRoute = fs.readFileSync('backend/routes/ai.js', 'utf8');

// The route file looks like:
// const { suggestReply, autocompleteDraft, rewriteDraft, generateListingSEO, generatePlatformSEO } = require('../controllers/aiController');
// We can just append the route at the end before module.exports

const newRoute = `
router.post('/extract-specs', protect, require('../controllers/aiController').extractItemSpecifics);

module.exports = router;`;

aiRoute = aiRoute.replace('module.exports = router;', newRoute);
fs.writeFileSync('backend/routes/ai.js', aiRoute);
console.log('Injected ai.js');

