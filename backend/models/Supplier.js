const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  contact: {
    email: { type: String, trim: true },
    phone: { type: String },
    alternatePhone: String
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'USA' }
  },
  invoices: [{
    invoiceNumber: { type: String, required: true },
    invoiceDate: { type: Date, required: true },
    totalAmount: { type: Number, required: true },
    items: [{
      model: String,
      brand: String,
      quantity: Number,
      unitPrice: Number,
      imeis: [String]
    }],
    notes: String,
    fileUrl: String,
    createdAt: { type: Date, default: Date.now }
  }],
  rating: { type: Number, min: 1, max: 5, default: 5 },
  notes: String,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Supplier', supplierSchema);
