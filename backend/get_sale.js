require('dotenv').config();
const mongoose = require('mongoose');
const Sale = require('./models/Sale');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const sale = await Sale.findById('6a1f0abe039edf1e690a5424');
  console.log("labelImage length:", sale.shipping?.labelImage?.length);
  console.log("scannedLabel:", sale.shipping?.scannedLabel);
  console.log("fullImage:", sale.shipping?.fullImage);
  process.exit(0);
});
