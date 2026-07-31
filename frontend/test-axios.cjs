const axios = require('axios');

(async () => {
  try {
    const api = axios.create({ baseURL: 'http://localhost:5000/api' });
    
    // 1. Get listings
    const { data: { listings } } = await api.get('/listings');
    const listingId = listings[0]._id;
    
    console.log("OLD EBAY:", JSON.stringify(listings[0].platformSettings.ebay, null, 2));
    
    // 2. Update listing
    const payload = {
      ...listings[0],
      platformSettings: {
        ebay: {
          categoryId: '9999',
          shipping: {
            shippingType: 'Calculated',
            packageWeightMajor: 42
          }
        }
      }
    };
    
    await api.put(`/listings/${listingId}`, payload);
    
    // 3. Fetch listing
    const { data: { listing } } = await api.get(`/listings/${listingId}`);
    console.log("NEW EBAY:", JSON.stringify(listing.platformSettings.ebay, null, 2));
    
  } catch(e) {
    console.error(e.response ? e.response.data : e.message);
  }
})();
