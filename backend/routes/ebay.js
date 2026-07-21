const express = require('express');
const router = express.Router();
const axios = require('axios');
const xml2js = require('xml2js');
const Integration = require('../models/Integration');
const Sale = require('../models/Sale');
const User = require('../models/User');
const Customer = require('../models/Customer');
const { protect } = require('../middleware/auth');
// Scope for eBay APIs (Inventory and Fulfillment are key for this platform)
const EBAY_SCOPES = [
  'https://api.ebay.com/oauth/api_scope',
  'https://api.ebay.com/oauth/api_scope/sell.inventory',
  'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
  'https://api.ebay.com/oauth/api_scope/sell.account'
].join(' ');

// Depending on sandbox vs production, use the correct endpoints
const isSandbox = process.env.EBAY_ENV !== 'production';
const authBaseUrl = isSandbox ? 'https://auth.sandbox.ebay.com/oauth2/authorize' : 'https://auth.ebay.com/oauth2/authorize';
const tokenBaseUrl = isSandbox ? 'https://api.sandbox.ebay.com/identity/v1/oauth2/token' : 'https://api.ebay.com/identity/v1/oauth2/token';

// @route   GET /api/ebay/auth
// @desc    Initiate eBay OAuth 2.0 connection
router.get('/auth', (req, res) => {
  const appId = process.env.EBAY_APP_ID;
  const ruName = process.env.EBAY_RU_NAME;

  if (!appId || !ruName) {
    return res.status(500).json({ success: false, message: 'eBay credentials not configured in server environment.' });
  }

  // State can be used to prevent CSRF or pass the frontend redirect URL
  const state = 'connect_ebay'; 

  const authUrl = `${authBaseUrl}?client_id=${appId}&response_type=code&redirect_uri=${ruName}&scope=${encodeURIComponent(EBAY_SCOPES)}&state=${state}`;
  
  // Redirect user to eBay login page
  res.redirect(authUrl);
});

// @route   GET /api/ebay/callback
// @desc    eBay OAuth callback handler (RU_NAME must point here!)
router.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    console.error('eBay Auth Error:', error);
    return res.redirect('http://localhost:5173/sales-channels?ebayAuth=failed');
  }

  if (!code) {
    return res.status(400).send('No authorization code provided');
  }

  try {
    const appId = process.env.EBAY_APP_ID;
    const certId = process.env.EBAY_CERT_ID;
    const ruName = process.env.EBAY_RU_NAME;

    // Create Basic Auth header (Base64 of clientId:clientSecret)
    const authHeader = Buffer.from(`${appId}:${certId}`).toString('base64');

    // Exchange code for tokens
    const response = await axios.post(tokenBaseUrl, new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: ruName
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${authHeader}`
      }
    });

    const { access_token, refresh_token, expires_in } = response.data;
    
    // Calculate expiry date
    const tokenExpiry = new Date();
    tokenExpiry.setSeconds(tokenExpiry.getSeconds() + expires_in);

    // Save or update Integration document
    await Integration.findOneAndUpdate(
      { platform: 'ebay' },
      {
        platform: 'ebay',
        isConnected: true,
        credentials: {
          accessToken: access_token,
          refreshToken: refresh_token,
          tokenExpiry: tokenExpiry
        }
      },
      { upsert: true, new: true }
    );

    // Redirect back to frontend settings/sales dashboard
    res.redirect('http://localhost:5173/sales-channels?ebayAuth=success');

  } catch (err) {
    console.error('Error exchanging eBay token:', err.response?.data || err.message);
    res.redirect('http://localhost:5173/sales-channels?ebayAuth=failed');
  }
});

// @route   GET /api/ebay/status
// @desc    Check eBay connection status
router.get('/status', async (req, res) => {
  try {
    const integration = await Integration.findOne({ platform: 'ebay' });
    if (integration && integration.isConnected) {
      return res.json({ success: true, connected: true, lastSync: integration.lastSync });
    }
    res.json({ success: true, connected: false });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error checking integration status' });
  }
});

// @route   GET /api/ebay/account-deletion
// @desc    Handle eBay Marketplace Account Deletion (MAD) Verification
router.get('/account-deletion', (req, res) => {
  const challengeCode = req.query.challenge_code;
  const verificationToken = 'UdealWholesalePlatformToken2026eBayAPI12';
  // Note: the endpoint URL must match EXACTLY what is pasted into eBay
  const endpoint = `https://${req.get('host')}/api/ebay/account-deletion`;
  
  if (challengeCode) {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    hash.update(challengeCode);
    hash.update(verificationToken);
    hash.update(endpoint);
    const responseHash = hash.digest('hex');
    
    res.json({
      "challengeResponse": responseHash
    });
  } else {
    res.status(200).send('OK');
  }
});

