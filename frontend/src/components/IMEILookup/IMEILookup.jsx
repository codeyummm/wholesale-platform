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
