const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const Listing = require('./models/Listing');

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');
    
    const result = await Listing.deleteMany({});
    console.log('Deleted Listings:', result.deletedCount);
    
  } catch (err) {
    console.error('Failed:', err.message);
  }
  process.exit(0);
}
run();
