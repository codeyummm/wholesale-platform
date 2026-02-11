const mongoose = require('mongoose');
const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  contact: { email: { type: String, trim: true }, phone: { type: String }, alternatePhone: String },
  address: { street: String, city: String, state: String, zipCode: String, country: { type: String, default: 'USA' } },
  invoices: [{
    invoiceNumber: { type: String, required: true },
    invoiceDate: { type: Date, required: true },
    totalAmount: { type: Number, required: true },
    items: [{ model: String, brand: String, quantity: Number, unitPrice: Number, imeis: [String] }],
    notes: String, fileUrl: String, imageUrl: String,
    createdAt: { type: Date, default: Date.now }
  }],
  totalInvoices: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  rating: { type: Number, min: 1, max: 5, default: 5 },
  notes: String,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });
supplierSchema.index({ name: 'text' });
module.exports = mongoose.model('Supplier', supplierSchema);
