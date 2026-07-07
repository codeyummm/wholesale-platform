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
  
  const msg = msgResponse.data.data[0];
  
  try {
    const contentResponse = await axios.get(`https://mail.zoho.com/api/accounts/${accountId}/folders/${msg.folderId}/messages/${msg.messageId}/content`, {
      headers: { Authorization: `Bearer ${account.accessToken}` }
    });
    
    console.log(contentResponse.data.substring(0, 500)); // Print first 500 chars of HTML
  } catch (err) {
    console.error(err.response?.data || err.message);
  }
  process.exit(0);
});
