import React, { useState } from 'react';
import { Camera, Upload, X, Check, Edit2, Package, Truck } from 'lucide-react';

const SaleScanner = ({ onScanComplete, onClose }) => {
  const [step, setStep] = useState('choose'); // 'choose', 'upload-shipping', 'upload-device', 'review'
  const [shippingImage, setShippingImage] = useState(null);
  const [deviceImage, setDeviceImage] = useState(null);
  const [shippingPreview, setShippingPreview] = useState(null);
  const [devicePreview, setDevicePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scannedData, setScannedData] = useState({
    device: {},
    shipping: {}
  });

  const handleImageSelect = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      if (type === 'shipping') {
        setShippingImage(file);
        setShippingPreview(URL.createObjectURL(file));
      } else {
        setDeviceImage(file);
        setDevicePreview(URL.createObjectURL(file));
      }
      setError('');
    }
  };

  const scanImage = async (image, type) => {
    const formData = new FormData();
    formData.append('image', image);

    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:5000/api/sales/scan-label', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Scan failed');
    }

    return result.data;
  };

  const handleScanShipping = async () => {
    if (!shippingImage) return;
    
    setLoading(true);
    setError('');

    try {
      const data = await scanImage(shippingImage, 'shipping');
      setScannedData(prev => ({
        ...prev,
        shipping: data.shipping || {}
      }));
      setStep('upload-device');
    } catch (err) {
      setError('Failed to scan shipping label: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleScanDevice = async () => {
    if (!deviceImage) return;
    
    setLoading(true);
    setError('');

    try {
      const data = await scanImage(deviceImage, 'device');
      setScannedData(prev => ({
        device: data.device || {},
        shipping: prev.shipping
      }));
      setStep('review');
    } catch (err) {
      setError('Failed to scan device label: ' + err.message);
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

  // Choose scan type
  if (step === 'choose') {
    return (
      <div style={{ padding: '24px', maxWidth: '600px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>Scan Labels</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ display: 'grid', gap: '16px' }}>
          <button
            onClick={() => setStep('upload-shipping')}
            style={{ 
              padding: '32px', 
              border: '2px solid #6366f1', 
              borderRadius: '12px', 
              background: '#f0f9ff', 
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <Truck size={48} color="#6366f1" />
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#1e3a8a' }}>Scan Shipping Label First</div>
            <div style={{ fontSize: '14px', color: '#64748b' }}>UPS, USPS, FedEx labels</div>
          </button>

          <button
            onClick={() => setStep('upload-device')}
            style={{ 
              padding: '32px', 
              border: '2px solid #d1d5db', 
              borderRadius: '12px', 
              background: 'white', 
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <Package size={48} color="#9ca3af" />
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#475569' }}>Skip to Device Label</div>
            <div style={{ fontSize: '14px', color: '#64748b' }}>IMEI sticker only</div>
          </button>
        </div>
      </div>
    );
  }

  // Upload shipping label
  if (step === 'upload-shipping') {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>
            <Truck size={24} style={{ display: 'inline', marginRight: '8px' }} />
            Scan Shipping Label
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        {error && (
          <div style={{ padding: '12px', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleImageSelect(e, 'shipping')}
          style={{ display: 'none' }}
          id="shipping-upload"
        />
        <label
          htmlFor="shipping-upload"
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '48px', 
            border: '2px dashed #d1d5db', 
            borderRadius: '8px', 
            cursor: 'pointer', 
            background: '#f9fafb',
            marginBottom: '16px'
          }}
        >
          <Upload size={48} style={{ color: '#9ca3af', marginBottom: '12px' }} />
          <span style={{ color: '#6b7280' }}>Upload Shipping Label</span>
        </label>

        {shippingPreview && (
          <div style={{ marginBottom: '16px' }}>
            <img src={shippingPreview} alt="Shipping label" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px' }} />
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setStep('choose')}
            style={{ flex: 1, padding: '12px', background: '#e5e7eb', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}
          >
            Back
          </button>
          <button
            onClick={handleScanShipping}
            disabled={!shippingImage || loading}
            style={{ 
              flex: 2, 
              padding: '12px', 
              background: loading || !shippingImage ? '#d1d5db' : '#6366f1', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: loading || !shippingImage ? 'not-allowed' : 'pointer', 
              fontWeight: '500' 
            }}
          >
            {loading ? 'Scanning...' : 'Scan & Continue to Device'}
          </button>
        </div>
      </div>
    );
  }

  // Upload device label
  if (step === 'upload-device') {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>
            <Package size={24} style={{ display: 'inline', marginRight: '8px' }} />
            Scan Device IMEI Label
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        {error && (
          <div style={{ padding: '12px', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleImageSelect(e, 'device')}
          style={{ display: 'none' }}
          id="device-upload"
        />
        <label
          htmlFor="device-upload"
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '48px', 
            border: '2px dashed #d1d5db', 
            borderRadius: '8px', 
            cursor: 'pointer', 
            background: '#f9fafb',
            marginBottom: '16px'
          }}
        >
          <Upload size={48} style={{ color: '#9ca3af', marginBottom: '12px' }} />
          <span style={{ color: '#6b7280' }}>Upload Device IMEI Sticker</span>
        </label>

        {devicePreview && (
          <div style={{ marginBottom: '16px' }}>
            <img src={devicePreview} alt="Device label" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px' }} />
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setStep('upload-shipping')}
            style={{ flex: 1, padding: '12px', background: '#e5e7eb', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}
          >
            Back
          </button>
          <button
            onClick={handleScanDevice}
            disabled={!deviceImage || loading}
            style={{ 
              flex: 2, 
              padding: '12px', 
              background: loading || !deviceImage ? '#d1d5db' : '#6366f1', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: loading || !deviceImage ? 'not-allowed' : 'pointer', 
              fontWeight: '500' 
            }}
          >
            {loading ? 'Scanning...' : 'Scan & Review'}
          </button>
        </div>
      </div>
    );
  }

  // Review combined data
  if (step === 'review') {
    return (
      <div style={{ padding: '24px', maxWidth: '800px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>Review Scanned Data</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ display: 'grid', gap: '24px' }}>
          {/* Device Information */}
          <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Package size={16} /> Device Information
            </h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>IMEI</label>
                <input
                  type="text"
                  value={scannedData.device.imei || ''}
                  onChange={(e) => handleEdit('device', 'imei', e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  placeholder="Enter IMEI manually if needed"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>Model</label>
                <input
                  type="text"
                  value={scannedData.device.model || ''}
                  onChange={(e) => handleEdit('device', 'model', e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
            </div>
          </div>

          {/* Shipping Information */}
          <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Truck size={16} /> Shipping Information
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
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setStep('choose')}
              style={{ padding: '10px 20px', background: '#e5e7eb', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}
            >
              Start Over
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

  return null;
};

export default SaleScanner;
