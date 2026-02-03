const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  model: String,
  details: String,
  quantity: { type: Number, required: true, default: 1 },
  unitPrice: { type: Number, required: true },
  lineTotal: { type: Number, required: true },
});

const InvoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, index: true },
  invoiceDate: Date,
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  supplierName: { type: String, required: true },
  products: [ProductSchema],
  subtotal: Number,
  tax: Number,
  totalAmount: { type: Number, required: true },
  currency: { type: String, default: 'USD', enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'JPY', 'CHF'] },
  status: { type: String, enum: ['pending', 'processed', 'verified', 'rejected'], default: 'pending' },
  rawText: String,
  imageUrl: String,
  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

InvoiceSchema.index({ invoiceNumber: 'text', supplierName: 'text' });

InvoiceSchema.virtual('formattedTotal').get(function() {
  const symbols = { USD: '$', EUR: '€', GBP: '£', INR: '₹' };
  const symbol = symbols[this.currency] || this.currency + ' ';
  return symbol + (this.totalAmount?.toFixed(2) || '0.00');
});

InvoiceSchema.set('toJSON', { virtuals: true });
InvoiceSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Invoice', InvoiceSchema);
