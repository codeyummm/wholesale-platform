const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

(async () => {
  await mongoose.connect('mongodb+srv://codeyumm_db_user:9hjjF0zVjxNuO0Vb@wholesale.q0idcqt.mongodb.net/wholesale?retryWrites=true&w=majority&appName=wholesale');
  
  const schema = new mongoose.Schema({ email: String, password: String, role: String });
  const User = mongoose.model('User', schema, 'users');
  
  const hashedPassword = await bcrypt.hash('password123', 10);
  let user = await User.findOne({ email: 'admin@example.com' });
  if (user) {
    user.password = hashedPassword;
    await user.save();
  } else {
    user = new User({ email: 'admin@example.com', password: hashedPassword, role: 'admin' });
    await user.save();
  }
  console.log("USER FIXED");
  process.exit(0);
})();
