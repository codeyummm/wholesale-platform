const fs = require('fs');
let code = fs.readFileSync('routes/ebay.js', 'utf8');

const routeCode = `
// Mark message as read
router.post('/messages/:id/read', protect, async (req, res) => {
  try {
    const accessToken = await getEbayToken();
    const apiUrl = process.env.EBAY_ENV !== 'production' 
      ? 'https://api.sandbox.ebay.com/ws/api.dll' 
      : 'https://api.ebay.com/ws/api.dll';

    const xmlBody = \`<?xml version="1.0" encoding="utf-8"?>
<ReviseMyMessagesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>\${accessToken}</eBayAuthToken>
  </RequesterCredentials>
  <MessageIDs>
    <MessageID>\${req.params.id}</MessageID>
  </MessageIDs>
  <Read>true</Read>
</ReviseMyMessagesRequest>\`;

    await axios.post(apiUrl, xmlBody, {
      headers: {
        'X-EBAY-API-SITEID': '0',
        'X-EBAY-API-COMPATIBILITY-LEVEL': '1311',
        'X-EBAY-API-CALL-NAME': 'ReviseMyMessages',
        'Content-Type': 'text/xml'
      }
    });

    res.json({ success: true });
  } catch (err) {
    console.error('ReviseMyMessages error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});
`;

// Insert the route right before module.exports
code = code.replace('module.exports = router;', routeCode + '\nmodule.exports = router;');

fs.writeFileSync('routes/ebay.js', code);
console.log('Added read route');
