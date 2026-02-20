const mongoose = require('mongoose');

const SaleItemSchema = new mongoose.Schema({
  inventory: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory' },
  model: { type: String, required: true },
  brand: String,
  storage: String,
  color: String,
  imei: String,
  condition: String,
  grade: String,
  costPrice: { type: Number, default: 0 },
  salePrice: { type: Number, required: true },
  profit: { type: Number, default: 0 }
});

const saleSchema = new mongoose.Schema({
  saleNumber: { type: String, unique: true, index: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  customerName: { type: String, required: true },
  items: [SaleItemSchema],
  subtotal: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  totalProfit: { type: Number, default: 0 },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'bank_transfer', 'check', 'zelle', 'paypal', 'other'],
    default: 'cash'
  },
  paymentStatus: {
    type: String,
    enum: ['paid', 'partial', 'unpaid'],
    default: 'paid'
  },
  amountPaid: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['completed', 'pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
    default: 'completed'
  },
  // Sales Channel
  salesChannel: {
    type: String,
    enum: ['in_store', 'online', 'wholesale', 'marketplace', 'phone', 'other'],
    default: 'in_store'
  },
  // Shipping Information
  shipping: {
    trackingNumber: { type: String, trim: true },
    carrier: {
      type: String,
      enum: ['', 'UPS', 'USPS', 'FedEx', 'DHL', 'Amazon', 'OnTrac', 'LaserShip', 'Other', 'usps', 'ups', 'fedex', 'dhl', 'amazon', 'ontrac', 'lasership', 'other'],
      default: ''
    },
    shippingMethod: { type: String, trim: true },
    shippingCost: { type: Number, default: 0 },
    shippedDate: Date,
    estimatedDelivery: Date,
    deliveredDate: Date,
    // Customer shipping address (overrides customer default)
    address: {
      name: String,
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: { type: String, default: 'USA' },
      phone: String
    }
  },
  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// Auto-generate sale number + calculate totals
saleSchema.pre('save', async function (next) {
  if (!this.saleNumber) {
    const count = await mongoose.model('Sale').countDocuments();
    const date = new Date();
    const prefix = `SL${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    this.saleNumber = `${prefix}-${String(count + 1).padStart(4, '0')}`;
  }

  // Calculate totals
  if (this.items && this.items.length > 0) {
    this.subtotal = this.items.reduce((sum, item) => sum + item.salePrice, 0);
    this.totalProfit = this.items.reduce((sum, item) => sum + item.profit, 0);
    this.totalAmount = this.subtotal - this.discount + this.tax;
  }

  next();
});

saleSchema.index({ createdAt: -1 });
saleSchema.index({ customerName: 'text', saleNumber: 'text' });
saleSchema.index({ 'shipping.trackingNumber': 1 });

module.exports = mongoose.models.Sale || mongoose.model('Sale', saleSchema);