// @route   POST /api/ebay/account-deletion
// @desc    Acknowledge eBay Marketplace Account Deletion (MAD) Notification
router.post('/account-deletion', (req, res) => {
  // Acknowledge receipt of the notification immediately
  res.status(200).send('OK');
  
  // Asynchronous processing of deletion payload could go here
  console.log('Received eBay account deletion notification:', req.body);
});

// Helper to get active token
async function getEbayToken() {
  const integration = await Integration.findOne({ platform: 'ebay' });
  if (!integration || !integration.isConnected) throw new Error('eBay not connected');

  // Check if token expired (add 5 min buffer)
  const now = new Date();
  if (integration.credentials.tokenExpiry <= new Date(now.getTime() + 5 * 60000)) {
    // Refresh token
    const appId = process.env.EBAY_APP_ID;
    const certId = process.env.EBAY_CERT_ID;
    const authHeader = Buffer.from(`${appId}:${certId}`).toString('base64');
    const tokenBaseUrl = process.env.EBAY_ENV !== 'production' 
      ? 'https://api.sandbox.ebay.com/identity/v1/oauth2/token' 
      : 'https://api.ebay.com/identity/v1/oauth2/token';

    const response = await axios.post(tokenBaseUrl, new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: integration.credentials.refreshToken,
      scope: EBAY_SCOPES
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `Basic ${authHeader}` }
    });

    integration.credentials.accessToken = response.data.access_token;
    const newExpiry = new Date();
    newExpiry.setSeconds(newExpiry.getSeconds() + response.data.expires_in);
    integration.credentials.tokenExpiry = newExpiry;
    await integration.save();
  }
  return integration.credentials.accessToken;
}

