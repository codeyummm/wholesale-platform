require('dotenv').config();
const { fetchLiveTracking } = require('./controllers/trackingController');

async function test() {
  try {
    const data = await fetchLiveTracking('ups', '1ZYF89724225866810');
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e.message);
  }
}
test();
