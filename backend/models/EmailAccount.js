const mongoose = require('mongoose');

const emailAccountSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  provider: {
    type: String,
    required: true,
    enum: ['zoho', 'gmail'],
    default: 'zoho'
  },
  emailAddress: {
    type: String
  },
  accessToken: String,
  refreshToken: String,
  tokenExpiry: Date,
  lastSync: Date,
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('EmailAccount', emailAccountSchema);
