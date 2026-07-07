const axios = require('axios');
require('dotenv').config({ path: './.env' });

const getAuthHeader = () => {
  const token = Buffer.from(`${process.env.SHIPSTATION_API_KEY}:${process.env.SHIPSTATION_API_SECRET}`).toString('base64');
  return `Basic ${token}`;
};

async function run() {
  try {
    const response = await axios.post(`https://ssapi.shipstation.com/carriers/addfunds`, { carrierCode: "stamps_com", amount: 10 }, {
      headers: { 'Authorization': getAuthHeader() }
    });
    console.log("STATUS:", response.status);
    console.log(response.data);
  } catch(e) {
    console.error("ERROR STATUS:", e.response ? e.response.status : 'None');
    console.error(e.response ? e.response.data : e);
  }
}
run();
