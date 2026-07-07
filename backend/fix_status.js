require('dotenv').config();
const mongoose = require('mongoose');
const Sale = require('./models/Sale');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const sale = await Sale.findOne({ saleNumber: 'SL202606-0036' });
  if (sale) {
    sale.status = 'in_transit';
    sale.deliveryStatus = 'in_transit';
    await sale.save();
    console.log("Fixed status for SL202606-0036");
  } else {
    console.log("Sale not found");
  }
  process.exit(0);
});
