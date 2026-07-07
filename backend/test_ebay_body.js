const mongoose = require('mongoose');
const axios = require('axios');
const xml2js = require('xml2js');
require('dotenv').config();

const Integration = require('./models/Integration');

async function test() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    
    const integration = await Integration.findOne({ platform: 'ebay' });
    const accessToken = integration.credentials.accessToken;

    const apiUrl = process.env.EBAY_ENV !== 'production' 
      ? 'https://api.sandbox.ebay.com/ws/api.dll' 
      : 'https://api.ebay.com/ws/api.dll';

    // Fetch body for a specific MessageID
    const bodiesXml = `<?xml version="1.0" encoding="utf-8"?>
<GetMyMessagesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${accessToken}</eBayAuthToken>
  </RequesterCredentials>
  <DetailLevel>ReturnMessages</DetailLevel>
  <MessageIDs>
    <MessageID>209542789834</MessageID>
  </MessageIDs>
</GetMyMessagesRequest>`;

    const bodiesResponse = await axios.post(apiUrl, bodiesXml, {
      headers: {
        'X-EBAY-API-SITEID': '0',
        'X-EBAY-API-COMPATIBILITY-LEVEL': '1311',
        'X-EBAY-API-CALL-NAME': 'GetMyMessages',
        'Content-Type': 'text/xml'
      }
    });

    const parser = new xml2js.Parser({ explicitArray: false });
    const bodiesResult = await parser.parseStringPromise(bodiesResponse.data);

    console.log(JSON.stringify(bodiesResult.GetMyMessagesResponse.Messages.Message.Text));
    
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
test();
