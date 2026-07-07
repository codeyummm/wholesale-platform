const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  sku: { type: String, required: true, unique: true, trim: true },
  
  // Optional reference to the underlying wholesale Inventory
  inventoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory' },
  
  price: { type: Number, required: true, min: 0, default: 0 },
  compareAtPrice: { type: Number, min: 0 },
  quantity: { type: Number, required: true, min: 0, default: 0 },
  
  condition: {
    type: String,
    enum: ['new', 'used', 'refurbished'],
    default: 'used'
  },
  
  brand: { type: String, trim: true },
  category: { type: String, trim: true },
  tags: [{ type: String, trim: true }],
  
  weight: { type: Number, min: 0 },
  barcode: { type: String, trim: true },
  
  platformSettings: {
    ebay: {
      categoryId: String,
      conditionId: String,
      returnProfileId: String,
      shippingProfileId: String,
      paymentProfileId: String
    },
    etsy: {
      taxonomyId: String,
      whoMade: String,
      whenMade: String,
      isSupply: { type: Boolean, default: false },
      shippingProfileId: String
    },
    shopify: {
      productType: String,
      weightUnit: { type: String, default: 'lb', enum: ['lb', 'oz', 'kg', 'g'] }
    }
  },
  
  images: [{
    url: String,
    alt: String,
    isPrimary: Boolean
  }],
  
  status: {
    type: String,
    enum: ['draft', 'active', 'archived'],
    default: 'draft'
  }
}, { timestamps: true });

module.exports = mongoose.model('Listing', listingSchema);
