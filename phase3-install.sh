#!/bin/bash
# ============================================
# Phase 3: IMEI Lookup + Reports + User Management
# Run from PROJECT ROOT (wholesale-platform/)
# ============================================

echo "🚀 Starting Phase 3 Installation..."
echo ""

# ============================================
# STEP 1: IMEI Lookup Route (Backend)
# ============================================
echo "📦 Step 1: Creating IMEI Lookup route..."

cat > backend/routes/imeiLookup.js << 'ENDOFFILE'
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Inventory = require('../models/Inventory');
const Invoice = require('../models/Invoice');
const Sale = require('../models/Sale');
const DeviceTest = require('../models/DeviceTest');

// @route GET /api/imei/:imei
// @desc Get full lifecycle of a device by IMEI
router.get('/:imei', protect, async (req, res) => {
  try {
    const { imei } = req.params;

    if (!imei || imei.length < 5) {
      return res.status(400).json({ success: false, message: 'Valid IMEI required' });
    }

    // Find in inventory
    const inventoryItem = await Inventory.findOne({ 'devices.imei': imei });
    let deviceInfo = null;
    if (inventoryItem) {
      const device = inventoryItem.devices.find(d => d.imei === imei);
      deviceInfo = {
        inventoryId: inventoryItem._id,
        model: inventoryItem.model,
        brand: inventoryItem.brand,
        storage: inventoryItem.specifications?.storage || '',
        color: inventoryItem.specifications?.color || '',
        costPrice: inventoryItem.price?.cost || 0,
        retailPrice: inventoryItem.price?.retail || 0,
        imei: device?.imei,
        unlockStatus: device?.unlockStatus,
        condition: device?.condition,
        grade: device?.grade,
        isSold: device?.isSold || false,
        soldDate: device?.soldDate,
        addedDate: inventoryItem.createdAt
      };
    }

    // Find in invoices (purchase history)
    const invoices = await Invoice.find({
      $or: [
        { 'products.fullDescription': { $regex: imei, $options: 'i' } },
        { rawText: { $regex: imei, $options: 'i' } }
      ]
    }).select('invoiceNumber invoiceDate supplierName totalAmount status createdAt').sort({ createdAt: -1 }).limit(5);

    // Find in sales
    const sales = await Sale.find({ 'items.imei': imei })
      .select('saleNumber customerName totalAmount totalProfit status paymentMethod createdAt items')
      .sort({ createdAt: -1 }).limit(5);

    const saleInfo = sales.map(sale => {
      const item = sale.items.find(i => i.imei === imei);
      return {
        saleId: sale._id,
        saleNumber: sale.saleNumber,
        customerName: sale.customerName,
        salePrice: item?.salePrice || 0,
        profit: item?.profit || 0,
        status: sale.status,
        paymentMethod: sale.paymentMethod,
        date: sale.createdAt
      };
    });

    // Find device tests
    const tests = await DeviceTest.find({ imei: imei })
      .select('overallStatus summary testedBy createdAt notes')
      .sort({ createdAt: -1 }).limit(10);

    // Build timeline
    const timeline = [];

    if (deviceInfo) {
      timeline.push({
        type: 'inventory',
        title: 'Added to Inventory',
        description: `${deviceInfo.brand} ${deviceInfo.model} ${deviceInfo.storage}`,
        date: deviceInfo.addedDate,
        status: 'info'
      });
    }

    invoices.forEach(inv => {
      timeline.push({
        type: 'invoice',
        title: `Invoice #${inv.invoiceNumber || 'N/A'}`,
        description: `From ${inv.supplierName} - $${inv.totalAmount}`,
        date: inv.invoiceDate || inv.createdAt,
        status: 'info'
      });
    });

    tests.forEach(test => {
      timeline.push({
        type: 'test',
        title: `Device Test - ${test.overallStatus}`,
        description: `${test.summary?.passedTests || 0}/${test.summary?.totalTests || 0} passed (${test.summary?.passRate || 0}%)`,
        date: test.createdAt,
        status: test.overallStatus === 'passed' ? 'success' : test.overallStatus === 'failed' ? 'error' : 'warning'
      });
    });

    saleInfo.forEach(sale => {
      timeline.push({
        type: 'sale',
        title: `Sold - ${sale.saleNumber}`,
        description: `To ${sale.customerName} for $${sale.salePrice} (profit: $${sale.profit})`,
        date: sale.date,
        status: 'success'
      });
    });

    // Sort timeline by date
    timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      success: true,
      data: {
        imei,
        found: !!deviceInfo,
        device: deviceInfo,
        invoices,
        sales: saleInfo,
        tests,
        timeline
      }
    });
  } catch (error) {
    console.error('IMEI lookup error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
ENDOFFILE

echo "✅ IMEI Lookup route created"

# ============================================
# STEP 2: Reports Route (Backend)
# ============================================
echo ""
echo "📦 Step 2: Creating Reports route..."

cat > backend/routes/reports.js << 'ENDOFFILE'
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Sale = require('../models/Sale');
const Inventory = require('../models/Inventory');
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');

// @route GET /api/reports/overview
router.get('/overview', protect, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);

    // Sales stats
    const [thisMonthSales, lastMonthSales, allTimeSales] = await Promise.all([
      Sale.aggregate([
        { $match: { createdAt: { $gte: thisMonth }, status: 'completed' } },
        { $group: { _id: null, revenue: { $sum: '$totalAmount' }, profit: { $sum: '$totalProfit' }, count: { $sum: 1 } } }
      ]),
      Sale.aggregate([
        { $match: { createdAt: { $gte: lastMonth, $lte: lastMonthEnd }, status: 'completed' } },
        { $group: { _id: null, revenue: { $sum: '$totalAmount' }, profit: { $sum: '$totalProfit' }, count: { $sum: 1 } } }
      ]),
      Sale.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, revenue: { $sum: '$totalAmount' }, profit: { $sum: '$totalProfit' }, count: { $sum: 1 } } }
      ])
    ]);

    // Inventory stats
    const inventory = await Inventory.find({});
    let totalInventoryValue = 0;
    let totalRetailValue = 0;
    let totalDevices = 0;
    let availableDevices = 0;
    let soldDevices = 0;

    inventory.forEach(item => {
      const avail = item.devices?.filter(d => !d.isSold).length || 0;
      const sold = item.devices?.filter(d => d.isSold).length || 0;
      totalDevices += item.quantity || 0;
      availableDevices += avail;
      soldDevices += sold;
      totalInventoryValue += avail * (item.price?.cost || 0);
      totalRetailValue += avail * (item.price?.retail || 0);
    });

    // Daily sales for chart (last 30 days)
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailySales = await Sale.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo }, status: 'completed' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$totalAmount' },
          profit: { $sum: '$totalProfit' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Top selling products
    const topProducts = await Sale.aggregate([
      { $match: { status: 'completed' } },
      { $unwind: '$items' },
      {
        $group: {
          _id: { model: '$items.model', brand: '$items.brand' },
          totalSold: { $sum: 1 },
          totalRevenue: { $sum: '$items.salePrice' },
          totalProfit: { $sum: '$items.profit' }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 }
    ]);

    // Top customers
    const topCustomers = await Customer.find({ totalSpent: { $gt: 0 } })
      .sort({ totalSpent: -1 })
      .limit(10)
      .select('name company type totalPurchases totalSpent');

    // Sales by payment method
    const paymentBreakdown = await Sale.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: '$paymentMethod',
          total: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const thisMonthData = thisMonthSales[0] || { revenue: 0, profit: 0, count: 0 };
    const lastMonthData = lastMonthSales[0] || { revenue: 0, profit: 0, count: 0 };

    const revenueGrowth = lastMonthData.revenue > 0
      ? (((thisMonthData.revenue - lastMonthData.revenue) / lastMonthData.revenue) * 100).toFixed(1)
      : 0;

    res.json({
      success: true,
      data: {
        sales: {
          thisMonth: thisMonthData,
          lastMonth: lastMonthData,
          allTime: allTimeSales[0] || { revenue: 0, profit: 0, count: 0 },
          revenueGrowth: parseFloat(revenueGrowth)
        },
        inventory: {
          totalProducts: inventory.length,
          totalDevices,
          availableDevices,
          soldDevices,
          costValue: totalInventoryValue,
          retailValue: totalRetailValue,
          potentialProfit: totalRetailValue - totalInventoryValue
        },
        charts: {
          dailySales,
          topProducts,
          topCustomers,
          paymentBreakdown
        }
      }
    });
  } catch (error) {
    console.error('Reports error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
ENDOFFILE

echo "✅ Reports route created"

# ============================================
# STEP 3: User Management Controller + Route
# ============================================
echo ""
echo "📦 Step 3: Creating User Management..."

cat > backend/controllers/userController.js << 'ENDOFFILE'
const User = require('../models/User');

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: 'Email already exists' });

    const user = await User.create({ email, password, role: role || 'staff' });
    res.status(201).json({
      success: true,
      data: { _id: user._id, email: user.email, role: user.role, isActive: user.isActive, createdAt: user.createdAt }
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { role, isActive } = req.body;
    const updateData = {};
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;

    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.password = password;
    await user.save();
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
ENDOFFILE

cat > backend/routes/user.js << 'ENDOFFILE'
const express = require('express');
const router = express.Router();
const { getUsers, createUser, updateUser, resetPassword, deleteUser } = require('../controllers/userController');
const { protect } = require('../middleware/auth');

// Admin-only middleware
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

router.get('/', protect, adminOnly, getUsers);
router.post('/', protect, adminOnly, createUser);
router.put('/:id', protect, adminOnly, updateUser);
router.put('/:id/reset-password', protect, adminOnly, resetPassword);
router.delete('/:id', protect, adminOnly, deleteUser);

module.exports = router;
ENDOFFILE

echo "✅ User Management backend created"

# ============================================
# STEP 4: Update server.js with new routes
# ============================================
echo ""
echo "📦 Step 4: Updating server.js..."

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
  res.json({ success: true, message: 'Wholesale Platform API', version: '3.0.0' });
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
app.use('/api/imei', require('./routes/imeiLookup'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/users', require('./routes/user'));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message || 'Server Error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('🚀 Server running on port ' + PORT);
});
ENDOFFILE

echo "✅ server.js updated"

# ============================================
# STEP 5: IMEI Lookup Frontend
# ============================================
echo ""
echo "📦 Step 5: Creating IMEI Lookup page..."

mkdir -p frontend/src/components/IMEILookup

cat > frontend/src/components/IMEILookup/IMEILookup.jsx << 'ENDOFFILE'
import React, { useState } from 'react';
import api from '../../utils/api';
import {
  Search, Smartphone, Package, FileText, ShoppingCart,
  ClipboardCheck, Clock, CheckCircle, XCircle, AlertTriangle,
  Loader2, ArrowRight, Tag, DollarSign, MapPin
} from 'lucide-react';

export default function IMEILookup() {
  const [imei, setImei] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!imei || imei.length < 5) { setError('Enter a valid IMEI'); return; }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await api.get(`/imei/${imei.trim()}`);
      if (res.data.success) {
        setResult(res.data.data);
        if (!res.data.data.found) setError('IMEI not found in inventory');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Lookup failed');
    } finally {
      setLoading(false);
    }
  };

  const statusIcon = (status) => {
    switch (status) {
      case 'success': return <CheckCircle size={16} color="#10b981" />;
      case 'error': return <XCircle size={16} color="#ef4444" />;
      case 'warning': return <AlertTriangle size={16} color="#f59e0b" />;
      default: return <Clock size={16} color="#6366f1" />;
    }
  };

  const typeIcon = (type) => {
    switch (type) {
      case 'inventory': return <Package size={16} color="#6366f1" />;
      case 'invoice': return <FileText size={16} color="#8b5cf6" />;
      case 'sale': return <ShoppingCart size={16} color="#10b981" />;
      case 'test': return <ClipboardCheck size={16} color="#f59e0b" />;
      default: return <Clock size={16} color="#94a3b8" />;
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px' }}>IMEI Lookup</h1>
        <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Track the full lifecycle of any device by IMEI</p>
      </div>

      {/* Search Bar */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>Enter IMEI Number</label>
            <div style={{ position: 'relative' }}>
              <Smartphone style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={18} />
              <input type="text" value={imei} onChange={(e) => setImei(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Enter 15-digit IMEI number..."
                style={{ width: '100%', padding: '12px 12px 12px 42px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '16px', fontFamily: 'monospace', letterSpacing: '1px' }} />
            </div>
          </div>
          <button onClick={handleSearch} disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: loading ? '#94a3b8' : 'linear-gradient(135deg, #4338ca, #6366f1)', color: 'white', border: 'none', borderRadius: '8px', cursor: loading ? 'wait' : 'pointer', fontWeight: '600', fontSize: '14px', whiteSpace: 'nowrap' }}>
            {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={18} />}
            {loading ? 'Searching...' : 'Lookup'}
          </button>
        </div>
        {error && !result?.found && (
          <div style={{ marginTop: '12px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} /> {error}
          </div>
        )}
      </div>

      {result && result.found && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="imei-grid">
          {/* Device Info Card */}
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Smartphone size={20} color="#6366f1" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#0f172a' }}>Device Info</h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', fontFamily: 'monospace' }}>{result.imei}</p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                { label: 'Model', value: `${result.device.brand} ${result.device.model}` },
                { label: 'Storage', value: result.device.storage || 'N/A' },
                { label: 'Color', value: result.device.color || 'N/A' },
                { label: 'Condition', value: result.device.condition || 'N/A' },
                { label: 'Grade', value: result.device.grade || 'N/A' },
                { label: 'Lock Status', value: result.device.unlockStatus || 'N/A' },
              ].map((item, i) => (
                <div key={i} style={{ padding: '8px 10px', background: '#f8fafc', borderRadius: '6px' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>{item.label}</div>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: '#0f172a', textTransform: 'capitalize' }}>{item.value}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '12px', display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1, padding: '10px', background: '#ecfdf5', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#059669' }}>Cost Price</div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#059669' }}>${result.device.costPrice}</div>
              </div>
              <div style={{ flex: 1, padding: '10px', background: '#eef2ff', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#4338ca' }}>Retail Price</div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#4338ca' }}>${result.device.retailPrice}</div>
              </div>
              <div style={{ flex: 1, padding: '10px', background: result.device.isSold ? '#fef2f2' : '#f0fdf4', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: result.device.isSold ? '#dc2626' : '#16a34a' }}>Status</div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: result.device.isSold ? '#dc2626' : '#16a34a' }}>{result.device.isSold ? 'SOLD' : 'AVAILABLE'}</div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '600', color: '#0f172a' }}>Device Timeline</h3>
            {result.timeline.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {result.timeline.map((event, i) => (
                  <div key={i} style={{ display: 'flex', gap: '12px', paddingBottom: '16px', position: 'relative' }}>
                    {i < result.timeline.length - 1 && (
                      <div style={{ position: 'absolute', left: '15px', top: '32px', bottom: 0, width: '2px', background: '#e2e8f0' }} />
                    )}
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1 }}>
                      {typeIcon(event.type)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        {statusIcon(event.status)}
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{event.title}</span>
                      </div>
                      <p style={{ margin: '0 0 2px', fontSize: '12px', color: '#64748b' }}>{event.description}</p>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>{new Date(event.date).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>No timeline events</p>
            )}
          </div>

          {/* Test Results */}
          {result.tests.length > 0 && (
            <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '600', color: '#0f172a' }}>Test Results ({result.tests.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {result.tests.map((test, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#f8fafc', borderRadius: '8px' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#0f172a' }}>{test.summary?.passedTests}/{test.summary?.totalTests} passed</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>By {test.testedBy} · {new Date(test.createdAt).toLocaleDateString()}</div>
                    </div>
                    <span style={{
                      padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '600',
                      background: test.overallStatus === 'passed' ? '#ecfdf5' : test.overallStatus === 'failed' ? '#fef2f2' : '#fef3c7',
                      color: test.overallStatus === 'passed' ? '#059669' : test.overallStatus === 'failed' ? '#dc2626' : '#b45309'
                    }}>{test.overallStatus}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sale History */}
          {result.sales.length > 0 && (
            <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '600', color: '#0f172a' }}>Sale History</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {result.sales.map((sale, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#f8fafc', borderRadius: '8px' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#0f172a' }}>{sale.saleNumber}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>To {sale.customerName} · {new Date(sale.date).toLocaleDateString()}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '13px', fontWeight: '600' }}>${sale.salePrice.toFixed(2)}</div>
                      <div style={{ fontSize: '11px', color: '#059669' }}>+${sale.profit.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) { .imei-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
ENDOFFILE

echo "✅ IMEI Lookup page created"

# ============================================
# STEP 6: Reports Frontend
# ============================================
echo ""
echo "📦 Step 6: Creating Reports page..."

mkdir -p frontend/src/components/Reports

cat > frontend/src/components/Reports/ReportsPage.jsx << 'ENDOFFILE'
import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import {
  DollarSign, TrendingUp, TrendingDown, Package, ShoppingCart,
  Users, BarChart3, Loader2, ArrowUp, ArrowDown
} from 'lucide-react';

export default function ReportsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchReports(); }, []);

  const fetchReports = async () => {
    try {
      const res = await api.get('/reports/overview');
      if (res.data.success) setData(res.data.data);
    } catch (err) {
      console.error('Reports error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 size={36} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!data) return <p style={{ color: '#64748b', textAlign: 'center', padding: '48px' }}>Failed to load reports</p>;

  const { sales, inventory, charts } = data;

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px' }}>Reports & Analytics</h1>
        <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Business performance overview</p>
      </div>

      {/* Top Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        {[
          { label: 'Month Revenue', value: `$${(sales.thisMonth.revenue || 0).toLocaleString()}`, sub: `${sales.thisMonth.count || 0} sales`, icon: DollarSign, color: '#10b981', bg: '#ecfdf5', growth: sales.revenueGrowth },
          { label: 'Month Profit', value: `$${(sales.thisMonth.profit || 0).toLocaleString()}`, sub: 'Net earnings', icon: TrendingUp, color: '#6366f1', bg: '#eef2ff' },
          { label: 'Inventory Value', value: `$${(inventory.retailValue || 0).toLocaleString()}`, sub: `Cost: $${(inventory.costValue || 0).toLocaleString()}`, icon: Package, color: '#f59e0b', bg: '#fffbeb' },
          { label: 'Potential Profit', value: `$${(inventory.potentialProfit || 0).toLocaleString()}`, sub: `${inventory.availableDevices} devices`, icon: BarChart3, color: '#8b5cf6', bg: '#f5f3ff' },
        ].map((card, i) => (
          <div key={i} style={{ background: 'white', borderRadius: '10px', padding: '18px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <card.icon size={18} color={card.color} />
              </div>
              {card.growth !== undefined && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '12px', fontWeight: '600', color: card.growth >= 0 ? '#10b981' : '#ef4444' }}>
                  {card.growth >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                  {Math.abs(card.growth)}%
                </div>
              )}
            </div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a' }}>{card.value}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Inventory Overview + All Time */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }} className="report-grid-2">
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '600', color: '#0f172a' }}>Inventory Breakdown</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { label: 'Total Products', value: inventory.totalProducts, color: '#6366f1' },
              { label: 'Total Devices', value: inventory.totalDevices, color: '#8b5cf6' },
              { label: 'Available', value: inventory.availableDevices, color: '#10b981' },
              { label: 'Sold', value: inventory.soldDevices, color: '#f59e0b' },
            ].map((item, i) => {
              const maxVal = Math.max(inventory.totalDevices, 1);
              return (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>{item.label}</span>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{item.value}</span>
                  </div>
                  <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(item.value / maxVal) * 100}%`, background: item.color, borderRadius: '3px' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '600', color: '#0f172a' }}>All-Time Performance</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ padding: '14px', background: '#ecfdf5', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#059669', marginBottom: '4px' }}>Total Revenue</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#059669' }}>${(sales.allTime.revenue || 0).toLocaleString()}</div>
            </div>
            <div style={{ padding: '14px', background: '#eef2ff', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#4338ca', marginBottom: '4px' }}>Total Profit</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#4338ca' }}>${(sales.allTime.profit || 0).toLocaleString()}</div>
            </div>
            <div style={{ padding: '14px', background: '#fffbeb', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#b45309', marginBottom: '4px' }}>Total Sales</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#b45309' }}>{sales.allTime.count || 0}</div>
            </div>
            <div style={{ padding: '14px', background: '#f5f3ff', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#7c3aed', marginBottom: '4px' }}>Avg. Margin</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#7c3aed' }}>
                {sales.allTime.revenue > 0 ? ((sales.allTime.profit / sales.allTime.revenue) * 100).toFixed(1) : 0}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Products + Top Customers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }} className="report-grid-2">
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '600', color: '#0f172a' }}>Top Selling Products</h3>
          {charts.topProducts?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {charts.topProducts.slice(0, 8).map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: '#f8fafc', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8', minWidth: '20px' }}>#{i + 1}</span>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#0f172a' }}>{p._id.brand} {p._id.model}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>{p.totalSold} sold · ${p.totalRevenue.toLocaleString()} rev</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#059669' }}>+${p.totalProfit.toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>No sales data yet</p>}
        </div>

        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '600', color: '#0f172a' }}>Top Customers</h3>
          {charts.topCustomers?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {charts.topCustomers.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: '#f8fafc', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: '#4338ca' }}>{i + 1}</div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#0f172a' }}>{c.name}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>{c.company || c.type} · {c.totalPurchases} orders</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>${c.totalSpent.toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>No customer data yet</p>}
        </div>
      </div>

      {/* Payment Breakdown + Daily Chart */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }} className="report-grid-2">
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '600', color: '#0f172a' }}>Payment Methods</h3>
          {charts.paymentBreakdown?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {charts.paymentBreakdown.map((p, i) => {
                const colors = { cash: '#10b981', card: '#6366f1', bank_transfer: '#f59e0b', check: '#8b5cf6', other: '#94a3b8' };
                const totalAll = charts.paymentBreakdown.reduce((s, x) => s + x.total, 0);
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', color: '#334155', textTransform: 'capitalize' }}>{p._id?.replace('_', ' ')}</span>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>${p.total.toLocaleString()} ({p.count})</span>
                    </div>
                    <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(p.total / totalAll) * 100}%`, background: colors[p._id] || '#94a3b8', borderRadius: '3px' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>No payment data</p>}
        </div>

        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '600', color: '#0f172a' }}>Daily Sales (Last 30 Days)</h3>
          {charts.dailySales?.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '160px', padding: '0 4px' }}>
              {(() => {
                const maxRev = Math.max(...charts.dailySales.map(d => d.revenue), 1);
                return charts.dailySales.map((day, i) => {
                  const height = (day.revenue / maxRev) * 140;
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}
                      title={`${day._id}: $${day.revenue} (${day.count} sales)`}>
                      <div style={{ width: '100%', minWidth: '4px', maxWidth: '20px', height: `${Math.max(height, 2)}px`, background: 'linear-gradient(180deg, #6366f1, #818cf8)', borderRadius: '2px 2px 0 0', transition: 'height 0.3s ease' }} />
                    </div>
                  );
                });
              })()}
            </div>
          ) : <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '40px 0' }}>No sales in the last 30 days</p>}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) { .report-grid-2 { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
ENDOFFILE

echo "✅ Reports page created"

# ============================================
# STEP 7: User Management Frontend
# ============================================
echo ""
echo "📦 Step 7: Creating User Management page..."

mkdir -p frontend/src/components/UserManagement

cat > frontend/src/components/UserManagement/UserManagement.jsx << 'ENDOFFILE'
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { Plus, Edit, Trash2, X, Save, Shield, User, Mail, Key, ToggleLeft, ToggleRight } from 'lucide-react';

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [formData, setFormData] = useState({ email: '', password: '', role: 'staff' });
  const [error, setError] = useState('');

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data.data || []);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 403) setError('Admin access required');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/users', formData);
      setShowModal(false);
      setFormData({ email: '', password: '', role: 'staff' });
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user');
    }
  };

  const handleToggleActive = async (userId, currentStatus) => {
    try {
      await api.put(`/users/${userId}`, { isActive: !currentStatus });
      fetchUsers();
    } catch (err) {
      alert('Failed to update user');
    }
  };

  const handleChangeRole = async (userId, newRole) => {
    try {
      await api.put(`/users/${userId}`, { role: newRole });
      fetchUsers();
    } catch (err) {
      alert('Failed to update role');
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
    try {
      await api.put(`/users/${selectedUserId}/reset-password`, { password: newPassword });
      setShowPasswordModal(false);
      setNewPassword('');
      setSelectedUserId(null);
      alert('Password reset successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Delete this user? This cannot be undone.')) return;
    try {
      await api.delete(`/users/${userId}`);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete user');
    }
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <Shield size={48} color="#dc2626" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ color: '#0f172a', marginBottom: '8px' }}>Access Denied</h2>
        <p style={{ color: '#64748b' }}>Only admins can manage users.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px' }}>User Management</h1>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Manage staff accounts and permissions</p>
        </div>
        <button onClick={() => { setFormData({ email: '', password: '', role: 'staff' }); setError(''); setShowModal(true); }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #4338ca, #6366f1)', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '500', fontSize: '14px' }}>
          <Plus size={18} /> Add User
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>Loading...</div>
      ) : (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>User</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Role</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Joined</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isCurrentUser = u._id === currentUser?.id;
                return (
                  <tr key={u._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '8px',
                          background: u.role === 'admin' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#f1f5f9',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: u.role === 'admin' ? 'white' : '#64748b', fontSize: '13px', fontWeight: '700'
                        }}>
                          {u.email?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '500', color: '#0f172a' }}>{u.email}</div>
                          {isCurrentUser && <span style={{ fontSize: '10px', color: '#6366f1', fontWeight: '600' }}>YOU</span>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <select value={u.role} onChange={(e) => handleChangeRole(u._id, e.target.value)}
                        disabled={isCurrentUser}
                        style={{
                          padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', border: '1px solid #e2e8f0',
                          background: u.role === 'admin' ? '#eef2ff' : '#f8fafc',
                          color: u.role === 'admin' ? '#4338ca' : '#64748b',
                          cursor: isCurrentUser ? 'not-allowed' : 'pointer'
                        }}>
                        <option value="admin">Admin</option>
                        <option value="staff">Staff</option>
                      </select>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button onClick={() => !isCurrentUser && handleToggleActive(u._id, u.isActive)}
                        disabled={isCurrentUser}
                        style={{ background: 'none', border: 'none', cursor: isCurrentUser ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', margin: '0 auto' }}>
                        {u.isActive ? <ToggleRight size={24} color="#10b981" /> : <ToggleLeft size={24} color="#94a3b8" />}
                        <span style={{ fontSize: '12px', color: u.isActive ? '#10b981' : '#94a3b8', fontWeight: '500' }}>{u.isActive ? 'Active' : 'Disabled'}</span>
                      </button>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748b' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button onClick={() => { setSelectedUserId(u._id); setNewPassword(''); setError(''); setShowPasswordModal(true); }}
                          style={{ padding: '6px', background: '#fffbeb', border: 'none', borderRadius: '6px', cursor: 'pointer' }} title="Reset Password">
                          <Key size={15} color="#b45309" />
                        </button>
                        {!isCurrentUser && (
                          <button onClick={() => handleDelete(u._id)}
                            style={{ padding: '6px', background: '#fef2f2', border: 'none', borderRadius: '6px', cursor: 'pointer' }} title="Delete">
                            <Trash2 size={15} color="#dc2626" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create User Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '28px', maxWidth: '440px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>Create User</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="#64748b" /></button>
            </div>
            {error && <div style={{ marginBottom: '14px', padding: '10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '13px' }}>{error}</div>}
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px', color: '#334155' }}>Email *</label>
                <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }} />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px', color: '#334155' }}>Password *</label>
                <input type="password" required minLength="6" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }} />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px', color: '#334155' }}>Role</label>
                <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', background: 'white' }}>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => setShowModal(false)}
                  style={{ flex: 1, padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', cursor: 'pointer', fontWeight: '500' }}>Cancel</button>
                <button type="submit"
                  style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg, #4338ca, #6366f1)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showPasswordModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '28px', maxWidth: '400px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>Reset Password</h2>
              <button onClick={() => setShowPasswordModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="#64748b" /></button>
            </div>
            {error && <div style={{ marginBottom: '14px', padding: '10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '13px' }}>{error}</div>}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px', color: '#334155' }}>New Password *</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }} />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowPasswordModal(false)}
                style={{ flex: 1, padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', cursor: 'pointer', fontWeight: '500' }}>Cancel</button>
              <button onClick={handleResetPassword}
                style={{ flex: 1, padding: '10px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Reset Password</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
ENDOFFILE

echo "✅ User Management page created"

# ============================================
# STEP 8: Update App.jsx with all real pages
# ============================================
echo ""
echo "📦 Step 8: Updating App.jsx..."

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
import IMEILookup from './components/IMEILookup/IMEILookup';
import ReportsPage from './components/Reports/ReportsPage';
import UserManagement from './components/UserManagement/UserManagement';
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
          <Route path="/imei-history" element={<PrivateRoute><IMEILookup /></PrivateRoute>} />
          <Route path="/reports" element={<PrivateRoute><ReportsPage /></PrivateRoute>} />
          <Route path="/user-management" element={<PrivateRoute><UserManagement /></PrivateRoute>} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
ENDOFFILE

echo "✅ App.jsx updated — all placeholder pages replaced with real ones"

# ============================================
# DONE
# ============================================
echo ""
echo "============================================"
echo "✅ Phase 3 Installation Complete!"
echo "============================================"
echo ""
echo "Backend files:"
echo "  NEW: backend/routes/imeiLookup.js"
echo "  NEW: backend/routes/reports.js"
echo "  NEW: backend/routes/user.js"
echo "  NEW: backend/controllers/userController.js"
echo "  UPD: backend/server.js (added 3 new routes)"
echo ""
echo "Frontend files:"
echo "  NEW: frontend/src/components/IMEILookup/IMEILookup.jsx"
echo "  NEW: frontend/src/components/Reports/ReportsPage.jsx"
echo "  NEW: frontend/src/components/UserManagement/UserManagement.jsx"
echo "  UPD: frontend/src/App.jsx (all routes now point to real pages)"
echo ""
echo "Next steps:"
echo "  1. Restart backend: killall -9 node && cd backend && npm start"
echo "  2. Frontend auto-reloads"
echo "  3. Test IMEI Lookup — enter an IMEI from your inventory"
echo "  4. Test Reports — see analytics dashboard"
echo "  5. Test User Mgmt — create staff accounts (admin only)"
echo ""
echo "🎉 ALL FEATURES COMPLETE! Your wholesale platform is fully built."
echo ""
