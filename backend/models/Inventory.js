const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  model: { type: String, required: true, trim: true },
  brand: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 0, default: 0 },
  price: {
    cost: { type: Number, required: true, min: 0 },
    retail: { type: Number, required: true, min: 0 }
  },
  devices: [{
    imei: { type: String, required: true },
    unlockStatus: {
      type: String,
      enum: ['locked', 'unlocked', 'carrier_locked'],
      default: 'unlocked'
    },
    condition: {
      type: String,
      enum: ['new', 'refurbished', 'used'],
      default: 'used'
    },
    grade: { type: String, default: 'Grade 5' },
    isSold: { type: Boolean, default: false },
    soldDate: Date
  }],
  barcode: { type: String, sparse: true },
  lowStockThreshold: { type: Number, default: 10 },
  specifications: {
    storage: String,
    color: String,
    ram: String
  },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier" },
  supplierName: { type: String, default: "" },
}, { timestamps: true });

inventorySchema.virtual('availableQuantity').get(function() {
  return this.devices.filter(d => !d.isSold).length;
});

inventorySchema.index({ model: 1, brand: 1 });

module.exports = mongoose.model('Inventory', inventorySchema);
