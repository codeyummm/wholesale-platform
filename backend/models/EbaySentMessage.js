const mongoose = require('mongoose');

const EbaySentMessageSchema = new mongoose.Schema({
  originalMessageId: { type: String }, 
  itemId: { type: String },
  recipient: { type: String, required: true },
  body: { type: String, required: true },
  respondedBy: { type: String, required: true },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('EbaySentMessage', EbaySentMessageSchema);
