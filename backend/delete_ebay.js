const mongoose = require('mongoose');
require('dotenv').config();
const Sale = require('./models/Sale');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const result = await Sale.deleteMany({ salesChannel: 'ebay' });
  console.log('Deleted eBay orders:', result.deletedCount);
  process.exit(0);
}
run();
