const mongoose = require('mongoose');
const Message = require('./models/Message');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const duplicates = await Message.aggregate([
    { $match: { 'emailMetadata.messageId': { $exists: true, $ne: null } } },
    { $group: { _id: '$emailMetadata.messageId', count: { $sum: 1 }, docs: { $push: '$_id' } } },
    { $match: { count: { $gt: 1 } } }
  ]);
  
  let deletedCount = 0;
  for (const doc of duplicates) {
    // Keep the first one, delete the rest
    doc.docs.shift(); 
    const result = await Message.deleteMany({ _id: { $in: doc.docs } });
    deletedCount += result.deletedCount;
  }
  
  console.log(`Removed ${deletedCount} duplicate messages.`);
  process.exit(0);
});
