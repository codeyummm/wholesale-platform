#!/bin/bash
# ============================================
# Phase 2: Customers + Sales/Orders
# Run from PROJECT ROOT (wholesale-platform/)
# ============================================

echo "🚀 Starting Phase 2 Installation..."
echo ""

# ============================================
# STEP 1: Customer Model
# ============================================
echo "📦 Step 1: Creating Customer model..."

cat > backend/models/Customer.js << 'ENDOFFILE'
const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ['wholesale', 'retail', 'distributor'],
    default: 'retail'
  },
  company: { type: String, trim: true },
  contact: {
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, required: true },
    alternatePhone: String
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'USA' }
  },
  taxId: String,
  totalPurchases: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  notes: String,
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

customerSchema.index({ name: 'text', company: 'text', 'contact.email': 'text' });

module.exports = mongoose.model('Customer', customerSchema);
ENDOFFILE

echo "✅ Customer model created"

# ============================================
# STEP 2: Sale Model
# ============================================
echo ""
echo "📦 Step 2: Creating Sale model..."

cat > backend/models/Sale.js << 'ENDOFFILE'
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
  totalAmount: { type: Number, required: true },
  totalProfit: { type: Number, default: 0 },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'bank_transfer', 'check', 'other'],
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
    enum: ['completed', 'pending', 'cancelled', 'refunded'],
    default: 'completed'
  },
  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// Auto-generate sale number
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

module.exports = mongoose.model('Sale', saleSchema);
ENDOFFILE

echo "✅ Sale model created"

# ============================================
# STEP 3: Customer Controller
# ============================================
echo ""
echo "📦 Step 3: Creating Customer controller..."

cat > backend/controllers/customerController.js << 'ENDOFFILE'
const Customer = require('../models/Customer');

exports.getCustomers = async (req, res) => {
  try {
    const { search, type } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { 'contact.email': { $regex: search, $options: 'i' } },
        { 'contact.phone': { $regex: search, $options: 'i' } }
      ];
    }
    if (type) query.type = type;

    const customers = await Customer.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: customers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, data: customer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createCustomer = async (req, res) => {
  try {
    const customer = await Customer.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, data: customer });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, message: 'Customer deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
ENDOFFILE

echo "✅ Customer controller created"

# ============================================
# STEP 4: Sale Controller
# ============================================
echo ""
echo "📦 Step 4: Creating Sale controller..."

cat > backend/controllers/saleController.js << 'ENDOFFILE'
const Sale = require('../models/Sale');
const Inventory = require('../models/Inventory');
const Customer = require('../models/Customer');

exports.getSales = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status, startDate, endDate } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { saleNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } }
      ];
    }
    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate + 'T23:59:59');
    }

    const sales = await Sale.find(query)
      .populate('customer', 'name company contact')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Sale.countDocuments(query);

    res.json({
      success: true,
      data: sales,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSale = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id).populate('customer', 'name company contact address');
    if (!sale) return res.status(404).json({ success: false, message: 'Sale not found' });
    res.json({ success: true, data: sale });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createSale = async (req, res) => {
  try {
    const { customerId, customerName, items, discount, tax, paymentMethod, paymentStatus, amountPaid, notes } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one item is required' });
    }

    // Process each item - mark devices as sold in inventory
    const processedItems = [];
    for (const item of items) {
      const processedItem = { ...item };

      // If we have inventory ID and IMEI, mark device as sold
      if (item.inventoryId && item.imei) {
        const inventoryItem = await Inventory.findById(item.inventoryId);
        if (inventoryItem) {
          const deviceIndex = inventoryItem.devices.findIndex(
            d => d.imei === item.imei && !d.isSold
          );
          if (deviceIndex !== -1) {
            inventoryItem.devices[deviceIndex].isSold = true;
            inventoryItem.devices[deviceIndex].soldDate = new Date();
            await inventoryItem.save();

            processedItem.inventory = item.inventoryId;
            processedItem.costPrice = inventoryItem.price?.cost || 0;
            processedItem.profit = (item.salePrice || 0) - (inventoryItem.price?.cost || 0);
          }
        }
      } else {
        // Manual item without inventory link
        processedItem.profit = (item.salePrice || 0) - (item.costPrice || 0);
      }

      processedItems.push(processedItem);
    }

    // Update customer stats
    if (customerId) {
      const totalAmount = processedItems.reduce((sum, item) => sum + item.salePrice, 0) - (discount || 0) + (tax || 0);
      await Customer.findByIdAndUpdate(customerId, {
        $inc: { totalPurchases: 1, totalSpent: totalAmount }
      });
    }

    const sale = await Sale.create({
      customer: customerId || null,
      customerName: customerName || 'Walk-in Customer',
      items: processedItems,
      discount: discount || 0,
      tax: tax || 0,
      paymentMethod: paymentMethod || 'cash',
      paymentStatus: paymentStatus || 'paid',
      amountPaid: amountPaid || 0,
      notes,
      createdBy: req.user._id
    });

    const populated = await Sale.findById(sale._id).populate('customer', 'name company contact');

    res.status(201).json({ success: true, data: populated, message: 'Sale created successfully' });
  } catch (error) {
    console.error('Create sale error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateSale = async (req, res) => {
  try {
    const sale = await Sale.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!sale) return res.status(404).json({ success: false, message: 'Sale not found' });
    res.json({ success: true, data: sale });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteSale = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) return res.status(404).json({ success: false, message: 'Sale not found' });

    // Unmark devices as sold
    for (const item of sale.items) {
      if (item.inventory && item.imei) {
        const inventoryItem = await Inventory.findById(item.inventory);
        if (inventoryItem) {
          const device = inventoryItem.devices.find(d => d.imei === item.imei);
          if (device) {
            device.isSold = false;
            device.soldDate = null;
            await inventoryItem.save();
          }
        }
      }
    }

    await Sale.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Sale deleted and inventory restored' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSaleStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [todaySales, monthSales, allSales] = await Promise.all([
      Sale.aggregate([
        { $match: { createdAt: { $gte: today }, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 }, profit: { $sum: '$totalProfit' } } }
      ]),
      Sale.aggregate([
        { $match: { createdAt: { $gte: thisMonth }, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 }, profit: { $sum: '$totalProfit' } } }
      ]),
      Sale.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 }, profit: { $sum: '$totalProfit' } } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        today: todaySales[0] || { total: 0, count: 0, profit: 0 },
        thisMonth: monthSales[0] || { total: 0, count: 0, profit: 0 },
        allTime: allSales[0] || { total: 0, count: 0, profit: 0 }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
