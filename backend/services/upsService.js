const fetch = require('node-fetch');

// Using the Sandbox base URL by default as specified in the UPS docs.
const UPS_BASE_URL = process.env.UPS_BASE_URL || 'https://wwwcie.ups.com';
const UPS_CLIENT_ID = process.env.UPS_CLIENT_ID || '';
const UPS_CLIENT_SECRET = process.env.UPS_CLIENT_SECRET || '';

// Internal caching of the UPS token
let cachedToken = null;
let tokenExpiry = null;

const getUpsToken = async () => {
  if (cachedToken && tokenExpiry && new Date() < new Date(tokenExpiry - 5 * 60 * 1000)) {
    return cachedToken;
  }

  try {
    const authHeader = `Basic ${Buffer.from(`${UPS_CLIENT_ID}:${UPS_CLIENT_SECRET}`).toString('base64')}`;
    const data = new URLSearchParams();
    data.append('grant_type', 'client_credentials');

    const response = await fetch(`${UPS_BASE_URL}/security/v1/oauth/token`, {
      method: 'POST',
      body: data,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': authHeader,
        'x-merchant-id': UPS_CLIENT_ID // Optional but recommended by UPS
      }
    });

    if (!response.ok) {
       const errorData = await response.text();
       throw new Error(`Failed to authenticate with UPS API: ${errorData}`);
    }

    const jsonData = await response.json();
    cachedToken = jsonData.access_token;
    
    // UPS returns issued_at (ms) and expires_in (seconds)
    // Sometimes it just returns expires_in
    const expiresIn = parseInt(jsonData.expires_in, 10);
    tokenExpiry = new Date().getTime() + (expiresIn * 1000);
    
    return cachedToken;
  } catch (error) {
    console.error('UPS Token Auth Error:', error.message);
    throw new Error('Failed to authenticate with UPS API');
  }
};

exports.trackUpsShipment = async (trackingNumber) => {
  try {
    const token = await getUpsToken();

    // UPS Tracking API spec
    const transId = Math.random().toString(36).substring(2, 15);
    
    const response = await fetch(`${UPS_BASE_URL}/api/track/v1/details/${trackingNumber}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'transId': transId,
        'transactionSrc': 'WholesalePlatform'
      }
    });

    const data = await response.json();

    if (!response.ok) {
       if (data?.response?.errors) {
          throw new Error(data.response.errors[0].message);
       }
       throw new Error('Error retrieving tracking data from UPS');
    }

    // UPS tracking wrap format
    const trackData = data?.trackResponse?.shipment?.[0] || null;
    return trackData;

  } catch (error) {
    console.error('UPS Tracking Error:', error.message);
    throw new Error(error.message);
  }
};
