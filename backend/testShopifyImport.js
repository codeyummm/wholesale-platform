const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const { importShopifyProducts } = require('./services/shopifyListingService');
const Listing = require('./models/Listing');

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const importedListings = await importShopifyProducts();
    console.log(`Fetched ${importedListings.length} products`);
    
    for (const data of importedListings) {
      const exists = await Listing.findOne({ sku: data.sku });
      if (!exists) {
        try {
          await Listing.create(data);
          console.log(`Created: ${data.sku}`);
        } catch (e) {
          console.error(`Validation error for ${data.sku}:`, e.message);
        }
      } else {
        console.log(`Exists: ${data.sku}`);
      }
    }
  } catch (err) {
    console.error('Failed:', err.message);
  }
  process.exit(0);
}
run();
