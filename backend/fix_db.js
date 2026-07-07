const mongoose = require('mongoose');
const EmailAccount = require('./models/EmailAccount');
require('dotenv').config({ path: './.env' });

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const accounts = await EmailAccount.find({});
    console.log("Found accounts:", accounts.length);
    for (let acc of accounts) {
        console.log(`Account ID: ${acc._id}, Provider: ${acc.provider}, Email: ${acc.emailAddress}`);
        
        // Let's add dummy emailAddress to those missing it for testing
        if (!acc.emailAddress) {
            acc.emailAddress = `test_${acc.provider}_${Date.now()}@example.com`;
            await acc.save();
            console.log(`Updated missing email for ${acc._id} to ${acc.emailAddress}`);
        }
    }
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
