const mongoose = require('mongoose');
const Listing = require('./models/Listing');

(async () => {
  await mongoose.connect('mongodb+srv://codeyumm_db_user:9hjjF0zVjxNuO0Vb@wholesale.q0idcqt.mongodb.net/wholesale?retryWrites=true&w=majority&appName=wholesale');
  const listings = await Listing.find().sort({ createdAt: -1 }).limit(1);
  console.log("LAST LISTING:", JSON.stringify(listings[0].platformSettings.ebay, null, 2));
  process.exit(0);
})();
