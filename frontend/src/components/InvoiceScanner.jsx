import { useState, useCallback } from 'react';
import { Upload, FileText, Camera, Loader2, Check, Save, Plus, Trash2, AlertCircle, X, Calendar, Hash, Building, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../utils/api';

const InvoiceScanner = ({ onScanComplete, supplierId = null, supplierName = null }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [addToInventory, setAddToInventory] = useState(true);
  const [expandedProducts, setExpandedProducts] = useState({});

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) { setFile(f); setPreview(f.type.startsWith('image/') ? URL.createObjectURL(f) : null); setExtractedData(null); setError(null); }
  };
  const handleDrop = useCallback((e) => {
    e.preventDefault(); const f = e.dataTransfer.files[0];
    if (f) { setFile(f); setPreview(f.type.startsWith('image/') ? URL.createObjectURL(f) : null); setExtractedData(null); setError(null); }
  }, []);
  const handleDragOver = (e) => e.preventDefault();

  const handleScan = async () => {
    if (!file) return; setScanning(true); setError(null);
    try {
      const formData = new FormData(); formData.append('invoice', file);
      const response = await api.post('/invoices/scan', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (response.data.success) {
        const data = response.data.data;
        if (supplierName) data.supplierName = supplierName;
        console.log('Scan result - imageUrl present:', !!data.imageUrl);
        setExtractedData(data);
      } else setError(response.data.message || 'Scan failed');
    } catch (err) { setError(err.response?.data?.message || 'Failed to scan invoice'); }
    finally { setScanning(false); }
  };

  const handleSave = async () => {
    if (!extractedData) return; setSaving(true); setError(null);
    try {
      // IMPORTANT: Include imageUrl in save payload
      const payload = {
        invoiceNumber: extractedData.invoiceNumber,
        invoiceDate: extractedData.invoiceDate,
        supplierName: extractedData.supplierName,
        supplierPhone: extractedData.supplierPhone,
        supplierId: supplierId || extractedData.existingSupplier?._id || null,
        products: extractedData.products,
        subtotal: extractedData.subtotal,
        tax: extractedData.tax,
        totalAmount: extractedData.totalAmount,
        currency: extractedData.currency,
        imageUrl: extractedData.imageUrl || null,
        addToInventory
      };
      console.log('Saving invoice with imageUrl:', !!payload.imageUrl);
      const response = await api.post('/invoices/save', payload);
      if (response.data.success) { if (onScanComplete) onScanComplete(response.data.data); handleReset(); }
      else setError(response.data.message || 'Save failed');
    } catch (err) { setError(err.response?.data?.message || 'Failed to save invoice'); }
    finally { setSaving(false); }
  };

  const updateField = (field, value) => setExtractedData(prev => ({ ...prev, [field]: value }));
  const updateProduct = (index, field, value) => {
    setExtractedData(prev => {
      const np = [...prev.products]; np[index] = { ...np[index], [field]: value };
      if (field === 'quantity' || field === 'unitPrice') {
        np[index].lineTotal = (np[index].quantity || 0) * (np[index].unitPrice || 0);
        if (field === 'quantity') { const q = parseInt(value) || 1; const ci = np[index].imeis || []; const ni = []; for (let i = 0; i < q; i++) ni.push(ci[i] || '555500000000000'); np[index].imeis = ni; }
      }
      return { ...prev, products: np };
    });
  };
  const updateImei = (pi, ii, v) => {
    setExtractedData(prev => { const np = [...prev.products]; const ni = [...(np[pi].imeis || [])]; ni[ii] = v; np[pi].imeis = ni; return { ...prev, products: np }; });
  };
  const addProduct = () => {
    setExtractedData(prev => ({ ...prev, products: [...(prev.products || []), { name: '', brand: '', model: '', modelNumber: '', color: '', lockStatus: 'Unlocked', storage: '', grade: '', quantity: 1, unitPrice: 0, lineTotal: 0, imeis: ['555500000000000'] }] }));
  };
  const removeProduct = (i) => { setExtractedData(prev => ({ ...prev, products: prev.products.filter((_, idx) => idx !== i) })); };
  const toggleProductExpand = (i) => { setExpandedProducts(prev => ({ ...prev, [i]: !prev[i] })); };
  const handleReset = () => { setFile(null); setPreview(null); setExtractedData(null); setError(null); setExpandedProducts({}); };
  const getCC = (c) => { switch (c) { case 'high': return { bg: '#dcfce7', text: '#166534' }; case 'medium': return { bg: '#fef9c3', text: '#854d0e' }; default: return { bg: '#fee2e2', text: '#991b1b' }; } };
  const fid = `file-input-${supplierId || 'global'}`;

  return (
    <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '16px', padding: '2px' }}>
      <div style={{ background: '#ffffff', borderRadius: '14px', padding: '24px', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '10px', borderRadius: '10px' }}><FileText size={22} color="white" /></div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700', color: '#1f2937' }}>Invoice Scanner</h2>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>{supplierName ? `Scanning for ${supplierName}` : 'AI-powered data extraction'}</p>
          </div>
        </div>
        {error && (<div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', marginBottom: '16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px' }}>
          <AlertCircle size={18} color="#dc2626" /><span style={{ color: '#dc2626', fontSize: '0.85rem', flex: 1 }}>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} color="#dc2626" /></button>
        </div>)}
        <div style={{ display: 'grid', gridTemplateColumns: extractedData ? '280px 1fr' : '1fr', gap: '20px' }}>
          <div>
            <div onDrop={handleDrop} onDragOver={handleDragOver}
              style={{ border: `2px dashed ${file ? '#22c55e' : '#d1d5db'}`, borderRadius: '10px', padding: '24px 16px', textAlign: 'center', background: file ? '#f0fdf4' : '#fafafa', cursor: 'pointer' }}
              onClick={() => !file && document.getElementById(fid).click()}>
              {file ? (<div>
                {preview ? <img src={preview} alt="Preview" style={{ maxHeight: '120px', maxWidth: '100%', borderRadius: '6px', marginBottom: '10px' }} /> :
                  <div style={{ background: '#e0e7ff', padding: '14px', borderRadius: '10px', display: 'inline-block', marginBottom: '10px' }}><FileText size={36} color="#6366f1" /></div>}
                <p style={{ fontWeight: '600', color: '#166534', marginBottom: '2px', fontSize: '0.85rem' }}>{file.name}</p>
                <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>{(file.size / 1024).toFixed(1)} KB</p>
                <button onClick={(e) => { e.stopPropagation(); handleReset(); }} style={{ marginTop: '8px', padding: '5px 12px', background: 'white', border: '1px solid #d1d5db', borderRadius: '5px', cursor: 'pointer', fontSize: '0.75rem' }}>Change</button>
              </div>) : (<div>
                <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '12px', borderRadius: '50%', display: 'inline-block', marginBottom: '10px' }}><Upload size={24} color="white" /></div>
                <p style={{ fontWeight: '600', color: '#374151', marginBottom: '4px', fontSize: '0.9rem' }}>Drop invoice here</p>
                <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>PDF, JPG, PNG</p>
              </div>)}
              <input id={fid} type="file" accept=".pdf,image/*" onChange={handleFileChange} style={{ display: 'none' }} />
            </div>
            <button onClick={handleScan} disabled={!file || scanning}
              style={{ width: '100%', marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', borderRadius: '8px', border: 'none', background: !file || scanning ? '#e5e7eb' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: !file || scanning ? '#9ca3af' : 'white', fontSize: '0.9rem', fontWeight: '600', cursor: !file || scanning ? 'not-allowed' : 'pointer' }}>
              {scanning ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Scanning...</> : <><Camera size={16} /> Scan Invoice</>}
            </button>
          </div>
          {extractedData && (<div style={{ background: '#f9fafb', borderRadius: '10px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '500', background: getCC(extractedData.confidence).bg, color: getCC(extractedData.confidence).text }}>
                {extractedData.confidence === 'high' && <Check size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />}{extractedData.confidence}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'white', padding: '4px 10px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                <Building size={12} color="#6b7280" />
                <input type="text" value={extractedData.supplierName || ''} onChange={(e) => updateField('supplierName', e.target.value)} readOnly={!!supplierName}
                  style={{ border: 'none', outline: 'none', fontSize: '0.8rem', fontWeight: '500', width: '120px', background: supplierName ? '#f3f4f6' : 'white' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'white', padding: '4px 10px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                <Hash size={12} color="#6b7280" />
                <input type="text" value={extractedData.invoiceNumber || ''} onChange={(e) => updateField('invoiceNumber', e.target.value)} style={{ border: 'none', outline: 'none', fontSize: '0.8rem', fontWeight: '500', width: '60px' }} placeholder="Inv #" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'white', padding: '4px 10px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                <Calendar size={12} color="#6b7280" />
                <input type="date" value={extractedData.invoiceDate ? new Date(extractedData.invoiceDate).toISOString().split('T')[0] : ''} onChange={(e) => updateField('invoiceDate', e.target.value)} style={{ border: 'none', outline: 'none', fontSize: '0.8rem' }} />
              </div>
            </div>
            <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <span style={{ fontWeight: '600', color: '#374151', fontSize: '0.85rem' }}>Products ({extractedData.products?.length || 0})</span>
                <button onClick={addProduct} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '0.75rem' }}><Plus size={12} /> Add</button>
              </div>
              <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                {extractedData.products?.map((product, index) => (
                  <div key={index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: index % 2 === 0 ? 'white' : '#fafafa' }} onClick={() => toggleProductExpand(index)}>
                      {expandedProducts[index] ? <ChevronUp size={16} color="#6b7280" /> : <ChevronDown size={16} color="#6b7280" />}
                      <span style={{ flex: 1, fontWeight: '500', fontSize: '0.85rem', color: '#1f2937' }}>{product.brand} {product.model} {product.storage} {product.color}</span>
                      <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>x{product.quantity}</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#059669' }}>${(product.lineTotal || 0).toFixed(2)}</span>
                      <button onClick={(e) => { e.stopPropagation(); removeProduct(index); }} style={{ background: '#fee2e2', border: 'none', borderRadius: '4px', padding: '4px', cursor: 'pointer' }}><Trash2 size={14} color="#dc2626" /></button>
                    </div>
                    {expandedProducts[index] && (<div style={{ padding: '12px', background: '#f9fafb', borderTop: '1px solid #e5e7eb' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '10px' }}>
                        {['brand', 'model', 'color', 'storage'].map(f => (<div key={f}><label style={{ fontSize: '0.65rem', color: '#6b7280', display: 'block', marginBottom: '2px', textTransform: 'capitalize' }}>{f}</label><input type="text" value={product[f] || ''} onChange={(e) => updateProduct(index, f, e.target.value)} style={{ width: '100%', padding: '5px 7px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '0.8rem' }} /></div>))}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px' }}>
                        <div><label style={{ fontSize: '0.65rem', color: '#6b7280', display: 'block', marginBottom: '2px' }}>Lock Status</label><input type="text" value={product.lockStatus || ''} onChange={(e) => updateProduct(index, 'lockStatus', e.target.value)} style={{ width: '100%', padding: '5px 7px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '0.8rem' }} /></div>
                        <div><label style={{ fontSize: '0.65rem', color: '#6b7280', display: 'block', marginBottom: '2px' }}>Grade</label><input type="text" value={product.grade || ''} onChange={(e) => updateProduct(index, 'grade', e.target.value)} style={{ width: '100%', padding: '5px 7px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '0.8rem' }} /></div>
                        <div><label style={{ fontSize: '0.65rem', color: '#6b7280', display: 'block', marginBottom: '2px' }}>Qty</label><input type="number" value={product.quantity || 1} onChange={(e) => updateProduct(index, 'quantity', parseInt(e.target.value) || 1)} style={{ width: '100%', padding: '5px 7px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '0.8rem' }} /></div>
                        <div><label style={{ fontSize: '0.65rem', color: '#6b7280', display: 'block', marginBottom: '2px' }}>Unit Price</label><input type="number" step="0.01" value={product.unitPrice || 0} onChange={(e) => updateProduct(index, 'unitPrice', parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '5px 7px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '0.8rem' }} /></div>
                      </div>
                      <div style={{ background: 'white', padding: '10px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                        <label style={{ fontSize: '0.7rem', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '8px' }}>IMEIs ({product.quantity} devices)</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                          {(product.imeis || []).map((imei, ii) => (<div key={ii} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ fontSize: '0.7rem', color: '#6b7280', minWidth: '20px' }}>{ii + 1}.</span><input type="text" value={imei} onChange={(e) => updateImei(index, ii, e.target.value)} placeholder="Enter IMEI" style={{ flex: 1, padding: '5px 7px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.75rem', fontFamily: 'monospace' }} /></div>))}
                        </div>
                      </div>
                    </div>)}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              <div style={{ background: 'white', padding: '10px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                <label style={{ fontSize: '0.65rem', color: '#6b7280', display: 'block', marginBottom: '2px' }}>Subtotal</label>
                <input type="number" step="0.01" value={extractedData.subtotal || ''} onChange={(e) => updateField('subtotal', parseFloat(e.target.value))} style={{ width: '100%', padding: '6px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '0.9rem', fontWeight: '600' }} />
              </div>
              <div style={{ background: 'white', padding: '10px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                <label style={{ fontSize: '0.65rem', color: '#6b7280', display: 'block', marginBottom: '2px' }}>Tax</label>
                <input type="number" step="0.01" value={extractedData.tax || ''} onChange={(e) => updateField('tax', parseFloat(e.target.value))} style={{ width: '100%', padding: '6px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '0.9rem', fontWeight: '600' }} />
              </div>
              <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '10px', borderRadius: '6px' }}>
                <label style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.8)', display: 'block', marginBottom: '2px' }}>Total</label>
                <input type="number" step="0.01" value={extractedData.totalAmount || ''} onChange={(e) => updateField('totalAmount', parseFloat(e.target.value))} style={{ width: '100%', padding: '6px', border: 'none', borderRadius: '4px', fontSize: '1rem', fontWeight: '700', background: 'rgba(255,255,255,0.9)' }} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}><input type="checkbox" checked={addToInventory} onChange={(e) => setAddToInventory(e.target.checked)} style={{ width: '14px', height: '14px', accentColor: '#6366f1' }} /><span style={{ fontSize: '0.8rem', color: '#374151' }}>Add to inventory</span></label>
              <div style={{ flex: 1 }} />
              <button onClick={handleReset} style={{ padding: '8px 16px', background: 'white', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 20px', border: 'none', borderRadius: '6px', background: saving ? '#d1d5db' : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', color: 'white', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.85rem', fontWeight: '600' }}>
                {saving ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : <><Save size={14} /> Save Invoice</>}
              </button>
            </div>
          </div>)}
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
};
export default InvoiceScanner;