// @route   GET /api/ebay/sync-orders
// @desc    Pull active orders from eBay Fulfillment API
router.get('/sync-orders', protect, async (req, res) => {
  try {
    const accessToken = await getEbayToken();
    // Removed the filter so it pulls ALL recent orders (including shipped/completed)
    const apiUrl = process.env.EBAY_ENV !== 'production'
      ? 'https://api.sandbox.ebay.com/sell/fulfillment/v1/order?limit=50'
      : 'https://api.ebay.com/sell/fulfillment/v1/order?limit=50';

    const response = await axios.get(apiUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
    });

    const orders = response.data.orders || [];
    let syncedCount = 0;

    for (let order of orders) {
      // Check if order already exists
      const exists = await Sale.findOne({ externalOrderId: order.orderId });
      if (exists) continue;

      // Extract items
      const items = order.lineItems.map(item => ({
        externalLineItemId: item.lineItemId,
        model: item.title,
        salePrice: parseFloat(item.lineItemCost?.value || 0),
        condition: 'Unknown' // will be updated when staff binds IMEI
      }));

      // Calculate totals and extract advanced fields
      const subtotal = parseFloat(order.pricingSummary?.priceSubtotal?.value || 0);
      const deliveryCost = parseFloat(order.pricingSummary?.deliveryCost?.value || 0);
      const marketplaceFees = parseFloat(order.totalMarketplaceFee?.value || 0);

      // Sum up tax from line items (eBay often hides tax from pricingSummary because they remit it directly)
      let calculatedTax = 0;
      order.lineItems.forEach(item => {
        if (item.ebayCollectAndRemitTaxes) {
          item.ebayCollectAndRemitTaxes.forEach(tax => {
            calculatedTax += parseFloat(tax.amount?.value || 0);
          });
        }
      });

      const totalAmount = subtotal + deliveryCost + calculatedTax;

      // Extract carrier info
      const carrierCode = order.fulfillmentStartInstructions?.[0]?.shippingStep?.shippingCarrierCode || '';
      const serviceCode = order.fulfillmentStartInstructions?.[0]?.shippingStep?.shippingServiceCode || '';

      const custName = order.fulfillmentStartInstructions?.[0]?.shippingStep?.shipTo?.fullName || order.buyer?.username || 'eBay Buyer';
      const custPhone = order.fulfillmentStartInstructions?.[0]?.shippingStep?.shipTo?.primaryPhone?.phoneNumber || order.buyer?.buyerRegistrationAddress?.primaryPhone?.phoneNumber || '0000000000';
      const custStreet = [order.fulfillmentStartInstructions?.[0]?.shippingStep?.shipTo?.contactAddress?.addressLine1, order.fulfillmentStartInstructions?.[0]?.shippingStep?.shipTo?.contactAddress?.addressLine2].filter(Boolean).join(', ');
      const custCity = order.fulfillmentStartInstructions?.[0]?.shippingStep?.shipTo?.contactAddress?.city || '';
      const custState = order.fulfillmentStartInstructions?.[0]?.shippingStep?.shipTo?.contactAddress?.stateOrProvince || '';
      const custZip = order.fulfillmentStartInstructions?.[0]?.shippingStep?.shipTo?.contactAddress?.postalCode || '';
      const custCountry = order.fulfillmentStartInstructions?.[0]?.shippingStep?.shipTo?.contactAddress?.countryCode || 'US';
      const ebayUser = order.buyer?.username || '';

      // Find or Create Customer
      let customer = null;
      if (custPhone && custPhone !== '0000000000') {
        customer = await Customer.findOne({ 'contact.phone': custPhone });
      }
      if (!customer && custName && custName !== 'eBay Buyer') {
        customer = await Customer.findOne({ name: custName });
      }

      if (!customer) {
        customer = new Customer({
          name: custName,
          ebayUsername: ebayUser,
          type: 'retail',
          contact: { phone: custPhone },
          address: {
            street: custStreet,
            city: custCity,
            state: custState,
            zipCode: custZip,
            country: custCountry
          },
          notes: 'Auto-imported from eBay'
        });
        await customer.save();
      } else {
        // Update total purchases and ebayUsername if it was missing
        customer.totalPurchases = (customer.totalPurchases || 0) + 1;
        customer.totalSpent = (customer.totalSpent || 0) + totalAmount;
        if (ebayUser && !customer.ebayUsername) customer.ebayUsername = ebayUser;
        await customer.save();
      }

      // Create new Sale
      const newSale = new Sale({
        externalOrderId: order.orderId,
        customer: customer._id,
        customerName: custName,
        items: items,
        subtotal: subtotal,
        tax: calculatedTax,
        totalAmount: totalAmount,
        paymentMethod: 'ebay',
        paymentStatus: order.orderPaymentStatus === 'PAID' ? 'paid' : 'pending',
        salesChannel: 'ebay',
        status: 'pending',
        deliveryStatus: 'pending',
        shipping: {
          shippingCollected: deliveryCost,
          shippingCost: 0,
          carrier: carrierCode.toLowerCase() === 'usps' ? 'USPS' : carrierCode.toLowerCase() === 'fedex' ? 'FedEx' : carrierCode.toLowerCase() === 'ups' ? 'UPS' : carrierCode || 'Other',
          shippingMethod: serviceCode,
          address: {
            name: custName,
            street: custStreet,
            city: custCity,
            state: custState,
            zipCode: custZip,
            country: custCountry,
            phone: custPhone
          }
        },
        costs: { marketplaceFees: marketplaceFees, packaging: 2, handling: 1 },
        createdBy: req.user.id,
        createdAt: new Date(order.creationDate)
      });

      await newSale.save();
      syncedCount++;
    }

    // Update last sync time
    await Integration.findOneAndUpdate({ platform: 'ebay' }, { lastSync: new Date() });

    res.json({ success: true, message: `Successfully synced ${syncedCount} new eBay orders.`, count: syncedCount });
  } catch (err) {
    console.error('eBay sync error:', err.response?.data || err.message);
    res.status(500).json({ success: false, message: 'Failed to sync eBay orders', error: err.message });
  }
});

