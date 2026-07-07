const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  name: { type: String, default: 'Staff Member' },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['admin', 'staff'], default: 'staff' },
  permissions: {
    dashboard: { type: Boolean, default: true },
    sales: { type: Boolean, default: false },
    salesChannels: { type: Boolean, default: false },
    inventory: { type: Boolean, default: false },
    customers: { type: Boolean, default: false },
    suppliers: { type: Boolean, default: false },
    invoices: { type: Boolean, default: false },
    shipping: { type: Boolean, default: false },
    imeiLookup: { type: Boolean, default: false },
    imeiLab: { type: Boolean, default: false },
    deviceTest: { type: Boolean, default: false },
    userManagement: { type: Boolean, default: false },
    msg_emails: { type: Boolean, default: false },
    msg_ebay: { type: Boolean, default: false },
    msg_amazon: { type: Boolean, default: false },
    msg_walmart: { type: Boolean, default: false },
    msg_groupon: { type: Boolean, default: false },
    msg_tiktok: { type: Boolean, default: false },
    msg_whatnot: { type: Boolean, default: false },
    msg_poshmark: { type: Boolean, default: false },
    msg_mercari: { type: Boolean, default: false }
  },
  isActive: { type: Boolean, default: true },
  signatures: [{
    name: { type: String, required: true },
    content: { type: String, required: true }
  }],
  defaultSignatureId: { type: mongoose.Schema.Types.ObjectId }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);
