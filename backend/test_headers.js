const axios = require('axios');
const xml2js = require('xml2js');
require('dotenv').config();
const { getEbayCredentials, getEbayAccessToken } = require('./utils/ebayAuth');

async function test() {
  const creds = await getEbayCredentials();
  const accessToken = await getEbayAccessToken(creds);
  const headersXmlInbox = `<?xml version="1.0" encoding="utf-8"?>
<GetMyMessagesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${accessToken}</eBayAuthToken>
  </RequesterCredentials>
  <DetailLevel>ReturnHeaders</DetailLevel>
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
  const msgs = result.GetMyMessagesResponse?.Messages?.Message;
  console.log(msgs[0]);
  process.exit();
}
test();
