import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Search, Trash2, Edit, Camera, ChevronDown, ChevronUp, X, Save, Smartphone } from 'lucide-react';
import InvoiceScanner from '../InvoiceScanner';

export default function InventoryList() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});
  const [formData, setFormData] = useState({
    model: '',
    brand: '',
    quantity: 1,
    price: { cost: 0, retail: 0 },
    specifications: { storage: '', color: '', ram: '' }
  });

  useEffect(() => { fetchInventory(); }, [search]);

  const fetchInventory = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/inventory?search=${search}`);
      setInventory(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/inventory`, formData);
      setShowModal(false);
      resetForm();
      fetchInventory();
      alert('Item added successfully!');
    } catch (err) {
      alert('Failed to add item: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this item?')) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/inventory/${id}`);
      fetchInventory();
    } catch (err) {
      alert('Failed to delete');
    }
  };

  const handleEdit = (item) => {
    setEditItem(JSON.parse(JSON.stringify(item)));
    setShowEditModal(true);
  };

  const handleUpdateItem = async () => {
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/inventory/${editItem._id}`, editItem);
      setShowEditModal(false);
      setEditItem(null);
      fetchInventory();
      alert('Item updated successfully!');
    } catch (err) {
      alert('Failed to update: ' + (err.response?.data?.message || err.message));
    }
  };

  const updateEditField = (field, value) => {
    setEditItem(prev => ({ ...prev, [field]: value }));
  };

  const updateEditPrice = (field, value) => {
    setEditItem(prev => ({ ...prev, price: { ...prev.price, [field]: parseFloat(value) || 0 } }));
  };

  const updateEditSpec = (field, value) => {
    setEditItem(prev => ({ ...prev, specifications: { ...prev.specifications, [field]: value } }));
  };

  const updateDeviceImei = (deviceIndex, value) => {
    setEditItem(prev => {
      const newDevices = [...(prev.devices || [])];
      newDevices[deviceIndex] = { ...newDevices[deviceIndex], imei: value };
      return { ...prev, devices: newDevices };
    });
  };

  const updateDeviceField = (deviceIndex, field, value) => {
    setEditItem(prev => {
      const newDevices = [...(prev.devices || [])];
      newDevices[deviceIndex] = { ...newDevices[deviceIndex], [field]: value };
      return { ...prev, devices: newDevices };
    });
  };

  const addDevice = () => {
    setEditItem(prev => ({
      ...prev,
      quantity: (prev.quantity || 0) + 1,
      devices: [...(prev.devices || []), { imei: '555500000000000', unlockStatus: 'unlocked', condition: 'used', grade: 'Grade 5', isSold: false }]
    }));
  };

  const removeDevice = (deviceIndex) => {
    setEditItem(prev => ({
      ...prev,
      quantity: Math.max(0, (prev.quantity || 1) - 1),
      devices: prev.devices.filter((_, i) => i !== deviceIndex)
    }));
  };

  const toggleRow = (id) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const resetForm = () => {
    setFormData({
      model: '',
      brand: '',
      quantity: 1,
      price: { cost: 0, retail: 0 },
      specifications: { storage: '', color: '', ram: '' }
    });
  };

  const handleScanComplete = (invoice) => {
    setShowScanModal(false);
    fetchInventory();
    alert('Invoice scanned and saved successfully!');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', padding: '2rem' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937' }}>Inventory Management</h1>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={() => setShowScanModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontWeight: '500' }}
            >
              <Camera size={20} />
              Scan Invoice
            </button>
            <button
              onClick={() => setShowModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#2563eb', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontWeight: '500' }}
            >
              <Plus size={20} />
              Add Item
            </button>
          </div>
        </div>

        {/* Search */}
        <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
          <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} size={20} />
          <input
            type="text"
            placeholder="Search by model, brand, or IMEI..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', paddingLeft: '3rem', padding: '0.75rem 1rem 0.75rem 3rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }}
          />
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '0.5rem' }}>
            <div style={{ display: 'inline-block', width: '3rem', height: '3rem', border: '4px solid #e5e7eb', borderTop: '4px solid #2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <p style={{ marginTop: '1rem', color: '#6b7280' }}>Loading inventory...</p>
          </div>
        ) : inventory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '0.5rem' }}>
            <Smartphone size={48} color="#9ca3af" style={{ margin: '0 auto 1rem' }} />
            <p style={{ color: '#6b7280', marginBottom: '1rem' }}>No inventory items found</p>
            <button
              onClick={() => setShowScanModal(true)}
              style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', marginRight: '0.5rem' }}
            >
              Scan Invoice
            </button>
            <button
              onClick={() => setShowModal(true)}
              style={{ background: '#2563eb', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }}
            >
              Add Manually
            </button>
          </div>
        ) : (
          <div style={{ background: 'white', borderRadius: '0.5rem', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                <tr>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151', width: '40px' }}></th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Product</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Specs</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Stock</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Price</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((item) => {
                  const available = item.devices?.filter(d => !d.isSold).length || 0;
                  const isExpanded = expandedRows[item._id];
                  return (
                    <React.Fragment key={item._id}>
                      <tr style={{ borderBottom: '1px solid #e5e7eb', background: isExpanded ? '#f9fafb' : 'white' }}>
                        <td style={{ padding: '1rem' }}>
                          <button
                            onClick={() => toggleRow(item._id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
                          >
                            {isExpanded ? <ChevronUp size={20} color="#6b7280" /> : <ChevronDown size={20} color="#6b7280" />}
                          </button>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontWeight: '600', color: '#111827' }}>{item.model}</div>
                          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{item.brand}</div>
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                          {item.specifications?.storage && <span style={{ background: '#e5e7eb', padding: '2px 8px', borderRadius: '4px', marginRight: '4px' }}>{item.specifications.storage}</span>}
                          {item.specifications?.color && <span style={{ background: '#e5e7eb', padding: '2px 8px', borderRadius: '4px' }}>{item.specifications.color}</span>}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '9999px',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            background: available < 10 ? '#fee2e2' : '#d1fae5',
                            color: available < 10 ? '#991b1b' : '#065f46'
                          }}>
                            {available} / {item.quantity}
                          </span>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontWeight: '600', color: '#059669' }}>${item.price?.retail || 0}</div>
                          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Cost: ${item.price?.cost || 0}</div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => handleEdit(item)}
                              style={{ background: '#eff6ff', border: 'none', color: '#2563eb', cursor: 'pointer', padding: '0.5rem', borderRadius: '4px' }}
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(item._id)}
                              style={{ background: '#fef2f2', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.5rem', borderRadius: '4px' }}
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {/* Expanded Row - Devices/IMEIs */}
                      {isExpanded && (
                        <tr>
                          <td colSpan="6" style={{ padding: '0', background: '#f9fafb' }}>
                            <div style={{ padding: '1rem 2rem', borderBottom: '1px solid #e5e7eb' }}>
                              <h4 style={{ margin: '0 0 1rem', fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>
                                Devices ({item.devices?.length || 0})
                              </h4>
                              {item.devices && item.devices.length > 0 ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
                                  {item.devices.map((device, idx) => (
                                    <div key={idx} style={{ 
                                      background: 'white', 
                                      padding: '0.75rem', 
                                      borderRadius: '8px', 
                                      border: `1px solid ${device.isSold ? '#fecaca' : '#d1fae5'}`,
                                      opacity: device.isSold ? 0.7 : 1
                                    }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>#{idx + 1}</span>
                                        <span style={{ 
                                          fontSize: '0.7rem', 
                                          padding: '2px 8px', 
                                          borderRadius: '4px',
                                          background: device.isSold ? '#fee2e2' : '#d1fae5',
                                          color: device.isSold ? '#991b1b' : '#065f46'
                                        }}>
                                          {device.isSold ? 'Sold' : 'Available'}
                                        </span>
                                      </div>
                                      <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#1f2937', marginBottom: '0.5rem' }}>
                                        IMEI: {device.imei || 'N/A'}
                                      </div>
                                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '0.7rem', background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>{device.unlockStatus}</span>
                                        <span style={{ fontSize: '0.7rem', background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>{device.condition}</span>
                                        <span style={{ fontSize: '0.7rem', background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>{device.grade}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>No devices registered. Click Edit to add IMEIs.</p>
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

        {/* Manual Add Modal */}
        {showModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
            <div style={{ background: 'white', borderRadius: '0.5rem', padding: '2rem', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Add New Item</h2>
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>Model *</label>
                    <input
                      type="text"
                      required
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      placeholder="iPhone 15 Pro"
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>Brand *</label>
                    <input
                      type="text"
                      required
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      placeholder="Apple"
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>Storage</label>
                    <input
                      type="text"
                      value={formData.specifications.storage}
                      onChange={(e) => setFormData({ ...formData, specifications: { ...formData.specifications, storage: e.target.value } })}
                      placeholder="256GB"
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>Color</label>
                    <input
                      type="text"
                      value={formData.specifications.color}
                      onChange={(e) => setFormData({ ...formData, specifications: { ...formData.specifications, color: e.target.value } })}
                      placeholder="Black"
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>Quantity *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>Cost Price *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.price.cost}
                      onChange={(e) => setFormData({ ...formData, price: { ...formData.price, cost: parseFloat(e.target.value) } })}
                      placeholder="999.00"
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>Retail Price *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.price.retail}
                      onChange={(e) => setFormData({ ...formData, price: { ...formData.price, retail: parseFloat(e.target.value) } })}
                      placeholder="1199.00"
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); resetForm(); }}
                    style={{ flex: 1, padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', background: 'white', cursor: 'pointer', fontWeight: '500' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{ flex: 1, padding: '0.75rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '500' }}
                  >
                    Add Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Modal with IMEI Management */}
        {showEditModal && editItem && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
            <div style={{ background: 'white', borderRadius: '0.5rem', padding: '2rem', maxWidth: '800px', width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>Edit Inventory Item</h2>
                <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={24} color="#6b7280" />
                </button>
              </div>

              {/* Basic Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>Model</label>
                  <input
                    type="text"
                    value={editItem.model || ''}
                    onChange={(e) => updateEditField('model', e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>Brand</label>
                  <input
                    type="text"
                    value={editItem.brand || ''}
                    onChange={(e) => updateEditField('brand', e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>Storage</label>
                  <input
                    type="text"
                    value={editItem.specifications?.storage || ''}
                    onChange={(e) => updateEditSpec('storage', e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>Color</label>
                  <input
                    type="text"
                    value={editItem.specifications?.color || ''}
                    onChange={(e) => updateEditSpec('color', e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>Cost Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editItem.price?.cost || 0}
                    onChange={(e) => updateEditPrice('cost', e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>Retail Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editItem.price?.retail || 0}
                    onChange={(e) => updateEditPrice('retail', e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                  />
                </div>
              </div>

              {/* Devices/IMEIs Section */}
              <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>Devices / IMEIs ({editItem.devices?.length || 0})</h3>
                  <button
                    onClick={addDevice}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
                  >
                    <Plus size={14} /> Add Device
                  </button>
                </div>

                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {editItem.devices && editItem.devices.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {editItem.devices.map((device, idx) => (
                        <div key={idx} style={{ background: 'white', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#374151' }}>Device #{idx + 1}</span>
                            <div style={{ flex: 1 }}></div>
                            <button
                              onClick={() => removeDevice(idx)}
                              style={{ background: '#fee2e2', border: 'none', borderRadius: '4px', padding: '4px', cursor: 'pointer' }}
                            >
                              <Trash2 size={14} color="#dc2626" />
                            </button>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '0.5rem' }}>
                            <div>
                              <label style={{ fontSize: '0.7rem', color: '#6b7280' }}>IMEI</label>
                              <input
                                type="text"
                                value={device.imei || ''}
                                onChange={(e) => updateDeviceImei(idx, e.target.value)}
                                placeholder="Enter IMEI"
                                style={{ width: '100%', padding: '6px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.85rem', fontFamily: 'monospace' }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '0.7rem', color: '#6b7280' }}>Status</label>
                              <select
                                value={device.unlockStatus || 'unlocked'}
                                onChange={(e) => updateDeviceField(idx, 'unlockStatus', e.target.value)}
                                style={{ width: '100%', padding: '6px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.85rem' }}
                              >
                                <option value="unlocked">Unlocked</option>
                                <option value="locked">Locked</option>
                                <option value="carrier_locked">Carrier</option>
                              </select>
                            </div>
                            <div>
                              <label style={{ fontSize: '0.7rem', color: '#6b7280' }}>Condition</label>
                              <select
                                value={device.condition || 'used'}
                                onChange={(e) => updateDeviceField(idx, 'condition', e.target.value)}
                                style={{ width: '100%', padding: '6px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.85rem' }}
                              >
                                <option value="new">New</option>
                                <option value="refurbished">Refurbished</option>
                                <option value="used">Used</option>
                              </select>
                            </div>
                            <div>
                              <label style={{ fontSize: '0.7rem', color: '#6b7280' }}>Sold?</label>
                              <select
                                value={device.isSold ? 'yes' : 'no'}
                                onChange={(e) => updateDeviceField(idx, 'isSold', e.target.value === 'yes')}
                                style={{ width: '100%', padding: '6px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.85rem' }}
                              >
                                <option value="no">No</option>
                                <option value="yes">Yes</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ textAlign: 'center', color: '#9ca3af', padding: '1rem' }}>No devices. Click "Add Device" to add IMEIs.</p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => setShowEditModal(false)}
                  style={{ flex: 1, padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', background: 'white', cursor: 'pointer', fontWeight: '500' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateItem}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '0.75rem', background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '500' }}
                >
                  <Save size={18} /> Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scan Invoice Modal */}
        {showScanModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem', overflow: 'auto' }}>
            <div style={{ background: 'white', borderRadius: '0.5rem', maxWidth: '1000px', width: '100%', maxHeight: '95vh', overflow: 'auto', position: 'relative' }}>
              <button
                onClick={() => setShowScanModal(false)}
                style={{ position: 'absolute', top: '1rem', right: '1rem', background: '#f3f4f6', border: 'none', borderRadius: '50%', width: '2rem', height: '2rem', cursor: 'pointer', fontSize: '1.25rem', zIndex: 10 }}
              >
                ×
              </button>
              <InvoiceScanner onScanComplete={handleScanComplete} />
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
