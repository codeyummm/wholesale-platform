const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('crypto');
const Integration = require('../models/Integration');

const { importShopifyProducts } = require('../services/shopifyListingService');
const { syncShopifyOrders } = require('../services/shopifyOrderService');

// @route   GET /api/shopify/status
// @desc    Check if Shopify is connected
router.get('/status', async (req, res) => {
  try {
    const integration = await Integration.findOne({ platform: 'shopify' });
    if (integration && integration.isConnected) {
      return res.json({ connected: true });
    }
    res.json({ connected: false });
  } catch (err) {
    console.error('Error fetching Shopify status:', err);
    res.status(500).json({ connected: false, message: 'Server error' });
  }
});

// @route   POST /api/shopify/custom-auth
// @desc    Save a Custom App token directly (bypasses OAuth)
router.post('/custom-auth', async (req, res) => {
  try {
    const { storeDomain, accessToken } = req.body;
    
    if (!storeDomain || !accessToken) {
      return res.status(400).json({ success: false, message: 'Store domain and access token are required' });
    }

    await Integration.findOneAndUpdate(
      { platform: 'shopify' },
      {
        platform: 'shopify',
        isConnected: true,
        credentials: {
          accessToken: accessToken,
          storeDomain: storeDomain,
          shopName: storeDomain.replace('.myshopify.com', '')
        }
      },
      { upsert: true, new: true }
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Custom Auth Error:', err);
    res.status(500).json({ success: false, message: 'Server error saving token' });
  }
});

// @route   GET /api/shopify/auth
// @desc    Initiate Shopify OAuth flow
router.get('/auth', (req, res) => {
  let shop = req.query.shop;
  if (!shop) {
    return res.status(400).send('Missing shop parameter. Please provide your Shopify store domain.');
  }

  // Ensure shop ends with .myshopify.com
  if (!shop.endsWith('.myshopify.com')) {
    shop = `${shop}.myshopify.com`;
  }

  const apiKey = process.env.SHOPIFY_API_KEY;
  const redirectUri = process.env.SHOPIFY_REDIRECT_URI;

  if (!apiKey) {
    return res.status(500).send('Shopify API Key not configured in .env file.');
  }

  const scopes = 'write_products,write_inventory,read_locations,read_orders,write_orders,read_customers,read_fulfillments,write_fulfillments';
  
  // Create a random nonce for security
  const nonce = crypto.randomBytes(16).toString('hex');
  
  const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${apiKey}&scope=${scopes}&redirect_uri=${redirectUri}&state=${nonce}`;
  
  res.redirect(authUrl);
});

// @route   GET /api/shopify/callback
// @desc    Handle Shopify OAuth callback
router.get('/callback', async (req, res) => {
  let { shop, code, state, hmac } = req.query;

  if (!shop || !code || !hmac) {
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5177'}/sales-channels?shopify_success=false`);
  }

  if (!shop.endsWith('.myshopify.com')) {
    shop = `${shop}.myshopify.com`;
  }

  const apiKey = process.env.SHOPIFY_API_KEY;
  const apiSecret = process.env.SHOPIFY_API_SECRET;

  try {
    // Note: In a production app, we would also verify the HMAC signature here for security.
    
    // Exchange the authorization code for an expiring access token
    const tokenResponse = await axios.post(`https://${shop}/admin/oauth/access_token`, {
      client_id: apiKey,
      client_secret: apiSecret,
      code,
      expiring: 1
    });

    const { access_token: accessToken, refresh_token: refreshToken, expires_in } = tokenResponse.data;

    // Calculate expiry date if expires_in is provided (Shopify usually returns 3600 for expiring tokens)
    let tokenExpiry = null;
    if (expires_in) {
      tokenExpiry = new Date(Date.now() + expires_in * 1000);
    }

    // Fetch shop details to get the exact shop name
    const shopResponse = await axios.get(`https://${shop}/admin/api/2024-01/shop.json`, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
      }
    });

    const shopName = shopResponse.data.shop.name;

    // Save token to DB
    await Integration.findOneAndUpdate(
      { platform: 'shopify' },
      {
        platform: 'shopify',
        isConnected: true,
        credentials: {
          accessToken: accessToken,
          refreshToken: refreshToken,
          tokenExpiry: tokenExpiry,
          storeDomain: shop,
          shopName: shopName
        }
      },
      { upsert: true, new: true }
    );

    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5177'}/sales-channels?shopify_success=true`);

  } catch (error) {
    console.error('Shopify OAuth Error:', error.response?.data || error.message);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5177'}/sales-channels?shopify_success=false`);
  }
});


// @route   POST /api/shopify/import-products
// @desc    Import products from Shopify and save as Master Listings
router.post('/import-products', async (req, res) => {
  try {
    const importedListings = await importShopifyProducts();
    // Assuming you want to save them to the Listing collection
    const Listing = require('../models/Listing');
    const ChannelListing = require('../models/ChannelListing');
    let savedCount = 0;
    
    for (const data of importedListings) {
      try {
        const exists = await Listing.findOne({ sku: data.newListing.sku });
        if (!exists) {
          const savedListing = await Listing.create(data.newListing);
          await ChannelListing.create({
            listingId: savedListing._id,
            platform: 'shopify',
            externalId: data.externalId,
            externalUrl: `https://${data.storeDomain}/admin/products/${data.externalId}`,
            status: 'active',
            lastSync: new Date()
          });
          savedCount++;
        }
      } catch (err) {
        console.error(`Failed to import listing ${data.newListing.sku}:`, err.message);
      }
    }
    
    res.json({ success: true, imported: savedCount, totalFound: importedListings.length });
  } catch (error) {
    console.error('Failed to import Shopify products:', error);
    res.status(500).json({ success: false, message: 'Failed to import products' });
  }
});

// @route   POST /api/shopify/sync-orders
// @desc    Sync unfulfilled orders from Shopify
router.post('/sync-orders', async (req, res) => {
  try {
    const syncedCount = await syncShopifyOrders();
    res.json({ success: true, syncedCount });
  } catch (error) {
    console.error('Failed to sync Shopify orders:', error);
    res.status(500).json({ success: false, message: 'Failed to sync orders' });
  }
});

module.exports = router;
