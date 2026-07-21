const axios = require('axios');
const xml2js = require('xml2js');
const Integration = require('../models/Integration');
const ChannelListing = require('../models/ChannelListing');
const SyncJob = require('../models/SyncJob');

const isSandbox = process.env.EBAY_ENV !== 'production';
const tradingApiUrl = isSandbox ? 'https://api.sandbox.ebay.com/ws/api.dll' : 'https://api.ebay.com/ws/api.dll';

/**
 * Creates an eBay listing using the Trading API (VerifyAddItem or AddItem)
 */
exports.createEbayListing = async (listing, syncOptions) => {
  try {
    // 1. Get the eBay OAuth token from the database
    const integration = await Integration.findOne({ platform: 'ebay', isConnected: true });
    
    // Check if token exists and is valid
    if (!integration || !integration.credentials || !integration.credentials.accessToken) {
      throw new Error('eBay integration not found or missing access token. Please connect eBay first.');
    }
    
    const accessToken = integration.credentials.accessToken;

    // 2. Build the AddItem request XML
    const ebaySettings = listing.platformSettings?.ebay || {};
    const { categoryId, conditionId, returnProfileId, shippingProfileId, paymentProfileId } = ebaySettings;
    const { useSandboxTest = false } = syncOptions;
    
    // Choose between VerifyAddItem (test only, no fees) and AddItem (actually lists)
    const callName = useSandboxTest ? 'VerifyAddItem' : 'AddItem';

    const xmlPayload = `<?xml version="1.0" encoding="utf-8"?>
<${callName}Request xmlns="urn:ebay:apis:eBLBaseComponents">
  <ErrorLanguage>en_US</ErrorLanguage>
  <WarningLevel>High</WarningLevel>
  <Item>
    <Title><![CDATA[${listing.title.substring(0, 80)}]]></Title>
    <Description><![CDATA[${listing.description || listing.title}]]></Description>
    <PrimaryCategory>
      <CategoryID>${categoryId || '9355'}</CategoryID>
    </PrimaryCategory>
    <StartPrice currencyID="USD">${listing.price}</StartPrice>
    <ConditionID>${conditionId || '3000'}</ConditionID>
    <Country>US</Country>
    <Currency>USD</Currency>
    <DispatchTimeMax>1</DispatchTimeMax>
    <ListingDuration>GTC</ListingDuration>
    <ListingType>FixedPriceItem</ListingType>
    <PostalCode>90210</PostalCode>
    <Quantity>${listing.quantity || 1}</Quantity>
    
    ${listing.sku ? `<SKU>${listing.sku}</SKU>` : ''}
    
    <PictureDetails>
      <PictureURL>${listing.images && listing.images.length > 0 ? listing.images[0].url : 'https://example.com/placeholder.jpg'}</PictureURL>
    </PictureDetails>

    <SellerProfiles>
      <SellerPaymentProfile>
        <PaymentProfileID>${paymentProfileId || '0'}</PaymentProfileID>
      </SellerPaymentProfile>
      <SellerReturnProfile>
        <ReturnProfileID>${returnProfileId || '0'}</ReturnProfileID>
      </SellerReturnProfile>
      <SellerShippingProfile>
        <ShippingProfileID>${shippingProfileId || '0'}</ShippingProfileID>
      </SellerShippingProfile>
    </SellerProfiles>
  </Item>
</${callName}Request>`;

    // 3. Make the API Call
    const response = await axios.post(tradingApiUrl, xmlPayload, {
      headers: {
        'X-EBAY-API-SITEID': '0', // US Site
        'X-EBAY-API-COMPATIBILITY-LEVEL': '1331',
        'X-EBAY-API-CALL-NAME': callName,
        'X-EBAY-API-IAF-TOKEN': accessToken,
        'Content-Type': 'text/xml'
      }
    });

    // 4. Parse the XML response
    const parser = new xml2js.Parser({ explicitArray: false });
    const parsedResponse = await parser.parseStringPromise(response.data);
    const apiResult = parsedResponse[`${callName}Response`];
    
    if (apiResult.Ack !== 'Success' && apiResult.Ack !== 'Warning') {
      const errorMsg = apiResult.Errors 
        ? (Array.isArray(apiResult.Errors) ? apiResult.Errors[0].LongMessage : apiResult.Errors.LongMessage)
        : 'Unknown eBay error';
      throw new Error(`eBay API Error: ${errorMsg}`);
    }

    const itemId = apiResult.ItemID;
    return { success: true, remoteId: itemId, apiResult };
  } catch (error) {
    if (error.response && error.response.data) {
      console.error('eBay API XML Error Response:', error.response.data);
    }
    throw error;
  }
};

