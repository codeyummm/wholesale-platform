import React, { useState } from 'react';
import { Camera, Upload, X, Check, Edit2 } from 'lucide-react';
import api from '../utils/api';
import heic2any from 'heic2any';
import * as pdfjsLib from 'pdfjs-dist';

// Setup PDF worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const SaleScanner = ({ onScanComplete, onClose }) => {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scannedData, setScannedData] = useState(null);

  const isImageRenderable = (file) => {
    return new Promise((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => { URL.revokeObjectURL(objectUrl); resolve(true); };
      img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(false); };
      img.src = objectUrl;
    });
  };

  const convertToJpeg = async (file) => {
    const ext = file.name.split('.').pop().toLowerCase();
    
    if (ext === 'heic' || ext === 'heif' || file.type === 'image/heic') {
      try {
        // Sometimes iOS auto-converts HEIC to JPEG on upload but keeps the .HEIC extension.
        // If the browser can render it natively, it's already a valid JPEG/PNG!
        const canRender = await isImageRenderable(file);
        if (canRender) {
          console.log('File has HEIC extension but is natively renderable (iOS auto-converted). Bypassing conversion.');
          return new File([file], file.name.replace(/\.heic|\.heif$/i, '.jpg'), { type: file.type || 'image/jpeg' });
        }

        const convertedBlob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.8 });
        const blobObj = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
        return new File([blobObj], file.name.replace(/\.heic|\.heif$/i, '.jpg'), { type: 'image/jpeg' });
      } catch (err) {
        console.error('HEIC conversion failed:', err);
        console.warn('Fallback: Bypassing HEIC conversion and uploading original file.');
        return file;
      }
    }
    
    if (ext === 'pdf' || file.type === 'application/pdf') {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2.5 }); // High res for OCR
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: context, viewport }).promise;
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
        return new File([blob], file.name.replace(/\.pdf$/i, '.jpg'), { type: 'image/jpeg' });
      } catch (err) {
        console.error('PDF conversion failed', err);
        throw new Error('Failed to extract PDF image. Please upload a JPG/PNG.');
      }
    }
    return file;
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        setLoading(true);
        setError('Processing file format...');
        const processedFile = await convertToJpeg(file);
        setImage(processedFile);
        setPreview(URL.createObjectURL(processedFile));
        setError('');
      } catch (err) {
        setError(err.message);
        setImage(null);
        setPreview(null);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleScan = async () => {
    if (!image) {
      setError('Please select an image first');
      return;
    }

    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('image', image);

    try {
      const response = await api.post('/sale-scanner/scan-label', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const result = response.data;

      if (result.success) {
        let scannedDevice = result.data.device || {};
        
        // Pre-fill missing data from inventory if IMEI is found
        if (scannedDevice.imei) {
          try {
            const invRes = await api.get(`/inventory/search/${scannedDevice.imei}`);
            if (invRes.data.success && invRes.data.data) {
              const matchedInventory = invRes.data.data;
              scannedDevice = {
                ...scannedDevice,
                model: matchedInventory.model || scannedDevice.model,
                storage: matchedInventory.specifications?.storage || scannedDevice.storage,
                color: matchedInventory.specifications?.color || scannedDevice.color,
              };
            }
          } catch (e) {
            console.error("Failed to pre-fill from inventory", e);
          }
        }

        setScannedData({
          device: scannedDevice,
          shipping: result.data.shipping || {}
        });
      } else {
        setError(result.message || 'Scan failed');
      }
    } catch (err) {
      console.error('Scan error:', err);
      setError('Failed to scan image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (section, field, value) => {
    setScannedData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleConfirm = () => {
    onScanComplete(scannedData);
  };

  if (scannedData) {
    return (
      <div style={{ padding: '24px', maxWidth: '800px', maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>Review Scanned Data</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ display: 'grid', gap: '24px' }}>
          <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Device Information</h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>IMEI</label>
                <input type="text" value={scannedData.device.imei || ''} onChange={(e) => handleEdit('device', 'imei', e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>Model</label>
                <input type="text" value={scannedData.device.model || ''} onChange={(e) => handleEdit('device', 'model', e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>Storage</label>
                  <input type="text" value={scannedData.device.storage || ''} onChange={(e) => handleEdit('device', 'storage', e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>Color</label>
                  <input type="text" value={scannedData.device.color || ''} onChange={(e) => handleEdit('device', 'color', e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Shipping Information</h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>Tracking Number</label>
                  <input type="text" value={scannedData.shipping.tracking_number || ''} onChange={(e) => handleEdit('shipping', 'tracking_number', e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>Carrier</label>
                  <input type="text" value={scannedData.shipping.carrier || ''} onChange={(e) => handleEdit('shipping', 'carrier', e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>Recipient Name</label>
                <input type="text" value={scannedData.shipping.recipient_name || ''} onChange={(e) => handleEdit('shipping', 'recipient_name', e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>Street Address</label>
                <input type="text" value={scannedData.shipping.street_address || ''} onChange={(e) => handleEdit('shipping', 'street_address', e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>City</label>
                  <input type="text" value={scannedData.shipping.city || ''} onChange={(e) => handleEdit('shipping', 'city', e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>State</label>
                  <input type="text" value={scannedData.shipping.state || ''} onChange={(e) => handleEdit('shipping', 'state', e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>ZIP</label>
                  <input type="text" value={scannedData.shipping.zip || ''} onChange={(e) => handleEdit('shipping', 'zip', e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button onClick={() => setScannedData(null)} style={{ padding: '10px 20px', background: '#e5e7eb', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
              Scan Another
            </button>
            <button onClick={handleConfirm} style={{ padding: '10px 20px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Check size={18} /> Confirm
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>Scan Label</h2>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <X size={24} />
        </button>
      </div>

      {error && <div style={{ padding: '12px', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '16px' }}>{error}</div>}

      <input type="file" accept="image/*,.pdf,.heic" onChange={handleImageSelect} style={{ display: 'none' }} id="image-upload" />
      <label htmlFor="image-upload" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px', border: '2px dashed #d1d5db', borderRadius: '8px', cursor: 'pointer', background: '#f9fafb', marginBottom: '16px' }}>
        <Upload size={48} style={{ color: '#9ca3af', marginBottom: '12px' }} />
        <span style={{ color: '#6b7280' }}>Upload shipping label + device sticker</span>
      </label>

      {preview && <div style={{ marginBottom: '16px' }}><img src={preview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '8px' }} /></div>}

      <button onClick={handleScan} disabled={!image || loading} style={{ width: '100%', padding: '12px', background: !image || loading ? '#d1d5db' : '#6366f1', color: 'white', border: 'none', borderRadius: '8px', cursor: !image || loading ? 'not-allowed' : 'pointer' }}>
        {loading ? 'Scanning...' : 'Scan Label'}
      </button>
    </div>
  );
};

export default SaleScanner;
