const axios = require('axios');

async function test() {
  try {
    const res = await axios.post('http://localhost:5000/api/agent/chat', {
      message: "show me its imeilab report",
      context: {},
      history: [
        { role: 'user', content: 'do we have any pixel 10 pro xl in stock' },
        { role: 'assistant', content: '✅ Found **1 match(es)** for "pixel 10 pro xl" — **1 units available**:\n• **GOOGLE PIXEL 10 PRO XL** (256, WHITE) — **1 available** — $610.00' }
      ]
    }, {
      headers: {
        // We might get 401 Not authorized if we don't have token, but wait, the API is protected.
        // Let's generate a quick token or just test the internal functions.
      }
    });
    console.log(res.data.text);
  } catch (err) {
    console.error(err.response?.data || err.message);
  }
}
test();
