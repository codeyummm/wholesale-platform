const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Sale = require('./models/Sale');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const user = await User.findOne();
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
  
  // Let's first make sure there is an order with a tracking number so it doesn't just say "not found"
  let sale = await Sale.findOne({ 'shipping.trackingNumber': { $exists: true, $ne: '' } });
  if (!sale) {
     sale = await Sale.findOne();
     sale.shipping = sale.shipping || {};
     sale.shipping.trackingNumber = '1ZYF89724218612848';
     await sale.save();
  }
  
  try {
    const res = await axios.post('http://localhost:5000/api/agent/chat', {
      message: `what is the status of ${sale.shipping.trackingNumber}`
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(res.data.text);
  } catch (e) {
    console.error(e.response ? e.response.data : e.message);
  }
  process.exit(0);
}
test();
