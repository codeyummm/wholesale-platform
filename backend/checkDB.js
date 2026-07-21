const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const Listing = require('./models/Listing');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const count = await Listing.countDocuments();
  console.log(`Listings in DB: ${count}`);
  process.exit(0);
}
run();
