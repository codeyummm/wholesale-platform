require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Message = require('./models/Message');
  const Conversation = require('./models/Conversation');
  
  const msgs = await Message.find({ channel: { $ne: 'something' } }).limit(5); // just get 5
  console.log('Messages total:', await Message.countDocuments());
  console.log('Conversations total:', await Conversation.countDocuments());
  
  if (msgs.length > 0) {
    console.log('Sample Message emailMetadata:', msgs[0].emailMetadata);
  }
  
  const msgsWithFolder = await Message.find({ 'emailMetadata.folder': { $exists: true } });
  console.log('Messages with folder explicitly set:', msgsWithFolder.length);
  
  const inboxRegex = new RegExp(`^inbox$`, 'i');
  const msgsInInbox = await Message.find({ 'emailMetadata.folder': { $regex: inboxRegex } });
  console.log('Messages matching inbox regex:', msgsInInbox.length);
  
  process.exit(0);
});
