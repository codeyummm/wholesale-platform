const { getEbayToken } = require('./routes/ebay');
const axios = require('axios');
const xml2js = require('xml2js');
const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const token = await getEbayToken();
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<GetMyMessagesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials><eBayAuthToken>${token}</eBayAuthToken></RequesterCredentials>
  <FolderID>0</FolderID>
  <DetailLevel>ReturnHeaders</DetailLevel>
</GetMyMessagesRequest>`;
  const res = await axios.post('https://api.ebay.com/ws/api.dll', xml, {
    headers: {
      'X-EBAY-API-SITEID': '0',
      'X-EBAY-API-COMPATIBILITY-LEVEL': '1311',
      'X-EBAY-API-CALL-NAME': 'GetMyMessages',
      'Content-Type': 'text/xml'
    }
  });
  const parser = new xml2js.Parser({ explicitArray: false });
  const result = await parser.parseStringPromise(res.data);
  const msgs = result.GetMyMessagesResponse.Messages.Message;
  console.log(JSON.stringify(msgs.slice(0, 5).map(m => ({ 
    MessageID: m.MessageID, 
    ExternalMessageID: m.ExternalMessageID, 
    Sender: m.Sender, 
    Subject: m.Subject 
  })), null, 2));
  process.exit(0);
}
run();
