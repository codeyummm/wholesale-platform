require('dotenv').config();
const mongoose = require('mongoose');
const Integration = require('./models/Integration');
const axios = require('axios');

async function test() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/wholesale');
  
  const integration = await Integration.findOne({ platform: 'ebay' });
  if (!integration) {
    console.log("No eBay integration found in DB.");
    process.exit(1);
  }

  const accessToken = integration.credentials.accessToken;
  const isSandbox = process.env.EBAY_ENV !== 'production';
  const baseUrl = isSandbox ? 'https://api.sandbox.ebay.com/sell/account/v1' : 'https://api.ebay.com/sell/account/v1';

  console.log("Using API:", baseUrl);

  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  };

  try {
    const res = await axios.get(`${baseUrl}/fulfillment_policy?marketplace_id=EBAY_US`, { headers });
    console.log("Fulfillment Policies Data:", JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error("Fulfillment Policy Error:", err.response?.data || err.message);
  }
  
  process.exit(0);
}

test();
