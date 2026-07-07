require('dotenv').config();
const mongoose = require('mongoose');
const EmailAccount = require('./models/EmailAccount');
const { fetchAndSaveGmailMessages } = require('./services/gmailSyncService');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const account = await EmailAccount.findOne({ provider: 'gmail', isActive: true });
  if (!account) {
    console.log('No active gmail account');
    process.exit(0);
  }
  
  try {
    await fetchAndSaveGmailMessages(account);
    console.log('Sync complete');
  } catch (err) {
    console.error('Outer error:', err);
  }

  process.exit(0);
});
