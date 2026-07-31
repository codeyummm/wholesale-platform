const axios = require('axios');

(async () => {
  const start = Date.now();
  try {
    const api = axios.create({ baseURL: 'http://localhost:5000/api' });
    const { data } = await api.get('/listings');
    console.log(`Fetched ${data.listings.length} listings in ${Date.now() - start}ms`);
  } catch(e) {
    console.error(e.response ? e.response.data : e.message);
  }
})();
