import React, { useState } from 'react';
import { Camera, Upload, X, Check, Edit2 } from 'lucide-react';

const SaleScanner = ({ onScanComplete, onClose }) => {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scannedData, setScannedData] = useState(null);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setError('');
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
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/sales/scan-label', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        setScannedData({
          device: result.data.device || {},
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

  // Review screen
  if (scannedData) {
    return (
      <div style={{ padding: '24px', maxWidth: '800px', maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', position: 'sticky', top: 0, background: 'white', paddingBottom: '12px', zIndex: 10 }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>Review Scanned Data</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ display: 'grid', gap: '24px' }}>
          {/* Device Information */}
          <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Edit2 size={16} /> Device Information
            </h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>IMEI</label>
                <input
                  type="text"
                  value={scannedData.device.imei || ''}
                  onChange={(e) => handleEdit('device', 'imei', e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  placeholder="Enter IMEI"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>Serial Number</label>
                <input
                  type="text"
                  value={scannedData.device.serial || ''}
                  onChange={(e) => handleEdit('device', 'serial', e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  placeholder="Enter Serial"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>Model</label>
                <input
                  type="text"
                  value={scannedData.device.model || ''}
                  onChange={(e) => handleEdit('device', 'model', e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  placeholder="e.g., iPhone 14 Plus"
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>Storage</label>
                  <input
                    type="text"
                    value={scannedData.device.storage || ''}
                    onChange={(e) => handleEdit('device', 'storage', e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                    placeholder="e.g., 512GB"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>Color</label>
                  <input
                    type="text"
                    value={scannedData.device.color || ''}
                    onChange={(e) => handleEdit('device', 'color', e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                    placeholder="e.g., Starlight"
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>Carrier</label>
                <input
                  type="text"
                  value={scannedData.device.carrier || ''}
                  onChange={(e) => handleEdit('device', 'carrier', e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  placeholder="e.g., Verizon (Unlocked)"
                />
              </div>
            </div>
          </div>

          {/* Shipping Information */}
          <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Edit2 size={16} /> Shipping Information
            </h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>Tracking Number</label>
                  <input
                    type="text"
                    value={scannedData.shipping.tracking_number || ''}
                    onChange={(e) => handleEdit('shipping', 'tracking_number', e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>Carrier</label>
                  <input
                    type="text"
                    value={scannedData.shipping.carrier || ''}
                    onChange={(e) => handleEdit('shipping', 'carrier', e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                    placeholder="UPS/USPS"
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>Recipient Name</label>
                <input
                  type="text"
                  value={scannedData.shipping.recipient_name || ''}
                  onChange={(e) => handleEdit('shipping', 'recipient_name', e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>Street Address</label>
                <input
                  type="text"
                  value={scannedData.shipping.street_address || ''}
                  onChange={(e) => handleEdit('shipping', 'street_address', e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>City</label>
                  <input
                    type="text"
                    value={scannedData.shipping.city || ''}
                    onChange={(e) => handleEdit('shipping', 'city', e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>State</label>
                  <input
                    type="text"
                    value={scannedData.shipping.state || ''}
                    onChange={(e) => handleEdit('shipping', 'state', e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>ZIP</label>
                  <input
                    type="text"
                    value={scannedData.shipping.zip || ''}
                    onChange={(e) => handleEdit('shipping', 'zip', e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', position: 'sticky', bottom: 0, background: 'white', paddingTop: '12px' }}>
            <button
              onClick={() => setScannedData(null)}
              style={{ padding: '10px 20px', background: '#e5e7eb', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}
            >
              Scan Another
            </button>
            <button
              onClick={handleConfirm}
              style={{ padding: '10px 20px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Check size={18} /> Confirm & Add to Sale
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Upload screen
  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>Scan Label</h2>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <X size={24} />
        </button>
      </div>

      <div style={{ background: '#eff6ff', padding: '16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #bfdbfe' }}>
        <p style={{ margin: 0, fontSize: '14px', color: '#1e40af' }}>
          📸 <strong>Tip:</strong> Take one photo showing both the shipping label AND device sticker for best results!
        </p>
      </div>

      {error && (
        <div style={{ padding: '12px', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: '24px' }}>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          style={{ display: 'none' }}
          id="image-upload"
        />
        <label
          htmlFor="image-upload"
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px', border: '2px dashed #d1d5db', borderRadius: '8px', cursor: 'pointer', background: '#f9fafb' }}
        >
          <Upload size={48} style={{ color: '#9ca3af', marginBottom: '12px' }} />
          <span style={{ color: '#6b7280', fontWeight: '500' }}>Click to upload label photospan>
          <span style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>PNG, JPG, JPEG</span>
        </label>
      </div>

      {preview && (
        <div style={{ marginBottom: '24px' }}>
          <img src={preview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
        </div>
      )}

      <button
        onClick={handleScan}
        disabled={!image || loading}
        style={{ width: '100%', padding: '12px', background: loading || !image ? '#d1d5db' : '#6366f1', color: 'white', border: 'none', borderRadius: '8px', cursor: loading || !image ? 'not-allowed' : 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
      >
        <Camera size={20} />
        {loading ? 'Scanning...' : 'Scan Label'}
      </button>
    </div>
  );
};

export default SaleScanner;
