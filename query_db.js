const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });
const Sale = require('./backend/models/Sale');
const Customer = require('./backend/models/Customer');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Customers with diego:');
  console.log(await Customer.find({ ebayUsername: /diego/i }));
  console.log('Sales with diego:');
  console.log(await Sale.find({ $or: [{ customerName: /diego/i }, { externalOrderId: /diego/i }] }).select('saleNumber customerName externalOrderId status'));
  process.exit(0);
}
run();
