const mongoose = require('mongoose');
require('dotenv').config();
const Inventory = require('./models/Inventory');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const text = "google pixel 10 pro xl";
  const words = text.split(/\s+/).filter(w => w.length > 1);
  
  const andClauses = words.map(w => ({
    $or: [
      { brand: { $regex: new RegExp(w, 'i') } },
      { model: { $regex: new RegExp(w, 'i') } },
      { 'specifications.color': { $regex: new RegExp(w, 'i') } },
      { 'specifications.storage': { $regex: new RegExp(w, 'i') } },
    ]
  }));
  
  const items = await Inventory.find({ $and: andClauses }).select('model brand quantity devices specifications').limit(5);
  console.log(`Found ${items.length} items`);
  items.forEach(i => console.log(i.brand, i.model));
  process.exit(0);
}
test();