// @route   POST /api/ebay/fulfill/:saleId
// @desc    Push tracking number to eBay to fulfill the order
router.post('/fulfill/:saleId', protect, async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.saleId);
    if (!sale) return res.status(404).json({ success: false, message: 'Sale not found' });
    if (!sale.externalOrderId || sale.paymentMethod !== 'ebay') {
      return res.status(400).json({ success: false, message: 'Not an eBay order' });
    }
    if (!sale.shipping || !sale.shipping.trackingNumber) {
      return res.status(400).json({ success: false, message: 'Sale is missing tracking number' });
    }

    const carrierCode = sale.shipping.carrier || 'USPS';
    const trackingNumber = sale.shipping.trackingNumber;
    
    // We must fulfill specific line items. For simplicity, we fulfill all items in the order that have an externalLineItemId.
    const lineItemsToFulfill = sale.items
      .filter(item => item.externalLineItemId)
      .map(item => ({ lineItemId: item.externalLineItemId }));

    if (lineItemsToFulfill.length === 0) {
      return res.status(400).json({ success: false, message: 'No eBay line item IDs found on this sale' });
    }

    const accessToken = await getEbayToken();
    const apiUrl = process.env.EBAY_ENV !== 'production'
      ? `https://api.sandbox.ebay.com/sell/fulfillment/v1/order/${sale.externalOrderId}/shipping_fulfillment`
      : `https://api.ebay.com/sell/fulfillment/v1/order/${sale.externalOrderId}/shipping_fulfillment`;

    const payload = {
      lineItems: lineItemsToFulfill,
      shippingCarrierCode: carrierCode,
      trackingNumber: trackingNumber
    };

    const response = await axios.post(apiUrl, payload, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({ success: true, message: 'Order fulfilled on eBay', fulfillmentId: response.data.fulfillmentId });
  } catch (error) {
    console.error('eBay Fulfillment Error:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      message: error.response?.data?.errors?.[0]?.message || error.message 
    });
  }
});

