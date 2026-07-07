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
