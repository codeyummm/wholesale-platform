const mongoose = require('mongoose');
const axios = require('axios');
const xml2js = require('xml2js');
require('dotenv').config();

const Integration = require('./models/Integration');

async function test() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to DB');
    
    // We mock the getEbayToken since we need it
    const integration = await Integration.findOne({ platform: 'ebay' });
    if (!integration) return console.log('No eBay integration');
    const accessToken = integration.credentials.accessToken;

    const apiUrl = process.env.EBAY_ENV !== 'production' 
      ? 'https://api.sandbox.ebay.com/ws/api.dll' 
      : 'https://api.ebay.com/ws/api.dll';

    // 1. Fetch Message Headers
    const headersXml = `<?xml version="1.0" encoding="utf-8"?>
<GetMyMessagesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${accessToken}</eBayAuthToken>
  </RequesterCredentials>
  <DetailLevel>ReturnHeaders</DetailLevel>
</GetMyMessagesRequest>`;

    const headersResponse = await axios.post(apiUrl, headersXml, {
      headers: {
        'X-EBAY-API-SITEID': '0',
        'X-EBAY-API-COMPATIBILITY-LEVEL': '1311',
        'X-EBAY-API-CALL-NAME': 'GetMyMessages',
        'Content-Type': 'text/xml'
      }
    });

    const parser = new xml2js.Parser({ explicitArray: false });
    const headersResult = await parser.parseStringPromise(headersResponse.data);

    console.log(JSON.stringify(headersResult.GetMyMessagesResponse, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
test();