// @route   GET /api/ebay/messages/unread
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

    const headersXmlSent = `<?xml version="1.0" encoding="utf-8"?>
<GetMyMessagesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${accessToken}</eBayAuthToken>
  </RequesterCredentials>
  <DetailLevel>ReturnHeaders</DetailLevel>
  <FolderID>1</FolderID>
  <Pagination>
    <EntriesPerPage>100</EntriesPerPage>
    <PageNumber>1</PageNumber>
  </Pagination>
</GetMyMessagesRequest>`;

    const [inboxHeaders, sentHeaders] = await Promise.all([
      fetchHeaders(headersXmlInbox),
      fetchHeaders(headersXmlSent)
    ]);

    let rawHeaders = [...inboxHeaders, ...sentHeaders];
    rawHeaders.sort((a, b) => new Date(a.ReceiveDate) - new Date(b.ReceiveDate));
    
    rawHeaders.reverse();
    rawHeaders = rawHeaders.slice(0, 100);
    rawHeaders.reverse();

    const conversationsMap = {};
    rawHeaders.forEach(msg => {
      let participant = msg.Sender;
      const isSentByMe = msg.Folder?.FolderID === '1';
      if (isSentByMe) {
        participant = msg.SendToName || 'Unknown';
      }

      let rawItemId = msg.ItemID;
      const itemIdMatch = msg.Subject?.match(/#(\d{12})/);
      if (!rawItemId && itemIdMatch) rawItemId = itemIdMatch[1];
      const key = `${participant}_${rawItemId || 'no_item'}`;
      
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
});

// @route   GET /api/ebay/messages
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

    const fetchHeaders = async (xml) => {
      const response = await axios.post(apiUrl, xml, {
        headers: {
          'X-EBAY-API-SITEID': '0',
          'X-EBAY-API-COMPATIBILITY-LEVEL': '1311',
          'X-EBAY-API-CALL-NAME': 'GetMyMessages',
          'Content-Type': 'text/xml'
        }
      });
      const parser = new xml2js.Parser({ explicitArray: false });
      const result = await parser.parseStringPromise(response.data);
      if (result.GetMyMessagesResponse?.Ack === 'Failure') return [];
      let msgs = result.GetMyMessagesResponse?.Messages?.Message;
      if (!msgs) return [];
      return Array.isArray(msgs) ? msgs : [msgs];
    };

    const folderIds = [0, 1, 2, 3];
    const fetchPromises = folderIds.map(folder => {
      const xml = `<?xml version="1.0" encoding="utf-8"?>
<GetMyMessagesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${accessToken}</eBayAuthToken>
  </RequesterCredentials>
  <DetailLevel>ReturnHeaders</DetailLevel>
  <FolderID>${folder}</FolderID>
  <Pagination>
    <EntriesPerPage>${entriesPerPage}</EntriesPerPage>
    <PageNumber>${page}</PageNumber>
  </Pagination>
</GetMyMessagesRequest>`;
      return fetchHeaders(xml);
    });

    const results = await Promise.all(fetchPromises);
    let rawHeaders = results.flat();
    
    // Sort by ReceiveDate descending
    rawHeaders.sort((a, b) => new Date(b.ReceiveDate) - new Date(a.ReceiveDate));

    
    if (rawHeaders.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // We can only request up to 10 messages at a time for bodies in GetMyMessages
    // We will chunk the MessageIDs into arrays of 10 and do Promise.all
    const chunkArray = (arr, size) => {
      return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
        arr.slice(i * size, i * size + size)
      );
    };

    const chunks = chunkArray(rawHeaders, 10);
    let rawMessages = [];

    await Promise.all(chunks.map(async (chunk) => {
      const messageIDs = chunk.map(m => `<MessageID>${m.MessageID}</MessageID>`).join('\n    ');
      const bodiesXml = `<?xml version="1.0" encoding="utf-8"?>
<GetMyMessagesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${accessToken}</eBayAuthToken>
  </RequesterCredentials>
  <DetailLevel>ReturnMessages</DetailLevel>
  <MessageIDs>
    ${messageIDs}
  </MessageIDs>
</GetMyMessagesRequest>`;

      try {
        const bodiesResponse = await axios.post(apiUrl, bodiesXml, {
          headers: {
            'X-EBAY-API-SITEID': '0',
            'X-EBAY-API-COMPATIBILITY-LEVEL': '1311',
            'X-EBAY-API-CALL-NAME': 'GetMyMessages',
            'Content-Type': 'text/xml'
          }
        });
        const parser = new xml2js.Parser({ explicitArray: false });
        const bodiesResult = await parser.parseStringPromise(bodiesResponse.data);
        if (bodiesResult.GetMyMessagesResponse?.Ack !== 'Failure') {
          const bodiesObj = bodiesResult.GetMyMessagesResponse?.Messages?.Message;
          if (Array.isArray(bodiesObj)) {
            rawMessages.push(...bodiesObj);
          } else if (bodiesObj) {
            rawMessages.push(bodiesObj);
          }
        } else {
          // Fallback to headers if bodies fail for this chunk
          rawMessages.push(...chunk);
        }
      } catch (err) {
        // Fallback to headers
        rawMessages.push(...chunk);
      }
    }));

    const readStatusMap = {};
    rawHeaders.forEach(h => {
      readStatusMap[h.MessageID] = h.Read === 'true';
    });

    const formattedMessages = rawMessages.map(msg => {
      let mediaUrl = '';
      if (msg.MessageMedia) {
        if (Array.isArray(msg.MessageMedia) && msg.MessageMedia.length > 0) {
          mediaUrl = msg.MessageMedia[0].MediaURL;
        } else if (msg.MessageMedia.MediaURL) {
          mediaUrl = msg.MessageMedia.MediaURL;
        }
      }

      let rawBody = msg.Text || '';
      let cleanBody = rawBody;
      const userTextMatch = rawBody.match(/<div id="UserInputtedText">([\s\S]*?)<\/div>/i);
      if (userTextMatch) {
        cleanBody = userTextMatch[1].trim();
      } else {
        const v4Match = rawBody.match(/<div id="V4PrimaryMessage"[\s\S]*?<td>\s*<font[^>]*>[\s\S]*?<\/strong>(?:<br\s*\/?>)+([\s\S]*?)(?:<br\s*\/?>)+\s*<\/font>\s*<div/i);
        if (v4Match) {
          cleanBody = v4Match[1].trim();
        }
      }

      return {
        id: msg.ExternalMessageID || msg.MessageID,
        originalMessageId: msg.MessageID,
        sender: msg.Sender,
        sendToName: msg.SendToName,
        subject: msg.Subject,
        itemTitle: msg.ItemTitle || 'No Item',
        itemId: msg.ItemID,
        date: msg.ReceiveDate,
        body: cleanBody,
        rawHtml: rawBody,
        mediaUrl: mediaUrl,
        folderId: msg.Folder?.FolderID || '0',
        isRead: readStatusMap[msg.MessageID] !== undefined ? readStatusMap[msg.MessageID] : msg.Read === 'true',
        replies: []
      };
    });

    // For better UX, we group messages by Sender and ItemID to simulate "Conversations"
    const conversationsMap = {};
    
    // Sort chronological so replies come after initial messages
    formattedMessages.sort((a, b) => new Date(a.date) - new Date(b.date));

    formattedMessages.forEach(msg => {
      // eBay messages usually have a subject like "Re: Question about item"
      // We'll group by Participant and ItemId
      const isSentByMe = msg.folderId === '1' || msg.sender === 'itscitysale';
      const participant = msg.sender === 'itscitysale' ? (msg.sendToName || 'eBay Buyer') : msg.sender;
      const key = `${participant}_${msg.itemId || 'no-item'}`;
      
      if (!conversationsMap[key]) {
        let respondedBy = null;
        let respondedDate = null;
        
        if (isSentByMe) {
          const cleanEbayBody = msg.body.replace(/\s+/g, '').toLowerCase();
          const match = localSentMessages.find(l => 
            l.recipient === participant && 
            cleanEbayBody.includes(l.body.replace(/\s+/g, '').toLowerCase().substring(0, 50)) &&
            Math.abs(new Date(l.date) - new Date(msg.date)) < 1000 * 60 * 60 * 48 // within 48 hours
          );
          if (match) {
            respondedBy = match.respondedBy;
            respondedDate = match.date;
          }
        }

        conversationsMap[key] = {
          id: msg.id,
          originalMessageId: msg.originalMessageId,
          sender: participant,
          subject: msg.subject,
          itemTitle: msg.itemTitle,
          itemId: msg.itemId,
          date: msg.date,
          body: msg.body,
          isRead: isSentByMe ? true : msg.isRead,
          folderId: msg.folderId,
          respondedBy,
          respondedDate,
          replies: []
        };
        if (isSentByMe) {
          conversationsMap[key].replies.push({
            sender: 'Me',
            body: msg.body,
            date: msg.date,
            respondedBy,
            respondedDate
          });
        }
      } else {
        let respondedBy = null;
        let respondedDate = null;
        
        if (isSentByMe) {
          const cleanEbayBody = msg.body.replace(/\s+/g, '').toLowerCase();
          const match = localSentMessages.find(l => 
            l.recipient === participant && 
            cleanEbayBody.includes(l.body.replace(/\s+/g, '').toLowerCase().substring(0, 50)) &&
            Math.abs(new Date(l.date) - new Date(msg.date)) < 1000 * 60 * 60 * 48
          );
          if (match) {
            respondedBy = match.respondedBy;
            respondedDate = match.date;
          }
        }

        // Append as reply
        conversationsMap[key].replies.push({
          sender: isSentByMe ? 'Me' : participant,
          body: msg.body,
          date: msg.date,
          respondedBy,
          respondedDate
        });
        // Update main read status and latest date
        conversationsMap[key].isRead = isSentByMe ? true : msg.isRead;
        conversationsMap[key].date = msg.date;
        // Keep the latest buyer message ID to use as ParentMessageID for replies
        if (!isSentByMe) {
          conversationsMap[key].id = msg.id;
        }
      }
    });

    const groupedData = Object.values(conversationsMap).sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Fetch related eBay orders for each conversation participant
    try {
      const participants = [...new Set(groupedData.map(c => c.sender))];
      const customers = await Customer.find({ ebayUsername: { $in: participants } }).lean();
      
      const customerMap = {};
      customers.forEach(c => { customerMap[c.ebayUsername] = c._id });
      
      const customerIds = customers.map(c => c._id);
      const relatedSales = await Sale.find({
        $or: [
          { customer: { $in: customerIds } }
        ]
      }).populate('items.inventory').sort({ createdAt: -1 }).lean();

      // We will also fetch any sales that match the itemId directly
      const allItemIds = groupedData.map(c => c.itemId).filter(Boolean);
      let itemSales = [];
      if (allItemIds.length > 0) {
        itemSales = await Sale.find({ 'items.externalLineItemId': { $regex: new RegExp(allItemIds.join('|')) } })
          .populate('items.inventory').sort({ createdAt: -1 }).lean();
      }
      const allSales = [...relatedSales, ...itemSales];

      const salesByCustomer = {};
      const salesByItemId = {};
      
      allSales.forEach(s => {
        if (s.customer) {
          if (!salesByCustomer[s.customer]) salesByCustomer[s.customer] = [];
          if (!salesByCustomer[s.customer].find(existing => existing._id.toString() === s._id.toString())) {
            salesByCustomer[s.customer].push(s);
          }
        }
        if (s.items && s.items.length > 0) {
          s.items.forEach(item => {
            if (item.externalLineItemId) {
              const baseItemId = item.externalLineItemId.substring(0, 12); // First 12 digits usually item ID
              if (!salesByItemId[baseItemId]) salesByItemId[baseItemId] = [];
              if (!salesByItemId[baseItemId].find(existing => existing._id.toString() === s._id.toString())) {
                salesByItemId[baseItemId].push(s);
              }
            }
          });
        }
      });
      
      groupedData.forEach(c => {
        const custId = customerMap[c.sender];
        c.relatedOrders = [];
        if (custId && salesByCustomer[custId]) {
          c.relatedOrders.push(...salesByCustomer[custId]);
        }
        if (c.itemId && salesByItemId[c.itemId]) {
          salesByItemId[c.itemId].forEach(s => {
            if (!c.relatedOrders.find(existing => existing._id.toString() === s._id.toString())) {
              c.relatedOrders.push(s);
            }
          });
        }
      });
    } catch (orderErr) {
      console.error('Failed to attach related orders:', orderErr.message);
      groupedData.forEach(c => c.relatedOrders = []);
    }

    try {
      const ConversationMeta = require('../models/ConversationMeta');
      const keys = groupedData.map(c => `${c.sender}_${c.itemId || 'no-item'}`);
      const metaData = await ConversationMeta.find({ platform: 'ebay', conversationKey: { $in: keys } })
        .populate('assignedTo', 'name email role')
        .populate('internalNotes.sender', 'name email role')
        .lean();
        
      const metaMap = {};
      metaData.forEach(m => metaMap[m.conversationKey] = m);

      groupedData.forEach(c => {
        const key = `${c.sender}_${c.itemId || 'no-item'}`;
        const meta = metaMap[key] || { assignedTo: [], internalNotes: [] };
        c.assignedTo = meta.assignedTo;
        c.internalNotes = meta.internalNotes;
        c.conversationKey = key;
      });
    } catch (metaErr) {
      console.error('Failed to attach conversation meta:', metaErr.message);
      groupedData.forEach(c => {
        c.assignedTo = [];
        c.internalNotes = [];
        c.conversationKey = `${c.sender}_${c.itemId || 'no-item'}`;
      });
    }

    console.log(`Formatted messages: ${formattedMessages.length}, Grouped data: ${groupedData.length}`);

    let finalData = groupedData;
    if (req.user && req.user.role !== 'admin') {
      finalData = finalData.filter(c => 
        c.assignedTo && c.assignedTo.some(u => u._id.toString() === req.user._id.toString())
      );
    }

    res.json({ success: true, data: finalData, hasMore: rawHeaders.length >= entriesPerPage });
  } catch (error) {
    console.error('eBay Messages Error:', error.response?.data || error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch eBay messages' });
  }
});

