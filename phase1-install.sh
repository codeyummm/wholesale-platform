#!/bin/bash
# ============================================
# Phase 1 Installation Script
# Run this from your PROJECT ROOT (parent of frontend/ and backend/)
# ============================================

echo "🚀 Starting Phase 1 Installation..."
echo ""

# ============================================
# STEP 1: Fix Backend - server.js
# ============================================
echo "📦 Step 1: Fixing backend/server.js..."

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
  res.json({ success: true, message: 'Wholesale Platform API', version: '1.0.0' });
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

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message || 'Server Error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('🚀 Server running on port ' + PORT);
});
ENDOFFILE

echo "✅ backend/server.js fixed"

# ============================================
# STEP 2: Create Layout folder + files
# ============================================
echo ""
echo "📦 Step 2: Creating Layout components..."

mkdir -p frontend/src/components/Layout

# --- Sidebar.jsx ---
cat > frontend/src/components/Layout/Sidebar.jsx << 'ENDOFFILE'
import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Package,
  Users,
  FileText,
  Smartphone,
  ShoppingCart,
  UserCircle,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  History
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/inventory', icon: Package, label: 'Inventory' },
  { path: '/suppliers', icon: Users, label: 'Suppliers' },
  { path: '/invoices', icon: FileText, label: 'Invoices' },
  { path: '/sales', icon: ShoppingCart, label: 'Sales' },
  { path: '/customers', icon: UserCircle, label: 'Customers' },
  { path: '/device-test', icon: Smartphone, label: 'Device Test' },
  { path: '/imei-history', icon: History, label: 'IMEI Lookup' },
  { path: '/reports', icon: BarChart3, label: 'Reports' },
];

