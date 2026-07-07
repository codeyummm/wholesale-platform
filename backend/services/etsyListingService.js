const axios = require('axios');
const Integration = require('../models/Integration');
const ChannelListing = require('../models/ChannelListing');
const SyncJob = require('../models/SyncJob');

const ETSY_API_URL = 'https://openapi.etsy.com/v3/application';

const createEtsyListing = async (listing, syncOptions, userId) => {
  try {
    // 1. Get the Etsy Integration for the user
    // Since this is a single-tenant/internal tool for now, we just find the active Etsy integration.
    // If it was multi-tenant, we'd query by userId.
    const integration = await Integration.findOne({ platform: 'etsy', isConnected: true });

    if (!integration || !integration.credentials || !integration.credentials.accessToken) {
      throw new Error('Etsy is not connected or token is missing.');
    }

    const { accessToken, shopId } = integration.credentials;
    const apiKey = process.env.ETSY_KEYSTRING;

    if (!shopId) {
       throw new Error('Etsy Shop ID is missing from integration record.');
    }

    // 2. Build the Create Listing request payload
    // We merge base canonical data with Etsy-specific settings saved on the listing
    const etsySettings = listing.platformSettings?.etsy || {};
    
    const payload = {
      title: listing.title.substring(0, 140), // Etsy title limit
      description: listing.description || 'No description provided.',
      price: listing.price,
      quantity: listing.quantity || 1,
      who_made: etsySettings.whoMade || 'i_did',
      when_made: etsySettings.whenMade || 'made_to_order',
      taxonomy_id: etsySettings.taxonomyId || '1', // Default required taxonomy (usually shoes/clothing etc)
      is_supply: etsySettings.isSupply || false,
      shipping_profile_id: etsySettings.shippingProfileId || null,
      type: 'physical'
    };

    // 3. Make the API Call to Etsy
    // https://developers.etsy.com/documentation/reference/#operation/createDraftListing
    const response = await axios.post(`${ETSY_API_URL}/shops/${shopId}/listings`, payload, {
      headers: {
        'x-api-key': apiKey,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded' // Etsy v3 requires urlencoded for some endpoints, or json. We use axios which will serialize appropriately if we send URLSearchParams, but let's send JSON and set type.
      }
    });

    const etsyListingId = response.data.listing_id;

    // 4. If we have images, we would upload them here using:
    // POST /v3/application/shops/{shop_id}/listings/{listing_id}/images
    // This requires uploading multipart/form-data with the image bytes.
    // For now, we skip image upload in this basic implementation.

    // 5. Save the mapping to ChannelListing
    const channelListing = new ChannelListing({
      listingId: listing._id,
      platform: 'etsy',
      externalId: etsyListingId.toString(),
      externalUrl: response.data.url || `https://www.etsy.com/listing/${etsyListingId}`,
      status: 'active',
      lastSync: new Date()
    });

    await channelListing.save();

    return {
      success: true,
      channelListing
    };

  } catch (error) {
    console.error('Etsy Listing Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error || error.message || 'Failed to create Etsy listing');
  }
};

module.exports = {
  createEtsyListing
};
