const axios = require('axios');
require('dotenv').config({ path: './.env' });

const getAuthHeader = () => {
  const token = Buffer.from(`${process.env.SHIPSTATION_API_KEY}:${process.env.SHIPSTATION_API_SECRET}`).toString('base64');
  return `Basic ${token}`;
};

async function run() {
  try {
    const response = await axios.get(`https://ssapi.shipstation.com/carriers`, {
      headers: { 'Authorization': getAuthHeader() }
    });
    console.log(JSON.stringify(response.data, null, 2));
  } catch(e) {
    console.error(e.response ? e.response.data : e);
  }
}
run();
