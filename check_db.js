const mongoose = require('mongoose');
const EmailAccount = require('./backend/models/EmailAccount');
require('dotenv').config({ path: './backend/.env' });

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const accounts = await EmailAccount.find({});
    console.log(JSON.stringify(accounts, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
