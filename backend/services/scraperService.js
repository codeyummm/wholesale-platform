const axios = require('axios');

/**
 * Fetch HTML from a URL using Bright Data Web Unlocker API.
 * @param {string} url - The URL to scrape.
 * @returns {Promise<string>} The raw HTML of the page.
 */
const fetchWithBrightData = async (url) => {
  const BRIGHTDATA_API_KEY = process.env.BRIGHTDATA_API_KEY || '383e80a7-2a9e-4c62-87b7-a55c625efff0';
  
  try {
    const response = await axios.post(
      'https://api.brightdata.com/request',
      {
        zone: 'codeyumm_unlock',
        url: url,
        format: 'raw'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${BRIGHTDATA_API_KEY}`
        },
        timeout: 60000 // Web Unlocker can take up to 60s for hard targets
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Bright Data Web Unlocker Error:', error.response?.data || error.message);
    throw error;
  }
};

module.exports = {
  fetchWithBrightData,
};
