import { useState, useCallback } from 'react';
import { Upload, FileText, Camera, Loader2, Check, Save, Plus, Trash2, AlertCircle, X, Calendar, DollarSign, Hash, Building, Smartphone, Palette, HardDrive, Shield } from 'lucide-react';
import api from '../utils/api';

const InvoiceScanner = ({ onScanComplete, supplierId = null }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [addToInventory, setAddToInventory] = useState(true);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (selectedFile.type.startsWith('image/')) {
        setPreview(URL.createObjectURL(selectedFile));
      } else {
        setPreview(null);
      }
      setExtractedData(null);
      setError(null);
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      if (droppedFile.type.startsWith('image/')) {
        setPreview(URL.createObjectURL(droppedFile));
      } else {
        setPreview(null);
      }
      setExtractedData(null);
      setError(null);
    }
  }, []);

  const handleDragOver = (e) => e.preventDefault();

  const handleScan = async () => {
    if (!file) return;
    setScanning(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('invoice', file);
      const response = await api.post('/invoices/scan', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (response.data.success) {
        setExtractedData(response.data.data);
      } else {
        setError(response.data.message || 'Scan failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to scan invoice');
    } finally {
      setScanning(false);
    }
  };

  const handleSave = async () => {
    if (!extractedData) return;
    setSaving(true);
    setError(null);
    try {
      const response = await api.post('/invoices/save', { ...extractedData, supplierId, addToInventory });
      if (response.data.success) {
        if (onScanComplete) onScanComplete(response.data.data);
        handleReset();
      } else {
        setError(response.data.message || 'Save failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save invoice');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field, value) => setExtractedData(prev => ({ ...prev, [field]: value }));
  
  const updateProduct = (index, field, value) => {
    setExtractedData(prev => {
      const newProducts = [...prev.products];
      newProducts[index] = { ...newProducts[index], [field]: value };
      if (field === 'quantity' || field === 'unitPrice') {
        newProducts[index].lineTotal = (newProducts[index].quantity || 0) * (newProducts[index].unitPrice || 0);
      }
      return { ...prev, products: newProducts };
    });
  };
  
  const addProduct = () => {
    setExtractedData(prev => ({
      ...prev,
      products: [...(prev.products || []), { 
        name: '', brand: '', model: '', modelNumber: '', color: '', 
        lockStatus: '', storage: '', grade: '', quantity: 1, unitPrice: 0, lineTotal: 0 
      }]
    }));
  };
  
  const removeProduct = (index) => {
    setExtractedData(prev => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index)
    }));
  };
  
  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setExtractedData(null);
    setError(null);
  };

  const getConfidenceColor = (confidence) => {
    switch (confidence) {
      case 'high': return { bg: '#dcfce7', text: '#166534', border: '#86efac' };
      case 'medium': return { bg: '#fef9c3', text: '#854d0e', border: '#fde047' };
      default: return { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' };
    }
  };

  return (
    <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '16px', padding: '2px' }}>
      <div style={{ background: '#ffffff', borderRadius: '14px', padding: '24px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '12px', borderRadius: '12px' }}>
              <FileText size={24} color="white" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: '#1f2937' }}>Invoice Scanner</h2>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>AI-powered invoice data extraction</p>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', marginBottom: '20px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px' }}>
            <AlertCircle size={20} color="#dc2626" />
            <span style={{ color: '#dc2626', fontSize: '0.875rem', flex: 1 }}>{error}</span>
            <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
              <X size={18} color="#dc2626" />
            </button>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: extractedData ? '350px 1fr' : '1fr', gap: '24px' }}>
          
          {/* Upload Section */}
          <div>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              style={{
                border: `2px dashed ${file ? '#22c55e' : '#d1d5db'}`,
                borderRadius: '12px',
                padding: '32px 20px',
                textAlign: 'center',
                background: file ? '#f0fdf4' : '#fafafa',
                cursor: 'pointer'
              }}
              onClick={() => !file && document.getElementById('file-input').click()}
            >
              {file ? (
                <div>
                  {preview ? (
                    <img src={preview} alt="Invoice preview" style={{ maxHeight: '150px', maxWidth: '100%', borderRadius: '8px', marginBottom: '12px' }} />
                  ) : (
                    <div style={{ background: '#e0e7ff', padding: '16px', borderRadius: '12px', display: 'inline-block', marginBottom: '12px' }}>
                      <FileText size={40} color="#6366f1" />
                    </div>
                  )}
                  <p style={{ fontWeight: '600', color: '#166534', marginBottom: '4px', fontSize: '0.9rem' }}>{file.name}</p>
                  <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>{(file.size / 1024).toFixed(1)} KB</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleReset(); }}
                    style={{ marginTop: '10px', padding: '6px 14px', background: 'white', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
                  >
                    Change File
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '14px', borderRadius: '50%', display: 'inline-block', marginBottom: '12px' }}>
                    <Upload size={28} color="white" />
                  </div>
                  <p style={{ fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Drop your invoice here</p>
                  <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '12px' }}>or click to browse</p>
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                    {['PDF', 'JPG', 'PNG'].map(type => (
                      <span key={type} style={{ padding: '3px 10px', background: '#f3f4f6', borderRadius: '12px', fontSize: '0.7rem', color: '#6b7280' }}>{type}</span>
                    ))}
                  </div>
                </div>
              )}
              <input id="file-input" type="file" accept=".pdf,image/*" onChange={handleFileChange} style={{ display: 'none' }} />
            </div>

            <button
              onClick={handleScan}
              disabled={!file || scanning}
              style={{
                width: '100%', marginTop: '14px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '12px', borderRadius: '10px', border: 'none',
                background: !file || scanning ? '#e5e7eb' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: !file || scanning ? '#9ca3af' : 'white',
                fontSize: '0.95rem', fontWeight: '600', cursor: !file || scanning ? 'not-allowed' : 'pointer'
              }}
            >
              {scanning ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Scanning...</> : <><Camera size={18} /> Scan Invoice</>}
            </button>
          </div>

          {/* Results Section */}
          {extractedData && (
            <div style={{ background: '#f9fafb', borderRadius: '12px', padding: '20px' }}>
              
              {/* Confidence + Invoice Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '6px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '500',
                  background: getConfidenceColor(extractedData.confidence).bg,
                  color: getConfidenceColor(extractedData.confidence).text,
                }}>
                  {extractedData.confidence === 'high' && <Check size={14} />}
                  {extractedData.confidence} confidence
                </span>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                  <Building size={14} color="#6b7280" />
                  <input type="text" value={extractedData.supplierName || ''} onChange={(e) => updateField('supplierName', e.target.value)} style={{ border: 'none', outline: 'none', fontSize: '0.85rem', fontWeight: '500', width: '120px' }} />
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                  <Hash size={14} color="#6b7280" />
                  <input type="text" value={extractedData.invoiceNumber || ''} onChange={(e) => updateField('invoiceNumber', e.target.value)} style={{ border: 'none', outline: 'none', fontSize: '0.85rem', fontWeight: '500', width: '80px' }} placeholder="Invoice #" />
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                  <Calendar size={14} color="#6b7280" />
                  <input type="date" value={extractedData.invoiceDate ? new Date(extractedData.invoiceDate).toISOString().split('T')[0] : ''} onChange={(e) => updateField('invoiceDate', e.target.value)} style={{ border: 'none', outline: 'none', fontSize: '0.85rem' }} />
                </div>
              </div>

              {/* Products Table */}
              <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #e5e7eb', overflow: 'hidden', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <span style={{ fontWeight: '600', color: '#374151', fontSize: '0.95rem' }}>Products ({extractedData.products?.length || 0})</span>
                  <button onClick={addProduct} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>
                    <Plus size={14} /> Add
                  </button>
                </div>
                
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {extractedData.products?.length > 0 ? extractedData.products.map((product, index) => (
                    <div key={index} style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', background: index % 2 === 0 ? 'white' : '#fafafa' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '10px' }}>
                        <div>
                          <label style={{ fontSize: '0.7rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                            <Smartphone size={12} /> Brand
                          </label>
                          <input type="text" value={product.brand || ''} onChange={(e) => updateProduct(index, 'brand', e.target.value)} style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.85rem' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.7rem', color: '#6b7280', marginBottom: '4px', display: 'block' }}>Model</label>
                          <input type="text" value={product.model || ''} onChange={(e) => updateProduct(index, 'model', e.target.value)} style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.85rem' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.7rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                            <Palette size={12} /> Color
                          </label>
                          <input type="text" value={product.color || ''} onChange={(e) => updateProduct(index, 'color', e.target.value)} style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.85rem' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.7rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                            <HardDrive size={12} /> Storage
                          </label>
                          <input type="text" value={product.storage || ''} onChange={(e) => updateProduct(index, 'storage', e.target.value)} style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.85rem' }} />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr) auto', gap: '10px', alignItems: 'end' }}>
                        <div>
                          <label style={{ fontSize: '0.7rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                            <Shield size={12} /> Lock Status
                          </label>
                          <input type="text" value={product.lockStatus || ''} onChange={(e) => updateProduct(index, 'lockStatus', e.target.value)} style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.85rem' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.7rem', color: '#6b7280', marginBottom: '4px', display: 'block' }}>Grade</label>
                          <input type="text" value={product.grade || ''} onChange={(e) => updateProduct(index, 'grade', e.target.value)} style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.85rem' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.7rem', color: '#6b7280', marginBottom: '4px', display: 'block' }}>Qty</label>
                          <input type="number" value={product.quantity || 1} onChange={(e) => updateProduct(index, 'quantity', parseInt(e.target.value) || 1)} style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.85rem', textAlign: 'center' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.7rem', color: '#6b7280', marginBottom: '4px', display: 'block' }}>Unit Price</label>
                          <input type="number" step="0.01" value={product.unitPrice || 0} onChange={(e) => updateProduct(index, 'unitPrice', parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.85rem', textAlign: 'right' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.7rem', color: '#6b7280', marginBottom: '4px', display: 'block' }}>Total</label>
                          <div style={{ padding: '6px 8px', background: '#f0fdf4', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600', color: '#166534', textAlign: 'right' }}>
                            ${(product.lineTotal || 0).toFixed(2)}
                          </div>
                        </div>
                        <button onClick={() => removeProduct(index)} style={{ background: '#fee2e2', border: 'none', borderRadius: '6px', padding: '8px', cursor: 'pointer' }}>
                          <Trash2 size={16} color="#dc2626" />
                        </button>
                      </div>
                    </div>
                  )) : (
                    <div style={{ padding: '30px', textAlign: 'center', color: '#9ca3af' }}>
                      No items detected. Click "Add" to add manually.
                    </div>
                  )}
                </div>
              </div>

              {/* Totals */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div style={{ background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                  <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Subtotal</label>
                  <input type="number" step="0.01" value={extractedData.subtotal || ''} onChange={(e) => updateField('subtotal', parseFloat(e.target.value))} style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '1rem', fontWeight: '600' }} />
                </div>
                <div style={{ background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                  <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Tax</label>
                  <input type="number" step="0.01" value={extractedData.tax || ''} onChange={(e) => updateField('tax', parseFloat(e.target.value))} style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '1rem', fontWeight: '600' }} />
                </div>
                <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '12px', borderRadius: '8px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', display: 'block', marginBottom: '4px' }}>Total</label>
                  <input type="number" step="0.01" value={extractedData.totalAmount || ''} onChange={(e) => updateField('totalAmount', parseFloat(e.target.value))} style={{ width: '100%', padding: '8px', border: 'none', borderRadius: '6px', fontSize: '1.25rem', fontWeight: '700', background: 'rgba(255,255,255,0.9)' }} />
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={addToInventory} onChange={(e) => setAddToInventory(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#6366f1' }} />
                  <span style={{ fontSize: '0.85rem', color: '#374151' }}>Add to inventory</span>
                </label>
                <div style={{ flex: 1 }}></div>
                <button onClick={handleReset} style={{ padding: '10px 20px', background: 'white', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500' }}>
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '10px 24px', border: 'none', borderRadius: '8px',
                    background: saving ? '#d1d5db' : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                    color: 'white', cursor: saving ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem', fontWeight: '600'
                  }}
                >
                  {saving ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : <><Save size={16} /> Save Invoice</>}
                </button>
              </div>
            </div>
          )}
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
};

export default InvoiceScanner;