// @route   POST /api/ebay/messages/:id/reply
// @desc    Reply to an eBay message via Trading API
router.post('/messages/:id/reply', protect, async (req, res) => {
  try {
    const { body, itemId, recipient } = req.body;
    if (!body || !itemId || !recipient) {
      return res.status(400).json({ success: false, message: 'Body, itemId, and recipient are required' });
    }

    const accessToken = await getEbayToken();
    const apiUrl = process.env.EBAY_ENV !== 'production' 
      ? 'https://api.sandbox.ebay.com/ws/api.dll' 
      : 'https://api.ebay.com/ws/api.dll';

    // To reply, we use AddMemberMessageRTQ
    const xmlBody = `<?xml version="1.0" encoding="utf-8"?>
<AddMemberMessageRTQRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${accessToken}</eBayAuthToken>
  </RequesterCredentials>
  <ItemID>${itemId}</ItemID>
  <MemberMessage>
    <Body><![CDATA[${body}]]></Body>
    <EmailCopyToSender>false</EmailCopyToSender>
    <DisplayToPublic>false</DisplayToPublic>
    <ParentMessageID>${req.params.id}</ParentMessageID>
    <RecipientID>${recipient}</RecipientID>
  </MemberMessage>
</AddMemberMessageRTQRequest>`;

    const response = await axios.post(apiUrl, xmlBody, {
      headers: {
        'X-EBAY-API-SITEID': '0',
        'X-EBAY-API-COMPATIBILITY-LEVEL': '1311',
        'X-EBAY-API-CALL-NAME': 'AddMemberMessageRTQ',
        'Content-Type': 'text/xml'
      }
    });

    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(response.data);

    if (result.AddMemberMessageRTQResponse?.Ack === 'Failure') {
      console.error('eBay API Reply Error:', result.AddMemberMessageRTQResponse.Errors);
      return res.status(400).json({ success: false, message: 'Failed to send reply on eBay' });
    }

    const EbaySentMessage = require('../models/EbaySentMessage');
    await EbaySentMessage.create({
      originalMessageId: req.params.id,
      itemId,
      recipient,
      body,
      respondedBy: req.user.name || 'Admin'
    });

    res.json({ success: true, message: 'Reply sent successfully' });
  } catch (error) {
    console.error('eBay Reply Error:', error.response?.data || error.message);
    res.status(500).json({ success: false, message: 'Failed to send reply' });
  }
});

