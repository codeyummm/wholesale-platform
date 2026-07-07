const mongoose = require('mongoose');
const Sale = require('./models/Sale');
require('dotenv').config();

async function test() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/wholesale');
  const sale = await Sale.findOne({ saleNumber: 'SL202606-0039' });
  console.log("ITEMS:", JSON.stringify(sale.items, null, 2));
  process.exit(0);
}
test();
