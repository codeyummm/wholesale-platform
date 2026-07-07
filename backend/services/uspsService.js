const fetch = require('node-fetch');

// Using the USPS API base URL. Handshake uses identical format to FedEx.
const USPS_BASE_URL = process.env.USPS_BASE_URL || 'https://api.usps.com';
const USPS_CLIENT_ID = process.env.USPS_CLIENT_ID || '';
const USPS_CLIENT_SECRET = process.env.USPS_CLIENT_SECRET || '';

// Internal caching of the USPS token
let cachedToken = null;
let tokenExpiry = null;

const getUspsToken = async () => {
  // If we have a cached token that expires in more than 5 minutes, reuse it
  if (cachedToken && tokenExpiry && new Date() < new Date(tokenExpiry - 5 * 60 * 1000)) {
    return cachedToken;
  }

  try {
    const data = new URLSearchParams();
    data.append('grant_type', 'client_credentials');
    data.append('client_id', USPS_CLIENT_ID);
    data.append('client_secret', USPS_CLIENT_SECRET);

    const response = await fetch(`${USPS_BASE_URL}/oauth2/v3/token`, {
      method: 'POST',
      body: data,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (!response.ok) {
       const errorData = await response.text();
       throw new Error(`Failed to authenticate with USPS API: ${errorData}`);
    }

    const jsonData = await response.json();
    cachedToken = jsonData.access_token;
    
    // Set expiry in milliseconds
    const expiresIn = parseInt(jsonData.expires_in, 10) || 3599;
    tokenExpiry = new Date().getTime() + (expiresIn * 1000);
    
    return cachedToken;
  } catch (error) {
    console.error('USPS Token Auth Error:', error.message);
    throw new Error('Failed to authenticate with USPS API');
  }
};

exports.trackUspsShipment = async (trackingNumber) => {
  try {
    const token = await getUspsToken();

    const payload = [{ "trackingNumber": trackingNumber }];

    const response = await fetch(`${USPS_BASE_URL}/tracking/v3r2/tracking`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const bodyData = await response.json();
    // V3R2 bulk endpoint returns an array of tracking models
    const data = Array.isArray(bodyData) ? bodyData[0] : bodyData;

    if (!response.ok) {
       if (data?.error) {
          throw new Error(data.error.message || 'Error retrieving tracking data from USPS');
       }
       throw new Error('Error retrieving tracking data from USPS');
    }

    return data;

  } catch (error) {
    console.error('USPS Tracking Error:', error.message);
    throw new Error(error.message);
  }
};