router.getEbayToken = getEbayToken;
// @route   POST /api/ebay/messages/translate
// @desc    Translate text using free Google Translate API
router.post('/messages/translate', protect, async (req, res) => {
  try {
    const { text, targetLang = 'en' } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, message: 'Text is required' });
    }

    // Strip HTML tags for clean translation if it contains any
    const cleanText = text.replace(/<[^>]*>?/gm, '');

    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(cleanText)}`;
    const response = await axios.get(url);
    const translatedText = response.data[0].map(x => x[0]).join('');

    res.json({ success: true, translatedText });
  } catch (error) {
    console.error('Translation Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to translate message' });
  }
});

// @route   POST /api/ebay/messages/suggest
// @desc    Suggest smart replies
router.post('/messages/suggest', protect, async (req, res) => {
  try {
    const { text, order } = req.body;
    if (!text) return res.status(400).json({ success: false, message: 'Text required' });

    const cleanText = text.toLowerCase();
    let suggestions = [];

    // If an order is provided, prepend context-aware suggestions
    if (order) {
      const isDelivered = order.status === 'delivered' || order.deliveryStatus === 'delivered';
      const isShipped = order.status === 'shipped' || order.status === 'completed' || order.deliveryStatus === 'shipped' || order.deliveryStatus === 'in_transit' || order.deliveryStatus === 'out_for_delivery';
      const tracking = order.shipping?.trackingNumber;
      
      if (isDelivered) {
        if (tracking) {
          suggestions.push(`Your order shows as delivered! Tracking number: ${tracking}. Hope you enjoy the item!`);
        } else {
          suggestions.push(`Your order shows as delivered! Hope you enjoy the item!`);
        }
      } else if ((isShipped || tracking) && tracking) {
        suggestions.push(`Your order has been shipped! Tracking number: ${tracking}`);
      } else if (isShipped) {
        suggestions.push("Your order has been shipped and is on its way.");
      } else {
        suggestions.push("Thank you for your order! We are processing it and will ship it out soon.");
      }
    }

    if (cleanText.includes('battery')) {
      suggestions.push("The battery health is excellent and holds a great charge.");
      suggestions.push("The battery is in great shape as it is an open box item.");
    }
    if (cleanText.includes('scratch') || cleanText.includes('condition')) {
      suggestions.push("The item is in pristine condition with no visible scratches.");
      suggestions.push("It's in new shape, exactly as described.");
    }
    if (cleanText.includes('price') || cleanText.includes('lowest') || cleanText.includes('discount') || cleanText.includes('offer')) {
      suggestions.push("This is our best price, we've already discounted it heavily.");
      suggestions.push("I can offer a 5% discount if you purchase today.");
    }
    if (cleanText.includes('shipping') || cleanText.includes('when')) {
      if (!order) suggestions.push("We ship within 1 business day of receiving payment.");
      suggestions.push("It will be shipped out today via USPS/FedEx.");
    }
    if (cleanText.includes('return')) {
      suggestions.push("Yes, we accept returns within 30 days if the item is in its original condition.");
    }

    // Default fallbacks if no heuristics matched
    if (suggestions.length === 0) {
      suggestions.push("Yes, it is available.");
      suggestions.push("It's in new shape.");
      suggestions.push("Let me know if you have any other questions!");
    }

    res.json({ success: true, suggestions: suggestions.slice(0, 3) });
  } catch (error) {
    console.error('Suggest Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to generate suggestions' });
  }
});


// Mark message as read
router.post('/messages/:id/read', protect, async (req, res) => {
  try {
    const accessToken = await getEbayToken();
    const apiUrl = process.env.EBAY_ENV !== 'production' 
      ? 'https://api.sandbox.ebay.com/ws/api.dll' 
      : 'https://api.ebay.com/ws/api.dll';

    const xmlBody = `<?xml version="1.0" encoding="utf-8"?>
<ReviseMyMessagesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${accessToken}</eBayAuthToken>
  </RequesterCredentials>
  <MessageIDs>
    <MessageID>${req.params.id}</MessageID>
  </MessageIDs>
  <Read>true</Read>
</ReviseMyMessagesRequest>`;

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

// @route   POST /api/ebay/import-listings
// @desc    Import active eBay listings into master Listing collection
router.post('/import-listings', async (req, res) => {
  try {
    const { importEbayListings } = require('../services/ebayListingService');
    const result = await importEbayListings();
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('eBay import error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
