const mongoose = require('mongoose');
const EmailAccount = require('./models/EmailAccount');
const { google } = require('googleapis');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const account = await EmailAccount.findOne({ provider: 'gmail', isActive: true });
  if (!account) {
    console.log('No active gmail account');
    process.exit(0);
  }
  
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/google/callback'
  );

  console.log('Account refreshToken:', account.refreshToken);

  try {
    oauth2Client.setCredentials({
      refresh_token: account.refreshToken
    });
    
    const { credentials } = await oauth2Client.refreshAccessToken();
    console.log('Credentials:', credentials);
  } catch (err) {
    console.error('Refresh Error:', err.response?.data || err.message);
  }

  process.exit(0);
});
