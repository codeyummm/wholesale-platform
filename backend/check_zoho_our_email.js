const mongoose = require('mongoose');
const Conversation = require('./models/Conversation');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const conv = await Conversation.findOne({ name: /Hi invoive/i });
  console.log('Conversation:', conv);
  process.exit(0);
});