const adminItems = [
  { path: '/user-management', icon: Settings, label: 'User Mgmt' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const allItems = user?.role === 'admin' ? [...navItems, ...adminItems] : navItems;

  const sidebarContent = (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'linear-gradient(180deg, #1e1b4b 0%, #312e81 40%, #4338ca 100%)',
      color: 'white',
      transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      width: collapsed ? '72px' : '240px',
      overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{
        padding: collapsed ? '20px 0' : '20px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: '12px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        minHeight: '72px',
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #818cf8, #c084fc)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 4px 12px rgba(129, 140, 248, 0.4)',
        }}>
          <Smartphone size={20} color="white" />
        </div>
        {!collapsed && (
          <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <div style={{ fontSize: '15px', fontWeight: '700', letterSpacing: '-0.02em' }}>WholesaleHub</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '400' }}>Mobile Platform</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto', overflowX: 'hidden' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {allItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: collapsed ? '10px 0' : '10px 12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderRadius: '8px',
                textDecoration: 'none',
                color: isActive ? '#ffffff' : 'rgba(255,255,255,0.6)',
                background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                fontWeight: isActive ? '600' : '400',
                fontSize: '13.5px',
                transition: 'all 0.15s ease',
                position: 'relative',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
              })}
              onMouseEnter={(e) => {
                if (!e.currentTarget.classList.contains('active')) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.9)';
                }
              }}
              onMouseLeave={(e) => {
                const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                }
              }}
            >
              <item.icon size={19} style={{ flexShrink: 0 }} />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div style={{
        padding: collapsed ? '16px 8px' : '16px',
        borderTop: '1px solid rgba(255,255,255,0.1)',
      }}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="sidebar-collapse-btn"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: '12px',
            width: '100%',
            padding: '8px 12px',
            borderRadius: '8px',
            border: 'none',
            background: 'rgba(255,255,255,0.05)',
            color: 'rgba(255,255,255,0.5)',
            cursor: 'pointer',
            fontSize: '13px',
            marginBottom: '8px',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
            e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
          }}
        >
          {collapsed ? <ChevronRight size={18} /> : <><ChevronLeft size={18} /><span>Collapse</span></>}
        </button>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: collapsed ? '8px 0' : '8px',
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #f472b6, #c084fc)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            fontWeight: '700',
            flexShrink: 0,
          }}>
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          {!collapsed && (
            <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
              <div style={{ fontSize: '12.5px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email || 'User'}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'capitalize' }}>
                {user?.role || 'staff'}
              </div>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={handleLogout}
              title="Logout"
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.4)',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '6px',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(248,113,113,0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = 'none'; }}
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        className="mobile-menu-btn"
        onClick={() => setMobileOpen(true)}
        style={{
          position: 'fixed',
          top: '16px',
          left: '16px',
          zIndex: 60,
          display: 'none',
          alignItems: 'center',
          justifyContent: 'center',
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          border: 'none',
          background: 'linear-gradient(135deg, #4338ca, #6366f1)',
          color: 'white',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(67, 56, 202, 0.4)',
        }}
      >
        <Menu size={20} />
      </button>

      {mobileOpen && (
        <div
          className="mobile-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 70,
            display: 'none',
          }}
          onClick={() => setMobileOpen(false)}
        >
          <div
            style={{ width: '240px', height: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setMobileOpen(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                borderRadius: '8px',
                padding: '6px',
                zIndex: 80,
              }}
            >
              <X size={18} />
            </button>
            {React.cloneElement(sidebarContent, {})}
          </div>
        </div>
      )}

      <div className="desktop-sidebar" style={{ flexShrink: 0 }}>
        {sidebarContent}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .mobile-menu-btn { display: flex !important; }
          .mobile-overlay { display: block !important; }
          .desktop-sidebar { display: none !important; }
          .sidebar-collapse-btn { display: none !important; }
        }
      `}</style>
    </>
  );
}
ENDOFFILE

# --- DashboardLayout.jsx ---
cat > frontend/src/components/Layout/DashboardLayout.jsx << 'ENDOFFILE'
import React from 'react';
import Sidebar from './Sidebar';

export default function DashboardLayout({ children }) {
  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#f8fafc',
    }}>
      <Sidebar />
      <main style={{
        flex: 1,
        overflow: 'auto',
        position: 'relative',
      }}>
        <div style={{
          padding: '24px',
          maxWidth: '1400px',
          margin: '0 auto',
        }}
          className="main-content"
        >
          {children}
        </div>

        <style>{`
          @media (max-width: 768px) {
            .main-content {
              padding: 16px !important;
              padding-top: 64px !important;
            }
          }
        `}</style>
      </main>
    </div>
  );
}
ENDOFFILE

echo "✅ Layout components created"

# ============================================
# STEP 3: Fix AuthContext.jsx
# ============================================
echo ""
echo "📦 Step 3: Fixing AuthContext.jsx..."

cat > frontend/src/context/AuthContext.jsx << 'ENDOFFILE'
import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      checkAuth();
    } else {
      setLoading(false);
    }
  }, [token]);

  const checkAuth = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/auth/me`);
      setUser(response.data.user);
    } catch (error) {
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/login`, { email, password });
      const { token: newToken, user: userData } = response.data;
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Login failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};
ENDOFFILE

echo "✅ AuthContext.jsx fixed"

# ============================================
# STEP 4: Replace App.jsx
# ============================================
echo ""
echo "📦 Step 4: Replacing App.jsx..."

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
import api from './utils/api';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#f8fafc',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #e2e8f0',
            borderTop: '4px solid #6366f1',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
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

  return (
    <PhoneTestModule
      imei={imei}
      inventoryId={inventoryId}
      onSaveResults={saveTestResults}
    />
  );
}

function PlaceholderPage({ title, description }) {
  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>{title}</h1>
      <p style={{ color: '#64748b' }}>{description}</p>
      <div style={{
        marginTop: '32px',
        padding: '48px',
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        textAlign: 'center',
        color: '#94a3b8',
      }}>
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
          <Route path="/sales" element={<PrivateRoute><PlaceholderPage title="Sales & Orders" description="Manage sales, create orders, and track revenue." /></PrivateRoute>} />
          <Route path="/customers" element={<PrivateRoute><PlaceholderPage title="Customers" description="Manage your wholesale buyers and retail customers." /></PrivateRoute>} />
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

# Delete the stray App.jsxt file
rm -f frontend/src/App.jsxt

echo "✅ App.jsx replaced + App.jsxt deleted"

# ============================================
# STEP 5: Replace DashboardHome.jsx
# ============================================
echo ""
echo "📦 Step 5: Creating new DashboardHome.jsx..."

cat > frontend/src/components/Dashboard/DashboardHome.jsx << 'ENDOFFILE'
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import {
  Package,
  Users,
  FileText,
  AlertTriangle,
  ArrowRight,
  Smartphone,
  DollarSign,
  BarChart3,
  CheckCircle,
  ChevronRight,
} from 'lucide-react';

export default function DashboardHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalInventory: 0,
    availableDevices: 0,
    soldDevices: 0,
    totalSuppliers: 0,
    totalInvoices: 0,
    inventoryValue: 0,
    lowStockItems: [],
    recentInventory: [],
    recentInvoices: [],
    topBrands: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
      const [inventoryRes, suppliersRes, invoicesRes] = await Promise.all([
        api.get('/inventory?limit=200'),
        api.get('/suppliers'),
        api.get('/invoices?limit=50'),
      ]);

      const inventory = inventoryRes.data.data || [];
      const suppliers = suppliersRes.data.data || [];
      const invoices = invoicesRes.data.data || [];

      let totalDevices = 0;
      let availableDevices = 0;
      let soldDevices = 0;
      let inventoryValue = 0;
      const brandCounts = {};
      const lowStockItems = [];

      inventory.forEach((item) => {
        const available = item.devices?.filter((d) => !d.isSold).length || 0;
        const sold = item.devices?.filter((d) => d.isSold).length || 0;
        totalDevices += item.quantity || 0;
        availableDevices += available;
        soldDevices += sold;
        inventoryValue += available * (item.price?.retail || 0);

        const brand = item.brand || 'Unknown';
        brandCounts[brand] = (brandCounts[brand] || 0) + (item.quantity || 0);

        if (available <= (item.lowStockThreshold || 10) && available > 0) {
          lowStockItems.push({ ...item, available });
        }
      });

      const topBrands = Object.entries(brandCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

      setStats({
        totalInventory: inventory.length,
        totalDevices,
        availableDevices,
        soldDevices,
        totalSuppliers: suppliers.length,
        totalInvoices: invoices.length,
        inventoryValue,
        lowStockItems: lowStockItems.slice(0, 5),
        recentInventory: inventory.slice(0, 5),
        recentInvoices: invoices.slice(0, 5),
        topBrands,
      });
    } catch (error) {
      console.error('Dashboard data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
    return `$${val.toFixed(0)}`;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px', height: '40px',
            border: '4px solid #e2e8f0', borderTop: '4px solid #6366f1',
            borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
          }} />
          <p style={{ color: '#64748b' }}>Loading dashboard...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Products', value: stats.totalInventory, sub: `${stats.totalDevices} total units`, icon: Package, color: '#6366f1', bg: '#eef2ff', path: '/inventory' },
    { label: 'Available Devices', value: stats.availableDevices, sub: `${stats.soldDevices} sold`, icon: Smartphone, color: '#10b981', bg: '#ecfdf5', path: '/inventory' },
    { label: 'Inventory Value', value: formatCurrency(stats.inventoryValue), sub: 'At retail price', icon: DollarSign, color: '#f59e0b', bg: '#fffbeb', path: '/reports' },
    { label: 'Suppliers', value: stats.totalSuppliers, sub: `${stats.totalInvoices} invoices`, icon: Users, color: '#8b5cf6', bg: '#f5f3ff', path: '/suppliers' },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>
          {getGreeting()}, {user?.email?.split('@')[0] || 'there'} 👋
        </h1>
        <p style={{ color: '#64748b', fontSize: '14px' }}>Here's what's happening with your business today.</p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {statCards.map((card, i) => (
          <div key={i} onClick={() => navigate(card.path)}
            style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s ease', position: 'relative', overflow: 'hidden' }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <card.icon size={20} color={card.color} />
              </div>
              <ArrowRight size={16} color="#cbd5e1" />
            </div>
            <div style={{ fontSize: '26px', fontWeight: '700', color: '#0f172a', lineHeight: 1.2 }}>{card.value}</div>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>{card.label}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Middle Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }} className="dashboard-grid-2">
        {/* Top Brands */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a', margin: 0 }}>Top Brands</h3>
            <BarChart3 size={18} color="#94a3b8" />
          </div>
          {stats.topBrands.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {stats.topBrands.map((brand, i) => {
                const maxCount = stats.topBrands[0]?.count || 1;
                const pct = (brand.count / maxCount) * 100;
                const colors = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'];
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', color: '#334155', fontWeight: '500' }}>{brand.name}</span>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>{brand.count} units</span>
                    </div>
                    <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: colors[i] || '#6366f1', borderRadius: '3px', transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>No inventory data yet</p>
          )}
        </div>

        {/* Low Stock */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a', margin: 0 }}>Low Stock Alerts</h3>
            <AlertTriangle size={18} color="#f59e0b" />
          </div>
          {stats.lowStockItems.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {stats.lowStockItems.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fef3c7' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: '#1e293b' }}>{item.model}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{item.brand}</div>
                  </div>
                  <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', background: '#fef3c7', color: '#92400e' }}>{item.available} left</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <CheckCircle size={24} color="#10b981" style={{ margin: '0 auto 8px' }} />
              <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>All stock levels healthy</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="dashboard-grid-2">
        {/* Recent Inventory */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a', margin: 0 }}>Recent Inventory</h3>
            <button onClick={() => navigate('/inventory')} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: '#6366f1', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}>View all <ChevronRight size={14} /></button>
          </div>
          {stats.recentInventory.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {stats.recentInventory.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', background: '#f8fafc' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Smartphone size={16} color="#6366f1" />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#1e293b' }}>{item.model}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>{item.brand} · {item.specifications?.storage || 'N/A'}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#059669' }}>${item.price?.retail || 0}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Qty: {item.quantity}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>No inventory yet</p>
          )}
        </div>

        {/* Recent Invoices */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a', margin: 0 }}>Recent Invoices</h3>
            <button onClick={() => navigate('/invoices')} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: '#6366f1', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}>View all <ChevronRight size={14} /></button>
          </div>
          {stats.recentInvoices.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {stats.recentInvoices.map((inv, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', background: '#f8fafc' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={16} color="#8b5cf6" />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#1e293b' }}>#{inv.invoiceNumber || 'N/A'}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>{inv.supplierName}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>${inv.totalAmount?.toFixed(2) || '0.00'}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString() : 'N/A'}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>No invoices yet</p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ marginTop: '24px', background: 'linear-gradient(135deg, #312e81 0%, #4338ca 50%, #6366f1 100%)', borderRadius: '12px', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h3 style={{ color: 'white', fontSize: '16px', fontWeight: '600', margin: '0 0 4px' }}>Quick Actions</h3>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', margin: 0 }}>Jump to common tasks</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {[
            { label: 'Scan Invoice', path: '/invoices', icon: '📄' },
            { label: 'Add Inventory', path: '/inventory', icon: '📦' },
            { label: 'New Supplier', path: '/suppliers', icon: '👤' },
            { label: 'Test Device', path: '/device-test', icon: '📱' },
          ].map((action, i) => (
            <button key={i} onClick={() => navigate(action.path)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white', fontSize: '13px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.15s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
            >
              <span>{action.icon}</span> {action.label}
            </button>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .dashboard-grid-2 { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
ENDOFFILE

echo "✅ DashboardHome.jsx created"

# ============================================
# STEP 6: Fix InvoicesPage.jsx
# ============================================
echo ""
echo "📦 Step 6: Fixing InvoicesPage.jsx..."

cat > frontend/src/pages/InvoicesPage.jsx << 'ENDOFFILE'
import { useState, useEffect } from 'react';
import { FileText, Search, Calendar, Trash2, Download, Plus, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import api from '../utils/api';
import InvoiceScanner from '../components/InvoiceScanner';

const InvoicesPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [filters, setFilters] = useState({ search: '', startDate: '', endDate: '' });

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pagination.page, limit: pagination.limit });
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      const response = await api.get(`/invoices?${params}`);
      if (response.data.success) {
        setInvoices(response.data.data);
        setPagination(prev => ({ ...prev, ...response.data.pagination }));
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchInvoices(); }, [pagination.page]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this invoice?')) return;
    try {
      await api.delete(`/invoices/${id}`);
      fetchInvoices();
    } catch (err) { alert('Failed to delete'); }
  };

  const exportToCSV = () => {
    const headers = ['Invoice #', 'Supplier', 'Date', 'Total', 'Currency', 'Status'];
    const rows = invoices.map(inv => [
      inv.invoiceNumber || '', inv.supplierName,
      inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString() : '',
      inv.totalAmount, inv.currency, inv.status
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'invoices.csv';
    a.click();
  };

  const filteredInvoices = invoices.filter(inv => {
    if (!filters.search) return true;
    const s = filters.search.toLowerCase();
    return inv.invoiceNumber?.toLowerCase().includes(s) || inv.supplierName?.toLowerCase().includes(s);
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Invoices</h1>
          <p className="text-gray-500">Manage scanned invoices</p>
        </div>
        <div className="flex gap-3">
          <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={() => setShowScanner(!showScanner)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Scan Invoice
          </button>
        </div>
      </div>

      {showScanner && (
        <div className="mb-6">
          <InvoiceScanner onScanComplete={() => { setShowScanner(false); fetchInvoices(); }} />
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Search invoices..." value={filters.search} onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))} className="w-full pl-10 pr-4 py-2 border rounded-lg" />
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <input type="date" value={filters.startDate} onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))} className="px-3 py-2 border rounded-lg" />
            <span>to</span>
            <input type="date" value={filters.endDate} onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))} className="px-3 py-2 border rounded-lg" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
        ) : filteredInvoices.length === 0 ? (
          <div className="text-center py-12"><FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" /><p className="text-gray-500">No invoices found</p></div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredInvoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium">{inv.invoiceNumber || 'N/A'}</td>
                    <td className="px-6 py-4">{inv.supplierName}</td>
                    <td className="px-6 py-4 text-gray-500">{inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString() : 'N/A'}</td>
                    <td className="px-6 py-4 text-right font-medium">${inv.totalAmount?.toFixed(2)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 text-xs rounded-full ${inv.status === 'processed' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100'}`}>{inv.status}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleDelete(inv._id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-5 h-5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-t">
              <span className="text-sm text-gray-500">Page {pagination.page} of {pagination.pages || 1}</span>
              <div className="flex gap-2">
                <button onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))} disabled={pagination.page === 1} className="p-2 border rounded disabled:opacity-50"><ChevronLeft className="w-4 h-4" /></button>
                <button onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))} disabled={pagination.page >= pagination.pages} className="p-2 border rounded disabled:opacity-50"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default InvoicesPage;
