const fs = require('fs');
let code = fs.readFileSync('routes/ebay.js', 'utf8');

const unreadLogic = `// @route   GET /api/ebay/messages/unread
// @desc    Get unread eBay messages count
router.get('/messages/unread', protect, async (req, res) => {
  try {
    const accessToken = await getEbayToken();
    const apiUrl = process.env.EBAY_ENV !== 'production' 
      ? 'https://api.sandbox.ebay.com/ws/api.dll' 
      : 'https://api.ebay.com/ws/api.dll';

    const fetchHeaders = async (xml) => {
      const resp = await axios.post(apiUrl, xml, {
        headers: {
          'X-EBAY-API-SITEID': '0',
          'X-EBAY-API-COMPATIBILITY-LEVEL': '1311',
          'X-EBAY-API-CALL-NAME': 'GetMyMessages',
          'Content-Type': 'text/xml'
        }
      });
      const parser = new xml2js.Parser({ explicitArray: false });
      const resObj = await parser.parseStringPromise(resp.data);
      if (resObj.GetMyMessagesResponse?.Ack === 'Failure') return [];
      let msgs = resObj.GetMyMessagesResponse?.Messages?.Message;
      if (!msgs) return [];
      return Array.isArray(msgs) ? msgs : [msgs];
    };

    const headersXmlInbox = \`<?xml version="1.0" encoding="utf-8"?>
<GetMyMessagesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>\${accessToken}</eBayAuthToken>
  </RequesterCredentials>
  <DetailLevel>ReturnHeaders</DetailLevel>
  <FolderID>0</FolderID>
  <Pagination>
    <EntriesPerPage>100</EntriesPerPage>
    <PageNumber>1</PageNumber>
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
    <EntriesPerPage>100</EntriesPerPage>
    <PageNumber>1</PageNumber>
  </Pagination>
</GetMyMessagesRequest>\`;

    const [inboxHeaders, sentHeaders] = await Promise.all([
      fetchHeaders(headersXmlInbox),
      fetchHeaders(headersXmlSent)
    ]);

    let rawHeaders = [...inboxHeaders, ...sentHeaders];
    rawHeaders.sort((a, b) => new Date(a.ReceiveDate) - new Date(b.ReceiveDate)); // Sort chronological
    
    // Reverse it to slice the top 100 recent
    rawHeaders.reverse();
    rawHeaders = rawHeaders.slice(0, 100);
    rawHeaders.reverse(); // Back to chronological

    const conversationsMap = {};
    rawHeaders.forEach(msg => {
      let participant = msg.Sender;
      const isSentByMe = msg.Folder?.FolderID === '1';
      if (isSentByMe) {
        participant = msg.SendToName || 'Unknown';
      }

      // Extract raw item ID from subject if it's there
      let rawItemId = msg.ItemID;
      const itemIdMatch = msg.Subject?.match(/#(\\d{12})/);
      if (!rawItemId && itemIdMatch) rawItemId = itemIdMatch[1];
      const key = \`\${participant}_\${rawItemId || 'no_item'}\`;
      
      if (!conversationsMap[key]) {
        conversationsMap[key] = { isRead: msg.Read === 'true', sender: participant };
      }
      conversationsMap[key].isRead = isSentByMe ? true : msg.Read === 'true';
    });

    const isFromEbay = (sender) => {
      const lower = sender.toLowerCase();
      return lower === 'ebay' || lower.includes('ebay.com');
    };

    let unreadCount = 0;
    Object.values(conversationsMap).forEach(c => {
      if (c.isRead === false && !isFromEbay(c.sender)) {
        unreadCount++;
      }
    });

    res.json({ success: true, count: unreadCount });
  } catch (error) {
    console.error('eBay Unread Messages Error:', error.message);
    res.json({ success: true, count: 0 }); 
  }
});`;

// Replace the old endpoint
const regex = /\/\/ @route   GET \/api\/ebay\/messages\/unread[\s\S]*?(?=\/\/ @route   GET \/api\/ebay\/messages$)/;
code = code.replace(regex, unreadLogic + '\n\n');

fs.writeFileSync('routes/ebay.js', code);
console.log('Fixed unread logic');
