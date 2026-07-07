const mongoose = require('mongoose');
const EmailAccount = require('./models/EmailAccount');
require('dotenv').config({ path: './.env' });

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const accounts = await EmailAccount.find({});
    for (let acc of accounts) {
        console.log(`Account ID: ${acc._id}, User: ${acc.user}`);
    }
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
