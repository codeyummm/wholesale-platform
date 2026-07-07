const fetch = require('node-fetch');

// Using the Sandbox base URL by default as specified in the docs API.
// Change to https://apis.fedex.com once production keys are available.
const FEDEX_BASE_URL = process.env.FEDEX_BASE_URL || 'https://apis-sandbox.fedex.com';
const FEDEX_CLIENT_ID = process.env.FEDEX_CLIENT_ID || '';
const FEDEX_CLIENT_SECRET = process.env.FEDEX_CLIENT_SECRET || '';

// Internal caching of the FedEx token
let cachedToken = null;
let tokenExpiry = null;

const getFedexToken = async () => {
  // If we have a cached token that expires in more than 5 minutes, reuse it
  if (cachedToken && tokenExpiry && new Date() < new Date(tokenExpiry - 5 * 60 * 1000)) {
    return cachedToken;
  }

  try {
    const data = new URLSearchParams();
    data.append('grant_type', 'client_credentials');
    data.append('client_id', FEDEX_CLIENT_ID);
    data.append('client_secret', FEDEX_CLIENT_SECRET);

    const response = await fetch(`${FEDEX_BASE_URL}/oauth/token`, {
      method: 'POST',
      body: data,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (!response.ok) {
       const errorData = await response.text();
       throw new Error(`Failed to authenticate with FedEx API: ${errorData}`);
    }

    const jsonData = await response.json();
    cachedToken = jsonData.access_token;
    // Set expiry in milliseconds
    tokenExpiry = new Date().getTime() + (jsonData.expires_in * 1000);
    return cachedToken;
  } catch (error) {
    console.error('FedEx Token Auth Error:', error.message);
    throw new Error('Failed to authenticate with FedEx API');
  }
};

exports.trackFedexShipment = async (trackingNumber) => {
  try {
    const token = await getFedexToken();
    
    // The FedEx V1 tracking numbers payload spec
    const payload = {
      includeDetailedScans: true,
      trackingInfo: [
        {
          trackingNumberInfo: {
            trackingNumber: trackingNumber
          }
        }
      ]
    };

    const response = await fetch(`${FEDEX_BASE_URL}/track/v1/trackingnumbers`, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
       if (data?.errors) {
          throw new Error(data.errors[0].message);
       }
       throw new Error('Error retrieving tracking data from FedEx');
    }

    // FedEx wraps the array output inside completeTrackResults[0].trackResults
    const trackData = data?.output?.completeTrackResults?.[0]?.trackResults?.[0] || null;
    return trackData;

  } catch (error) {
    console.error('FedEx Tracking Error:', error.message);
    throw new Error(error.message);
  }
};
