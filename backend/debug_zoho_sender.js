const mongoose = require('mongoose');
const EmailAccount = require('./models/EmailAccount');
const axios = require('axios');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const emailAccount = await EmailAccount.findOne({ provider: 'zoho', isActive: true });
  if (!emailAccount) {
    console.log('No active zoho account');
    process.exit(0);
  }

  try {
    const accountResponse = await axios.get('https://mail.zoho.com/api/accounts', {
      headers: { Authorization: `Bearer ${emailAccount.accessToken}` }
    });
    console.log('primaryEmailAddress used for sending:', accountResponse.data.data[0].primaryEmailAddress);
  } catch (err) {
    console.error('API Error:', err.response ? err.response.data : err.message);
  }

  process.exit(0);
});
