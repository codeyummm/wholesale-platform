const mongoose = require('mongoose');
const { chatWithNova } = require('./controllers/agentController');
require('dotenv').config({ path: __dirname + '/.env' });

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const agentController = require('./controllers/agentController');
  
  // monkey patch handleOrders to print what it searches for
  const Sale = require('./models/Sale');
  const originalFind = Sale.find;
  Sale.find = function() {
    console.log('Sale.find called with:', arguments[0]);
    return originalFind.apply(this, arguments);
  };
  
  const req = { body: { message: 'do we have any order that is in transit', history: [] } };
  const res = { json: (data) => console.log('Response:', data), status: (code) => ({ json: (data) => console.log('Error', code, data) }) };
  await agentController.chatWithNova(req, res);
  process.exit(0);
});
