const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const { getValidShopifyToken } = require('./utils/shopifyAuth');

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const { accessToken, storeDomain } = await getValidShopifyToken();
    
    let allProducts = [];
    let url = `https://${storeDomain}/admin/api/2024-01/products.json?limit=250`;
    
    while (url) {
      console.log(`Fetching from ${url}`);
      const response = await axios.get(url, {
        headers: { 'X-Shopify-Access-Token': accessToken }
      });
      
      allProducts = allProducts.concat(response.data.products);
      
      const linkHeader = response.headers['link'];
      let nextUrl = null;
      if (linkHeader) {
        const links = linkHeader.split(',');
        const nextLink = links.find(link => link.includes('rel="next"'));
        if (nextLink) {
          const match = nextLink.match(/<([^>]+)>/);
          if (match) {
            nextUrl = match[1];
          }
        }
      }
      url = nextUrl;
    }
    
    console.log(`Fetched a total of ${allProducts.length} products`);
  } catch (err) {
    console.error('Failed:', err.message);
  }
  process.exit(0);
}
run();
