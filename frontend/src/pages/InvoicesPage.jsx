import React, { useState, useEffect } from 'react';
import { FileText, Search, Trash2, Download, Plus, Camera, ChevronDown, ChevronUp, Loader2, Eye, Edit, Save, X, ZoomIn, ZoomOut, Printer } from 'lucide-react';
import api from '../utils/api';
import InvoiceScanner from '../components/InvoiceScanner';

// Helper function to convert base64 to Blob
function b64ToBlob(dataUrl) {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const b64 = parts[1];
  const byteChars = atob(b64);
  const byteArrays = [];
  for (let offset = 0; offset < byteChars.length; offset += 512) {
    const slice = byteChars.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) byteNumbers[i] = slice.charCodeAt(i);
    byteArrays.push(new Uint8Array(byteNumbers));
  }
  return new Blob(byteArrays, { type: mime });
}

// Document Viewer Component
function DocViewer({ dataUrl, onClose, invoiceNumber }) {
  const [zoom, setZoom] = useState(100);
  const [blobUrl, setBlobUrl] = useState(null);
  const isPdf = dataUrl && dataUrl.includes('application/pdf');
  
  useEffect(() => { 
    if (isPdf) { 
      const blob = b64ToBlob(dataUrl); 
      const url = URL.createObjectURL(blob); 
      setBlobUrl(url); 
      return () => URL.revokeObjectURL(url); 
    } 
  }, [dataUrl, isPdf]);
  
  useEffect(() => { 
    const h = (e) => { if (e.key === 'Escape') onClose(); }; 
    window.addEventListener('keydown', h); 
    return () => window.removeEventListener('keydown', h); 
  }, [onClose]);
  
  const downloadFile = () => { 
    const blob = b64ToBlob(dataUrl); 
    const url = URL.createObjectURL(blob); 
    const ext = isPdf ? 'pdf' : 'jpg'; 
    const link = document.createElement('a'); 
    link.href = url; 
    link.download = `invoice-${invoiceNumber||'scan'}.${ext}`; 
    document.body.appendChild(link); 
    link.click(); 
    document.body.removeChild(link); 
    URL.revokeObjectURL(url); 
  };
  
  const printFile = () => { 
    if (isPdf && blobUrl) { 
      const w = window.open(blobUrl, '_blank'); 
      if (w) w.addEventListener('load', () => w.print()); 
    } else { 
      const w = window.open('', '_blank'); 
      if (w) { 
        w.document.write(`<html><body style="margin:0;display:flex;justify-content:center;"><img src="${dataUrl}" style="max-width:100%;"/></body></html>`); 
        w.document.close(); 
        w.addEventListener('load', () => w.print()); 
      } 
    } 
  };
  
  const tbBtn = { padding: '6px 12px', background: '#334155', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '13px', fontWeight: '500' };
  
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.9)', zIndex: 9999, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 20px', background: '#1e293b', borderBottom: '1px solid #334155', flexShrink: 0 }}>
        {!isPdf && (
          <>
            <button onClick={() => setZoom(p=>Math.max(p-25,50))} style={tbBtn}><ZoomOut size={16}/></button>
            <span style={{color:'white',fontSize:'13px',fontWeight:'600',minWidth:'50px',textAlign:'center',background:'#334155',padding:'4px 12px',borderRadius:'6px'}}>{zoom}%</span>
            <button onClick={() => setZoom(p=>Math.min(p+25,300))} style={tbBtn}><ZoomIn size={16}/></button>
            <div style={{width:'1px',height:'24px',background:'#475569',margin:'0 4px'}}/>
          </>
        )}
        <button onClick={printFile} style={{...tbBtn,background:'#2563eb'}}><Printer size={16}/><span style={{fontSize:'12px',marginLeft:'4px'}}>Print</span></button>
        <button onClick={downloadFile} style={{...tbBtn,background:'#059669'}}><Download size={16}/><span style={{fontSize:'12px',marginLeft:'4px'}}>Save</span></button>
        <button onClick={onClose} style={{...tbBtn,background:'#dc2626'}}><X size={16}/><span style={{fontSize:'12px',marginLeft:'4px'}}>Close</span></button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: isPdf ? 'stretch' : 'center', padding: isPdf ? '0' : '20px' }}>
        {isPdf ? (blobUrl ? <object data={blobUrl} type="application/pdf" style={{width:'100%',height:'100%'}}><iframe src={blobUrl} style={{width:'100%',height:'100%',border:'none'}} title="PDF"/></object> : <div style={{color:'white'}}>Loading...</div>)
          : <img src={dataUrl} alt="Invoice" style={{maxWidth:`${zoom}%`,height:'auto',objectFit:'contain',borderRadius:'8px',boxShadow:'0 8px 32px rgba(0,0,0,0.4)',transition:'max-width 0.2s ease'}}/>}
      </div>
      <div style={{padding:'6px 20px',background:'#1e293b',borderTop:'1px solid #334155',textAlign:'center',flexShrink:0}}>
        <span style={{color:'#94a3b8',fontSize:'12px'}}>{isPdf?'PDF Document — Browser controls for zoom/pages':'Image · '+zoom+'%'} · Press Esc to close</span>
      </div>
    </div>
  );
}

const InvoicesPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showProductEditModal, setShowProductEditModal] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});
  const [editInvoice, setEditInvoice] = useState(null);
  const [editProduct, setEditProduct] = useState(null);
  const [editProductIndex, setEditProductIndex] = useState(null);
  const [editInvoiceId, setEditInvoiceId] = useState(null);
  const [filters, setFilters] = useState({ search: '', startDate: '', endDate: '' });
  const [viewingDoc, setViewingDoc] = useState(null);
  const [viewingInvNum, setViewingInvNum] = useState('');

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

  useEffect(() => { fetchInvoices(); }, [filters.startDate, filters.endDate, filters.search]);

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

  const handleEditProduct = (invoiceId, product, productIndex) => {
    setEditInvoiceId(invoiceId);
    setEditProduct(JSON.parse(JSON.stringify(product)));
    setEditProductIndex(productIndex);
    setShowProductEditModal(true);
  };

  const handleUpdateProduct = async () => {
    try {
      const invoice = invoices.find(i => i._id === editInvoiceId);
      if (!invoice) return;
      const updatedProducts = [...invoice.products];
      updatedProducts[editProductIndex] = editProduct;
      await api.put(`/invoices/${editInvoiceId}`, { ...invoice, products: updatedProducts });
      setShowProductEditModal(false);
      setEditProduct(null);
      setEditProductIndex(null);
      setEditInvoiceId(null);
      fetchInvoices();
      alert('Product updated successfully!');
    } catch (err) {
      alert('Failed to update: ' + (err.response?.data?.message || err.message));
    }
  };

  const addProduct = () => {
    setEditInvoice(prev => ({
      ...prev,
      products: [...(prev.products || []), { 
        name: '', 
        brand: '', 
        model: '', 
        quantity: 1, 
        unitPrice: 0,
        imeis: []
      }]
    }));
  };

  const removeProduct = (productIndex) => {
    setEditInvoice(prev => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== productIndex)
    }));
  };

  const updateInvoiceField = (field, value) => {
    setEditInvoice(prev => ({ ...prev, [field]: value }));
  };

  const updateProductField = (productIndex, field, value) => {
    setEditInvoice(prev => {
      const newProducts = [...(prev.products || [])];
      newProducts[productIndex] = { ...newProducts[productIndex], [field]: value };
      return { ...prev, products: newProducts };
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

  const openViewer = (imageUrl, invNum) => { 
    setViewingDoc(imageUrl); 
    setViewingInvNum(invNum || ''); 
  };

  const filteredInvoices = invoices.filter(inv => {
    if (!filters.search) return true;
    const s = filters.search.toLowerCase();
    return inv.invoiceNumber?.toLowerCase().includes(s) || inv.supplierName?.toLowerCase().includes(s);
  });

  const toggleRow = (id) => setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  const handleScanComplete = () => { setShowScanner(false); fetchInvoices(); };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          <h1 className="text-3xl font-bold text-gray-900">Invoice Management</h1>
          <div className="flex gap-3">
            <button onClick={exportToCSV} className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-lg font-medium hover:bg-gray-50">
              <Download size={20} />Export
            </button>
            <button onClick={() => setShowScanner(true)} className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-5 py-2.5 rounded-lg font-medium hover:from-purple-700 hover:to-purple-800">
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
          <div className="text-center py-12 bg-white rounded-xl">
            <Loader2 size={48} color="#667eea" style={{ margin: '0 auto', animation: 'spin 1s linear infinite' }} />
            <p style={{ marginTop: '1rem', color: '#6b7280' }}>Loading invoices...</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '0.5rem' }}>
            <FileText size={48} color="#9ca3af" style={{ margin: '0 auto 1rem' }} />
            <p style={{ color: '#6b7280', marginBottom: '1rem' }}>No invoices found</p>
            <button onClick={() => setShowScanner(true)} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200">
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
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Products</th>
                  <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600', color: '#374151' }}>Total</th>
                  <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Status</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => {
                  const isExpanded = expandedRows[inv._id];
                  const isPdf = inv.imageUrl?.includes('application/pdf');
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
                          {inv.imageUrl && <span style={{ fontSize: '0.7rem', background: '#fee2e2', color: '#991b1b', padding: '2px 6px', borderRadius: '4px', marginTop: '4px', display: 'inline-block' }}>{isPdf ? 'PDF' : 'IMG'}</span>}
                        </td>
                        <td style={{ padding: '1rem', color: '#6b7280' }}>{inv.supplierName}</td>
                        <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                          {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString() : 'N/A'}
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                          {inv.products?.length || 0} items
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
                            {inv.imageUrl && (
                              <button onClick={() => openViewer(inv.imageUrl, inv.invoiceNumber)} style={{ background: '#f5f3ff', border: 'none', color: '#8b5cf6', cursor: 'pointer', padding: '0.5rem', borderRadius: '4px' }} title="View Invoice">
                                <Eye size={18} />
                              </button>
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
                              <h4 style={{ margin: '0 0 1rem', fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>Products ({inv.products?.length || 0})</h4>
                              {inv.products && inv.products.length > 0 ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.75rem' }}>
                                  {inv.products.map((product, idx) => (
                                    <div key={idx} style={{ background: 'white', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>#{idx + 1}</span>
                                        <button onClick={() => handleEditProduct(inv._id, product, idx)} style={{ background: '#eff6ff', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '0.7rem', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                          <Edit size={12} /> Edit
                                        </button>
                                      </div>
                                      <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem' }}>{product.name || product.fullDescription || 'No description'}</div>
                                      {product.model && <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Model: {product.model}</div>}
                                      {product.brand && <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Brand: {product.brand}</div>}
                                      {product.imeis && product.imeis.length > 0 && (
                                        <div style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#6b7280', marginBottom: '0.5rem', maxHeight: '40px', overflowY: 'auto' }}>
                                          {product.imeis.map((imei, i) => <div key={i}>IMEI: {imei}</div>)}
                                        </div>
                                      )}
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #f3f4f6' }}>
                                        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Qty: {product.quantity || 1}</span>
                                        <span style={{ fontWeight: '600', color: '#059669' }}>${product.unitPrice?.toFixed(2) || '0.00'}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>No products available</p>
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

        {/* Document Viewer */}
        {viewingDoc && <DocViewer dataUrl={viewingDoc} onClose={() => setViewingDoc(null)} invoiceNumber={viewingInvNum} />}

        {/* Edit Invoice Modal - same as before, keeping it for completeness */}
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
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>Status</label>
                  <select
                    value={editInvoice.status || 'pending'}
                    onChange={(e) => updateInvoiceField('status', e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                  >
                    <option value="pending">Pending</option>
                    <option value="processed">Processed</option>
                    <option value="verified">Verified</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              {/* Products Section */}
              <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>Products ({editInvoice.products?.length || 0})</h3>
                  <button onClick={addProduct} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>
                    <Plus size={14} /> Add Product
                  </button>
                </div>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {editInvoice.products && editInvoice.products.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {editInvoice.products.map((product, idx) => (
                        <div key={idx} style={{ background: 'white', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#374151' }}>Product #{idx + 1}</span>
                            <div style={{ flex: 1 }}></div>
                            <button onClick={() => removeProduct(idx)} style={{ background: '#fee2e2', border: 'none', borderRadius: '4px', padding: '4px', cursor: 'pointer' }}>
                              <Trash2 size={14} color="#dc2626" />
                            </button>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.5rem' }}>
                            <div>
                              <label style={{ fontSize: '0.7rem', color: '#6b7280' }}>Name</label>
                              <input
                                type="text"
                                value={product.name || ''}
                                onChange={(e) => updateProductField(idx, 'name', e.target.value)}
                                style={{ width: '100%', padding: '6px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.85rem' }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '0.7rem', color: '#6b7280' }}>Quantity</label>
                              <input
                                type="number"
                                value={product.quantity || 1}
                                onChange={(e) => updateProductField(idx, 'quantity', parseInt(e.target.value))}
                                style={{ width: '100%', padding: '6px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.85rem' }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '0.7rem', color: '#6b7280' }}>Price</label>
                              <input
                                type="number"
                                step="0.01"
                                value={product.unitPrice || 0}
                                onChange={(e) => updateProductField(idx, 'unitPrice', parseFloat(e.target.value))}
                                style={{ width: '100%', padding: '6px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.85rem' }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ textAlign: 'center', color: '#9ca3af', padding: '1rem' }}>No products. Click "Add Product" to add products.</p>
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

        {/* Edit Product Modal */}
        {showProductEditModal && editProduct && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
            <div style={{ background: 'white', borderRadius: '0.5rem', padding: '2rem', maxWidth: '500px', width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>Edit Product</h2>
                <button onClick={() => setShowProductEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={24} color="#6b7280" />
                </button>
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>Name</label>
                <input
                  type="text"
                  value={editProduct.name || ''}
                  onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>Brand</label>
                  <input
                    type="text"
                    value={editProduct.brand || ''}
                    onChange={(e) => setEditProduct({ ...editProduct, brand: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>Model</label>
                  <input
                    type="text"
                    value={editProduct.model || ''}
                    onChange={(e) => setEditProduct({ ...editProduct, model: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>Quantity</label>
                  <input
                    type="number"
                    value={editProduct.quantity || 1}
                    onChange={(e) => setEditProduct({ ...editProduct, quantity: parseInt(e.target.value) })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>Unit Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editProduct.unitPrice || 0}
                    onChange={(e) => setEditProduct({ ...editProduct, unitPrice: parseFloat(e.target.value) })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={() => setShowProductEditModal(false)} style={{ flex: 1, padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', background: 'white', cursor: 'pointer', fontWeight: '500' }}>
                  Cancel
                </button>
                <button onClick={handleUpdateProduct} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '0.75rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '500' }}>
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
