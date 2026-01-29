import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, X } from 'lucide-react';

export default function InventoryList() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    model: '',
    brand: '',
    price: { cost: 0, retail: 0 }
  });

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const res = await axios.get(import.meta.env.VITE_API_URL + '/inventory');
      setInventory(res.data.data);
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(import.meta.env.VITE_API_URL + '/inventory', formData);
      setShowModal(false);
      setFormData({ model: '', brand: '', price: { cost: 0, retail: 0 } });
      fetchInventory();
      alert('Item added successfully!');
    } catch (err) {
      alert('Failed to add item: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div style={{padding: '2rem'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
        <h1 style={{fontSize: '2rem', fontWeight: 'bold', margin: 0}}>Inventory</h1>
        <button 
          onClick={() => setShowModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#2563eb',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '500'
          }}
        >
          <Plus size={20} /> Add Item
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div style={{background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
          <p style={{marginBottom: '1rem', fontWeight: '500'}}>Total items: {inventory.length}</p>
          {inventory.length === 0 ? (
            <p style={{color: '#6b7280', textAlign: 'center', padding: '2rem'}}>No inventory items yet. Click "Add Item" to get started!</p>
          ) : (
            inventory.map(item => (
              <div key={item._id} style={{padding: '1rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between'}}>
                <div>
                  <strong style={{fontSize: '16px'}}>{item.model}</strong>
                  <p style={{color: '#6b7280', margin: '4px 0'}}>Brand: {item.brand}</p>
                </div>
                <div style={{textAlign: 'right'}}>
                  <p style={{fontWeight: '600', color: '#059669'}}>${item.price?.retail || 0}</p>
                  <p style={{fontSize: '14px', color: '#6b7280'}}>Cost: ${item.price?.cost || 0}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {showModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
              <h2 style={{fontSize: '1.5rem', fontWeight: 'bold', margin: 0}}>Add New Item</h2>
              <button 
                onClick={() => setShowModal(false)}
                style={{background: 'none', border: 'none', cursor: 'pointer', padding: '4px'}}
              >
                <X size={24} color="#6b7280" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{marginBottom: '1rem'}}>
                <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: '500'}}>Model *</label>
                <input
                  type="text"
                  required
                  value={formData.model}
                  onChange={(e) => setFormData({...formData, model: e.target.value})}
                  placeholder="e.g., iPhone 15 Pro"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '16px'
                  }}
                />
              </div>

              <div style={{marginBottom: '1rem'}}>
                <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: '500'}}>Brand *</label>
                <input
                  type="text"
                  required
                  value={formData.brand}
                  onChange={(e) => setFormData({...formData, brand: e.target.value})}
                  placeholder="e.g., Apple"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '16px'
                  }}
                />
              </div>

              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem'}}>
                <div>
                  <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: '500'}}>Cost Price *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.price.cost}
                    onChange={(e) => setFormData({...formData, price: {...formData.price, cost: parseFloat(e.target.value)}})}
                    placeholder="999"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '16px'
                    }}
                  />
                </div>

                <div>
                  <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: '500'}}>Retail Price *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.price.retail}
                    onChange={(e) => setFormData({...formData, price: {...formData.price, retail: parseFloat(e.target.value)}})}
                    placeholder="1199"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '16px'
                    }}
                  />
                </div>
              </div>

              <div style={{display: 'flex', gap: '12px'}}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    background: 'white',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '500'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '500'
                  }}
                >
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
