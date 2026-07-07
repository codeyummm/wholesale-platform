const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const User = require('./models/User');
const mongoose = require('mongoose');
const xml2js = require('xml2js');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const { getEbayCredentials, getEbayAccessToken } = require('./utils/ebayAuth');
    const creds = await getEbayCredentials();
    const accessToken = await getEbayAccessToken(creds);

    const headersXmlInbox = `<?xml version="1.0" encoding="utf-8"?>
<GetMyMessagesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${accessToken}</eBayAuthToken>
  </RequesterCredentials>
  <DetailLevel>ReturnMessages</DetailLevel>
  <FolderID>0</FolderID>
  <Pagination>
    <EntriesPerPage>100</EntriesPerPage>
    <PageNumber>1</PageNumber>
  </Pagination>
</GetMyMessagesRequest>`;

    const response = await axios.post('https://api.ebay.com/ws/api.dll', headersXmlInbox, {
      headers: {
        'X-EBAY-API-SITEID': '0',
        'X-EBAY-API-COMPATIBILITY-LEVEL': '1311',
        'X-EBAY-API-CALL-NAME': 'GetMyMessages',
        'Content-Type': 'text/xml'
      }
    });

    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(response.data);
    let msgs = result.GetMyMessagesResponse?.Messages?.Message || [];
    msgs = Array.isArray(msgs) ? msgs : [msgs];
    
    msgs.forEach(msg => {
      if (msg.Sender === 'feruzsohib') {
        console.log(`feruzsohib Read status in ReturnMessages: ${msg.Read}`);
      }
    });
  } catch (err) {
    console.error(err);
  }
  process.exit();
}
test();
