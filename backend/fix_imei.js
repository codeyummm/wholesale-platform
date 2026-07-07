require('dotenv').config();
const mongoose = require('mongoose');
const Inventory = require('./models/Inventory');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  await Inventory.updateMany(
    { 'devices.imei': '359489652886831' },
    { 
      $set: { 
        'devices.$[elem].isSold': true,
        'devices.$[elem].soldDate': new Date()
      }
    },
    { arrayFilters: [{ 'elem.imei': '359489652886831' }] }
  );
  console.log("Inventory updated!");
  process.exit(0);
});
