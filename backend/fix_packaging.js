const mongoose = require('mongoose');
const Sale = require('./models/Sale');
require('dotenv').config();

async function fix() {
  await mongoose.connect(process.env.MONGODB_URI);
  const sale = await Sale.findOne({ saleNumber: 'SL202606-0037' });
  if (sale) {
    sale.costs = sale.costs || {};
    sale.costs.packaging = 2.00;
    sale.costs.handling = 1.00;
    
    // Note: the pre-save hook on the Sale model will automatically 
    // recalculate totalProfit for us before it saves to the database!
    await sale.save();
    
    console.log('Fixed packaging/handling for sale', sale.saleNumber);
  } else {
    console.log('Sale not found');
  }
  process.exit(0);
}
fix();
