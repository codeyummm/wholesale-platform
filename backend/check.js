require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const EmailAccount = require('./models/EmailAccount');
  const account = await EmailAccount.findOne();
  console.log(account);
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
