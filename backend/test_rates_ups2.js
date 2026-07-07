const axios = require('axios');
require('dotenv').config({ path: './.env' });

const getAuthHeader = () => {
  const token = Buffer.from(`${process.env.SHIPSTATION_API_KEY}:${process.env.SHIPSTATION_API_SECRET}`).toString('base64');
  return `Basic ${token}`;
};

async function run() {
  const payload = {
    carrierCode: "ups_walleted",
    serviceCode: "ups_ground_saver",
    fromPostalCode: "90210", 
    toState: "NY",
    toCountry: "US",
    toPostalCode: "10001",
    weight: { value: 8, units: "ounces" },
    dimensions: { units: "inches", length: 9, width: 6, height: 2 },
    confirmation: "signature",
    insuranceOptions: { provider: "shipsurance", insureShipment: true, insuredValue: 100 },
    residential: true
  };
  
  try {
    const response = await axios.post(`https://ssapi.shipstation.com/shipments/getrates`, payload, {
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json'
      }
    });
    console.log(response.data);
  } catch(e) {
    console.error(e.response ? e.response.data : e);
  }
}
run();
