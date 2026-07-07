const axios = require('axios');

async function test() {
  try {
    const dirRes = await axios.get('http://localhost:5000/api/users/directory-test');
    console.log('Directory API Response:', JSON.stringify(dirRes.data, null, 2));

  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
}
test();
