const mongoose = require('mongoose');

const syncJobSchema = new mongoose.Schema({
  // The listing being synced (if applicable to a single listing)
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing' },
  
  // The target platform (e.g. "shopify", "amazon")
  platform: { type: String, required: true },
  
  // "push_inventory", "push_price", "publish_listing", "import_orders"
  action: { type: String, required: true },
  
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  
  // Detailed logs or error messages
  logs: [{
    timestamp: { type: Date, default: Date.now },
    message: String,
    level: { type: String, enum: ['info', 'warning', 'error'], default: 'info' }
  }],
  
  completedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('SyncJob', syncJobSchema);
