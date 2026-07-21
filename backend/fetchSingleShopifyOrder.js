const axios = require('axios');
const { getValidShopifyToken } = require('./utils/shopifyAuth');
const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const { accessToken, storeDomain } = await getValidShopifyToken();
    const response = await axios.get(`https://${storeDomain}/admin/api/2024-01/orders.json?status=any`, {
      headers: { 'X-Shopify-Access-Token': accessToken }
    });
    
    const targetOrder = response.data.orders[0];
    
    console.log("Order number:", targetOrder.order_number);
    console.log("Shipping Lines:", JSON.stringify(targetOrder.shipping_lines, null, 2));
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
run();
