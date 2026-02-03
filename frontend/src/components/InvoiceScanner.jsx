import { useState, useCallback } from 'react';
import { Upload, FileText, Camera, Loader2, Check, Edit2, Save, Plus, Trash2, AlertCircle, X, Calendar, DollarSign, Hash, Building } from 'lucide-react';
import api from '../utils/api';

const InvoiceScanner = ({ onScanComplete, supplierId = null }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [editMode, setEditMode] = useState(false);
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
        setEditMode(true);
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
      products: [...(prev.products || []), { name: '', quantity: 1, unitPrice: 0, lineTotal: 0 }]
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
    setEditMode(false);
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
          {extractedData && (
            <button
              onClick={() => setEditMode(!editMode)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: '8px', border: '1px solid #e5e7eb',
                background: editMode ? '#f3f4f6' : 'white', cursor: 'pointer',
                fontSize: '0.875rem', fontWeight: '500', color: '#374151'
              }}
            >
              <Edit2 size={16} />
              {editMode ? 'View Mode' : 'Edit Mode'}
            </button>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '12px 16px', marginBottom: '20px',
            background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px'
          }}>
            <AlertCircle size={20} color="#dc2626" />
            <span style={{ color: '#dc2626', fontSize: '0.875rem' }}>{error}</span>
            <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={18} color="#dc2626" />
            </button>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: extractedData ? '1fr 1.5fr' : '1fr', gap: '24px' }}>
          
          {/* Upload Section */}
          <div>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              style={{
                border: `2px dashed ${file ? '#22c55e' : '#d1d5db'}`,
                borderRadius: '12px',
                padding: '32px',
                textAlign: 'center',
                background: file ? '#f0fdf4' : '#fafafa',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              onClick={() => !file && document.getElementById('file-input').click()}
            >
              {file ? (
                <div>
                  {preview ? (
                    <img src={preview} alt="Invoice preview" style={{ maxHeight: '200px', maxWidth: '100%', borderRadius: '8px', marginBottom: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  ) : (
                    <div style={{ background: '#e0e7ff', padding: '20px', borderRadius: '12px', display: 'inline-block', marginBottom: '16px' }}>
                      <FileText size={48} color="#6366f1" />
                    </div>
                  )}
                  <p style={{ fontWeight: '600', color: '#166534', marginBottom: '4px' }}>{file.name}</p>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>{(file.size / 1024).toFixed(1)} KB</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleReset(); }}
                    style={{
                      marginTop: '12px', padding: '8px 16px',
                      background: 'white', border: '1px solid #d1d5db',
                      borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem'
                    }}
                  >
                    Change File
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '16px', borderRadius: '50%', display: 'inline-block', marginBottom: '16px' }}>
                    <Upload size={32} color="white" />
                  </div>
                  <p style={{ fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Drop your invoice here</p>
                  <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '16px' }}>or click to browse</p>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    {['PDF', 'JPG', 'PNG'].map(type => (
                      <span key={type} style={{ padding: '4px 12px', background: '#f3f4f6', borderRadius: '20px', fontSize: '0.75rem', color: '#6b7280' }}>{type}</span>
                    ))}
                  </div>
                </div>
              )}
              <input id="file-input" type="file" accept=".pdf,image/*" onChange={handleFileChange} style={{ display: 'none' }} />
            </div>

            {/* Scan Button */}
            <button
              onClick={handleScan}
              disabled={!file || scanning}
              style={{
                width: '100%', marginTop: '16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                padding: '14px 24px', borderRadius: '10px', border: 'none',
                background: !file || scanning ? '#e5e7eb' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: !file || scanning ? '#9ca3af' : 'white',
                fontSize: '1rem', fontWeight: '600', cursor: !file || scanning ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: !file || scanning ? 'none' : '0 4px 14px rgba(102, 126, 234, 0.4)'
              }}
            >
              {scanning ? (
                <><Loader2 size={20} className="spin" style={{ animation: 'spin 1s linear infinite' }} /> Scanning...</>
              ) : (
                <><Camera size={20} /> Scan Invoice</>
              )}
            </button>
          </div>

          {/* Results Section */}
          {extractedData && (
            <div style={{ background: '#f9fafb', borderRadius: '12px', padding: '20px' }}>
              
              {/* Confidence Badge */}
              <div style={{ marginBottom: '20px' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '6px 12px', borderRadius: '20px', fontSize: '0.875rem', fontWeight: '500',
                  background: getConfidenceColor(extractedData.confidence).bg,
                  color: getConfidenceColor(extractedData.confidence).text,
                  border: `1px solid ${getConfidenceColor(extractedData.confidence).border}`
                }}>
                  {extractedData.confidence === 'high' && <Check size={16} />}
                  {extractedData.confidence} confidence
                </span>
              </div>

              {/* Invoice Details Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                
                {/* Supplier */}
                <div style={{ background: 'white', padding: '16px', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Building size={16} color="#6b7280" />
                    <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Supplier</label>
                  </div>
                  {editMode ? (
                    <input
                      type="text"
                      value={extractedData.supplierName || ''}
                      onChange={(e) => updateField('supplierName', e.target.value)}
                      style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.95rem' }}
                    />
                  ) : (
                    <p style={{ margin: 0, fontWeight: '600', color: '#111827' }}>{extractedData.supplierName || 'N/A'}</p>
                  )}
                </div>

                {/* Invoice Number */}
                <div style={{ background: 'white', padding: '16px', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Hash size={16} color="#6b7280" />
                    <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Invoice #</label>
                  </div>
                  {editMode ? (
                    <input
                      type="text"
                      value={extractedData.invoiceNumber || ''}
                      onChange={(e) => updateField('invoiceNumber', e.target.value)}
                      style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.95rem' }}
                    />
                  ) : (
                    <p style={{ margin: 0, fontWeight: '600', color: '#111827' }}>{extractedData.invoiceNumber || 'N/A'}</p>
                  )}
                </div>

                {/* Date */}
                <div style={{ background: 'white', padding: '16px', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Calendar size={16} color="#6b7280" />
                    <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Date</label>
                  </div>
                  {editMode ? (
                    <input
                      type="date"
                      value={extractedData.invoiceDate ? new Date(extractedData.invoiceDate).toISOString().split('T')[0] : ''}
                      onChange={(e) => updateField('invoiceDate', e.target.value)}
                      style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.95rem' }}
                    />
                  ) : (
                    <p style={{ margin: 0, fontWeight: '600', color: '#111827' }}>
                      {extractedData.invoiceDate ? new Date(extractedData.invoiceDate).toLocaleDateString() : 'N/A'}
                    </p>
                  )}
                </div>

                {/* Currency */}
                <div style={{ background: 'white', padding: '16px', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <DollarSign size={16} color="#6b7280" />
                    <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Currency</label>
                  </div>
                  {editMode ? (
                    <select
                      value={extractedData.currency || 'USD'}
                      onChange={(e) => updateField('currency', e.target.value)}
                      style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.95rem' }}
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="INR">INR (₹)</option>
                    </select>
                  ) : (
                    <p style={{ margin: 0, fontWeight: '600', color: '#111827' }}>{extractedData.currency || 'USD'}</p>
             )}
                </div>
              </div>

              {/* Line Items */}
              <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #e5e7eb', overflow: 'hidden', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <span style={{ fontWeight: '600', color: '#374151' }}>Line Items</span>
                  {editMode && (
                    <button
                      onClick={addProduct}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem' }}
                    >
                      <Plus size={16} /> Add Item
                    </button>
                  )}
                </div>
                <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb' }}>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Item</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Qty</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Price</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Total</th>
                        {editMode && <th style={{ width: '40px' }}></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {extractedData.products?.length > 0 ? extractedData.products.map((product, index) => (
                        <tr key={index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '12px' }}>
                            {editMode ? (
                              <input type="text" value={product.name} onChange={(e) => updateProduct(index, 'name', e.target.value)} style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '4px' }} />
                            ) : (
                              <span style={{ fontWeight: '500' }}>{product.name}</span>
                            )}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            {editMode ? (
                              <input type="number" value={product.quantity} onChange={(e) => updateProduct(index, 'quantity', parseFloat(e.target.value) || 0)} style={{ width: '60px', padding: '6px', border: '1px solid #d1d5db', borderRadius: '4px', textAlign: 'center' }} />
                            ) : (
                              product.quantity
                            )}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            {editMode ? (
                              <input type="number" step="0.01" value={product.unitPrice} onChange={(e) => updateProduct(index, 'unitPrice', parseFloat(e.target.value) || 0)} style={{ width: '80px', padding: '6px', border: '1px solid #d1d5db', borderRadius: '4px', textAlign: 'right' }} />
                            ) : (
                              `$${(product.unitPrice || 0).toFixed(2)}`
                            )}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#059669' }}>
                            ${(product.lineTotal || 0).toFixed(2)}
                          </td>
                          {editMode && (
                            <td style={{ padding: '12px' }}>
                              <button onClick={() => removeProduct(index)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                                <Trash2 size={16} />
                              </button>
                            </td>
                          )}
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={editMode ? 5 : 4} style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>
                            No items detected. {editMode && 'Click "Add Item" to add manually.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #e5e7eb', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#6b7280' }}>Subtotal</span>
                  {editMode ? (
                    <input type="number" step="0.01" value={extractedData.subtotal || ''} onChange={(e) => updateField('subtotal', parseFloat(e.target.value))} style={{ width: '100px', padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px', textAlign: 'right' }} />
                  ) : (
                    <span>${(extractedData.subtotal || 0).toFixed(2)}</span>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ color: '#6b7280' }}>Tax</span>
                  {editMode ? (
                    <input type="number" step="0.01" value={extractedData.tax || ''} onChange={(e) => updateField('tax', parseFloat(e.target.value))} style={{ width: '100px', padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px', textAlign: 'right' }} />
                  ) : (
                    <span>${(extractedData.tax || 0).toFixed(2)}</span>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '12px', borderTop: '2px solid #e5e7eb' }}>
                  <span style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827' }}>Total</span>
                  {editMode ? (
                    <input type="number" step="0.01" value={extractedData.totalAmount || ''} onChange={(e) => updateField('totalAmount', parseFloat(e.target.value))} style={{ width: '120px', padding: '6px 10px', border: '2px solid #6366f1', borderRadius: '6px', textAlign: 'right', fontWeight: '700', fontSize: '1.125rem' }} />
                  ) : (
                    <span style={{ fontSize: '1.25rem', fontWeight: '700', color: '#059669' }}>${(extractedData.totalAmount || 0).toFixed(2)}</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div style={{ marginTop: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={addToInventory}
                    onChange={(e) => setAddToInventory(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#6366f1' }}
                  />
                  <span style={{ fontSize: '0.95rem', color: '#374151' }}>Add products to inventory</span>
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={handleReset}
                    style={{
                      flex: 1, padding: '12px 20px',
                      background: 'white', border: '1px solid #d1d5db', borderRadius: '8px',
                      cursor: 'pointer', fontSize: '0.95rem', fontWeight: '500', color: '#374151'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                      flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      padding: '12px 20px', border: 'none', borderRadius: '8px',
                      background: saving ? '#d1d5db' : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                      color: 'white', cursor: saving ? 'not-allowed' : 'pointer',
                      fontSize: '0.95rem', fontWeight: '600',
                      boxShadow: saving ? 'none' : '0 4px 14px rgba(34, 197, 94, 0.4)'
                    }}
                  >
                    {saving ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : <><Save size={18} /> Save Invoice</>}
                  </button>
                </div>
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
