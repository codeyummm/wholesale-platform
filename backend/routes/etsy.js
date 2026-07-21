const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('crypto');
const Integration = require('../models/Integration');

// Base URLs
const ETSY_API_V3_BASE_URL = 'https://openapi.etsy.com/v3/public';

// We need to temporarily store the code_verifier between requests.
// In a production app, this should be in a session or Redis, but for a simple internal tool, a Map in memory is sufficient.
const codeVerifiers = new Map();

function base64URLEncode(str) {
  return str.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// @route   GET /api/etsy/auth
// @desc    Initiate Etsy OAuth 2.0 PKCE connection
router.get('/auth', (req, res) => {
  const apiKey = process.env.ETSY_KEYSTRING;
  const redirectUri = process.env.ETSY_REDIRECT_URI || 'http://localhost:5000/api/etsy/callback';

  if (!apiKey) {
    return res.status(500).json({ success: false, message: 'Etsy credentials not configured.' });
  }

  // 1. Generate a PKCE code_verifier and code_challenge
  const codeVerifier = base64URLEncode(crypto.randomBytes(32));
  const codeChallenge = base64URLEncode(crypto.createHash('sha256').update(codeVerifier).digest());
  
  // Create a unique state token to map the verifier
  const state = crypto.randomBytes(16).toString('hex');
  codeVerifiers.set(state, codeVerifier);

  // Scopes needed for listings
  const scopes = encodeURIComponent(['listings_r', 'listings_w', 'shops_r'].join(' '));

  const authUrl = `https://www.etsy.com/oauth/connect?response_type=code&client_id=${apiKey}&redirect_uri=${redirectUri}&scope=${scopes}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`;
  
  res.redirect(authUrl);
});

// @route   GET /api/etsy/callback
// @desc    Etsy OAuth callback handler
router.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    console.error('Etsy Auth Error:', error);
    return res.redirect('http://localhost:5173/sales-channels?etsyAuth=failed');
  }

  if (!code || !state) {
    return res.status(400).send('Missing code or state');
  }

  const codeVerifier = codeVerifiers.get(state);
  if (!codeVerifier) {
    return res.status(400).send('Invalid state or session expired. Try connecting again.');
  }

  codeVerifiers.delete(state); // Clean up

  try {
    const apiKey = process.env.ETSY_KEYSTRING;
    const redirectUri = process.env.ETSY_REDIRECT_URI || 'http://localhost:5000/api/etsy/callback';

    // 2. Exchange authorization code for an access token
    const response = await axios.post('https://api.etsy.com/v3/public/oauth/token', {
      grant_type: 'authorization_code',
      client_id: apiKey,
      redirect_uri: redirectUri,
      code: code,
      code_verifier: codeVerifier
    });

    const { access_token, refresh_token, expires_in } = response.data;
    
    // Calculate expiry date
    const tokenExpiry = new Date();
    tokenExpiry.setSeconds(tokenExpiry.getSeconds() + expires_in);

    // Get the user's shop ID (Etsy v3 requires shop_id for most endpoints)
    // We can fetch this using the /application/users/me endpoint
    const meResponse = await axios.get('https://openapi.etsy.com/v3/application/users/me', {
      headers: {
        'x-api-key': apiKey,
        'Authorization': `Bearer ${access_token}`
      }
    });
    
    const userId = meResponse.data.user_id;
    const shopId = meResponse.data.shop_id; // Etsy API returns the shop_id here usually

    // Save Integration document
    await Integration.findOneAndUpdate(
      { platform: 'etsy' },
      {
        platform: 'etsy',
        isConnected: true,
        credentials: {
          accessToken: access_token,
          refreshToken: refresh_token,
          tokenExpiry: tokenExpiry,
          shopId: shopId,
          userId: userId
        }
      },
      { upsert: true, new: true }
    );

    res.redirect('http://localhost:5173/sales-channels?etsyAuth=success');

  } catch (err) {
    console.error('Etsy Token Exchange Error:', err.response ? err.response.data : err.message);
    res.redirect('http://localhost:5173/sales-channels?etsyAuth=failed');
  }
});

// @route   POST /api/etsy/import-listings
// @desc    Import active Etsy listings into master Listing collection
router.post('/import-listings', async (req, res) => {
  try {
    const { importEtsyListings } = require('../services/etsyListingService');
    const result = await importEtsyListings();
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Etsy import error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
