const mongoose = require('mongoose');
const Sale = require('./models/Sale');
require('dotenv').config({ path: __dirname + '/.env' });

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const count = await Sale.countDocuments({ deliveryStatus: 'in_transit' });
  console.log('in_transit count:', count);
  process.exit(0);
});
