const express = require('express');
const router = express.Router();
const axios = require('axios');
const { protect } = require('../middleware/auth');
const { getEbayToken } = require('./ebay');

const isSandbox = process.env.EBAY_ENV !== 'production';
const apiEndpoint = isSandbox 
  ? 'https://api.sandbox.ebay.com/ws/api.dll' 
  : 'https://api.ebay.com/ws/api.dll';

// Helper to extract XML tag values
function getXMLTagValue(xmlString, tag) {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i');
  const match = xmlString.match(regex);
  return match ? match[1] : '';
}

// Helper to extract nested list elements from XML
function extractMessages(xmlString) {
  const messages = [];
  const messageBlockRegex = /<Message>([\s\S]*?)<\/Message>/g;
  let match;

  while ((match = messageBlockRegex.exec(xmlString)) !== null) {
    const block = match[1];
    const messageId = getXMLTagValue(block, 'MessageID');
    const senderId = getXMLTagValue(block, 'SenderID');
    const subject = getXMLTagValue(block, 'Subject');
    const body = getXMLTagValue(block, 'Body');
    const creationDate = getXMLTagValue(block, 'CreationDate');
    const itemID = getXMLTagValue(block, 'ItemID');

    if (messageId) {
      messages.push({
        id: messageId,
        sender: senderId || 'eBay Buyer',
        subject: subject || 'No Subject',
        body: body || '',
        date: creationDate ? new Date(creationDate).toISOString() : new Date().toISOString(),
        itemId: itemID || ''
      });
    }
  }
  return messages;
}

// @route   GET /api/ebay/messages
// @desc    Retrieve unreplied buyer messages
router.get('/', protect, async (req, res) => {
  try {
    let accessToken;
    try {
      accessToken = await getEbayToken();
    } catch (tokenErr) {
      console.log('[eBay Messages] Integration not active, serving mock messages.');
      return res.json({ success: true, data: getMockMessages(), mock: true });
    }

    const xmlPayload = `<?xml version="1.0" encoding="utf-8"?>
<GetMemberMessagesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <MailMessageType>All</MailMessageType>
  <MessageStatus>Unanswered</MessageStatus>
  <Pagination>
    <EntriesPerPage>20</EntriesPerPage>
    <PageNumber>1</PageNumber>
  </Pagination>
</GetMemberMessagesRequest>`;

    const headers = {
      'Content-Type': 'text/xml',
      'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
      'X-EBAY-API-CALL-NAME': 'GetMemberMessages',
      'X-EBAY-API-SITEID': '0',
      'X-EBAY-API-APP-NAME': process.env.EBAY_APP_ID || '',
      'X-EBAY-API-DEV-NAME': process.env.EBAY_DEV_ID || '',
      'X-EBAY-API-CERT-NAME': process.env.EBAY_CERT_ID || '',
      'X-EBAY-API-IAF-TOKEN': accessToken
    };

    console.log('[eBay Messages] Fetching messages from API...');
    const response = await axios.post(apiEndpoint, xmlPayload, { headers });
    const responseXml = response.data;
    
    // Check for success in XML
    const ack = getXMLTagValue(responseXml, 'Ack');
    if (ack === 'Success' || ack === 'Warning') {
      const messages = extractMessages(responseXml);
      if (messages.length === 0) {
        console.log('[eBay Messages] No live messages, serving mock messages for sandbox.');
        res.json({ success: true, data: getMockMessages(), mock: true });
      } else {
        res.json({ success: true, data: messages });
      }
    } else {
      const errorMsg = getXMLTagValue(responseXml, 'LongMessage') || 'Failed to fetch messages';
      console.warn('[eBay Messages] API error, falling back to mock:', errorMsg);
      res.json({ success: true, data: getMockMessages(), mock: true });
    }

  } catch (error) {
    console.error('eBay messages fetch error:', error.message);
    res.json({ success: true, data: getMockMessages(), mock: true });
  }
});

