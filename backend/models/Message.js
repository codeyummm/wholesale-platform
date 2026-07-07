const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  // Sender can be an internal User...
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: false // Optional now, since an external customer might be the sender
  },
  // ...or an external contact (e.g. customer emailing in)
  externalSender: {
    name: String,
    email: String,
    phone: String
  },
  content: { 
    type: String
  },
  isInternalNote: {
    type: Boolean,
    default: false // If true, this is a staff-only whisper note, not sent to the customer
  },
  emailMetadata: {
    messageId: String, // Zoho / standard Email Message-ID
    inReplyTo: String,
    cc: [String],
    bcc: [String],
    folder: String, // e.g., 'Inbox', 'Sent', 'Spam'
    isRead: { type: Boolean, default: false }
  },
  readBy: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  attachment: {
    url: String,
    filename: String,
    fileType: String,
    size: Number
  }
}, { timestamps: true });

messageSchema.index({ conversationId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
