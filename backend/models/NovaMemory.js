const mongoose = require('mongoose');

const novaMemorySchema = new mongoose.Schema({
  ebayMessageId: {
    type: String,
    required: true,
    unique: true
  },
  messages: {
    type: Array,
    default: []
  }
}, { timestamps: true });

module.exports = mongoose.model('NovaMemory', novaMemorySchema);
