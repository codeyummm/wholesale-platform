const mongoose = require('mongoose');
const EmailAccount = require('./models/EmailAccount');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const account = await EmailAccount.findOne({ provider: 'gmail', isActive: true });
  console.log('lastSync:', account.lastSync);
  process.exit(0);
});
