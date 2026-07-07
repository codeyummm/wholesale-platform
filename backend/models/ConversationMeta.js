const mongoose = require('mongoose');

const conversationMetaSchema = new mongoose.Schema({
  platform: {
    type: String,
    enum: ['ebay'],
    default: 'ebay'
  },
  conversationKey: {
    type: String,
    required: true,
    index: true
  },
  assignedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  internalNotes: [{
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    senderName: String,
    text: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, { timestamps: true });

module.exports = mongoose.model('ConversationMeta', conversationMetaSchema);
