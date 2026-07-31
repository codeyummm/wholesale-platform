require('dotenv').config();
const mongoose = require('mongoose');
const Listing = require('./models/Listing');

// Common colors and storage capacities to extract from titles
const COMMON_COLORS = ['Black', 'White', 'Silver', 'Gold', 'Space Gray', 'Midnight', 'Starlight', 'Blue', 'Red', 'Green', 'Yellow', 'Purple', 'Pink', 'Graphite', 'Alpine Green'];
const STORAGE_REGEX = /(\d{1,4}\s*(GB|TB))/i;
const NETWORK_REGEX = /(Unlocked|Verizon|AT&T|T-Mobile|Sprint)/i;

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const listings = await Listing.find({});
    let updatedCount = 0;

    for (const listing of listings) {
      if (!listing.platformSettings) {
        listing.platformSettings = {};
      }
      if (!listing.platformSettings.ebay) {
        listing.platformSettings.ebay = {};
      }
      
      let specifics = {};
      
      if (listing.platformSettings.ebay.itemSpecifics && listing.platformSettings.ebay.itemSpecifics instanceof Map) {
         specifics = Object.fromEntries(listing.platformSettings.ebay.itemSpecifics);
      } else if (listing.platformSettings.ebay.itemSpecifics) {
         specifics = { ...listing.platformSettings.ebay.itemSpecifics };
      }

      let modified = false;

      // Map Core: Brand
      if (listing.brand && !specifics['Brand']) {
        specifics['Brand'] = listing.brand;
        modified = true;
      }

      // Map Core: UPC / Barcode
      if (listing.barcode && !specifics['UPC']) {
        specifics['UPC'] = listing.barcode;
        modified = true;
      }

      const title = listing.title || '';

      // Extract Storage Capacity
      if (!specifics['Storage Capacity']) {
        const match = title.match(STORAGE_REGEX);
        if (match) {
           specifics['Storage Capacity'] = match[1].toUpperCase().replace('GB', ' GB').replace('TB', ' TB');
           modified = true;
        }
      }

      // Extract Network
      if (!specifics['Network']) {
        const match = title.match(NETWORK_REGEX);
        if (match) {
           specifics['Network'] = match[1];
           modified = true;
        }
      }

      // Extract Color
      if (!specifics['Color']) {
         for (const color of COMMON_COLORS) {
            if (title.toLowerCase().includes(color.toLowerCase())) {
               specifics['Color'] = color;
               modified = true;
               break;
            }
         }
      }

      if (modified) {
        listing.platformSettings.ebay.itemSpecifics = specifics;
        listing.markModified('platformSettings.ebay.itemSpecifics');
        await listing.save();
        updatedCount++;
        console.log(`Updated Item Specifics for Listing: ${listing.title}`);
        console.log(`  -> Specifics:`, specifics);
      }
    }

    console.log(`\nFinished! Updated ${updatedCount} listings with core Item Specifics mapping.`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

run();
