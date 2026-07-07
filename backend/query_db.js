const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const Sale = require('./models/Sale');
const Customer = require('./models/Customer');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Customers with diego:');
  console.log(await Customer.find({ ebayUsername: /diego/i }));
  console.log('Sales with diego:');
  console.log(await Sale.find({ $or: [{ customerName: /diego/i }, { externalOrderId: /diego/i }] }).select('saleNumber customerName externalOrderId status'));
  process.exit(0);
}
run();
