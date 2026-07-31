require('dotenv').config({ path: 'backend/.env' });
const axios = require('axios');
const xml2js = require('xml2js');

// Copy the getEbayToken function from backend/routes/ebay.js since it's not exported as a standalone module we can easily require without Express
const Integration = require('./backend/models/Integration');
const mongoose = require('./backend/node_modules/mongoose');

async function getEbayToken() {
  const integration = await Integration.findOne({ provider: 'ebay' });
  if (!integration) throw new Error('No eBay integration found');
  
  if (Date.now() > integration.expiresAt.getTime() - 5 * 60 * 1000) {
    const isSandbox = process.env.EBAY_ENV !== 'production';
    const credentials = Buffer.from(`${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`).toString('base64');
    
    const tokenUrl = isSandbox 
      ? 'https://api.sandbox.ebay.com/identity/v1/oauth2/token' 
      : 'https://api.ebay.com/identity/v1/oauth2/token';

    const response = await axios.post(tokenUrl, 'grant_type=refresh_token&refresh_token=' + integration.refreshToken, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`
      }
    });

    integration.accessToken = response.data.access_token;
    integration.expiresAt = new Date(Date.now() + response.data.expires_in * 1000);
    await integration.save();
    return integration.accessToken;
  }
  return integration.accessToken;
}

async function testApi() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const token = await getEbayToken();
    
    const apiUrl = process.env.EBAY_ENV !== 'production' 
      ? 'https://api.sandbox.ebay.com/ws/api.dll' 
      : 'https://api.ebay.com/ws/api.dll';

    // 1. Get Category Features (This shows what options/features are allowed for listings in this category)
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<GetCategoryFeaturesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${token}</eBayAuthToken>
  </RequesterCredentials>
  <CategoryID>9355</CategoryID>
  <DetailLevel>ReturnAll</DetailLevel>
  <ViewAllNodes>true</ViewAllNodes>
</GetCategoryFeaturesRequest>`;

    const resp = await axios.post(apiUrl, xml, {
      headers: {
        'X-EBAY-API-SITEID': '0',
        'X-EBAY-API-COMPATIBILITY-LEVEL': '1311',
        'X-EBAY-API-CALL-NAME': 'GetCategoryFeatures',
        'Content-Type': 'text/xml'
      }
    });
    
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(resp.data);
    
    const features = result.GetCategoryFeaturesResponse?.Category;
    console.log("=== Category 9355 Listing Options ===");
    if(features) {
       console.log("Listing Durations Allowed:", features.ListingDuration);
       console.log("Condition Enabled:", features.ConditionEnabled);
       console.log("Best Offer Enabled:", features.BestOfferEnabled);
       console.log("Handling Time Enabled:", features.HandlingTimeEnabled);
       console.log("Return Policy Enabled:", features.ReturnPolicyEnabled);
       console.log("PayPal Required:", features.PayPalRequired);
       
       if (features.ConditionValues) {
           console.log("Condition Options:", features.ConditionValues.Condition.map(c => `${c.ID}: ${c.DisplayName}`));
       }
    } else {
       console.log("Full Response:", JSON.stringify(result, null, 2).substring(0, 500));
    }
    
    process.exit(0);
  } catch (e) {
    console.error(e.response?.data || e.message);
    process.exit(1);
  }
}
testApi();
