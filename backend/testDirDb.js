const mongoose = require('mongoose');
const User = require('./models/User');
const Conversation = require('./models/Conversation');
require('dotenv').config({ path: 'backend/.env' });

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/wholesale', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('Connected to DB');
  
  const users = await User.find({ isActive: { $ne: false } }).select('name email _id role');
  console.log('Active Users Count:', users.length);
  console.log('Active Users:', users);

  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
