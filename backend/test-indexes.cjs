const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGO_URI);

(async () => {
  try {
    const Listing = require('./models/Listing');
    const ChannelListing = require('./models/ChannelListing');
    
    console.log("Listing Indexes:", await Listing.collection.getIndexes());
    console.log("ChannelListing Indexes:", await ChannelListing.collection.getIndexes());
    
    // Add indexes
    await Listing.collection.createIndex({ createdAt: -1 });
    await ChannelListing.collection.createIndex({ listingId: 1 });
    
    console.log("Indexes created.");
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
