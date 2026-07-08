const Listing = require('../models/Listing');
const ChannelListing = require('../models/ChannelListing');
const SyncJob = require('../models/SyncJob');
const ebayListingService = require('../services/ebayListingService');
const etsyListingService = require('../services/etsyListingService');
const shopifyListingService = require('../services/shopifyListingService');

exports.getListings = async (req, res) => {
  try {
    // Exclude heavy fields like description and images to speed up network transfer
    const listings = await Listing.find()
      .select('-description -images')
      .sort({ createdAt: -1 })
      .lean();
    
    // Fetch all channels for these listings in ONE query to avoid the N+1 problem
    const listingIds = listings.map(l => l._id);
    const allChannels = await ChannelListing.find({ listingId: { $in: listingIds } }).lean();
    
    // Group channels by listingId
    const channelMap = {};
    allChannels.forEach(c => {
      const lid = c.listingId.toString();
      if (!channelMap[lid]) channelMap[lid] = [];
      channelMap[lid].push(c.platform);
    });

    const listingsWithChannels = listings.map(listing => ({
      ...listing,
      channels: channelMap[listing._id.toString()] || []
    }));

    res.json({ success: true, listings: listingsWithChannels });
  } catch (error) {
    console.error('Error fetching listings:', error);
    res.status(500).json({ success: false, message: 'Server error fetching listings' });
  }
};

exports.createListing = async (req, res) => {
  try {
    const { title, description, sku, price, quantity, condition, brand } = req.body;
    
    const newListing = new Listing({
      title,
      description,
      sku,
      price,
      quantity,
      condition,
      brand,
      status: 'active'
    });

    await newListing.save();
    res.status(201).json({ success: true, listing: newListing });
  } catch (error) {
    console.error('Error creating listing:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error creating listing' });
  }
};

exports.getListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }
    
    const channels = await ChannelListing.find({ listingId: listing._id });
    
    res.json({ success: true, listing: { ...listing.toObject(), channelData: channels } });
  } catch (error) {
    console.error('Error fetching listing:', error);
    res.status(500).json({ success: false, message: 'Server error fetching listing' });
  }
};

exports.updateListing = async (req, res) => {
  try {
    const updated = await Listing.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }
    res.json({ success: true, listing: updated });
  } catch (error) {
    console.error('Error updating listing:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error updating listing' });
  }
};

exports.syncToChannel = async (req, res) => {
  try {
    const { id } = req.params;
    const { platform, syncOptions } = req.body;
    
    const listing = await Listing.findById(id);
    if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });

    // Create a new SyncJob
    const job = new SyncJob({
      listingId: id,
      platform,
      action: 'publish_listing',
      status: 'processing'
    });
    await job.save();

    // Fire off async processing
    (async () => {
      try {
        let remoteId = null;

        if (platform === 'ebay') {
          const result = await ebayListingService.createEbayListing(listing, syncOptions, req.user?.id);
          remoteId = result.remoteId;
        } else if (platform === 'etsy') {
          const result = await etsyListingService.createEtsyListing(listing, syncOptions, req.user?.id);
          remoteId = result.remoteId;
        } else if (platform === 'shopify') {
          const result = await shopifyListingService.createShopifyListing(listing, syncOptions, req.user?.id);
          remoteId = result.remoteId;
        } else {
          throw new Error(`Platform ${platform} is not supported yet.`);
        }

        job.status = 'completed';
        job.completedAt = new Date();
        job.logs.push({ message: `Successfully pushed ${listing.sku} to ${platform}` });
        await job.save();

        // Update or create ChannelListing mapping
        await ChannelListing.findOneAndUpdate(
          { listingId: id, platform },
          { status: 'active', lastSyncedAt: new Date(), remoteId },
          { upsert: true, new: true }
        );
      } catch (err) {
        console.error(`Sync job error for ${platform}:`, err);
        job.status = 'failed';
        job.completedAt = new Date();
        job.logs.push({ message: err.message || String(err), level: 'error' });
        await job.save();

        await ChannelListing.findOneAndUpdate(
          { listingId: id, platform },
          { status: 'error', lastError: err.message || String(err) },
          { upsert: true, new: true }
        );
      }
    })();

    res.json({ success: true, message: `Sync job started for ${platform}`, jobId: job._id });
  } catch (error) {
    console.error('Error syncing listing:', error);
    res.status(500).json({ success: false, message: 'Server error syncing listing' });
  }
};
