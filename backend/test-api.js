const mongoose = require('mongoose');
const { getInventory } = require('./controllers/inventoryController');

async function test() {
  require('dotenv').config();
  await mongoose.connect(process.env.MONGODB_URI);
  
  const req = { query: { search: "IPHONE 14 PLUS 512GB " } };
  const res = {
    json: (data) => console.log('JSON:', JSON.stringify(data)),
    status: (code) => ({ json: (data) => console.log(`STATUS ${code}:`, JSON.stringify(data)) })
  };
  
  await getInventory(req, res);
  process.exit(0);
}
test();
