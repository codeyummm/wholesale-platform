const fs = require('fs');
let code = fs.readFileSync('routes/ebay.js', 'utf8');

const replacement = `// @route   GET /api/ebay/messages
// @desc    Get all eBay messages
router.get('/messages', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const entriesPerPage = 10;
    
    const accessToken = await getEbayToken();
    const EbaySentMessage = require('../models/EbaySentMessage');
    const localSentMessages = await EbaySentMessage.find().lean();

    const apiUrl = process.env.EBAY_ENV !== 'production' 
      ? 'https://api.sandbox.ebay.com/ws/api.dll' 
      : 'https://api.ebay.com/ws/api.dll';

    // 1. Fetch Message Headers
    const headersXmlInbox = \`<?xml version="1.0" encoding="utf-8"?>
<GetMyMessagesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>\${accessToken}</eBayAuthToken>
  </RequesterCredentials>
  <DetailLevel>ReturnHeaders</DetailLevel>
  <FolderID>0</FolderID>
  <Pagination>
    <EntriesPerPage>\${entriesPerPage}</EntriesPerPage>
    <PageNumber>\${page}</PageNumber>
  </Pagination>
</GetMyMessagesRequest>\`;

    const headersXmlSent = \`<?xml version="1.0" encoding="utf-8"?>
<GetMyMessagesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>\${accessToken}</eBayAuthToken>
  </RequesterCredentials>
  <DetailLevel>ReturnHeaders</DetailLevel>
  <FolderID>1</FolderID>
  <Pagination>
    <EntriesPerPage>\${entriesPerPage}</EntriesPerPage>
    <PageNumber>\${page}</PageNumber>
  </Pagination>
</GetMyMessagesRequest>\`;`;

const regex = /\/\/ @route   GET \/api\/ebay\/messages\n\/\/ @desc    Get all eBay messages\nrouter\.get\('\/messages', protect, async \(req, res\) => \{\n  try \{\n    const accessToken = await getEbayToken\(\);\n    const EbaySentMessage = require\('\.\.\/models\/EbaySentMessage'\);\n    const localSentMessages = await EbaySentMessage\.find\(\)\.lean\(\);\n\n    const apiUrl = process\.env\.EBAY_ENV !== 'production' \n      \? 'https:\/\/api\.sandbox\.ebay\.com\/ws\/api\.dll' \n      : 'https:\/\/api\.ebay\.com\/ws\/api\.dll';\n\n    \/\/ 1\. Fetch Message Headers\n    const headersXmlInbox = `<\?xml version="1\.0" encoding="utf-8"\?>\n<GetMyMessagesRequest xmlns="urn:ebay:apis:eBLBaseComponents">\n  <RequesterCredentials>\n    <eBayAuthToken>\$\{accessToken\}<\/eBayAuthToken>\n  <\/RequesterCredentials>\n  <DetailLevel>ReturnHeaders<\/DetailLevel>\n  <FolderID>0<\/FolderID>\n  <Pagination>\n    <EntriesPerPage>100<\/EntriesPerPage>\n    <PageNumber>1<\/PageNumber>\n  <\/Pagination>\n<\/GetMyMessagesRequest>`;\n\n    const headersXmlSent = `<\?xml version="1\.0" encoding="utf-8"\?>\n<GetMyMessagesRequest xmlns="urn:ebay:apis:eBLBaseComponents">\n  <RequesterCredentials>\n    <eBayAuthToken>\$\{accessToken\}<\/eBayAuthToken>\n  <\/RequesterCredentials>\n  <DetailLevel>ReturnHeaders<\/DetailLevel>\n  <FolderID>1<\/FolderID>\n  <Pagination>\n    <EntriesPerPage>100<\/EntriesPerPage>\n    <PageNumber>1<\/PageNumber>\n  <\/Pagination>\n<\/GetMyMessagesRequest>`;/g;

code = code.replace(regex, replacement);

fs.writeFileSync('routes/ebay.js', code);
console.log('Patched top part');
