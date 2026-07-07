const axios = require('axios');
require('dotenv').config({ path: './.env' });

const getAuthHeader = () => {
  const token = Buffer.from(`${process.env.SHIPSTATION_API_KEY}:${process.env.SHIPSTATION_API_SECRET}`).toString('base64');
  return `Basic ${token}`;
};

async function run() {
  const payload = {
    carrierCode: "stamps_com",
    serviceCode: "usps_ground_advantage",
    packageCode: "package",
    shipTo: {
      name: "Test Person",
      street1: "123 Main St",
      city: "Austin",
      state: "TX",
      postalCode: "78701",
      country: "US"
    },
    shipFrom: {
      name: "My Store",
      street1: "123 Store St",
      city: "Seattle",
      state: "WA",
      postalCode: "98101",
      country: "US"
    },
    weight: { value: 8, units: "ounces" },
    dimensions: { length: 9, width: 6, height: 2, units: "inches" },
    confirmation: "none",
    insuranceOptions: {
      provider: "shipsurance",
      insureShipment: true,
      insuredValue: 498
    },
    testLabel: true
  };
  
  try {
    const response = await axios.post(`https://ssapi.shipstation.com/shipments/createlabel`, payload, {
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
