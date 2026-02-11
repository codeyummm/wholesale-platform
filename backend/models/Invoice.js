const mongoose = require('mongoose');
const ProductSchema = new mongoose.Schema({
  itemCode: String, name: String, brand: String, model: String, modelNumber: String,
  color: String, lockStatus: String, storage: String, grade: String, fullDescription: String,
  quantity: { type: Number, default: 1 }, unitPrice: { type: Number, default: 0 },
  lineTotal: { type: Number, default: 0 }, imeis: [String]
});
const InvoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, index: true },
  invoiceDate: Date,
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  supplierName: { type: String, required: true },
  products: [ProductSchema],
  subtotal: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  currency: { type: String, default: 'USD', enum: ['USD','EUR','GBP','CAD','AUD','INR','JPY','CHF'] },
  status: { type: String, enum: ['pending','processed','verified','rejected'], default: 'pending' },
  imageUrl: String,
  rawText: String,
  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
InvoiceSchema.index({ invoiceNumber: 'text', supplierName: 'text' });
InvoiceSchema.index({ supplier: 1, createdAt: -1 });
module.exports = mongoose.model('Invoice', InvoiceSchema);
