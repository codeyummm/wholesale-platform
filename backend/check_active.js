const mongoose = require('mongoose');
const EmailAccount = require('./models/EmailAccount');
require('dotenv').config({ path: './.env' });

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const accounts = await EmailAccount.find({});
    for (let acc of accounts) {
        console.log(`Account ID: ${acc._id}, Provider: ${acc.provider}, Active: ${acc.isActive}`);
        if (acc.isActive === undefined) {
           acc.isActive = true;
           await acc.save();
           console.log(`Fixed missing isActive for ${acc._id}`);
        }
    }
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
