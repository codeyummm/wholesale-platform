const { getEbayToken } = require('./routes/ebay');
const axios = require('axios');
const xml2js = require('xml2js');
const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const token = await getEbayToken();
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<AddMemberMessageRTQRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials><eBayAuthToken>${token}</eBayAuthToken></RequesterCredentials>
  <ItemID>127910828293</ItemID>
  <MemberMessage>
    <Body><![CDATA[Testing reply via API]]></Body>
    <EmailCopyToSender>false</EmailCopyToSender>
    <DisplayToPublic>false</DisplayToPublic>
    <ParentMessageID>6260868352019</ParentMessageID>
    <RecipientID>mscmor</RecipientID>
  </MemberMessage>
</AddMemberMessageRTQRequest>`;
  const res = await axios.post('https://api.ebay.com/ws/api.dll', xml, {
    headers: {
      'X-EBAY-API-SITEID': '0',
      'X-EBAY-API-COMPATIBILITY-LEVEL': '1311',
      'X-EBAY-API-CALL-NAME': 'AddMemberMessageRTQ',
      'Content-Type': 'text/xml'
    }
  });
  console.log(res.data);
  process.exit(0);
}
run();