ENDOFFILE

echo "✅ InvoicesPage.jsx fixed"

# ============================================
# STEP 7: Fix PhoneTestModule.jsx typos
# ============================================
echo ""
echo "📦 Step 7: Fixing PhoneTestModule.jsx typos..."

# Fix 1: ay.from → Array.from
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS sed
  sed -i '' 's/const p =ay\.from/const p = Array.from/g' frontend/src/components/DeviceTest/PhoneTestModule.jsx
  sed -i '' 's/accelerationIncludingGravy/accelerationIncludingGravity/g' frontend/src/components/DeviceTest/PhoneTestModule.jsx
  sed -i '' 's/nSaveResults/onSaveResults/g' frontend/src/components/DeviceTest/PhoneTestModule.jsx
else
  # Linux sed
  sed -i 's/const p =ay\.from/const p = Array.from/g' frontend/src/components/DeviceTest/PhoneTestModule.jsx
  sed -i 's/accelerationIncludingGravy/accelerationIncludingGravity/g' frontend/src/components/DeviceTest/PhoneTestModule.jsx
  sed -i 's/nSaveResults/onSaveResults/g' frontend/src/components/DeviceTest/PhoneTestModule.jsx
fi

echo "✅ PhoneTestModule.jsx typos fixed"

# ============================================
# STEP 8: Clean up
# ============================================
echo ""
echo "📦 Step 8: Cleaning up..."

rm -f frontend/src/App.jsxt

echo "✅ Removed stray App.jsxt"

# ============================================
# DONE
# ============================================
echo ""
echo "============================================"
echo "✅ Phase 1 Installation Complete!"
echo "============================================"
echo ""
echo "Files changed:"
echo "  FIXED:   backend/server.js"
echo "  FIXED:   frontend/src/context/AuthContext.jsx"
echo "  FIXED:   frontend/src/App.jsx"
echo "  FIXED:   frontend/src/pages/InvoicesPage.jsx"
echo "  FIXED:   frontend/src/components/DeviceTest/PhoneTestModule.jsx"
echo "  NEW:     frontend/src/components/Layout/Sidebar.jsx"
echo "  NEW:     frontend/src/components/Layout/DashboardLayout.jsx"
echo "  NEW:     frontend/src/components/Dashboard/DashboardHome.jsx"
echo "  DELETED: frontend/src/App.jsxt"
echo ""
echo "Next steps:"
echo "  1. cd backend && npm start"
echo "  2. cd frontend && npm run dev"
echo "  3. Open browser → you should see sidebar + new dashboard"
echo ""
