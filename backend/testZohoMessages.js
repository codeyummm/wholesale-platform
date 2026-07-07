const mongoose = require('mongoose');
const Conversation = require('./models/Conversation');
const Message = require('./models/Message');

mongoose.connect('mongodb://localhost:27017/wholesale', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  const convs = await Conversation.find({ channel: 'email' }).sort({ createdAt: -1 }).limit(2).lean();
  console.log("CONVERSATIONS:", JSON.stringify(convs, null, 2));

  for (let c of convs) {
    const msgs = await Message.find({ conversationId: c._id }).lean();
    console.log(`MESSAGES for ${c._id}:`, JSON.stringify(msgs, null, 2));
  }
  process.exit(0);
});
