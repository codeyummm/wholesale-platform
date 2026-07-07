const mongoose = require('mongoose');
const Sale = require('./models/Sale');
require('dotenv').config();

async function fix() {
  await mongoose.connect(process.env.MONGODB_URI);
  const sale = await Sale.findOne({ saleNumber: 'SL202606-0037' });
  if (sale) {
    sale.shipping = sale.shipping || {};
    sale.shipping.shippingCost = 19.01;
    await sale.save();
    console.log('Fixed sale', sale.saleNumber);
  } else {
    console.log('Sale not found');
  }
  process.exit(0);
}
fix();
