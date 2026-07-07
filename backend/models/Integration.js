const mongoose = require('mongoose');

const integrationSchema = new mongoose.Schema({
  platform: {
    type: String,
    required: true,
    unique: true, // e.g., 'ebay', 'shipstation'
    index: true
  },
  isConnected: {
    type: Boolean,
    default: false
  },
  credentials: {
    // Encrypted or plaintext depending on security requirements. 
    // Usually these are long-lived refresh tokens.
    accessToken: String,
    refreshToken: String,
    tokenExpiry: Date,
    // Store additional platform-specific settings here
    storeName: String,
    storeDomain: String,
    sellerId: String,
    // Email Integration
    emailAddress: String,
    password: String, // Store securely or use App Password
    imapHost: String,
    imapPort: Number,
    smtpHost: String,
    smtpPort: Number
  },
  lastSync: {
    type: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('Integration', integrationSchema);
