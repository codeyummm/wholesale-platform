const axios = require('axios');
const mongoose = require('mongoose');
const EmailAccount = require('./models/EmailAccount');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const account = await EmailAccount.findOne({ provider: 'zoho' });
  const accountResponse = await axios.get('https://mail.zoho.com/api/accounts', {
    headers: { Authorization: `Bearer ${account.accessToken}` }
  });
  const accountId = accountResponse.data.data[0].accountId;
  const msgResponse = await axios.get(`https://mail.zoho.com/api/accounts/${accountId}/messages/view?limit=1`, {
    headers: { Authorization: `Bearer ${account.accessToken}` }
  });
  console.log(msgResponse.data.data[0]);
  process.exit(0);
});
