const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  channel: {
    type: String,
    enum: ['internal', 'email', 'sms', 'whatsapp'],
    default: 'internal'
  },
  provider: {
    type: String, // e.g. 'gmail', 'zoho'
  },
  isGroup: { 
    type: Boolean, 
    default: false 
  },
  name: { 
    type: String // Optional, for group chats or ticket subjects
  },
  participants: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  admin: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' // Only for group chats
  },
  // --- External Shared Inbox Fields ---
  ourEmail: {
    type: String // To track which alias we received this email on
  },
  externalContact: {
    name: String,
    email: String,
    phone: String
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['open', 'pending', 'resolved', 'closed'],
    default: 'open'
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

conversationSchema.index({ participants: 1, lastMessageAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
