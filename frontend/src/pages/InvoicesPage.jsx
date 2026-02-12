import React, { useState, useEffect } from 'react';
import { FileText, Search, Trash2, Download, Plus, Camera, ChevronDown, ChevronUp, Loader2, Eye } from 'lucide-react';
import api from '../utils/api';
import InvoiceScanner from '../components/InvoiceScanner';

const InvoicesPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});
  const [filters, setFilters] = useState({ search: '', startDate: '', endDate: '' });

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      const response = await api.get(`/invoices?${params}`);
      if (response.data.success) {
        setInvoices(response.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInvoices(); }, [filters.startDate, filters.endDate]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this invoice?')) return;
    try {
      await api.delete(`/invoices/${id}`);
      fetchInvoices();
    } catch (err) {
      alert('Failed to delete');
    }
  };

  const exportToCSV = () => {
    const headers = ['Invoice #', 'Supplier', 'Date', 'Total', 'Currency', 'Status'];
    const rows = invoices.map(inv => [
      inv.invoiceNumber || '',
      inv.supplierName,
      inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString() : '',
      inv.totalAmount,
      inv.currency,
      inv.status
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

  const toggleRow = (id) => setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  const handleScanComplete = () => { setShowScanner(false); fetchInvoices(); };

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', padding: '2rem' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937' }}>Invoice Management</h1>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={exportToCSV} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', border: '1px solid #d1d5db', color: '#374151', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '500' }}>
              <Download size={20} />Export
            </button>
            <button onClick={() => setShowScanner(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontWeight: '500' }}>
              <Camera size={20} />Scan Invoice
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
          <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} size={20} />
          <input
            type="text"
            placeholder="Search by invoice number or supplier..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            style={{ width: '100%', paddingLeft: '3rem', padding: '0.75rem 1rem 0.75rem 3rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }}
          />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '0.5rem' }}>
            <Loader2 size={48} color="#667eea" style={{ margin: '0 auto', animation: 'spin 1s linear infinite' }} />
            <p style={{ marginTop: '1rem', color: '#6b7280' }}>Loading invoices...</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '0.5rem' }}>
            <FileText size={48} color="#9ca3af" style={{ margin: '0 auto 1rem' }} />
            <p style={{ color: '#6b7280', marginBottom: '1rem' }}>No invoices found</p>
            <button onClick={() => setShowScanner(true)} style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }}>
              Scan Invoice
            </button>
          </div>
        ) : (
          <div style={{ background: 'white', borderRadius: '0.5rem', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                <tr>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151', width: '40px' }}></th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Invoice #</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Supplier</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Date</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Items</th>
                  <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600', color: '#374151' }}>Total</th>
                  <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Status</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => {
                  const isExpanded = expandedRows[inv._id];
                  return (
                    <React.Fragment key={inv._id}>
                      <tr style={{ borderBottom: '1px solid #e5e7eb', background: isExpanded ? '#f9fafb' : 'white' }}>
                        <td style={{ padding: '1rem' }}>
                          <button onClick={() => toggleRow(inv._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}>
                            {isExpanded ? <ChevronUp size={20} color="#6b7280" /> : <ChevronDown size={20} color="#6b7280" />}
                          </button>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontWeight: '600', color: '#111827' }}>#{inv.invoiceNumber || 'N/A'}</div>
                          {inv.pdfUrl && <span style={{ fontSize: '0.7rem', background: '#fee2e2', color: '#991b1b', padding: '2px 6px', borderRadius: '4px', marginTop: '4px', display: 'inline-block' }}>PDF</span>}
                        </td>
                        <td style={{ padding: '1rem', color: '#6b7280' }}>{inv.supplierName}</td>
                        <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                          {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString() : 'N/A'}
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                          {inv.items?.length || 0} products
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                          <div style={{ fontWeight: '600', color: '#059669' }}>${inv.totalAmount?.toFixed(2) || '0.00'}</div>
                          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{inv.currency || 'USD'}</div>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <span style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '500', background: inv.status === 'processed' ? '#d1fae5' : '#e5e7eb', color: inv.status === 'processed' ? '#065f46' : '#374151' }}>
                            {inv.status}
                          </span>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {inv.pdfUrl && (
                              <a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer" style={{ background: '#eff6ff', border: 'none', color: '#2563eb', cursor: 'pointer', padding: '0.5rem', borderRadius: '4px', display: 'flex' }} title="View PDF">
                                <Eye size={18} />
                              </a>
                            )}
                            <a href={inv.pdfUrl} download style={{ background: '#f0fdf4', border: 'none', color: '#16a34a', cursor: 'pointer', padding: '0.5rem', borderRadius: '4px', display: 'flex' }} title="Download">
                              <Download size={18} />
                            </a>
                            <button onClick={() => handleDelete(inv._id)} style={{ background: '#fef2f2', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.5rem', borderRadius: '4px' }} title="Delete">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan="8" style={{ padding: '0', background: '#f9fafb' }}>
                            <div style={{ padding: '1rem 2rem', borderBottom: '1px solid #e5e7eb' }}>
                              <h4 style={{ margin: '0 0 1rem', fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>Invoice Items ({inv.items?.length || 0})</h4>
                              {inv.items && inv.items.length > 0 ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.75rem' }}>
                                  {inv.items.map((item, idx) => (
                                    <div key={idx} style={{ background: 'white', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                                      <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem' }}>{item.description || 'No description'}</div>
                                      {item.imei && <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>IMEI: {item.imei}</div>}
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                                        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Qty: {item.quantity || 1}</span>
                                        <span style={{ fontWeight: '600', color: '#059669' }}>${item.unitPrice?.toFixed(2) || '0.00'}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>No items available</p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {showScanner && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem', overflow: 'auto' }}>
            <div style={{ background: 'white', borderRadius: '0.5rem', maxWidth: '1000px', width: '100%', maxHeight: '95vh', overflow: 'auto', position: 'relative' }}>
              <button onClick={() => setShowScanner(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: '#f3f4f6', border: 'none', borderRadius: '50%', width: '2rem', height: '2rem', cursor: 'pointer', fontSize: '1.25rem', zIndex: 10 }}>×</button>
              <InvoiceScanner onScanComplete={handleScanComplete} />
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default InvoicesPage;
