require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const convs = await require('./models/Conversation').find({channel:'email'}).select('_id').lean();
  const ids = convs.map(c => c._id);
  await require('./models/Message').deleteMany({conversationId: { $in: ids }});
  await require('./models/Conversation').deleteMany({channel:'email'});
  console.log('Wiped ' + ids.length + ' faulty conversations');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
