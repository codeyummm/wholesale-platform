const mongoose = require('mongoose');
const { chatWithNova } = require('./controllers/agentController');
require('dotenv').config();

async function test() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/wholesale');
  
  // Mock req and res
  const req = {
    body: {
      message: "show me its imeilab report",
      context: {},
      history: [
        { role: 'user', content: 'do we have any pixel 10 pro xl in stock' },
        { role: 'assistant', content: '✅ Found **1 match(es)** for "pixel 10 pro xl" — **1 units available**:\n• **GOOGLE PIXEL 10 PRO XL** (256, WHITE) — **1 available** — $610.00' }
      ]
    }
  };
  
  const res = {
    status: function(code) { return this; },
    json: function(data) { console.log(data.text || data); process.exit(0); }
  };
  
  await chatWithNova(req, res);
}
test();
