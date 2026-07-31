const mongoose = require('mongoose');
const Listing = require('./models/Listing');
const listingController = require('./controllers/listingController');

(async () => {
  await mongoose.connect('mongodb://localhost:27017/wholesale_db');
  let listing = await Listing.findOne();
  if(!listing) {
    listing = new Listing({ title: 'Test', sku: 'TEST-1' });
    await listing.save();
  }
  
  const req = {
    params: { id: listing._id.toString() },
    body: {
      platformSettings: {
        ebay: {
          categoryId: '9355',
          shipping: { shippingType: 'Calculated', shippingCost: 45.00 }
        }
      }
    }
  };
  
  const res = {
    json: function(data) { console.log("JSON:", JSON.stringify(data.listing.platformSettings.ebay, null, 2)); },
    status: function(code) { console.log("STATUS:", code); return this; }
  };
  
  await listingController.updateListing(req, res);
  
  // Refetch
  const fetched = await Listing.findById(listing._id);
  console.log("FETCHED:", JSON.stringify(fetched.platformSettings.ebay, null, 2));
  process.exit(0);
})();
