import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import api from '../../utils/api';
import {
  Search, Smartphone, Package, FileText, ShoppingCart,
  ClipboardCheck, Clock, CheckCircle, XCircle, AlertTriangle,
  Loader2, ArrowRight, Tag, DollarSign, MapPin, X
} from 'lucide-react';

export default function IMEILookup() {
  const navigate = useNavigate();
  const [imei, setImei] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showQr, setShowQr] = useState(false);

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
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: loading ? '#94a3b8' : '#dbeafe', color: loading ? 'white' : '#1d4ed8', border: 'none', borderRadius: '8px', cursor: loading ? 'wait' : 'pointer', fontWeight: '600', fontSize: '14px', whiteSpace: 'nowrap' }}>
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
              <div style={{ marginLeft: 'auto' }}>
                <button onClick={() => setShowQr(true)} style={{ padding: '8px 12px', background: '#009EF7', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,158,247,0.2)' }}>
                  <ClipboardCheck size={14} /> Run Hardware Test
                </button>
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
            
            {result.device.labData && (
              <div style={{ marginTop: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#0f172a', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle size={14} color="#10b981" /> IMEI Lab Verification Data
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {(() => {
                    const labData = result.device.labData;
                    if (typeof labData !== 'object' || (!labData.CODE && !labData.MESSAGE)) {
                      return <div style={{ gridColumn: '1 / -1', fontSize: '10px', fontFamily: 'monospace', color: '#334155', whiteSpace: 'pre-wrap', background: 'white', padding: '8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>{String(labData)}</div>;
                    }
                    const codeStr = labData.CODE || labData.MESSAGE || '';
                    const lines = codeStr.split(/<br\s*\/?>|\n/i).map(l => l.trim()).filter(l => l);
                    const parsed = [];
                    lines.forEach(line => {
                       const idx = line.indexOf(':');
                       if (idx !== -1 && !line.startsWith('<')) {
                          parsed.push({ label: line.substring(0, idx).trim(), value: line.substring(idx + 1).trim() });
                       } else if (line.length > 0) {
                          parsed.push({ label: 'Info', value: line });
                       }
                    });
                    if (parsed.length === 0) {
                      return <div style={{ gridColumn: '1 / -1', fontSize: '11px', color: '#334155', background: 'white', padding: '8px', borderRadius: '4px', border: '1px solid #e2e8f0' }} dangerouslySetInnerHTML={{ __html: codeStr }} />;
                    }
                    return parsed.map((item, i) => (
                      <div key={i} style={{ padding: '6px 10px', background: 'white', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.02em', fontWeight: '600' }}>{item.label}</div>
                        <div style={{ fontSize: '12px', fontWeight: '500', color: '#0f172a', marginTop: '2px' }} dangerouslySetInnerHTML={{ __html: item.value }}></div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}
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
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: test.testResults ? '12px' : '0' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>{test.summary?.passedTests}/{test.summary?.totalTests} passed</div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>By {test.testedBy || 'Anonymous'} · {new Date(test.createdAt).toLocaleDateString()}</div>
                      </div>
                      <span style={{
                        padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600',
                        background: test.overallStatus === 'passed' ? '#ecfdf5' : test.overallStatus === 'failed' ? '#fef2f2' : '#fef3c7',
                        color: test.overallStatus === 'passed' ? '#059669' : test.overallStatus === 'failed' ? '#dc2626' : '#b45309',
                        border: `1px solid ${test.overallStatus === 'passed' ? '#a7f3d0' : test.overallStatus === 'failed' ? '#fecaca' : '#fde68a'}`
                      }}>{test.overallStatus?.toUpperCase()}</span>
                    </div>

                    {test.testResults && Object.keys(test.testResults).length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingTop: '10px', borderTop: '1px dashed #cbd5e1' }}>
                        {Object.entries(test.testResults).filter(([_, res]) => res && res.status !== 'pending').map(([key, res]) => (
                          <div key={key} style={{ 
                            fontSize: '11px', padding: '3px 8px', borderRadius: '4px', fontWeight: '500',
                            background: res.status === 'passed' ? '#ecfdf5' : res.status === 'failed' ? '#fef2f2' : res.status === 'manual' ? '#fef3c7' : '#f1f5f9',
                            color: res.status === 'passed' ? '#059669' : res.status === 'failed' ? '#dc2626' : res.status === 'manual' ? '#b45309' : '#64748b',
                            border: `1px solid ${res.status === 'passed' ? '#a7f3d0' : res.status === 'failed' ? '#fecaca' : res.status === 'manual' ? '#fde68a' : '#e2e8f0'}`,
                            display: 'flex', alignItems: 'center', gap: '4px'
                          }}>
                            {res.status === 'passed' ? '✓' : res.status === 'failed' ? '✗' : res.status === 'manual' ? '⚠️' : '-'} 
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                            {res.data && res.data.health && ` (${res.data.health}%)`}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Purchase History */}
          {(result.invoices?.length > 0 || result.device?.supplierName) && (
            <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '600', color: '#0f172a' }}>Purchase & Supplier</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(result.invoices?.length > 0 ? result.invoices : [{}]).map((invoice, i) => (
                  <div key={i} 
                       onClick={() => invoice.invoiceNumber ? navigate('/invoices') : null}
                       style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#f8fafc', borderRadius: '8px', cursor: invoice.invoiceNumber ? 'pointer' : 'default', border: '1px solid transparent', transition: 'all 0.2s' }}
                       onMouseEnter={(e) => { if(invoice.invoiceNumber) { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#e2e8f0'; } }}
                       onMouseLeave={(e) => { if(invoice.invoiceNumber) { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = 'transparent'; } }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ background: '#fef3c7', padding: '8px', borderRadius: '6px' }}>
                        <FileText size={16} color="#d97706" />
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '2px' }}>{invoice.invoiceNumber ? `Invoice #${invoice.invoiceNumber}` : 'Direct Inventory Entry'}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>From {invoice.supplierName || result.device?.supplierName || 'Unknown Supplier'} {invoice.invoiceDate ? `· ${new Date(invoice.invoiceDate).toLocaleDateString()}` : ''}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>${(invoice.totalAmount || result.device?.costPrice || 0).toFixed(2)}</div>
                        <div style={{ fontSize: '11px', color: '#d97706', fontWeight: '500', textTransform: 'capitalize' }}>{invoice.status || 'Received'}</div>
                      </div>
                      {invoice.invoiceNumber && <ArrowRight size={16} color="#94a3b8" />}
                    </div>
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
                  <div key={i} 
                       onClick={() => navigate('/sales/' + sale.saleId)}
                       style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#f8fafc', borderRadius: '8px', cursor: 'pointer', border: '1px solid transparent', transition: 'all 0.2s' }}
                       onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                       onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = 'transparent'; }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ background: '#e0e7ff', padding: '8px', borderRadius: '6px' }}>
                        <ShoppingCart size={16} color="#4f46e5" />
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '2px' }}>{sale.saleNumber}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Sold to {sale.customerName} · {new Date(sale.date).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>${sale.salePrice.toFixed(2)}</div>
                        <div style={{ fontSize: '11px', color: '#059669', fontWeight: '500' }}>+${sale.profit.toFixed(2)} margin</div>
                      </div>
                      <ArrowRight size={16} color="#94a3b8" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showQr && result && result.device && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.2s ease-out' }}>
          <div style={{ background: 'white', padding: '32px', borderRadius: '24px', maxWidth: '420px', width: '90%', textAlign: 'center', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <button onClick={() => setShowQr(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#64748b', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
              <X size={18} />
            </button>
            <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '1px solid #bfdbfe' }}>
              <Smartphone size={32} color="#3b82f6" />
            </div>
            <h2 style={{ margin: '0 0 12px', fontSize: '22px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>Scan to Test Device</h2>
            <p style={{ margin: '0 0 24px', fontSize: '14px', color: '#64748b', lineHeight: '1.6', padding: '0 10px' }}>
              Point the camera of the phone you are testing ({result.imei}) at this QR code to instantly start the diagnostic wizard.
            </p>
            <div style={{ background: 'white', padding: '20px', borderRadius: '16px', display: 'inline-block', border: '2px dashed #e2e8f0' }}>
              <QRCodeCanvas 
                value={`http://${window.location.hostname}:5177/device-test/${result.imei}?inventoryId=${result.device.inventoryId}&deviceId=${result.device.deviceId}`}
                size={220}
                level={"H"}
                fgColor={"#0f172a"}
              />
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .imei-grid { max-width: 1200px; margin: 0 auto; }
        @media (max-width: 1024px) { .imei-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
