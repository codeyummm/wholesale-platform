const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();
const Integration = require('./models/Integration');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const integration = await Integration.findOne({ platform: 'ebay' });
  
  if (!integration) {
    console.log("No integration found.");
    process.exit(1);
  }

  try {
    const apiUrl = process.env.EBAY_ENV !== 'production'
      ? 'https://api.sandbox.ebay.com/sell/fulfillment/v1/order?limit=5'
      : 'https://api.ebay.com/sell/fulfillment/v1/order?limit=5';
      
    const response = await axios.get(apiUrl, {
      headers: { 'Authorization': `Bearer ${integration.credentials.accessToken}`, 'Content-Type': 'application/json' }
    });
    
    console.log(JSON.stringify(response.data.orders[0] || "No orders found", null, 2));
  } catch (err) {
    console.error("Error:", err.response?.data || err.message);
  }
  process.exit(0);
}

run();
