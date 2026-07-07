const mongoose = require('mongoose');
const Inventory = require('./models/Inventory');
require('dotenv').config();

async function fix() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  // Find the device using the incorrect IMEI 2 that was stored as IMEI 1
  const inv = await Inventory.findOne({ 'devices.imei': '359489652886831' });
  if (inv) {
    let updated = false;
    for (let device of inv.devices) {
      if (device.imei === '359489652886831') {
        updated = true;
      }
    }
    if (updated) {
      await Inventory.updateOne(
        { _id: inv._id, 'devices.imei': '359489652886831' },
        { 
          $set: { 
            'devices.$.imei': '359489652886823',
            'devices.$.imei2': '359489652886831'
          } 
        }
      );
      console.log('Fixed IMEI data for the device!');
    }
  } else {
    console.log('Device not found!');
  }
  process.exit(0);
}
fix();