// @route   POST /api/ebay/messages/reply
// @desc    Reply to a buyer message
router.post('/reply', protect, async (req, res) => {
  try {
    const { messageId, replyBody, recipientId, itemId, subject } = req.body;

    if (!messageId || !replyBody || !recipientId) {
      return res.status(400).json({ success: false, message: 'Missing parameters' });
    }

    // Check if it's a mock message reply
    if (messageId.startsWith('mock-')) {
      console.log(`[eBay Messages] Processing mock reply to ${recipientId} for message ${messageId}`);
      return res.json({ success: true, message: 'Reply sent successfully (Mock environment)' });
    }

    const accessToken = await getEbayToken();
    const headers = {
      'Content-Type': 'text/xml',
      'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
      'X-EBAY-API-CALL-NAME': 'AddMemberMessageAAQToPartner',
      'X-EBAY-API-SITEID': '0',
      'X-EBAY-API-APP-NAME': process.env.EBAY_APP_ID || '',
      'X-EBAY-API-DEV-NAME': process.env.EBAY_DEV_ID || '',
      'X-EBAY-API-CERT-NAME': process.env.EBAY_CERT_ID || '',
      'X-EBAY-API-IAF-TOKEN': accessToken
    };

    const xmlPayload = `<?xml version="1.0" encoding="utf-8"?>
<AddMemberMessageAAQToPartnerRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <ItemID>${itemId || ''}</ItemID>
  <MemberMessage>
    <Body>${replyBody}</Body>
    <DisplayToPublic>false</DisplayToPublic>
    <EmailCopyToSender>true</EmailCopyToSender>
    <ParentMessageID>${messageId}</ParentMessageID>
    <RecipientID>${recipientId}</RecipientID>
    <Subject>${subject || 'Re: eBay inquiry'}</Subject>
  </MemberMessage>
</AddMemberMessageAAQToPartnerRequest>`;

    console.log(`[eBay Messages] Sending reply for message ${messageId}...`);
    const response = await axios.post(apiEndpoint, xmlPayload, { headers });
    const responseXml = response.data;

    const ack = getXMLTagValue(responseXml, 'Ack');
    if (ack === 'Success' || ack === 'Warning') {
      res.json({ success: true, message: 'Reply sent successfully' });
    } else {
      const errorMsg = getXMLTagValue(responseXml, 'LongMessage') || 'Failed to send reply';
      res.status(400).json({ success: false, message: errorMsg });
    }

  } catch (error) {
    console.error('eBay messages reply error:', error.response?.data || error.message);
    res.status(500).json({ success: false, message: 'Failed to send message reply', error: error.message });
  }
});

function getMockMessages() {
  return [
    {
      id: 'mock-msg-101',
      sender: 'john_doe_deals',
      subject: 'Inquiry about iPhone 11 condition',
      body: 'Hi, I am interested in buying the iPhone 11. Can you tell me if the battery is above 85% health? Thank you!',
      date: new Date(Date.now() - 2 * 3600000).toISOString(), // 2 hours ago
      itemId: '356550755429846'
    },
    {
      id: 'mock-msg-102',
      sender: 'mary_smith_shopping',
      subject: 'Unlocked status for Galaxy S22+',
      body: 'Is this Verizon model unlocked for GSM carriers in South America? I travel frequently and want to make sure.',
      date: new Date(Date.now() - 5 * 3600000).toISOString(), // 5 hours ago
      itemId: '356550755429846'
    },
    {
      id: 'mock-msg-103',
      sender: 'gadget_guru',
      subject: 'Bulk discount pricing',
      body: 'Hello, do you offer discounts if we order 10+ units of Grade B iPhone XR? Let me know your best wholesale price.',
      date: new Date(Date.now() - 24 * 3600000).toISOString(), // 1 day ago
      itemId: ''
    }
  ];
}

module.exports = router;
