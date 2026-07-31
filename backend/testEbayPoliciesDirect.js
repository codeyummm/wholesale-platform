require('dotenv').config();
const mongoose = require('mongoose');
const Integration = require('./models/Integration');
const axios = require('axios');

async function test() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    const integration = await Integration.findOne({ platform: 'ebay' });
    if (!integration) { console.log("No integration"); process.exit(0); }
    
    const token = integration.credentials.accessToken;
    console.log("Token starts with:", token.substring(0, 10));
    
    const isSandbox = process.env.EBAY_ENV !== 'production';
    const baseUrl = isSandbox ? 'https://api.sandbox.ebay.com/sell/account/v1' : 'https://api.ebay.com/sell/account/v1';
    
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
    
    const res = await axios.get(`${baseUrl}/fulfillment_policy?marketplace_id=EBAY_US`, { headers });
    console.log("Fulfillment Policies:", res.data);
  } catch (err) {
    console.error("Error:", err.message);
    if(err.response) console.error("Response data:", err.response.data);
  }
  process.exit(0);
}
test();
