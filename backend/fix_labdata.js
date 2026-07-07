require('dotenv').config();
const mongoose = require('mongoose');
const Inventory = require('./models/Inventory');
const ImeiOrder = require('./models/ImeiOrder');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const order = await ImeiOrder.findOne({ imei: '359489652886831', status: 'Success' });
  if (order && order.apiResponse) {
    await Inventory.updateMany(
      { 'devices.imei': '359489652886831' },
      { 
        $set: { 
          'devices.$[elem].labData': order.apiResponse
        }
      },
      { arrayFilters: [{ 'elem.imei': '359489652886831' }] }
    );
    console.log("labData attached successfully!");
  } else {
    console.log("No successful order found.");
  }
  process.exit(0);
});
