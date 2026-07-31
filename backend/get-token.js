const axios = require('axios');
async function test() {
  try {
    const res = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@example.com',
      password: 'password123'
    });
    console.log("TOKEN=" + res.data.token);
  } catch(e) { console.log(e.response?.data); }
}
test();
