require('dotenv').config();
const mongoose = require('mongoose');
const ImeiOrder = require('./models/ImeiOrder');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const o = await ImeiOrder.find({ imei: '359489652886831' });
  console.log(JSON.stringify(o, null, 2));
  process.exit(0);
});