ENDOFFILE

echo "✅ Sale controller created"

# ============================================
# STEP 5: Customer Routes
# ============================================
echo ""
echo "📦 Step 5: Creating routes..."

cat > backend/routes/customer.js << 'ENDOFFILE'
const express = require('express');
const router = express.Router();
const { getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer } = require('../controllers/customerController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getCustomers);
router.get('/:id', protect, getCustomer);
router.post('/', protect, createCustomer);
router.put('/:id', protect, updateCustomer);
router.delete('/:id', protect, deleteCustomer);

module.exports = router;
ENDOFFILE

cat > backend/routes/sale.js << 'ENDOFFILE'
const express = require('express');
const router = express.Router();
const { getSales, getSale, createSale, updateSale, deleteSale, getSaleStats } = require('../controllers/saleController');
const { protect } = require('../middleware/auth');

router.get('/stats', protect, getSaleStats);
router.get('/', protect, getSales);
router.get('/:id', protect, getSale);
router.post('/', protect, createSale);
router.put('/:id', protect, updateSale);
router.delete('/:id', protect, deleteSale);

module.exports = router;
ENDOFFILE

echo "✅ Routes created"

# ============================================
# STEP 6: Update server.js to add new routes
# ============================================
echo ""
echo "📦 Step 6: Adding new routes to server.js..."

cat > backend/server.js << 'ENDOFFILE'
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
dotenv.config();
const app = express();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ MongoDB Connected');
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('inventories');
      await collection.dropIndex('devices.imei_1');
      console.log('✅ Dropped devices.imei_1 index');
    } catch (e) {
      console.log('Index check:', e.message);
    }
  })
  .catch(err => console.error('❌ MongoDB Error:', err));

app.use(express.json({ limit: '10mb' }));
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));

app.get('/', (req, res) => {
  res.json({ success: true, message: 'Wholesale Platform API', version: '2.0.0' });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/suppliers', require('./routes/supplier'));
app.use('/api/invoices', require('./routes/invoice'));
app.use('/api/device-tests', require('./routes/deviceTest'));
app.use('/api/customers', require('./routes/customer'));
app.use('/api/sales', require('./routes/sale'));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message || 'Server Error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('🚀 Server running on port ' + PORT);
});
ENDOFFILE

echo "✅ server.js updated with customer + sale routes"

# ============================================
# STEP 7: Customers Frontend Page
# ============================================
echo ""
echo "📦 Step 7: Creating Customers page..."

mkdir -p frontend/src/components/Customers

cat > frontend/src/components/Customers/CustomerList.jsx << 'ENDOFFILE'
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import {
  Plus, Search, Edit, Trash2, Phone, Mail, MapPin,
  UserCircle, Building, X, Save, Filter, DollarSign, ShoppingCart
} from 'lucide-react';

