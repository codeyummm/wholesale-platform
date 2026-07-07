const mongoose = require('mongoose');
const Conversation = require('./models/Conversation');
const Message = require('./models/Message');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const convs = await Conversation.find({ provider: 'zoho', name: /Hi invoive/i });
  for (const conv of convs) {
    await Message.deleteMany({ conversationId: conv._id });
    await Conversation.deleteOne({ _id: conv._id });
  }
  console.log('Deleted test email');
  process.exit(0);
});
