const mongoose = require('mongoose');
const Conversation = require('./models/Conversation');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  // Find all gmail conversations where email does NOT contain '@'
  // Or where it contains '<'
  const badConvs = await Conversation.find({ 
    provider: 'gmail', 
    $or: [
      { 'externalContact.email': { $not: /@/ } },
      { 'externalContact.email': /</ }
    ]
  });
  
  console.log(`Found ${badConvs.length} bad Gmail conversations.`);
  
  if (badConvs.length > 0) {
    const ids = badConvs.map(c => c._id);
    const Message = require('./models/Message');
    
    // Delete all messages belonging to these conversations
    await Message.deleteMany({ conversationId: { $in: ids } });
    
    // Delete the conversations themselves
    await Conversation.deleteMany({ _id: { $in: ids } });
    
    console.log('Deleted bad Gmail conversations and their messages.');
  }
  
  process.exit(0);
});