/**
 * Imports active eBay listings and converts them to master Listing records
 */
exports.importEbayListings = async () => {
  const axios = require('axios');
  const xml2js = require('xml2js');
  const Integration = require('../models/Integration');
  const Listing = require('../models/Listing');
  const ChannelListing = require('../models/ChannelListing');

  const integration = await Integration.findOne({ platform: 'ebay', isConnected: true });
  if (!integration?.credentials?.accessToken) throw new Error('eBay not connected');
  const accessToken = integration.credentials.accessToken;

  const isSandbox = process.env.EBAY_ENV !== 'production';
  const tradingApiUrl = isSandbox
    ? 'https://api.sandbox.ebay.com/ws/api.dll'
    : 'https://api.ebay.com/ws/api.dll';

  const xmlPayload = `<?xml version="1.0" encoding="utf-8"?>
<GetMyeBaySellingRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <ErrorLanguage>en_US</ErrorLanguage>
  <WarningLevel>High</WarningLevel>
  <ActiveList>
    <Include>true</Include>
    <Pagination><EntriesPerPage>100</EntriesPerPage><PageNumber>1</PageNumber></Pagination>
  </ActiveList>
</GetMyeBaySellingRequest>`;

  const response = await axios.post(tradingApiUrl, xmlPayload, {
    headers: {
      'X-EBAY-API-SITEID': '0',
      'X-EBAY-API-COMPATIBILITY-LEVEL': '1331',
      'X-EBAY-API-CALL-NAME': 'GetMyeBaySelling',
      'X-EBAY-API-IAF-TOKEN': accessToken,
      'Content-Type': 'text/xml'
    }
  });

  const parser = new xml2js.Parser({ explicitArray: false });
  const parsed = await parser.parseStringPromise(response.data);
  const result = parsed.GetMyeBaySellingResponse;
  if (result.Ack !== 'Success' && result.Ack !== 'Warning') throw new Error('eBay API error fetching listings');

  const items = result.ActiveList?.ItemArray?.Item;
  if (!items) return { imported: 0, skipped: 0 };

  const itemList = Array.isArray(items) ? items : [items];
  let imported = 0, skipped = 0;

  for (const item of itemList) {
    try {
      const sku = item.SKU || `EBAY-${item.ItemID}`;
      const existing = await Listing.findOne({ sku });
      if (existing) { skipped++; continue; }

      const newListing = await Listing.create({
        title: item.Title,
        sku,
        price: parseFloat(item.SellingStatus?.CurrentPrice?._ || item.BuyItNowPrice?._ || 0),
        quantity: parseInt(item.QuantityAvailable || item.Quantity || 1),
        condition: 'used',
        status: 'active',
        platformSettings: { ebay: { categoryId: item.PrimaryCategory?.CategoryID } }
      });

      await ChannelListing.findOneAndUpdate(
        { listingId: newListing._id, platform: 'ebay' },
        { status: 'active', remoteId: item.ItemID, lastSyncedAt: new Date() },
        { upsert: true, new: true }
      );
      imported++;
    } catch (err) {
      console.error(`Failed to import eBay item ${item.ItemID}:`, err.message);
      skipped++;
    }
  }
  return { imported, skipped };
};
