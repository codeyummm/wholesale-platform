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
  profit: { type: Number, default: 0 },
  externalLineItemId: { type: String } // Used to fulfill tracking to eBay for specific line items
});

const saleSchema = new mongoose.Schema({
  saleNumber: { type: String, unique: true, index: true },
  externalOrderId: { type: String, sparse: true, index: true }, // e.g. eBay Order ID
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
    enum: ['cash', 'card', 'bank_transfer', 'check', 'zelle', 'paypal', 'ebay', 'shopify', 'other'],
    default: 'cash'
  },
  paymentStatus: {
    type: String,
    enum: ['paid', 'pending', 'partial', 'unpaid', 'failed', 'cancelled', 'refunded'],
    default: 'paid'
  },
  amountPaid: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['completed', 'pending', 'shipped', 'delivered', 'cancelled', 'refunded'],
    default: 'completed'
  },
  deliveryStatus: {
    type: String,
    enum: ["pending", "processing", "shipped", "in_transit", "out_for_delivery", "delivered", "hold", "cancelled", "exception"],
    default: "pending"
  },
  // Sales Channel
  salesChannel: {
    type: String,
    enum: ['in_store', 'online', 'ebay', 'amazon', 'walmart', 'etsy', 'facebook', 'mercari', 'offerup', 'wholesale', 'phone', 'shopify', 'other'],
    default: 'in_store'
  },
  // Shipping Information
  shipping: {
    trackingNumber: { type: String, trim: true },
    carrier: {
      type: String,
      default: ''
    },
    shippingMethod: { type: String, trim: true },
    shippingCost: { type: Number, default: 0 },
    shippingCollected: { type: Number, default: 0 },
    labelImage: String,
    scannedLabel: String,
    fullImage: String,
    shipmentId: Number,
    dropoffReceipt: String,
    shippedDate: Date,
    estimatedDelivery: Date,
    deliveredDate: Date,
    trackingData: { type: mongoose.Schema.Types.Mixed },
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
  // Additional Costs
  costs: {
    handling: { type: Number, default: 1 },
    packaging: { type: Number, default: 2 },
    marketplaceFees: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  },
  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  editHistory: [{
    editedBy: { type: String },
    editedAt: { type: Date, default: Date.now },
    changes: { type: String }
  }],
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
    // Calculate total profit deducting all costs
    const itemProfits = this.items.reduce((sum, item) => sum + item.profit, 0);
    const shippingCost = this.shipping?.shippingCost || 0;
    const handlingCost = this.costs?.handling || 0;
    const packagingCost = this.costs?.packaging || 0;
    const marketplaceFees = this.costs?.marketplaceFees || 0;
    const otherCosts = this.costs?.other || 0;
    const totalCosts = shippingCost + handlingCost + packagingCost + marketplaceFees + otherCosts;
    const shippingCollected = this.shipping?.shippingCollected || 0;
    this.totalProfit = itemProfits + shippingCollected - totalCosts;
    this.totalAmount = this.subtotal - this.discount + this.tax + shippingCollected;
  }

  next();
});

saleSchema.index({ createdAt: -1 });
saleSchema.index({ customerName: 'text', saleNumber: 'text' });
saleSchema.index({ 'shipping.trackingNumber': 1 });

module.exports = mongoose.models.Sale || mongoose.model('Sale', saleSchema);
