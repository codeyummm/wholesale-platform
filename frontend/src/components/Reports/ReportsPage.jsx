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
