const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const { syncShopifyOrders } = require('./services/shopifyOrderService');

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');
    const result = await syncShopifyOrders();
    console.log('Success:', result);
  } catch (err) {
    console.error('Failed:', err.message);
    if (err.response) {
      console.error('Data:', err.response.data);
    }
  }
  process.exit(0);
}
run();
