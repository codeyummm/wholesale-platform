const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to DB');
    const users = await User.find({});
    console.log('All Users:', users.map(u => ({ id: u._id, name: u.name, isActive: u.isActive })));
    
    const activeUsers = await User.find({ isActive: { $ne: false } });
    console.log('Active Users Query:', activeUsers.map(u => ({ id: u._id, name: u.name, isActive: u.isActive })));
    
    process.exit(0);
  })
  .catch(console.error);
