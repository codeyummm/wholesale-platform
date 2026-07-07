const mongoose = require('mongoose');
const Inventory = require('./models/Inventory');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const inv = await Inventory.findOne({ "devices.imei": "357006523673644" });
  if (inv) {
    const dev = inv.devices.find(d => d.imei === "357006523673644");
    console.log(JSON.stringify(dev, null, 2));
  } else {
    console.log("Device not found.");
  }
  process.exit(0);
}
check();
