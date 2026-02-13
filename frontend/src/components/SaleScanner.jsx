import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Loader2, Smartphone, Package } from 'lucide-react';
import api from '../utils/api';

const SaleScanner = ({ onScanComplete, onClose }) => {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleImageUpload = async (file) => {
    if (!file) return;

    setScanning(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await api.post('/sales/scan-label', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        const data = response.data.data;
        setResult(data);
        
        if (data.device && data.device.imei) {
          onScanComplete(data);
        }
      } else {
        setError('Failed to scan label');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to scan image');
    } finally {
      setScanning(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleAddToSale = () => {
    if (result) {
      onScanComplete(result);
      onClose();
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>Scan Device Label</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <X size={24} color="#64748b" />
        </button>
      </div>

      {!result && (
        <div style={{ marginBottom: '1.5rem' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed #cbd5e1',
              borderRadius: '12px',
              padding: '3rem 2rem',
              textAlign: 'center',
              cursor: 'pointer',
              background: '#f8fafc',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#6366f1';
              e.currentTarget.style.background = '#eef2ff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.background = '#f8fafc';
            }}
          >
            {scanning ? (
              <>
                <Loader2 size={48} color="#6366f1" style={{ margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }} />
                <p style={{ color: '#64748b', margin: 0 }}>Scanning label...</p>
              </>
            ) : (
              <>
                <Upload size={48} color="#94a3b8" style={{ margin: '0 auto 1rem' }} />
                <p style={{ fontSize: '1rem', fontWeight: '500', color: '#334155', margin: '0 0 0.5rem' }}>
                  Upload Device Label or Shipping Label
                </p>
                <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
                  Click to upload an image • JPG, PNG
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
          <p style={{ color: '#dc2626', margin: 0, fontSize: '0.875rem' }}>{error}</p>
        </div>
      )}

      {result && (
        <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h4 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: '600', color: '#334155' }}>
            Scanned Information
          </h4>

          {result.device && Object.keys(result.device).length > 0 && (
            <div style={{ background: 'white', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <Smartphone size={18} color="#6366f1" />
                <span style={{ fontWeight: '600', color: '#334155' }}>Device Information</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {result.device.imei && (
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>IMEI:</span>
                    <div style={{ fontFamily: 'monospace', fontWeight: '500', color: '#0f172a' }}>{result.device.imei}</div>
                  </div>
                )}
                {result.device.model && (
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Model:</span>
                    <div style={{ fontWeight: '500', color: '#0f172a' }}>{result.device.model}</div>
                  </div>
                )}
                {result.device.storage && (
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Storage:</span>
                    <div style={{ fontWeight: '500', color: '#0f172a' }}>{result.device.storage}</div>
                  </div>
                )}
                {result.device.color && (
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Color:</span>
                    <div style={{ fontWeight: '500', color: '#0f172a' }}>{result.device.color}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {result.shipping && Object.keys(result.shipping).length > 0 && (
            <div style={{ background: 'white', borderRadius: '8px', padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <Package size={18} color="#10b981" />
                <span style={{ fontWeight: '600', color: '#334155' }}>Shipping Information</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
                {result.shipping.tracking_number && (
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Tracking:</span>
                    <div style={{ fontFamily: 'monospace', fontWeight: '500', color: '#0f172a' }}>{result.shipping.tracking_number}</div>
                  </div>
                )}
                {result.shipping.carrier && (
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Carrier:</span>
                    <div style={{ fontWeight: '500', color: '#0f172a' }}>{result.shipping.carrier}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button
              onClick={handleAddToSale}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: '#6366f1',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '0.875rem'
              }}
            >
              Add to Sale
            </button>
            <button
              onClick={() => {
                setResult(null);
                setError(null);
              }}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: 'white',
                color: '#64748b',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '0.875rem'
              }}
            >
              Scan Another
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default SaleScanner;
