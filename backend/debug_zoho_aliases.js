const mongoose = require('mongoose');
const EmailAccount = require('./models/EmailAccount');
const axios = require('axios');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const emailAccount = await EmailAccount.findOne({ provider: 'zoho', isActive: true });
  const accountResponse = await axios.get('https://mail.zoho.com/api/accounts', {
    headers: { Authorization: `Bearer ${emailAccount.accessToken}` }
  });
  console.log(JSON.stringify(accountResponse.data.data[0], null, 2));
  process.exit(0);
});
