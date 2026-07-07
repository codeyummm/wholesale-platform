require('dotenv').config();
const mongoose = require('mongoose');
const ImeiOrder = require('./models/ImeiOrder');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/wholesale', {
}).then(async () => {
  const order = await ImeiOrder.findOne({ imei: '357408120277193' });
  console.log("Found order:", order);
  process.exit(0);
}).catch(console.error);
