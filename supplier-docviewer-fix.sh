#!/bin/bash
echo "🔧 Fixing image viewer with zoom + page navigation..."

cat > frontend/src/components/Suppliers/SupplierList.jsx << 'SUPPLIEREOF'
import React, { useEffect, useState, useRef } from 'react';
import api from '../../utils/api';
import InvoiceScanner from '../InvoiceScanner';
import { Plus, Search, Edit, Trash2, Phone, Mail, MapPin, X, Save, FileText, Package, DollarSign, Eye, Building, Star, Camera, ArrowLeft, Download, ChevronDown, ChevronUp, ZoomIn, ZoomOut, ChevronRight } from 'lucide-react';

const lbl = { display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px', color: '#334155' };
const inp = { width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' };

// === DOCUMENT VIEWER COMPONENT ===
function DocViewer({ dataUrl, onClose }) {
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const iframeRef = useRef(null);
  const isPdf = dataUrl && dataUrl.includes('application/pdf');

  useEffect(() => {
    if (isPdf) {
      // Count PDF pages from base64
      try {
        const b64 = dataUrl.split(',')[1];
        const raw = atob(b64);
        const matches = raw.match(/\/Type\s*\/Page[^s]/g);
        if (matches) setTotalPages(matches.length);
      } catch (e) { console.log('Could not count pages'); }
    }
  }, [dataUrl, isPdf]);

  const zoomIn = () => setZoom(prev => Math.min(prev + 25, 300));
  const zoomOut = () => setZoom(prev => Math.max(prev - 25, 25));
  const resetZoom = () => setZoom(100);
  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  const downloadFile = () => {
    try {
      const parts = dataUrl.split(',');
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      const b64 = parts[1];
      const byteChars = atob(b64);
      const byteArrays = [];
      for (let offset = 0; offset < byteChars.length; offset += 512) {
        const slice = byteChars.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) byteNumbers[i] = slice.charCodeAt(i);
        byteArrays.push(new Uint8Array(byteNumbers));
      }
      const blob = new Blob(byteArrays, { type: mime });
      const url = URL.createObjectURL(blob);
      const ext = mime.includes('pdf') ? 'pdf' : mime.includes('png') ? 'png' : 'jpg';
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) { console.error('Download error:', err); }
  };

  // For PDFs: navigate via iframe hash
  useEffect(() => {
    if (isPdf && iframeRef.current) {
      const base = dataUrl;
      iframeRef.current.src = `${base}#page=${currentPage}`;
    }
  }, [currentPage, isPdf, dataUrl]);

  return (
    <div onClick={onClose}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>

      {/* Top toolbar */}
      <div onClick={(e) => e.stopPropagation()}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(30,30,30,0.95)', borderRadius: '12px', marginBottom: '12px', backdropFilter: 'blur(10px)' }}>

        {/* Page navigation (PDF only) */}
        {isPdf && totalPages > 1 && (<>
          <button onClick={prevPage} disabled={currentPage <= 1}
            style={{ padding: '6px 10px', background: currentPage <= 1 ? '#444' : '#6366f1', color: 'white', border: 'none', borderRadius: '6px', cursor: currentPage <= 1 ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center' }}>
            <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} />
          </button>
          <span style={{ color: 'white', fontSize: '13px', fontWeight: '500', minWidth: '80px', textAlign: 'center' }}>
            Page {currentPage} / {totalPages}
          </span>
          <button onClick={nextPage} disabled={currentPage >= totalPages}
            style={{ padding: '6px 10px', background: currentPage >= totalPages ? '#444' : '#6366f1', color: 'white', border: 'none', borderRadius: '6px', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center' }}>
            <ChevronRight size={16} />
          </button>
          <div style={{ width: '1px', height: '24px', background: '#555', margin: '0 4px' }} />
        </>)}

        {/* Zoom controls */}
        <button onClick={zoomOut} style={{ padding: '6px', background: '#333', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <ZoomOut size={18} />
        </button>
        <button onClick={resetZoom}
          style={{ padding: '4px 10px', background: '#333', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', minWidth: '50px', textAlign: 'center' }}>
          {zoom}%
        </button>
        <button onClick={zoomIn} style={{ padding: '6px', background: '#333', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <ZoomIn size={18} />
        </button>

        <div style={{ width: '1px', height: '24px', background: '#555', margin: '0 4px' }} />

        {/* Download */}
        <button onClick={downloadFile}
          style={{ padding: '6px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '600' }}>
          <Download size={16} /> Save
        </button>

        {/* Close */}
        <button onClick={onClose}
          style={{ padding: '6px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '600' }}>
          <X size={16} /> Close
        </button>
      </div>

      {/* Content area */}
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: 'white', borderRadius: '12px', overflow: 'auto', maxWidth: '95vw', maxHeight: 'calc(100vh - 100px)', position: 'relative' }}>
        {isPdf ? (
          <iframe
            ref={iframeRef}
            src={`${dataUrl}#page=${currentPage}`}
            style={{ width: `${Math.max(800, 800 * zoom / 100)}px`, height: `${Math.max(600, 900 * zoom / 100)}px`, border: 'none', display: 'block' }}
            title="Invoice PDF"
          />
        ) : (
          <img src={dataUrl} alt="Invoice"
            style={{ display: 'block', maxWidth: 'none', width: `${zoom}%`, minWidth: '300px', transition: 'width 0.2s ease' }} />
        )}
      </div>

      {/* Page indicator for images (single page) */}
      {!isPdf && (
        <div style={{ marginTop: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>
          1 / 1
        </div>
      )}
    </div>
  );
}

export default function SupplierList() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', contact: { email: '', phone: '', alternatePhone: '' }, address: { street: '', city: '', state: '', zipCode: '' }, notes: '', rating: 5 });
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [activeTab, setActiveTab] = useState('invoices');
  const [supplierInvoices, setSupplierInvoices] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [viewingImage, setViewingImage] = useState(null);
  const [expandedInvoice, setExpandedInvoice] = useState(null);

  useEffect(() => { fetchSuppliers(); }, [search]);

  const fetchSuppliers = async () => {
    try { const res = await api.get(`/suppliers?search=${search}`); setSuppliers(res.data.data || []); }
    catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const openSupplier = async (supplier) => {
    setSelectedSupplier(supplier); setActiveTab('invoices'); setExpandedInvoice(null); fetchInvoicesFor(supplier._id);
  };

  const fetchInvoicesFor = async (sid) => {
    setLoadingDetail(true);
    try { const res = await api.get(`/invoices?supplierId=${sid}&limit=100`); setSupplierInvoices(res.data.data || []); }
    catch (err) { console.error(err); } finally { setLoadingDetail(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) await api.put(`/suppliers/${editingId}`, formData);
      else await api.post('/suppliers', formData);
      setShowModal(false); setEditingId(null); resetForm(); fetchSuppliers();
    } catch (err) { alert('Failed: ' + (err.response?.data?.message || err.message)); }
  };

  const handleEdit = (supplier, e) => {
    if (e) e.stopPropagation(); setEditingId(supplier._id);
    setFormData({ name: supplier.name || '', contact: supplier.contact || { email: '', phone: '', alternatePhone: '' }, address: supplier.address || { street: '', city: '', state: '', zipCode: '' }, notes: supplier.notes || '', rating: supplier.rating || 5 });
    setShowModal(true);
  };

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Delete this supplier?')) return;
    try { await api.delete(`/suppliers/${id}`); if (selectedSupplier?._id === id) setSelectedSupplier(null); fetchSuppliers(); }
    catch (err) { alert('Failed to delete'); }
  };

  const resetForm = () => { setFormData({ name: '', contact: { email: '', phone: '', alternatePhone: '' }, address: { street: '', city: '', state: '', zipCode: '' }, notes: '', rating: 5 }); };

  const handleScanComplete = () => {
    setActiveTab('invoices');
    fetchInvoicesFor(selectedSupplier._id); fetchSuppliers();
    api.get(`/suppliers/${selectedSupplier._id}`).then(res => { if (res.data.success) setSelectedSupplier(res.data.data); });
  };

  const downloadImage = (dataUrl, fileName) => {
    try {
      const parts = dataUrl.split(',');
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      const b64 = parts[1];
      const byteChars = atob(b64);
      const byteArrays = [];
      for (let offset = 0; offset < byteChars.length; offset += 512) {
        const slice = byteChars.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) byteNumbers[i] = slice.charCodeAt(i);
        byteArrays.push(new Uint8Array(byteNumbers));
      }
      const blob = new Blob(byteArrays, { type: mime });
      const url = URL.createObjectURL(blob);
      const ext = mime.includes('pdf') ? 'pdf' : mime.includes('png') ? 'png' : 'jpg';
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || `invoice.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) { console.error('Download error:', err); }
  };

  // === MODAL ===
  const renderModal = () => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
      <div style={{ background: 'white', borderRadius: '12px', padding: '28px', maxWidth: '550px', width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>{editingId ? 'Edit' : 'Add'} Supplier</h2>
          <button onClick={() => { setShowModal(false); setEditingId(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={22} color="#64748b" /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Company Name *</label>
              <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={inp} /></div>
            <div><label style={lbl}>Phone *</label>
              <input type="tel" required value={formData.contact.phone} onChange={(e) => setFormData({ ...formData, contact: { ...formData.contact, phone: e.target.value } })} style={inp} /></div>
            <div><label style={lbl}>Email</label>
              <input type="email" value={formData.contact.email} onChange={(e) => setFormData({ ...formData, contact: { ...formData.contact, email: e.target.value } })} style={inp} /></div>
            <div><label style={lbl}>City</label>
              <input type="text" value={formData.address.city} onChange={(e) => setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })} style={inp} /></div>
            <div><label style={lbl}>State</label>
              <input type="text" value={formData.address.state} onChange={(e) => setFormData({ ...formData, address: { ...formData.address, state: e.target.value } })} style={inp} /></div>
            <div><label style={lbl}>Rating</label>
              <select value={formData.rating} onChange={(e) => setFormData({ ...formData, rating: parseInt(e.target.value) })} style={{...inp, background: 'white'}}>
                {[5,4,3,2,1].map(r => <option key={r} value={r}>{r} Star{r > 1 ? 's' : ''}</option>)}
              </select></div>
            <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Notes</label>
              <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows="2" style={{...inp, resize: 'vertical'}} /></div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="button" onClick={() => { setShowModal(false); setEditingId(null); }} style={{ flex: 1, padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', cursor: 'pointer', fontWeight: '500' }}>Cancel</button>
            <button type="submit" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', background: 'linear-gradient(135deg, #4338ca, #6366f1)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}><Save size={16} /> {editingId ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );

  // === SUPPLIER DETAIL ===
  if (selectedSupplier) {
    const s = selectedSupplier;
    return (<div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <button onClick={() => setSelectedSupplier(null)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: '1px solid #e2e8f0', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', color: '#64748b', fontSize: '13px' }}><ArrowLeft size={16} /> Back</button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', margin: '0 0 2px' }}>{s.name}</h1>
          <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#64748b', flexWrap: 'wrap' }}>
            {s.contact?.phone && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={13} /> {s.contact.phone}</span>}
            {s.contact?.email && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Mail size={13} /> {s.contact.email}</span>}
            {s.address?.city && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={13} /> {s.address.city}{s.address.state ? `, ${s.address.state}` : ''}</span>}
          </div>
        </div>
        <button onClick={(e) => handleEdit(s, e)} style={{ padding: '8px 16px', background: '#eef2ff', border: '1px solid #c7d2fe', color: '#4338ca', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}><Edit size={14} style={{ marginRight: '6px', verticalAlign: '-2px' }} /> Edit</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Invoices', value: s.totalInvoices || s.invoices?.length || 0, icon: FileText, color: '#6366f1', bg: '#eef2ff' },
          { label: 'Total Spent', value: `$${(s.totalSpent || 0).toLocaleString()}`, icon: DollarSign, color: '#10b981', bg: '#ecfdf5' },
          { label: 'Rating', value: `${s.rating || 5}/5`, icon: Star, color: '#f59e0b', bg: '#fffbeb' },
        ].map((c, i) => (
          <div key={i} style={{ background: 'white', borderRadius: '10px', padding: '14px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><c.icon size={18} color={c.color} /></div>
            <div><div style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>{c.value}</div><div style={{ fontSize: '11px', color: '#94a3b8' }}>{c.label}</div></div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0', marginBottom: '16px', borderBottom: '2px solid #e2e8f0' }}>
        {[{ id: 'invoices', label: 'Invoices', icon: FileText }, { id: 'scan', label: 'Scan Invoice', icon: Camera }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', background: 'none', border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #6366f1' : '2px solid transparent',
              color: activeTab === tab.id ? '#6366f1' : '#64748b', fontWeight: activeTab === tab.id ? '600' : '400',
              cursor: 'pointer', fontSize: '13px', marginBottom: '-2px' }}>
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'scan' && <InvoiceScanner supplierId={selectedSupplier._id} supplierName={selectedSupplier.name} onScanComplete={handleScanComplete} />}

      {activeTab === 'invoices' && (<div>
        {loadingDetail ? (
          <div style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>Loading invoices...</div>
        ) : supplierInvoices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <FileText size={40} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: '#64748b', marginBottom: '16px' }}>No invoices for this supplier yet</p>
            <button onClick={() => setActiveTab('scan')} style={{ background: '#6366f1', color: 'white', padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '500' }}>Scan First Invoice</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {supplierInvoices.map((inv) => {
              const isExpanded = expandedInvoice === inv._id;
              const isPdf = inv.imageUrl && inv.imageUrl.includes('application/pdf');
              return (
                <div key={inv._id} style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }}
                    onClick={() => setExpandedInvoice(isExpanded ? null : inv._id)}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '8px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', border: '1px solid #e2e8f0', position: 'relative' }}>
                      {inv.imageUrl && !isPdf ? (
                        <img src={inv.imageUrl} alt="Invoice" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : isPdf ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <FileText size={20} color="#dc2626" />
                          <span style={{ fontSize: '8px', fontWeight: '700', color: '#dc2626', marginTop: '1px' }}>PDF</span>
                        </div>
                      ) : (
                        <FileText size={22} color="#94a3b8" />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>#{inv.invoiceNumber || 'N/A'}</span>
                        <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '500', background: '#ecfdf5', color: '#059669' }}>{inv.status}</span>
                        {isPdf && <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '600', background: '#fef2f2', color: '#dc2626' }}>PDF</span>}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{inv.products?.length || 0} products · {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString() : 'N/A'}</div>
                    </div>
                    <div style={{ textAlign: 'right', marginRight: '8px' }}>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>${inv.totalAmount?.toFixed(2) || '0.00'}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>{inv.currency || 'USD'}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                      {inv.imageUrl && <button onClick={() => setViewingImage(inv.imageUrl)} style={{ padding: '6px', background: '#f5f3ff', border: 'none', borderRadius: '6px', cursor: 'pointer' }} title="View"><Eye size={16} color="#8b5cf6" /></button>}
                      {inv.imageUrl && <button onClick={() => downloadImage(inv.imageUrl, `invoice-${inv.invoiceNumber || inv._id}.${isPdf ? 'pdf' : 'jpg'}`)} style={{ padding: '6px', background: '#ecfdf5', border: 'none', borderRadius: '6px', cursor: 'pointer' }} title="Download"><Download size={16} color="#10b981" /></button>}
                    </div>
                    {isExpanded ? <ChevronUp size={18} color="#94a3b8" /> : <ChevronDown size={18} color="#94a3b8" />}
                  </div>

                  {isExpanded && (
                    <div style={{ borderTop: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '0', background: '#f8fafc', padding: '8px 16px', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <span>Product</span><span style={{ textAlign: 'center' }}>Qty</span><span style={{ textAlign: 'right' }}>Unit Price</span><span style={{ textAlign: 'right' }}>Total</span>
                      </div>
                      {(inv.products || []).map((p, idx) => (
                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '0', padding: '10px 16px', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                          <div>
                            <div style={{ fontWeight: '500', color: '#0f172a' }}>{p.brand} {p.model}</div>
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>{[p.storage, p.color, p.grade, p.lockStatus].filter(Boolean).join(' · ')}</div>
                          </div>
                          <div style={{ textAlign: 'center', color: '#334155' }}>{p.quantity}</div>
                          <div style={{ textAlign: 'right', color: '#64748b' }}>${(p.unitPrice || 0).toFixed(2)}</div>
                          <div style={{ textAlign: 'right', fontWeight: '600', color: '#059669' }}>${(p.lineTotal || (p.quantity * p.unitPrice) || 0).toFixed(2)}</div>
                        </div>
                      ))}
                      <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'flex-end', gap: '24px', background: '#f8fafc', fontSize: '13px' }}>
                        {inv.subtotal > 0 && <span style={{ color: '#64748b' }}>Subtotal: <strong>${inv.subtotal?.toFixed(2)}</strong></span>}
                        {inv.tax > 0 && <span style={{ color: '#64748b' }}>Tax: <strong>${inv.tax?.toFixed(2)}</strong></span>}
                        <span style={{ color: '#0f172a', fontWeight: '700' }}>Total: ${inv.totalAmount?.toFixed(2)}</span>
                      </div>
                      {inv.imageUrl && (
                        <div style={{ padding: '12px 16px', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '60px', height: '60px', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}
                            onClick={() => setViewingImage(inv.imageUrl)}>
                            {isPdf ? <div style={{ textAlign: 'center' }}><FileText size={20} color="#dc2626" /><div style={{ fontSize: '8px', fontWeight: '700', color: '#dc2626' }}>PDF</div></div>
                              : <img src={inv.imageUrl} alt="scan" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ margin: '0 0 4px', fontSize: '12px', fontWeight: '500', color: '#334155' }}>Original Scanned Document</p>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button onClick={() => setViewingImage(inv.imageUrl)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '5px', cursor: 'pointer', fontSize: '11px', color: '#7c3aed' }}><Eye size={12} /> View</button>
                              <button onClick={() => downloadImage(inv.imageUrl, `invoice-${inv.invoiceNumber || inv._id}.${isPdf ? 'pdf' : 'jpg'}`)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '5px', cursor: 'pointer', fontSize: '11px', color: '#059669' }}><Download size={12} /> Download</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>)}

      {/* Document Viewer */}
      {viewingImage && <DocViewer dataUrl={viewingImage} onClose={() => setViewingImage(null)} />}

      {showModal && renderModal()}
    </div>);
  }

  // === SUPPLIER LIST ===
  return (<div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px' }}>Suppliers</h1>
        <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Manage suppliers, invoices, and purchase history</p>
      </div>
      <button onClick={() => { resetForm(); setEditingId(null); setShowModal(true); }}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #4338ca, #6366f1)', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '500', fontSize: '14px' }}>
        <Plus size={18} /> Add Supplier
      </button>
    </div>
    <div style={{ marginBottom: '20px', position: 'relative' }}>
      <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={18} />
      <input type="text" placeholder="Search suppliers..." value={search} onChange={(e) => setSearch(e.target.value)}
        style={{ width: '100%', padding: '10px 10px 10px 40px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }} />
    </div>
    {loading ? (
      <div style={{ textAlign: 'center', padding: '48px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>Loading...</div>
    ) : suppliers.length === 0 ? (
      <div style={{ textAlign: 'center', padding: '48px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <Building size={48} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
        <p style={{ color: '#64748b', marginBottom: '16px' }}>No suppliers found</p>
        <button onClick={() => { resetForm(); setEditingId(null); setShowModal(true); }} style={{ background: '#6366f1', color: 'white', padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>Add First Supplier</button>
      </div>
    ) : (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {suppliers.map((supplier) => (
          <div key={supplier._id} onClick={() => openSupplier(supplier)}
            style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.15s ease' }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = '#c7d2fe'; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#e2e8f0'; }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Building size={20} color="#4338ca" /></div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a' }}>{supplier.name}</div>
                  <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                    {Array.from({ length: 5 }).map((_, i) => (<Star key={i} size={12} fill={i < (supplier.rating || 5) ? '#f59e0b' : 'none'} color={i < (supplier.rating || 5) ? '#f59e0b' : '#e2e8f0'} />))}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                <button onClick={(e) => handleEdit(supplier, e)} style={{ padding: '6px', background: '#eef2ff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><Edit size={14} color="#4338ca" /></button>
                <button onClick={(e) => handleDelete(supplier._id, e)} style={{ padding: '6px', background: '#fef2f2', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><Trash2 size={14} color="#dc2626" /></button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px', fontSize: '12px', color: '#64748b' }}>
              {supplier.contact?.phone && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={12} /> {supplier.contact.phone}</div>}
              {supplier.contact?.email && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={12} /> {supplier.contact.email}</div>}
              {supplier.address?.city && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={12} /> {supplier.address.city}{supplier.address.state ? `, ${supplier.address.state}` : ''}</div>}
            </div>
            <div style={{ display: 'flex', gap: '12px', padding: '10px 0', borderTop: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                <FileText size={13} color="#6366f1" />
                <span style={{ fontWeight: '600', color: '#334155' }}>{supplier.totalInvoices || supplier.invoices?.length || 0}</span>
                <span style={{ color: '#94a3b8' }}>invoices</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                <DollarSign size={13} color="#10b981" />
                <span style={{ fontWeight: '600', color: '#334155' }}>${(supplier.totalSpent || 0).toLocaleString()}</span>
                <span style={{ color: '#94a3b8' }}>total</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
    {showModal && renderModal()}
  </div>);
}
SUPPLIEREOF

echo "✅ SupplierList updated with DocViewer (zoom, page nav, download)"
