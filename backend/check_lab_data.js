require('dotenv').config();
const mongoose = require('mongoose');
const Inventory = require('./models/Inventory');
const DeviceTest = require('./models/DeviceTest');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const imei = "359489652886831";
  
  const test = await DeviceTest.findOne({ imei }).lean();
  console.log("Found Test:", !!test);
  
  const inv = await Inventory.findOne({ 'devices.imei': imei }).lean();
  if (inv) {
    const dev = inv.devices.find(d => d.imei === imei || d.imei2 === imei);
    console.log("Found Device in Inventory. Has labData?", !!dev.labData);
    if (dev.labData) {
      console.log("LabData keys:", Object.keys(dev.labData));
      console.log("LabData sample:", dev.labData);
    }
    console.log("Device unlockStatus:", dev.unlockStatus);
    console.log("Inventory model:", inv.model);
  } else {
    console.log("Inventory not found for IMEI", imei);
  }
  process.exit(0);
});
