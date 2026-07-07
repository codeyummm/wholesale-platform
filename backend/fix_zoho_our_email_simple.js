const mongoose = require('mongoose');
const Conversation = require('./models/Conversation');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  await Conversation.updateMany(
    { provider: 'zoho', ourEmail: { $exists: false } },
    { $set: { ourEmail: 'super@teckroot.com' } }
  );
  console.log('Fixed existing conversations.');
  process.exit(0);
});
