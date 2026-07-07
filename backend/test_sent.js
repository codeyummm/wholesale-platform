const axios = require('axios');
const xml2js = require('xml2js');
require('dotenv').config();
const Integration = require('./models/Integration');
const mongoose = require('mongoose');

async function getSent() {
  await mongoose.connect(process.env.MONGO_URI);
  const integration = await Integration.findOne({ platform: 'ebay' });
  const headersXmlSent = `<?xml version="1.0" encoding="utf-8"?>
<GetMyMessagesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${integration.accessToken}</eBayAuthToken>
  </RequesterCredentials>
  <DetailLevel>ReturnHeaders</DetailLevel>
  <FolderID>1</FolderID>
</GetMyMessagesRequest>`;

  const apiUrl = 'https://api.ebay.com/ws/api.dll';
  const response = await axios.post(apiUrl, headersXmlSent, {
    headers: { 'X-EBAY-API-SITEID': '0', 'X-EBAY-API-COMPATIBILITY-LEVEL': '1311', 'X-EBAY-API-CALL-NAME': 'GetMyMessages', 'Content-Type': 'text/xml' }
  });
  const parser = new xml2js.Parser({ explicitArray: false });
  const result = await parser.parseStringPromise(response.data);
  console.log(JSON.stringify(result.GetMyMessagesResponse.Messages.Message.slice(0, 3), null, 2));
  process.exit(0);
}
getSent();
