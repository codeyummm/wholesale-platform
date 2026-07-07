const mongoose = require('mongoose');
const Sale = require('./backend/models/Sale');
require('dotenv').config({path: './backend/.env'});

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const sale = await Sale.findOne({ saleNumber: 'SL202606-0036' });
  console.log("DB Status:", sale.status);
  console.log("DB DeliveryStatus:", sale.deliveryStatus);
  console.log("DB TrackingData cached?:", !!sale.shipping?.trackingData);
  if (sale.shipping?.trackingData) {
    console.log("Cached statusByLocale:", sale.shipping.trackingData.latestStatusDetail?.statusByLocale);
  }
  process.exit(0);
});
