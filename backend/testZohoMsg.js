require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const EmailAccount = require('./models/EmailAccount');
  const account = await EmailAccount.findOne({ provider: 'zoho' });
  
  const accountResponse = await axios.get('https://mail.zoho.com/api/accounts', {
    headers: { Authorization: `Bearer ${account.accessToken}` }
  });
  const accountId = accountResponse.data.data[0].accountId;
  
  const msgResponse = await axios.get(`https://mail.zoho.com/api/accounts/${accountId}/messages/view`, {
    headers: { Authorization: `Bearer ${account.accessToken}` },
    params: { limit: 1 }
  });
  
  console.log(JSON.stringify(msgResponse.data.data[0], null, 2));
  process.exit(0);
});
