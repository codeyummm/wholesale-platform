const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const user = await User.findOne();
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
  
  try {
    const res = await axios.post('http://localhost:5000/api/agent/chat', {
      message: `when was order SL202606-0037 shipped`
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("RESPONSE 1:", res.data.text);

    const res2 = await axios.post('http://localhost:5000/api/agent/chat', {
      message: `how much was order SL202606-0037`
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("RESPONSE 2:", res2.data.text);
  } catch (e) {
    console.error(e.response ? e.response.data : e.message);
  }
  process.exit(0);
}
test();
