require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const EmailAccount = require('./models/EmailAccount');
  const account = await EmailAccount.findOne({ provider: 'zoho' });
  
  if (!account || !account.accessToken) {
    console.log("No Zoho account or token found.");
    process.exit(0);
  }
  
  try {
    const accountResponse = await axios.get('https://mail.zoho.com/api/accounts', {
      headers: { Authorization: `Bearer ${account.accessToken}` }
    });
    const accountId = accountResponse.data.data[0].accountId;
    
    const foldersResponse = await axios.get(`https://mail.zoho.com/api/accounts/${accountId}/folders`, {
      headers: { Authorization: `Bearer ${account.accessToken}` }
    });
    
    console.log("Folders:");
    foldersResponse.data.data.forEach(f => {
      console.log(`- ID: ${f.folderId}, Name: ${f.folderName}`);
    });
  } catch (err) {
    console.error("Error fetching folders:", err.response?.data || err.message);
  }
  process.exit(0);
});
