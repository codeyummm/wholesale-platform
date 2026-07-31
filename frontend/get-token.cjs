const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

(async () => {
  await mongoose.connect('mongodb://localhost:27017/wholesale_db');
  
  const schema = new mongoose.Schema({ email: String, role: String });
  const User = mongoose.model('User', schema, 'users');
  
  const user = await User.findOne();
  if(!user) { console.log('no user'); process.exit(1); }
  
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '1d' });
  console.log(token);
  process.exit(0);
})();
