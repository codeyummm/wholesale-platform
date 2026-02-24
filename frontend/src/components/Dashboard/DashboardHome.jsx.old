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
