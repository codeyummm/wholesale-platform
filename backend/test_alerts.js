const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const User = require('./models/User');
const mongoose = require('mongoose');
const xml2js = require('xml2js');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const user = await User.findOne({ role: 'admin' });
  
  const apiUrl = 'https://api.ebay.com/ws/api.dll';
  const headersXmlInbox = `<?xml version="1.0" encoding="utf-8"?>
<GetMyMessagesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${process.env.EBAY_PRODUCTION_TOKEN}</eBayAuthToken>
  </RequesterCredentials>
  <DetailLevel>ReturnHeaders</DetailLevel>
</GetMyMessagesRequest>`;

  try {
    const response = await axios.post(apiUrl, headersXmlInbox, {
      headers: {
        'X-EBAY-API-SITEID': '0',
        'X-EBAY-API-COMPATIBILITY-LEVEL': '1311',
        'X-EBAY-API-CALL-NAME': 'GetMyMessages',
        'Content-Type': 'text/xml'
      }
    });
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(response.data);
    
    console.log("Has Alerts?", !!result.GetMyMessagesResponse?.Alerts);
    if(result.GetMyMessagesResponse?.Alerts) {
      console.log("Alerts:", result.GetMyMessagesResponse.Alerts);
    }
  } catch (err) {
    console.error(err);
  }
  process.exit();
}
test();
