import React, { useState, useEffect } from 'react';
import { FileText, Search, Trash2, Download, Plus, Camera, ChevronDown, ChevronUp, Loader2, Eye, Edit, Save, X } from 'lucide-react';
import api from '../utils/api';
import InvoiceScanner from '../components/InvoiceScanner';

const InvoicesPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showItemEditModal, setShowItemEditModal] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});
  const [editInvoice, setEditInvoice] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [editItemIndex, setEditItemIndex] = useState(null);
  const [editInvoiceId, setEditInvoiceId] = useState(null);
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

  const handleEdit = (invoice) => {
    setEditInvoice(JSON.parse(JSON.stringify(invoice)));
    setShowEditModal(true);
  };

  const handleUpdateInvoice = async () => {
    try {
      await api.put(`/invoices/${editInvoice._id}`, editInvoice);
      setShowEditModal(false);
      setEditInvoice(null);
      fetchInvoices();
      alert('Invoice updated successfully!');
    } catch (err) {
      alert('Failed to update: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleEditItem = (invoiceId, item, itemIndex) => {
    setEditInvoiceId(invoiceId);
    setEditItem(JSON.parse(JSON.stringify(item)));
    setEditItemIndex(itemIndex);
    setShowItemEditModal(true);
  };

  const handleUpdateItem = async () => {
    try {
      const invoice = invoices.find(i => i._id === editInvoiceId);
      if (!invoice) return;
      const updatedItems = [...invoice.items];
      updatedItems[editItemIndex] = editItem;
      await api.put(`/invoices/${editInvoiceId}`, { ...invoice, items: updatedItems });
      setShowItemEditModal(false);
      setEditItem(null);
      setEditItemIndex(null);
      setEditInvoiceId(null);
      fetchInvoices();
      alert('Item updated successfully!');
    } catch (err) {
      alert('Failed to update: ' + (err.response?.data?.message || err.message));
    }
  };

  const addItem = () => {
    setEditInvoice(prev => ({
      ...prev,
      items: [...(prev.items || []), { description: '', imei: '', quantity: 1, unitPrice: 0 }]
    }));
  };

  const removeItem = (itemIndex) => {
    setEditInvoice(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== itemIndex)
    }));
  };

  const updateInvoiceField = (field, value) => {
    setEditInvoice(prev => ({ ...prev, [field]: value }));
  };

  const updateItemField = (itemIndex, field, value) => {
    setEditInvoice(prev => {
      const newItems = [...(prev.items || [])];
      newItems[itemIndex] = { ...newItems[itemIndex], [field]: value };
      return { ...prev, items: newItems };
    });
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
        {/* Header */}
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

        {/* Search */}
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

        {/* Loading/Empty States */}
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
                            <button onClick={() => handleEdit(inv)} style={{ background: '#eff6ff', border: 'none', color: '#2563eb', cursor: 'pointer', padding: '0.5rem', borderRadius: '4px' }} title="Edit Invoice">
                              <Edit size={18} />
                            </button>
                            {inv.pdfUrl && (
                              <a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer" style={{ background: '#f0fdf4', border: 'none', color: '#16a34a', cursor: 'pointer', padding: '0.5rem', borderRadius: '4px', display: 'flex' }} title="View PDF">
                                <Eye size={18} />
                              </a>
                            )}
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
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>#{idx + 1}</span>
                                        <button onClick={() => handleEditItem(inv._id, item, idx)} style={{ background: '#eff6ff', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '0.7rem', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                          <Edit size={12} /> Edit
                                        </button>
                                      </div>
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

        {/* Edit Invoice Modal */}
        {showEditModal && editInvoice && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
            <div style={{ background: 'white', borderRadius: '0.5rem', padding: '2rem', maxWidth: '800px', width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>Edit Invoice</h2>
                <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={24} color="#6b7280" />
                </button>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>Invoice Number</label>
                  <input
                    type="text"
                    value={editInvoice.invoiceNumber || ''}
                    onChange={(e) => updateInvoiceField('invoiceNumber', e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>Supplier</label>
                  <input
                    type="text"
                    value={editInvoice.supplierName || ''}
                    onChange={(e) => updateInvoiceField('supplierName', e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>Date</label>
                  <input
                    type="date"
                    value={editInvoice.invoiceDate ? new Date(editInvoice.invoiceDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => updateInvoiceField('invoiceDate', e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>Total Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editInvoice.totalAmount || 0}
                    onChange={(e) => updateInvoiceField('totalAmount', parseFloat(e.target.value))}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>Currency</label>
                  <input
                    type="text"
                    value={editInvoice.currency || 'USD'}
                    onChange={(e) => updateInvoiceField('currency', e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                  />
                </div>
              </div>

              {/* Items Section */}
              <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>Items ({editInvoice.items?.length || 0})</h3>
                  <button onClick={addItem} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>
                    <Plus size={14} /> Add Item
                  </button>
                </div>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {editInvoice.items && editInvoice.items.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {editInvoice.items.map((item, idx) => (
                        <div key={idx} style={{ background: 'white', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#374151' }}>Item #{idx + 1}</span>
                            <div style={{ flex: 1 }}></div>
                            <button onClick={() => removeItem(idx)} style={{ background: '#fee2e2', border: 'none', borderRadius: '4px', padding: '4px', cursor: 'pointer' }}>
                              <Trash2 size={14} color="#dc2626" />
                            </button>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.5rem' }}>
                            <div>
                              <label style={{ fontSize: '0.7rem', color: '#6b7280' }}>Description</label>
                              <input
                                type="text"
                                value={item.description || ''}
                                onChange={(e) => updateItemField(idx, 'description', e.target.value)}
                                style={{ width: '100%', padding: '6px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.85rem' }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '0.7rem', color: '#6b7280' }}>Quantity</label>
                              <input
                                type="number"
                                value={item.quantity || 1}
                                onChange={(e) => updateItemField(idx, 'quantity', parseInt(e.target.value))}
                                style={{ width: '100%', padding: '6px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.85rem' }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '0.7rem', color: '#6b7280' }}>Price</label>
                              <input
                                type="number"
                                step="0.01"
                                value={item.unitPrice || 0}
                                onChange={(e) => updateItemField(idx, 'unitPrice', parseFloat(e.target.value))}
                                style={{ width: '100%', padding: '6px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.85rem' }}
                              />
                            </div>
                          </div>
                          <div style={{ marginTop: '0.5rem' }}>
                            <label style={{ fontSize: '0.7rem', color: '#6b7280' }}>IMEI (optional)</label>
                            <input
                              type="text"
                              value={item.imei || ''}
                              onChange={(e) => updateItemField(idx, 'imei', e.target.value)}
                              style={{ width: '100%', padding: '6px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.85rem', fontFamily: 'monospace' }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ textAlign: 'center', color: '#9ca3af', padding: '1rem' }}>No items. Click "Add Item" to add items.</p>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={() => setShowEditModal(false)} style={{ flex: 1, padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', background: 'white', cursor: 'pointer', fontWeight: '500' }}>
                  Cancel
                </button>
                <button onClick={handleUpdateInvoice} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '0.75rem', background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '500' }}>
                  <Save size={18} /> Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Item Modal */}
        {showItemEditModal && editItem && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
            <div style={{ background: 'white', borderRadius: '0.5rem', padding: '2rem', maxWidth: '500px', width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>Edit Item</h2>
                <button onClick={() => setShowItemEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={24} color="#6b7280" />
                </button>
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>Description</label>
                <input
                  type="text"
                  value={editItem.description || ''}
                  onChange={(e) => setEditItem({ ...editItem, description: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>IMEI</label>
                <input
                  type="text"
                  value={editItem.imei || ''}
                  onChange={(e) => setEditItem({ ...editItem, imei: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontFamily: 'monospace' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>Quantity</label>
                  <input
                    type="number"
                    value={editItem.quantity || 1}
                    onChange={(e) => setEditItem({ ...editItem, quantity: parseInt(e.target.value) })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>Unit Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editItem.unitPrice || 0}
                    onChange={(e) => setEditItem({ ...editItem, unitPrice: parseFloat(e.target.value) })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={() => setShowItemEditModal(false)} style={{ flex: 1, padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', background: 'white', cursor: 'pointer', fontWeight: '500' }}>
                  Cancel
                </button>
                <button onClick={handleUpdateItem} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '0.75rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '500' }}>
                  <Save size={18} /> Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scanner Modal */}
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
