const mongoose = require('mongoose');

const imeiOrderSchema = new mongoose.Schema({
  apiOrderId: {
    type: String,
    required: true,
    unique: true
  },
  referenceId: {
    type: String
  },
  imei: {
    type: String,
    required: true
  },
  imei2: {
    type: String
  },
  serialNumber: {
    type: String
  },
  brand: {
    type: String
  },
  model: {
    type: String
  },
  inventoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inventory'
  },
  serviceId: {
    type: String,
    required: true
  },
  serviceName: {
    type: String,
    required: true
  },
  cost: {
    type: Number,
    required: true,
    default: 0
  },
  status: {
    type: String,
    enum: ['Pending', 'In Process', 'Success', 'Rejected', 'Canceled', 'Refunded', 'Unknown'],
    default: 'Pending'
  },
  apiResponse: {
    type: mongoose.Schema.Types.Mixed
  }
}, { timestamps: true });

module.exports = mongoose.model('ImeiOrder', imeiOrderSchema);
