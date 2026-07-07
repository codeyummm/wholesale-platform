const mongoose = require('mongoose');
const { getInventory } = require('./controllers/inventoryController');

async function test() {
  require('dotenv').config();
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');
  
  const req = { query: { search: "IPHONE 14 PLUS 512GB " } };
  const res = {
    json: (data) => console.log('JSON returned with length:', data.data?.length),
    status: (code) => ({ json: (data) => console.log(`STATUS ${code} ERROR:`, data.message) })
  };
  
  try {
    await getInventory(req, res);
  } catch (e) {
    console.log('CRASH!', e.message);
  }
  process.exit(0);
}
test();
