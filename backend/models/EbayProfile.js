const mongoose = require('mongoose');

const ebayProfileSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ['TEMPLATE'], default: 'TEMPLATE' },
  ebayPolicyId: { type: String }, // Optional, not needed for new UX but kept for backwards compat
  description: { type: String }, // Optional user description
  configuration: { type: mongoose.Schema.Types.Mixed } // Stores the raw settings (e.g. shipping cost, handling time)
}, { timestamps: true });

module.exports = mongoose.model('EbayProfile', ebayProfileSchema);
