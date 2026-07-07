const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function test() {
  try {
    const token = jwt.sign({ id: 'test_admin', role: 'admin' }, process.env.JWT_SECRET || 'secret');
    const res = await axios.post('http://localhost:5000/api/agent/chat', {
      message: 'show its imei lab results',
      context: { orderNumber: 'SL202606-0037', imeis: ['352999112345678'] }
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("RESPONSE:", res.data.text);
  } catch (err) {
    console.error(err.response ? err.response.data : err.message);
  }
}
test();
