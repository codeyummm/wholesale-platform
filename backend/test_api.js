const axios = require('axios');
axios.post('http://localhost:5001/api/agent/chat', {
  message: "show me its imeilab report as well",
  context: {},
  history: [
    { role: 'user', content: 'do we have any pixel 10 pro xl in stock' },
    { role: 'assistant', content: '✅ Found **1 match(es)** for "pixel 10 pro xl" — **1 units available**:\n• **GOOGLE PIXEL 10 PRO XL** (256, WHITE) — **1 available** — $610.00' }
  ]
}).then(res => {
  console.log(res.data.text);
}).catch(err => console.error(err.response?.data || err.message));
