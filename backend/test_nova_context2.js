const axios = require('axios');
const mongoose = require('mongoose');
const User = require('./models/User');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  const user = await User.findOne({ role: 'admin' });
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });
  
  try {
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
  process.exit(0);
}
test();
