const mongoose = require('mongoose');
const Conversation = require('./models/Conversation');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  // Find all zoho conversations where email does NOT contain '@'
  const badConvs = await Conversation.find({ 
    provider: 'zoho', 
    'externalContact.email': { $not: /@/ } 
  });
  
  console.log(`Found ${badConvs.length} bad conversations.`);
  
  if (badConvs.length > 0) {
    const ids = badConvs.map(c => c._id);
    const Message = require('./models/Message');
    
    // Delete all messages belonging to these conversations
    await Message.deleteMany({ conversationId: { $in: ids } });
    
    // Delete the conversations themselves
    await Conversation.deleteMany({ _id: { $in: ids } });
    
    console.log('Deleted bad conversations and their messages.');
  }
  
  process.exit(0);
});
