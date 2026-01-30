import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Search, Edit, Trash2, Phone, Mail, MapPin } from 'lucide-react';

export default function SupplierList() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    contact: { email: '', phone: '' },
    address: { street: '', city: '', state: '', zipCode: '' }
  });

  useEffect(() => { fetchSuppliers(); }, [search]);

  const fetchSuppliers = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/suppliers?search=${search}`);
      setSuppliers(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`${import.meta.env.VITE_API_URL}/suppliers/${editingId}`, formData);
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/suppliers`, formData);
      }
      setShowModal(false);
      setEditingId(null);
      resetForm();
      fetchSuppliers();
    } catch (err) {
      alert('Failed: ' + err.response?.data?.message);
    }
  };

  const handleEdit = (supplier) => {
    setEditingId(supplier._id);
    setFormData({
      name: supplier.name,
      contact: supplier.contact,
      address: supplier.address
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this supplier?')) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/suppliers/${id}`);
      fetchSuppliers();
    } catch (err) {
      alert('Failed to delete');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      contact: { email: '', phone: '' },
      address: { street: '', city: '', state: '', zipCode: '' }
    });
  };

  return (
    <div style={{padding: '2rem'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '2rem'}}>
        <h1 style={{fontSize: '2rem', fontWeight: 'bold'}}>Suppliers</h1>
        <button onClick={() => {resetForm(); setEditingId(null); setShowModal(true);}} style={{display: 'flex', alignItems: 'center', gap: '8px', background: '#2563eb', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer'}}>
          <Plus size={20} /> Add Supplier
        </button>
      </div>

      <div style={{marginBottom: '24px', position: 'relative'}}>
        <Search style={{position: 'absolute', left: '12px', top: '12px', color: '#9ca3af'}} size={20} />
        <input type="text" placeholder="Search suppliers..." value={search} onChange={(e) => setSearch(e.target.value)} style={{width: '100%', paddingLeft: '40px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '8px'}} />
      </div>

      {loading ? (
        <div style={{textAlign: 'center', padding: '48px'}}>Loading...</div>
      ) : suppliers.length === 0 ? (
        <div style={{textAlign: 'center', padding: '48px', color: '#6b7280'}}>No suppliers found</div>
      ) : (
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px'}}>
          {suppliers.map((supplier) => (
            <div key={supplier._id} style={{background: 'white', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px'}}>
                <h3 style={{fontSize: '18px', fontWeight: 'bold'}}>{supplier.name}</h3>
                <div style={{display: 'flex', gap: '8px'}}>
                  <button onClick={() => handleEdit(supplier)} style={{background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer'}}>
                    <Edit size={18} />
                  </button>
                  <button onClick={() => handleDelete(supplier._id)} style={{background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer'}}>
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div style={{display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', color: '#6b7280'}}>
                {supplier.contact?.phone && (
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <Phone size={16} />
                    <span>{supplier.contact.phone}</span>
                  </div>
                )}
                {supplier.contact?.email && (
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <Mail size={16} />
                    <span>{supplier.contact.email}</span>
                  </div>
                )}
                {supplier.address?.city && (
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <MapPin size={16} />
                    <span>{supplier.address.city}, {supplier.address.state}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50}}>
          <div style={{background: 'white', borderRadius: '8px', padding: '32px', maxWidth: '500px', width: '100%', margin: '16px', maxHeight: '90vh', overflow: 'auto'}}>
            <h2 style={{fontSize: '24px', fontWeight: 'bold', marginBottom: '24px'}}>{editingId ? 'Edit' : 'Add'} Supplier</h2>
            <form onSubmit={handleSubmit}>
              <div style={{marginBottom: '16px'}}>
                <label style={{display: 'block', fontSize: '14px', marginBottom: '4px'}}>Name *</label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} style={{width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px'}} />
              </div>
              <div style={{marginBottom: '16px'}}>
                <label style={{display: 'block', fontSize: '14px', marginBottom: '4px'}}>Phone *</label>
                <input type="tel" required value={formData.contact.phone} onChange={(e) => setFormData({...formData, contact: {...formData.contact, phone: e.target.value}})} style={{width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px'}} />
              </div>
              <div style={{marginBottom: '16px'}}>
                <label style={{display: 'block', fontSize: '14px', marginBottom: '4px'}}>Email</label>
                <input type="email" value={formData.contact.email} onChange={(e) => setFormData({...formData, contact: {...formData.contact, email: e.target.value}})} style={{width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px'}} />
              </div>
              <div style={{marginBottom: '16px'}}>
                <label style={{display: 'block', fontSize: '14px', marginBottom: '4px'}}>City</label>
                <input type="text" value={formData.address.city} onChange={(e) => setFormData({...formData, address: {...formData.address, city: e.target.value}})} style={{width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px'}} />
              </div>
              <div style={{marginBottom: '16px'}}>
                <label style={{display: 'block', fontSize: '14px', marginBottom: '4px'}}>State</label>
                <input type="text" value={formData.address.state} onChange={(e) => setFormData({...formData, address: {...formData.address, state: e.target.value}})} style={{width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px'}} />
              </div>
              <div style={{display: 'flex', gap: '12px'}}>
                <button type="button" onClick={() => {setShowModal(false); setEditingId(null);}} style={{flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer'}}>Cancel</button>
                <button type="submit" style={{flex: 1, padding: '8px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer'}}>{editingId ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
