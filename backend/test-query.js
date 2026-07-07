const mongoose = require('mongoose');
const { chatWithNova } = require('./controllers/agentController');
require('dotenv').config({ path: __dirname + '/.env' });

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const req = { body: { message: 'do we have any recent sale of pixel 10 pro xl', history: [] } };
  const res = { json: (data) => console.log('Response:', data), status: (code) => ({ json: (data) => console.log('Error', code, data) }) };
  await chatWithNova(req, res);
  process.exit(0);
});
