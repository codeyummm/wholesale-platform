const axios = require('axios');
const Integration = require('../models/Integration');

const getValidShopifyToken = async () => {
  const integration = await Integration.findOne({ platform: 'shopify', isConnected: true });

  if (!integration || !integration.credentials || !integration.credentials.accessToken) {
    throw new Error('Shopify is not connected or token is missing.');
  }

  let { accessToken, refreshToken, tokenExpiry, storeDomain } = integration.credentials;

  // If token is expiring in the next 5 minutes (or already expired), refresh it
  if (refreshToken && tokenExpiry && new Date(tokenExpiry.getTime() - 5 * 60000) < new Date()) {
    try {
      const apiKey = process.env.SHOPIFY_API_KEY;
      const apiSecret = process.env.SHOPIFY_API_SECRET;

      const tokenResponse = await axios.post(`https://${storeDomain}/admin/oauth/access_token`, {
        client_id: apiKey,
        client_secret: apiSecret,
        refresh_token: refreshToken,
        access_mode: 'offline',
        grant_type: 'refresh_token'
      });

      const { access_token: newAccessToken, refresh_token: newRefreshToken, expires_in } = tokenResponse.data;
      
      accessToken = newAccessToken;
      refreshToken = newRefreshToken || refreshToken;
      if (expires_in) {
        tokenExpiry = new Date(Date.now() + expires_in * 1000);
      }

      // Save new tokens to DB
      integration.credentials.accessToken = accessToken;
      integration.credentials.refreshToken = refreshToken;
      integration.credentials.tokenExpiry = tokenExpiry;
      await integration.save();
      
      console.log('[Shopify API] Successfully refreshed offline access token.');
    } catch (refreshErr) {
      console.error('[Shopify API] Token refresh failed:', refreshErr.response?.data || refreshErr.message);
      throw new Error('Failed to refresh Shopify token. You may need to reconnect Shopify in the Sales Channels page.');
    }
  }

  return { accessToken, storeDomain };
};

module.exports = {
  getValidShopifyToken
};
