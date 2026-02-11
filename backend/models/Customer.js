const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ['wholesale', 'retail', 'distributor'],
    default: 'retail'
  },
  company: { type: String, trim: true },
  contact: {
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, required: true },
    alternatePhone: String
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'USA' }
  },
  taxId: String,
  totalPurchases: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  notes: String,
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

customerSchema.index({ name: 'text', company: 'text', 'contact.email': 'text' });

module.exports = mongoose.model('Customer', customerSchema);
