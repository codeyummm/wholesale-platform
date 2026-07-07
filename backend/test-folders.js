const axios = require('axios');
const xml2js = require('xml2js');
const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/.env' });
const { getEbayToken } = require('./routes/ebay');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const accessToken = await getEbayToken();
  const apiUrl = process.env.EBAY_ENV !== 'production' 
    ? 'https://api.sandbox.ebay.com/ws/api.dll' 
    : 'https://api.ebay.com/ws/api.dll';

  for (let folder of [0, 1, 2, 3, 4, 5]) {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<GetMyMessagesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials><eBayAuthToken>${accessToken}</eBayAuthToken></RequesterCredentials>
  <DetailLevel>ReturnHeaders</DetailLevel>
  <FolderID>${folder}</FolderID>
  <Pagination><EntriesPerPage>1</EntriesPerPage><PageNumber>1</PageNumber></Pagination>
</GetMyMessagesRequest>`;

    try {
      const response = await axios.post(apiUrl, xml, {
        headers: { 'X-EBAY-API-SITEID': '0', 'X-EBAY-API-COMPATIBILITY-LEVEL': '1311', 'X-EBAY-API-CALL-NAME': 'GetMyMessages', 'Content-Type': 'text/xml' }
      });
      const parser = new xml2js.Parser({ explicitArray: false });
      const result = await parser.parseStringPromise(response.data);
      if (result.GetMyMessagesResponse?.Ack !== 'Failure') {
        console.log(`FolderID ${folder} is VALID. Total messages: ${result.GetMyMessagesResponse.Summary?.TotalMessageCount || 0}`);
      } else {
        console.log(`FolderID ${folder} is INVALID or empty.`);
      }
    } catch(e) {
      console.log(`FolderID ${folder} threw error.`);
    }
  }
  process.exit(0);
})();
