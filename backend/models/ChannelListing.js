const mongoose = require('mongoose');

const channelListingSchema = new mongoose.Schema({
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  
  // "shopify", "amazon", "ebay", etc.
  platform: { type: String, required: true },
  
  // Remote IDs mapping to the platform's system
  remoteId: { type: String },
  remoteUrl: { type: String },
  
  // Status on the remote channel
  status: {
    type: String,
    enum: ['pending', 'active', 'error', 'inactive'],
    default: 'pending'
  },
  
  // Channel-specific overrides
  titleOverride: { type: String, trim: true },
  priceOverride: { type: Number, min: 0 },
  
  // Sync configuration
  syncEnabled: { type: Boolean, default: true },
  lastSyncedAt: { type: Date },
  
  // Last sync error/validation issue
  lastError: { type: String }
}, { timestamps: true });

// A listing should only have one configuration per platform
channelListingSchema.index({ listingId: 1, platform: 1 }, { unique: true });

module.exports = mongoose.model('ChannelListing', channelListingSchema);
