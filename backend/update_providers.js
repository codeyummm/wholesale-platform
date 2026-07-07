const mongoose = require('mongoose');
const Conversation = require('./models/Conversation');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const result = await Conversation.updateMany(
    { channel: 'email', provider: { $exists: false } },
    { $set: { provider: 'zoho' } }
  );
  console.log('Updated conversations:', result);
  process.exit(0);
});
