const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const User = require('./models/User');
const mongoose = require('mongoose');
const xml2js = require('xml2js');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const { getEbayCredentials, getEbayAccessToken } = require('./services/ebayAuth');
    const creds = await getEbayCredentials();
    const accessToken = await getEbayAccessToken(creds);

    const headersXmlInbox = `<?xml version="1.0" encoding="utf-8"?>
<GetMyMessagesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${accessToken}</eBayAuthToken>
  </RequesterCredentials>
  <DetailLevel>ReturnHeaders</DetailLevel>
  <FolderID>0</FolderID>
</GetMyMessagesRequest>`;

    // Is there a filter we can pass?
  } catch (err) {
    console.error(err);
  }
  process.exit();
}
test();
