const axios = require('axios');
const Integration = require('../models/Integration');
const ChannelListing = require('../models/ChannelListing');

const { getValidShopifyToken } = require('../utils/shopifyAuth');

const createShopifyListing = async (listing, syncOptions, userId) => {
  try {
    const { accessToken, storeDomain } = await getValidShopifyToken();

    const shopifySettings = listing.platformSettings?.shopify || {};

    // 1. Build the Product Payload
    const payload = {
      product: {
        title: listing.title,
        body_html: listing.description || '',
        vendor: listing.brand || 'UDEAL',
        product_type: shopifySettings.productType || '',
        status: 'active',
        variants: [
          {
            price: listing.price,
            sku: listing.sku,
            inventory_management: 'shopify',
            inventory_policy: 'deny',
            weight: listing.weight || 0,
            weight_unit: shopifySettings.weightUnit || 'lb',
            barcode: listing.barcode || '',
            requires_shipping: true
          }
        ]
      }
    };

    // If we have images, map them to Shopify format
    if (listing.images && listing.images.length > 0) {
      // Sort so primary is first, as Shopify uses the first image as the main one
      const sortedImages = [...listing.images].sort((a, b) => b.isPrimary - a.isPrimary);
      payload.product.images = sortedImages.map(img => ({
        src: img.url,
        alt: img.alt || listing.title
      }));
    }

    // 2. Make the API Request
    const response = await axios.post(`https://${storeDomain}/admin/api/2024-01/products.json`, payload, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    });

    const shopifyProduct = response.data.product;
    
    // 3. Update Inventory Quantity 
    // Shopify requires a separate call to `inventory_levels/set.json` using the inventory_item_id
    if (listing.quantity > 0) {
      const inventoryItemId = shopifyProduct.variants[0].inventory_item_id;
      
      // We need a location_id to set inventory. We can fetch the first active location.
      const locationResponse = await axios.get(`https://${storeDomain}/admin/api/2024-01/locations.json`, {
        headers: { 'X-Shopify-Access-Token': accessToken }
      });
      
      const locationId = locationResponse.data.locations[0]?.id;

      if (locationId) {
        await axios.post(`https://${storeDomain}/admin/api/2024-01/inventory_levels/set.json`, {
          location_id: locationId,
          inventory_item_id: inventoryItemId,
          available: listing.quantity
        }, {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json'
          }
        });
      }
    }

    // 4. Save the Mapping
    const channelListing = new ChannelListing({
      listingId: listing._id,
      platform: 'shopify',
      externalId: shopifyProduct.id.toString(),
      externalUrl: `https://${storeDomain}/admin/products/${shopifyProduct.id}`,
      status: 'active',
      lastSync: new Date()
    });

    await channelListing.save();

    return {
      success: true,
      channelListing,
      remoteId: shopifyProduct.id.toString()
    };

  } catch (error) {
    console.error('Shopify Listing Error:', error.response?.data || error.message);
    const apiError = error.response?.data?.errors ? JSON.stringify(error.response.data.errors) : error.message;
    throw error;
  }
};

const importShopifyProducts = async () => {
  try {
    const { accessToken, storeDomain } = await getValidShopifyToken();

    // Fetch all products with pagination
    let products = [];
    let url = `https://${storeDomain}/admin/api/2024-01/products.json?limit=250`;
    
    while (url) {
      const response = await axios.get(url, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
        }
      });
      
      products = products.concat(response.data.products);
      
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
    const importedListings = [];

    for (const product of products) {
      // Map variants to individual listings or one listing if no multiple variants
      // For simplicity in a wholesale app, map the first variant to the Master Listing
      const variant = product.variants[0];
      
      const newListing = {
        title: product.title,
        description: product.body_html || '',
        sku: variant?.sku || `SHOP-${product.id}`,
        price: parseFloat(variant?.price || 0),
        quantity: Math.max(0, variant?.inventory_quantity || 0),
        condition: 'new', // default
        brand: product.vendor,
        weight: variant?.weight || 0,
        images: product.images.map((img, idx) => ({
          url: img.src,
          isPrimary: idx === 0,
          alt: img.alt || ''
        })),
        platformSettings: {
          shopify: {
            productType: product.product_type,
            weightUnit: variant?.weight_unit || 'lb'
          }
        }
      };
      
      importedListings.push(newListing);
    }
    
    return importedListings;

  } catch (error) {
    console.error('Error importing Shopify products:', error.response?.data || error.message);
    throw error;
  }
};

module.exports = {
  createShopifyListing,
  importShopifyProducts
};
