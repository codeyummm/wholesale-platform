require('dotenv').config();
const axios = require('axios');

const SHIPSTATION_API_KEY = process.env.SHIPSTATION_API_KEY;
const SHIPSTATION_API_SECRET = process.env.SHIPSTATION_API_SECRET;
const authHeader = 'Basic ' + Buffer.from(SHIPSTATION_API_KEY + ':' + SHIPSTATION_API_SECRET).toString('base64');
const SHIPSTATION_API_URL = 'https://ssapi.shipstation.com';

async function fetchLabel() {
  try {
    const response = await axios.get(`${SHIPSTATION_API_URL}/shipments`, {
      headers: { 'Authorization': authHeader },
      params: { trackingNumber: '1ZYF89724201472030' }
    });
    
    if (response.data && response.data.shipments && response.data.shipments.length > 0) {
      console.log(JSON.stringify(response.data.shipments[0], null, 2));
    }
    process.exit(0);
  } catch (err) {
    console.error(err.message);
  }
}
fetchLabel();
