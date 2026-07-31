const axios = require('axios');

(async () => {
  try {
    const api = axios.create({ baseURL: 'http://localhost:5000/api' });
    const { data: { listings } } = await api.get('/listings');
    const listingId = listings[0]._id;
    const { data: { listing } } = await api.get(`/listings/${listingId}`);
    
    console.log("FETCHED ITEM SPECIFICS TYPE:", typeof listing.platformSettings.ebay.itemSpecifics);
    console.log("FETCHED ITEM SPECIFICS IS ARRAY?", Array.isArray(listing.platformSettings.ebay.itemSpecifics));
    console.log("FETCHED ITEM SPECIFICS:", JSON.stringify(listing.platformSettings.ebay.itemSpecifics, null, 2));
    
  } catch(e) {
    console.error(e.response ? e.response.data : e.message);
  }
})();
