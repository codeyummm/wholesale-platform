import { useState, useCallback } from 'react';
import { Upload, FileText, Camera, Loader2, Check, Edit2, Save, Plus, Trash2, AlertCircle } from 'lucide-react';
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
      setPreview(URL.createObjectURL(selectedFile));
      setExtractedData(null);
      setError(null);
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      setFile(droppedFile);
      setPreview(URL.createObjectURL(droppedFile));
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
      if (response.data.success) setExtractedData(response.data.data);
      else setError(response.data.message || 'Scan failed');
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
        setFile(null); setPreview(null); setExtractedData(null);
      } else setError(response.data.message || 'Save failed');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save invoice');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field, value) => setExtractedData(prev => ({ ...prev, [field]: value }));
  const updateProduct = (index, field, value) => setExtractedData(prev => ({ ...prev, products: prev.products.map((p, i) => i === index ? { ...p, [field]: value } : p) }));
  const addProduct = () => setExtractedData(prev => ({ ...prev, products: [...(prev.products || []), { name: '', quantity: 1, unitPrice: 0, lineTotal: 0 }] }));
  const removeProduct = (index) => setExtractedData(prev => ({ ...prev, products: prev.products.filter((_, i) => i !== index) }));
  const handleReset = () => { setFile(null); setPreview(null); setExtractedData(null); setError(null); setEditMode(false); };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-600" /> Invoice Scanner
        </h2>
        {extractedData && (
          <button onClick={() => setEditMode(!editMode)} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800">
            <Edit2 className="w-4 h-4" /> {editMode ? 'View Mode' : 'Edit Mode'}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div onDrop={handleDrop} onDragOver={handleDragOver} className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${preview ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-blue-400 bg-gray-50'}`}>
            {preview ? (
              <div className="space-y-4">
                <img src={preview} alt="Invoice preview" className="max-h-64 mx-auto rounded-lg shadow" />
                <p className="text-sm text-gray-600">{file?.name}</p>
                <button onClick={handleReset} className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border rounded">Change</button>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="w-12 h-12 mx-auto text-gray-400" />
                <p className="text-gray-600">Drag and drop an invoice image here</p>
                <label className="inline-block cursor-pointer">
                  <span className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">Browse Files</span>
                  <input type="file" accept="image/*,.pdf" onChange={handleFileChange} className="hidden" />
                </label>
                <p className="text-xs text-gray-400">Supports: JPG, PNG, WebP, PDF (max 10MB)</p>
              </div>
            )}
          </div>
          <div className="mt-4">
            <button onClick={handleScan} disabled={!file || scanning} className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition ${!file || scanning ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
              {scanning ? (<><Loader2 className="w-5 h-5 animate-spin" /> Scanning...</>) : (<><Camera className="w-5 h-5" /> Scan Invoice</>)}
            </button>
          </div>
        </div>

        <div>
          {extractedData ? (
            <div className="space-y-4">
              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm ${extractedData.confidence === 'high' ? 'bg-green-100 text-green-700' : extractedData.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                {extractedData.confidence === 'high' && <Check className="w-4 h-4" />} {extractedData.confidence} confidence
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Supplier</label>
                  {editMode ? <input type="text" value={extractedData.supplierName || ''} onChange={(e) => updateField('supplierName', e.target.value)} className="w-full px-3 py-2 border rounded-lg" /> : <p className="text-gray-900 font-medium">{extractedData.supplierName || 'N/A'}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Invoice #</label>
                  {editMode ? <input type="text" value={extractedData.invoiceNumber || ''} onChange={(e) => updateField('invoiceNumber', e.target.value)} className="w-full px-3 py-2 border rounded-lg" /> : <p className="text-gray-900">{extractedData.invoiceNumber || 'N/A'}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Date</label>
                  {editMode ? <input type="date" value={extractedData.invoiceDate ? new Date(extractedData.invoiceDate).toISOString().split('T')[0] : ''} onChange={(e) => updateField('invoiceDate', e.target.value)} className="w-full px-3 py-2 border rounded-lg" /> : <p className="text-gray-900">{extractedData.invoiceDate ? new Date(extractedData.invoiceDate).toLocaleDateString() : 'N/A'}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Currency</label>
                  {editMode ? <select value={extractedData.currency || 'USD'} onChange={(e) => updateField('currency', e.target.value)} className="w-full px-3 py-2 border rounded-lg"><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option><option value="INR">INR</option></select> : <p className="text-gray-900">{extractedData.currency || 'USD'}</p>}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-600">Line Items</label>
                  {editMode && <button onClick={addProduct} className="flex items-center gap-1 text-sm text-blue-600"><Plus className="w-4 h-4" /> Add</button>}
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50"><tr><th className="px-3 py-2 text-left">Item</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-right">Price</th><th className="px-3 py-2 text-right">Total</th>{editMode && <th className="px-2"></th>}</tr></thead>
                    <tbody>
                      {extractedData.products?.length > 0 ? extractedData.products.map((product, index) => (
                        <tr key={index} className="border-t">
                          <td className="px-3 py-2">{editMode ? <input type="text" value={product.name} onChange={(e) => updateProduct(index, 'name', e.target.value)} className="w-full px-2 py-1 border rounded" /> : product.name}</td>
                          <td className="px-3 py-2 text-right">{editMode ? <input type="number" value={product.quantity} onChange={(e) => updateProduct(index, 'quantity', parseFloat(e.target.value))} className="w-16 px-2 py-1 border rounded text-right" /> : product.quantity}</td>
                          <td className="px-3 py-2 text-right">{editMode ? <input type="number" step="0.01" value={product.unitPrice} onChange={(e) => updateProduct(index, 'unitPrice', parseFloat(e.target.value))} className="w-20 px-2 py-1 border rounded text-right" /> : `$${product.unitPrice?.toFixed(2)}`}</td>
                          <td className="px-3 py-2 text-right font-medium">${(product.lineTotal || product.quantity * product.unitPrice)?.toFixed(2)}</td>
                          {editMode && <td className="px-2"><button onClick={() => removeProduct(index)} className="text-red-500"><Trash2 className="w-4 h-4" /></button></td>}
                        </tr>
                      )) : <tr><td colSpan={5} className="px-3 py-4 text-center text-gray-500">No items detected</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between"><span className="text-gray-600">Subtotal:</span><span>${extractedData.subtotal?.toFixed(2) || '0.00'}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Tax:</span><span>${extractedData.tax?.toFixed(2) || '0.00'}</span></div>
                <div className="flex justify-between text-lg font-semibold"><span>Total:</span><span>${extractedData.totalAmount?.toFixed(2) || '0.00'}</span></div>
              </div>
              <div className="border-t pt-4 space-y-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={addToInventory} onChange={(e) => setAddToInventory(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                  <span className="text-sm text-gray-700">Add products to inventory</span>
                </label>
                <div className="flex gap-3">
                  <button onClick={handleReset} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
                  <button onClick={handleSave} disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300">
                    {saving ? (<><Loader2 className="w-5 h-5 animate-spin" /> Saving...</>) : (<><Save className="w-5 h-5" /> Save Invoice</>)}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              <div className="text-center"><FileText className="w-16 h-16 mx-auto mb-4 opacity-50" /><p>Upload and scan an invoice</p></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoiceScanner;
