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
    systemId: { 
      type: String, 
      default: () => 'D-' + Math.random().toString(36).substring(2, 8).toUpperCase() 
    },
    imei: { type: String, required: true },
    imei2: { type: String, trim: true },
    serialNumber: { type: String, trim: true, sparse: true },
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
    batteryHealth: { type: String, trim: true },
    grade: { type: String, default: 'Grade 5' },
    isSold: { type: Boolean, default: false },
    soldDate: Date,
    
    // Detailed specs & label fields
    originalCarrier: { type: String, trim: true },
    modelNumber: { type: String, trim: true },
    partNumber: { type: String, trim: true },
    osVersion: { type: String, trim: true },
    dataCleared: { type: String, default: 'PASS' },
    cosmeticsGrade: { type: String, trim: true },
    functionalityStatus: { type: String, default: 'PASS' },
    imeiStatus: { type: String, default: 'Whitelisted' },
    fmiStatus: { type: String, default: 'OFF' },
    mdmStatus: { type: String, default: 'OFF' },
    labelNotes: { type: String, trim: true },
    internalNotes: { type: String, trim: true },

    history: [{
      action: { type: String, required: true },
      date: { type: Date, default: Date.now },
      details: { type: String },
      user: { type: String }
    }],
    labData: { type: mongoose.Schema.Types.Mixed },
    testResults: [{ type: mongoose.Schema.Types.ObjectId, ref: 'DeviceTest' }]
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