export default function CustomerList() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '', company: '', type: 'retail',
    contact: { email: '', phone: '', alternatePhone: '' },
    address: { street: '', city: '', state: '', zipCode: '' },
    taxId: '', notes: ''
  });

  useEffect(() => { fetchCustomers(); }, [search, typeFilter]);

  const fetchCustomers = async () => {
    try {
      let url = `/customers?search=${search}`;
      if (typeFilter) url += `&type=${typeFilter}`;
      const res = await api.get(url);
      setCustomers(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/customers/${editingId}`, formData);
      } else {
        await api.post('/customers', formData);
      }
      setShowModal(false);
      setEditingId(null);
      resetForm();
      fetchCustomers();
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleEdit = (customer) => {
    setEditingId(customer._id);
    setFormData({
      name: customer.name || '',
      company: customer.company || '',
      type: customer.type || 'retail',
      contact: customer.contact || { email: '', phone: '', alternatePhone: '' },
      address: customer.address || { street: '', city: '', state: '', zipCode: '' },
      taxId: customer.taxId || '',
      notes: customer.notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this customer?')) return;
    try {
      await api.delete(`/customers/${id}`);
      fetchCustomers();
    } catch (err) {
      alert('Failed to delete');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '', company: '', type: 'retail',
      contact: { email: '', phone: '', alternatePhone: '' },
      address: { street: '', city: '', state: '', zipCode: '' },
      taxId: '', notes: ''
    });
  };

  const typeColors = {
    wholesale: { bg: '#eef2ff', color: '#4338ca', label: 'Wholesale' },
    retail: { bg: '#ecfdf5', color: '#059669', label: 'Retail' },
    distributor: { bg: '#fef3c7', color: '#b45309', label: 'Distributor' }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px' }}>Customers</h1>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Manage your buyers and wholesale clients</p>
        </div>
        <button onClick={() => { resetForm(); setEditingId(null); setShowModal(true); }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #4338ca, #6366f1)', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '500', fontSize: '14px' }}>
          <Plus size={18} /> Add Customer
        </button>
      </div>

      {/* Search + Filter */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={18} />
          <input type="text" placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '10px 10px 10px 40px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none' }} />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          style={{ padding: '10px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', background: 'white', cursor: 'pointer', minWidth: '140px' }}>
          <option value="">All Types</option>
          <option value="wholesale">Wholesale</option>
          <option value="retail">Retail</option>
          <option value="distributor">Distributor</option>
        </select>
      </div>

      {/* Customer List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ width: '36px', height: '36px', border: '4px solid #e2e8f0', borderTop: '4px solid #6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: '#64748b' }}>Loading customers...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : customers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <UserCircle size={48} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: '#64748b', marginBottom: '16px' }}>No customers found</p>
          <button onClick={() => { resetForm(); setEditingId(null); setShowModal(true); }}
            style={{ background: '#6366f1', color: 'white', padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>Add First Customer</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
          {customers.map((cust) => {
            const tc = typeColors[cust.type] || typeColors.retail;
            return (
              <div key={cust._id} style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', transition: 'all 0.15s ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: tc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <UserCircle size={22} color={tc.color} />
                    </div>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a' }}>{cust.name}</div>
                      {cust.company && <div style={{ fontSize: '12px', color: '#64748b' }}>{cust.company}</div>}
                    </div>
                  </div>
                  <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', background: tc.bg, color: tc.color }}>{tc.label}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px', fontSize: '13px', color: '#64748b' }}>
                  {cust.contact?.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Phone size={14} /> {cust.contact.phone}</div>
                  )}
                  {cust.contact?.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Mail size={14} /> {cust.contact.email}</div>
                  )}
                  {cust.address?.city && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><MapPin size={14} /> {cust.address.city}{cust.address.state ? `, ${cust.address.state}` : ''}</div>
                  )}
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', gap: '12px', padding: '10px 0', borderTop: '1px solid #f1f5f9', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                    <ShoppingCart size={14} color="#6366f1" />
                    <span style={{ color: '#334155', fontWeight: '600' }}>{cust.totalPurchases || 0}</span>
                    <span style={{ color: '#94a3b8' }}>orders</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                    <DollarSign size={14} color="#10b981" />
                    <span style={{ color: '#334155', fontWeight: '600' }}>${(cust.totalSpent || 0).toLocaleString()}</span>
                    <span style={{ color: '#94a3b8' }}>spent</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => navigate(`/sales?customerId=${cust._id}`)}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}>
                    <ShoppingCart size={14} /> New Sale
                  </button>
                  <button onClick={() => handleEdit(cust)}
                    style={{ padding: '8px 12px', background: '#eef2ff', border: '1px solid #c7d2fe', color: '#4338ca', borderRadius: '6px', cursor: 'pointer' }}>
                    <Edit size={14} />
                  </button>
                  <button onClick={() => handleDelete(cust._id)}
                    style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '6px', cursor: 'pointer' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '28px', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>{editingId ? 'Edit' : 'Add'} Customer</h2>
              <button onClick={() => { setShowModal(false); setEditingId(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={22} color="#64748b" /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px', color: '#334155' }}>Name *</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px', color: '#334155' }}>Company</label>
                  <input type="text" value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px', color: '#334155' }}>Type</label>
                  <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', background: 'white' }}>
                    <option value="retail">Retail</option>
                    <option value="wholesale">Wholesale</option>
                    <option value="distributor">Distributor</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px', color: '#334155' }}>Phone *</label>
                  <input type="tel" required value={formData.contact.phone} onChange={(e) => setFormData({ ...formData, contact: { ...formData.contact, phone: e.target.value } })}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }} />
                </div>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px', color: '#334155' }}>Email</label>
                <input type="email" value={formData.contact.email} onChange={(e) => setFormData({ ...formData, contact: { ...formData.contact, email: e.target.value } })}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px', color: '#334155' }}>City</label>
                  <input type="text" value={formData.address.city} onChange={(e) => setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px', color: '#334155' }}>State</label>
                  <input type="text" value={formData.address.state} onChange={(e) => setFormData({ ...formData, address: { ...formData.address, state: e.target.value } })}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }} />
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px', color: '#334155' }}>Notes</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows="2"
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => { setShowModal(false); setEditingId(null); }}
                  style={{ flex: 1, padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', cursor: 'pointer', fontWeight: '500', fontSize: '14px' }}>Cancel</button>
                <button type="submit"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', background: 'linear-gradient(135deg, #4338ca, #6366f1)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', fontSize: '14px' }}>
                  <Save size={16} /> {editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
ENDOFFILE

echo "✅ CustomerList.jsx created"

# ============================================
# STEP 8: Sales Frontend Page
# ============================================
echo ""
echo "📦 Step 8: Creating Sales page..."

mkdir -p frontend/src/components/Sales

cat > frontend/src/components/Sales/SalesList.jsx << 'ENDOFFILE'
import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import {
  Plus, Search, Trash2, ChevronLeft, ChevronRight, Loader2,
  ShoppingCart, DollarSign, TrendingUp, X, Save, Smartphone,
  Receipt, Eye, Calendar, Filter
} from 'lucide-react';

export default function SalesList() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [stats, setStats] = useState({ today: {}, thisMonth: {}, allTime: {} });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [filters, setFilters] = useState({ search: '', status: '' });

  // Create sale form state
  const [customers, setCustomers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [saleForm, setSaleForm] = useState({
    customerId: '', customerName: 'Walk-in Customer',
    items: [], discount: 0, tax: 0,
    paymentMethod: 'cash', paymentStatus: 'paid', notes: ''
  });
  const [selectedInventory, setSelectedInventory] = useState('');
  const [selectedDevice, setSelectedDevice] = useState('');
  const [manualPrice, setManualPrice] = useState('');

  useEffect(() => { fetchSales(); fetchStats(); }, [pagination.page, filters.status]);

  const fetchSales = async () => {
    setLoading(true);
    try {
      let url = `/sales?page=${pagination.page}&limit=${pagination.limit}`;
      if (filters.search) url += `&search=${filters.search}`;
      if (filters.status) url += `&status=${filters.status}`;
      const res = await api.get(url);
      if (res.data.success) {
        setSales(res.data.data);
        setPagination(prev => ({ ...prev, ...res.data.pagination }));
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/sales/stats');
      if (res.data.success) setStats(res.data.data);
    } catch (err) { console.error(err); }
  };

  const openCreateModal = async () => {
    try {
      const [custRes, invRes] = await Promise.all([
        api.get('/customers'),
        api.get('/inventory?limit=200')
      ]);
      setCustomers(custRes.data.data || []);
      setInventory(invRes.data.data || []);
    } catch (err) { console.error(err); }
    setSaleForm({
      customerId: '', customerName: 'Walk-in Customer',
      items: [], discount: 0, tax: 0,
      paymentMethod: 'cash', paymentStatus: 'paid', notes: ''
    });
    setShowCreateModal(true);
  };

  const handleCustomerSelect = (e) => {
    const id = e.target.value;
    if (id === '') {
      setSaleForm(prev => ({ ...prev, customerId: '', customerName: 'Walk-in Customer' }));
    } else {
      const cust = customers.find(c => c._id === id);
      setSaleForm(prev => ({ ...prev, customerId: id, customerName: cust?.name || '' }));
    }
  };

  const addItemFromInventory = () => {
    if (!selectedInventory) return;
    const inv = inventory.find(i => i._id === selectedInventory);
    if (!inv) return;

    let device = null;
    if (selectedDevice) {
      device = inv.devices?.find(d => d.imei === selectedDevice && !d.isSold);
    }

    const newItem = {
      inventoryId: inv._id,
      model: inv.model,
      brand: inv.brand || '',
      storage: inv.specifications?.storage || '',
      color: inv.specifications?.color || '',
      imei: device?.imei || '',
      condition: device?.condition || '',
      grade: device?.grade || '',
      costPrice: inv.price?.cost || 0,
      salePrice: parseFloat(manualPrice) || inv.price?.retail || 0,
    };
    newItem.profit = newItem.salePrice - newItem.costPrice;

    setSaleForm(prev => ({ ...prev, items: [...prev.items, newItem] }));
    setSelectedInventory('');
    setSelectedDevice('');
    setManualPrice('');
  };

  const removeItem = (index) => {
    setSaleForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const updateItemPrice = (index, price) => {
    setSaleForm(prev => {
      const items = [...prev.items];
      items[index].salePrice = parseFloat(price) || 0;
      items[index].profit = items[index].salePrice - items[index].costPrice;
      return { ...prev, items };
    });
  };

  const getSubtotal = () => saleForm.items.reduce((sum, item) => sum + item.salePrice, 0);
  const getTotal = () => getSubtotal() - saleForm.discount + saleForm.tax;
  const getTotalProfit = () => saleForm.items.reduce((sum, item) => sum + item.profit, 0);

  const handleCreateSale = async () => {
    if (saleForm.items.length === 0) { alert('Add at least one item'); return; }
    try {
      const res = await api.post('/sales', { ...saleForm, amountPaid: getTotal() });
      if (res.data.success) {
        setShowCreateModal(false);
        fetchSales();
        fetchStats();
        alert('Sale created successfully!');
      }
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDeleteSale = async (id) => {
    if (!window.confirm('Delete this sale? Inventory will be restored.')) return;
    try {
      await api.delete(`/sales/${id}`);
      fetchSales();
      fetchStats();
    } catch (err) { alert('Failed to delete'); }
  };

  const viewSaleDetail = async (id) => {
    try {
      const res = await api.get(`/sales/${id}`);
      if (res.data.success) {
        setSelectedSale(res.data.data);
        setShowDetailModal(true);
      }
    } catch (err) { console.error(err); }
  };

  const availableDevices = selectedInventory
    ? (inventory.find(i => i._id === selectedInventory)?.devices?.filter(d => !d.isSold) || [])
    : [];

  const statusColors = {
    completed: { bg: '#ecfdf5', color: '#059669' },
    pending: { bg: '#fef3c7', color: '#b45309' },
    cancelled: { bg: '#fef2f2', color: '#dc2626' },
    refunded: { bg: '#f1f5f9', color: '#475569' }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px' }}>Sales & Orders</h1>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Create sales and track revenue</p>
        </div>
        <button onClick={openCreateModal}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '500', fontSize: '14px' }}>
          <Plus size={18} /> New Sale
        </button>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        {[
          { label: 'Today', value: `$${(stats.today?.total || 0).toLocaleString()}`, sub: `${stats.today?.count || 0} sales`, icon: DollarSign, color: '#10b981', bg: '#ecfdf5' },
          { label: 'This Month', value: `$${(stats.thisMonth?.total || 0).toLocaleString()}`, sub: `${stats.thisMonth?.count || 0} sales`, icon: Calendar, color: '#6366f1', bg: '#eef2ff' },
          { label: 'Month Profit', value: `$${(stats.thisMonth?.profit || 0).toLocaleString()}`, sub: 'Net earnings', icon: TrendingUp, color: '#f59e0b', bg: '#fffbeb' },
          { label: 'All Time', value: `$${(stats.allTime?.total || 0).toLocaleString()}`, sub: `${stats.allTime?.count || 0} total sales`, icon: ShoppingCart, color: '#8b5cf6', bg: '#f5f3ff' },
        ].map((card, i) => (
          <div key={i} style={{ background: 'white', borderRadius: '10px', padding: '16px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>{card.label}</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <card.icon size={16} color={card.color} />
              </div>
            </div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a' }}>{card.value}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={18} />
          <input type="text" placeholder="Search sales..." value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && fetchSales()}
            style={{ width: '100%', padding: '10px 10px 10px 40px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }} />
        </div>
        <select value={filters.status} onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
          style={{ padding: '10px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', background: 'white' }}>
          <option value="">All Status</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Sales Table */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
            <Loader2 size={32} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : sales.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <Receipt size={48} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: '#64748b' }}>No sales yet</p>
          </div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Sale #</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Customer</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Items</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Total</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Profit</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => {
                  const sc = statusColors[sale.status] || statusColors.completed;
                  return (
                    <tr key={sale._id} style={{ borderBottom: '1px solid #f1f5f9' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; }}>
                      <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{sale.saleNumber}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#334155' }}>{sale.customerName}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748b' }}>{sale.items?.length || 0} device(s)</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#0f172a', textAlign: 'right' }}>${sale.totalAmount?.toFixed(2)}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: sale.totalProfit >= 0 ? '#059669' : '#dc2626', textAlign: 'right' }}>${sale.totalProfit?.toFixed(2)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', background: sc.bg, color: sc.color }}>{sale.status}</span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748b' }}>{new Date(sale.createdAt).toLocaleDateString()}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button onClick={() => viewSaleDetail(sale._id)} style={{ padding: '6px', background: '#eef2ff', border: 'none', borderRadius: '6px', cursor: 'pointer' }} title="View"><Eye size={15} color="#4338ca" /></button>
                          <button onClick={() => handleDeleteSale(sale._id)} style={{ padding: '6px', background: '#fef2f2', border: 'none', borderRadius: '6px', cursor: 'pointer' }} title="Delete"><Trash2 size={15} color="#dc2626" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {pagination.pages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <span style={{ fontSize: '13px', color: '#64748b' }}>Page {pagination.page} of {pagination.pages}</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))} disabled={pagination.page === 1}
                    style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', background: 'white', cursor: 'pointer', opacity: pagination.page === 1 ? 0.5 : 1 }}><ChevronLeft size={16} /></button>
                  <button onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))} disabled={pagination.page >= pagination.pages}
                    style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', background: 'white', cursor: 'pointer', opacity: pagination.page >= pagination.pages ? 0.5 : 1 }}><ChevronRight size={16} /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Sale Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '28px', maxWidth: '800px', width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>Create New Sale</h2>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={22} color="#64748b" /></button>
            </div>

            {/* Customer Selection */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px', color: '#334155' }}>Customer</label>
              <select value={saleForm.customerId} onChange={handleCustomerSelect}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', background: 'white' }}>
                <option value="">Walk-in Customer</option>
                {customers.map(c => <option key={c._id} value={c._id}>{c.name} {c.company ? `(${c.company})` : ''}</option>)}
              </select>
            </div>

            {/* Add Items */}
            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '16px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '10px', color: '#334155' }}>Add Device</label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: 2, minWidth: '150px' }}>
                  <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '2px' }}>Product</label>
                  <select value={selectedInventory} onChange={(e) => { setSelectedInventory(e.target.value); setSelectedDevice(''); }}
                    style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', background: 'white' }}>
                    <option value="">Select product...</option>
                    {inventory.filter(i => i.devices?.some(d => !d.isSold)).map(i => (
                      <option key={i._id} value={i._id}>{i.brand} {i.model} {i.specifications?.storage || ''} ({i.devices?.filter(d => !d.isSold).length} avail)</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '2px' }}>Device (IMEI)</label>
                  <select value={selectedDevice} onChange={(e) => setSelectedDevice(e.target.value)}
                    style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', background: 'white' }}>
                    <option value="">Any / Manual</option>
                    {availableDevices.map((d, i) => (
                      <option key={i} value={d.imei}>{d.imei} ({d.condition})</option>
                    ))}
                  </select>
                </div>
                <div style={{ minWidth: '100px' }}>
                  <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '2px' }}>Price ($)</label>
                  <input type="number" step="0.01" value={manualPrice} onChange={(e) => setManualPrice(e.target.value)}
                    placeholder={selectedInventory ? String(inventory.find(i => i._id === selectedInventory)?.price?.retail || '') : '0'}
                    style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px' }} />
                </div>
                <button onClick={addItemFromInventory}
                  style={{ padding: '8px 16px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>
                  + Add
                </button>
              </div>
            </div>

            {/* Items List */}
            {saleForm.items.length > 0 && (
              <div style={{ marginBottom: '16px', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#f8fafc' }}>
                    <tr>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Item</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>IMEI</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Cost</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Sale Price</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Profit</th>
                      <th style={{ padding: '10px 12px', width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {saleForm.items.map((item, i) => (
                      <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ fontSize: '13px', fontWeight: '500', color: '#0f172a' }}>{item.brand} {item.model}</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>{item.storage} {item.color}</div>
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '12px', fontFamily: 'monospace', color: '#64748b' }}>{item.imei || '-'}</td>
                        <td style={{ padding: '10px 12px', fontSize: '13px', color: '#64748b', textAlign: 'right' }}>${item.costPrice.toFixed(2)}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <input type="number" step="0.01" value={item.salePrice} onChange={(e) => updateItemPrice(i, e.target.value)}
                            style={{ width: '90px', padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '13px', fontWeight: '600', textAlign: 'right' }} />
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: '600', textAlign: 'right', color: item.profit >= 0 ? '#059669' : '#dc2626' }}>${item.profit.toFixed(2)}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <button onClick={() => removeItem(i)} style={{ padding: '4px', background: '#fef2f2', border: 'none', borderRadius: '4px', cursor: 'pointer' }}><Trash2 size={14} color="#dc2626" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Totals + Payment */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '2px' }}>Payment Method</label>
                    <select value={saleForm.paymentMethod} onChange={(e) => setSaleForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                      style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', background: 'white' }}>
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="check">Check</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '2px' }}>Payment Status</label>
                    <select value={saleForm.paymentStatus} onChange={(e) => setSaleForm(prev => ({ ...prev, paymentStatus: e.target.value }))}
                      style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', background: 'white' }}>
                      <option value="paid">Paid</option>
                      <option value="partial">Partial</option>
                      <option value="unpaid">Unpaid</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '2px' }}>Notes</label>
                  <textarea value={saleForm.notes} onChange={(e) => setSaleForm(prev => ({ ...prev, notes: e.target.value }))} rows="2"
                    style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', resize: 'vertical' }} />
                </div>
              </div>
              <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '16px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                  <span style={{ color: '#64748b' }}>Subtotal</span>
                  <span style={{ fontWeight: '500' }}>${getSubtotal().toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', alignItems: 'center' }}>
                  <span style={{ color: '#64748b' }}>Discount</span>
                  <input type="number" step="0.01" value={saleForm.discount} onChange={(e) => setSaleForm(prev => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))}
                    style={{ width: '80px', padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '13px', textAlign: 'right' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '13px', alignItems: 'center' }}>
                  <span style={{ color: '#64748b' }}>Tax</span>
                  <input type="number" step="0.01" value={saleForm.tax} onChange={(e) => setSaleForm(prev => ({ ...prev, tax: parseFloat(e.target.value) || 0 }))}
                    style={{ width: '80px', padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '13px', textAlign: 'right' }} />
                </div>
                <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Total</span>
                  <span style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>${getTotal().toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#059669' }}>Profit</span>
                  <span style={{ fontWeight: '600', color: '#059669' }}>${getTotalProfit().toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowCreateModal(false)}
                style={{ flex: 1, padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', cursor: 'pointer', fontWeight: '500' }}>Cancel</button>
              <button onClick={handleCreateSale}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
                <Save size={16} /> Complete Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sale Detail Modal */}
      {showDetailModal && selectedSale && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '28px', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 4px' }}>Sale #{selectedSale.saleNumber}</h2>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>{new Date(selectedSale.createdAt).toLocaleString()}</p>
              </div>
              <button onClick={() => setShowDetailModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={22} color="#64748b" /></button>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Customer</div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a' }}>{selectedSale.customerName}</div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>Items ({selectedSale.items?.length || 0})</div>
              {selectedSale.items?.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: i % 2 === 0 ? '#f8fafc' : 'white', borderRadius: '6px', marginBottom: '4px' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '500' }}>{item.brand} {item.model}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{item.imei || 'No IMEI'} · {item.storage} {item.color}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600' }}>${item.salePrice?.toFixed(2)}</div>
                    <div style={{ fontSize: '11px', color: item.profit >= 0 ? '#059669' : '#dc2626' }}>+${item.profit?.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div><span style={{ fontSize: '12px', color: '#64748b' }}>Subtotal</span><div style={{ fontWeight: '600' }}>${selectedSale.subtotal?.toFixed(2)}</div></div>
              <div><span style={{ fontSize: '12px', color: '#64748b' }}>Discount</span><div style={{ fontWeight: '600' }}>-${selectedSale.discount?.toFixed(2)}</div></div>
              <div><span style={{ fontSize: '12px', color: '#64748b' }}>Total</span><div style={{ fontSize: '18px', fontWeight: '700' }}>${selectedSale.totalAmount?.toFixed(2)}</div></div>
              <div><span style={{ fontSize: '12px', color: '#64748b' }}>Profit</span><div style={{ fontSize: '18px', fontWeight: '700', color: '#059669' }}>${selectedSale.totalProfit?.toFixed(2)}</div></div>
              <div><span style={{ fontSize: '12px', color: '#64748b' }}>Payment</span><div style={{ fontWeight: '500', textTransform: 'capitalize' }}>{selectedSale.paymentMethod?.replace('_', ' ')}</div></div>
              <div><span style={{ fontSize: '12px', color: '#64748b' }}>Status</span><div style={{ fontWeight: '500', textTransform: 'capitalize' }}>{selectedSale.status}</div></div>
            </div>

            <button onClick={() => setShowDetailModal(false)}
              style={{ marginTop: '16px', width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', cursor: 'pointer', fontWeight: '500' }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
ENDOFFILE

echo "✅ SalesList.jsx created"

# ============================================
# STEP 9: Update App.jsx with real pages
# ============================================
echo ""
echo "📦 Step 9: Updating App.jsx with Customer & Sales routes..."

cat > frontend/src/App.jsx << 'ENDOFFILE'
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Auth/Login';
import DashboardLayout from './components/Layout/DashboardLayout';
import DashboardHome from './components/Dashboard/DashboardHome';
import InventoryList from './components/Inventory/InventoryList';
import SupplierList from './components/Suppliers/SupplierList';
import InvoicesPage from './pages/InvoicesPage';
import PhoneTestModule from './components/DeviceTest/PhoneTestModule';
import CustomerList from './components/Customers/CustomerList';
import SalesList from './components/Sales/SalesList';
import api from './utils/api';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8fafc' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTop: '4px solid #6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ color: '#64748b', fontSize: '14px' }}>Loading...</span>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }
  return user ? <DashboardLayout>{children}</DashboardLayout> : <Navigate to="/login" replace />;
}

const saveTestResults = async (testData) => {
  try {
    const response = await api.post('/device-tests', testData);
    if (response.data.success) {
      alert('Test results saved successfully!');
      return response.data;
    }
  } catch (error) {
    console.error('Error saving test results:', error);
    alert('Failed to save test results: ' + (error.response?.data?.error || error.message));
  }
};

function DeviceTestPage() {
  return <PhoneTestModule onSaveResults={saveTestResults} />;
}

function DeviceTestWithIMEI() {
  const { imei } = useParams();
  const [searchParams] = useSearchParams();
  const inventoryId = searchParams.get('inventoryId');
  return <PhoneTestModule imei={imei} inventoryId={inventoryId} onSaveResults={saveTestResults} />;
}

function PlaceholderPage({ title, description }) {
  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>{title}</h1>
      <p style={{ color: '#64748b' }}>{description}</p>
      <div style={{ marginTop: '32px', padding: '48px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#94a3b8' }}>
        🚧 Coming soon...
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<PrivateRoute><DashboardHome /></PrivateRoute>} />
          <Route path="/inventory" element={<PrivateRoute><InventoryList /></PrivateRoute>} />
          <Route path="/suppliers" element={<PrivateRoute><SupplierList /></PrivateRoute>} />
          <Route path="/invoices" element={<PrivateRoute><InvoicesPage /></PrivateRoute>} />
          <Route path="/device-test" element={<PrivateRoute><DeviceTestPage /></PrivateRoute>} />
          <Route path="/device-test/:imei" element={<PrivateRoute><DeviceTestWithIMEI /></PrivateRoute>} />
          <Route path="/customers" element={<PrivateRoute><CustomerList /></PrivateRoute>} />
          <Route path="/sales" element={<PrivateRoute><SalesList /></PrivateRoute>} />
          <Route path="/imei-history" element={<PrivateRoute><PlaceholderPage title="IMEI Lookup" description="Track the full lifecycle of any device by IMEI." /></PrivateRoute>} />
          <Route path="/reports" element={<PrivateRoute><PlaceholderPage title="Reports & Analytics" description="Profit/loss, sales trends, and inventory analytics." /></PrivateRoute>} />
          <Route path="/user-management" element={<PrivateRoute><PlaceholderPage title="User Management" description="Manage staff accounts and permissions." /></PrivateRoute>} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
ENDOFFILE

echo "✅ App.jsx updated"

# ============================================
# DONE
# ============================================
echo ""
echo "============================================"
echo "✅ Phase 2 Installation Complete!"
echo "============================================"
echo ""
echo "Backend files created:"
echo "  NEW: backend/models/Customer.js"
echo "  NEW: backend/models/Sale.js"
echo "  NEW: backend/controllers/customerController.js"
echo "  NEW: backend/controllers/saleController.js"
echo "  NEW: backend/routes/customer.js"
echo "  NEW: backend/routes/sale.js"
echo "  UPD: backend/server.js (added customer + sale routes)"
echo ""
echo "Frontend files created:"
echo "  NEW: frontend/src/components/Customers/CustomerList.jsx"
echo "  NEW: frontend/src/components/Sales/SalesList.jsx"
echo "  UPD: frontend/src/App.jsx (added Customer + Sales routes)"
echo ""
echo "Next steps:"
echo "  1. Restart backend: cd backend && killall -9 node && npm start"
echo "  2. Frontend should auto-reload (Vite HMR)"
echo "  3. Test: Click 'Customers' in sidebar → Add a customer"
echo "  4. Test: Click 'Sales' in sidebar → Create a sale"
echo ""
