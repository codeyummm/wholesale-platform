const axios = require('axios');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const Listing = require('./models/Listing');
  const ChannelListing = require('./models/ChannelListing');
  
  const start = Date.now();
  try {
    const listings = await Listing.find().select('-description -images').sort({ createdAt: -1 }).lean();
    console.log(`Default Batch: Fetched ${listings.length} listings in ${Date.now() - start}ms`);
    
    const start2 = Date.now();
    const listingsBatch = await Listing.find().select('-description -images').sort({ createdAt: -1 }).batchSize(5000).lean();
    console.log(`Large Batch: Fetched ${listingsBatch.length} listings in ${Date.now() - start2}ms`);
    
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
})();
