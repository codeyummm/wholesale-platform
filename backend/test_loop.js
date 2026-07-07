const axios = require('axios');

async function run() {
  try {
    throw new Error('Initial fail');
  } catch(err) {
    try {
      await axios.post('https://httpstat.us/403');
    } catch (autoFundErr) {
      console.log("CAUGHT AXIOS ERROR");
      throw new Error(`Auto-fund attempt failed.`);
    }
  }
}

run().catch(console.error);
