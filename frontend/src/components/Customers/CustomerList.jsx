import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import {
  Plus, Search, Edit, Trash2, Phone, Mail, MapPin,
  UserCircle, Building, X, Save, Filter, DollarSign, ShoppingCart
} from 'lucide-react';

export default function CustomerList() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSales, setCustomerSales] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [formData, setFormData] = useState({
    name: '', company: '', type: 'retail',
    contact: { email: '', phone: '', alternatePhone: '' },
    address: { street: '', city: '', state: '', zipCode: '' },
    taxId: '', notes: ''
  });

  useEffect(() => { fetchCustomers(); }, [search, typeFilter]);

  const fetchCustomers = async () => {
    try {
      let url = `/customers?search=${search}`;
      if (typeFilter) url += `&type=${typeFilter}`;
      const res = await api.get(url);
      setCustomers(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  const fetchCustomerSales = async (customerId) => {
    setLoadingHistory(true);
    try {
      const res = await api.get(`/sales?customerId=${customerId}`);
      setCustomerSales(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch customer sales:', err);
      setCustomerSales([]);
    } finally {
      setLoadingHistory(false);
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/customers/${editingId}`, formData);
      } else {
        await api.post('/customers', formData);
      }
      setShowModal(false);
      setEditingId(null);
      resetForm();
      fetchCustomers();
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleEdit = (customer) => {
    setEditingId(customer._id);
    setFormData({
      name: customer.name || '',
      company: customer.company || '',
      type: customer.type || 'retail',
      contact: customer.contact || { email: '', phone: '', alternatePhone: '' },
      address: customer.address || { street: '', city: '', state: '', zipCode: '' },
      taxId: customer.taxId || '',
      notes: customer.notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this customer?')) return;
    try {
      await api.delete(`/customers/${id}`);
      fetchCustomers();
    } catch (err) {
      alert('Failed to delete');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '', company: '', type: 'retail',
      contact: { email: '', phone: '', alternatePhone: '' },
      address: { street: '', city: '', state: '', zipCode: '' },
      taxId: '', notes: ''
    });
  };

  const typeColors = {
    wholesale: { bg: '#eef2ff', color: '#4338ca', label: 'Wholesale' },
    retail: { bg: '#ecfdf5', color: '#059669', label: 'Retail' },
    distributor: { bg: '#fef3c7', color: '#b45309', label: 'Distributor' }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px' }}>Customers</h1>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Manage your buyers and wholesale clients</p>
        </div>
        <button onClick={() => { resetForm(); setEditingId(null); setShowModal(true); }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #4338ca, #6366f1)', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '500', fontSize: '14px' }}>
          <Plus size={18} /> Add Customer
        </button>
      </div>

      {/* Search + Filter */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={18} />
          <input type="text" placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '10px 10px 10px 40px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none' }} />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          style={{ padding: '10px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', background: 'white', cursor: 'pointer', minWidth: '140px' }}>
          <option value="">All Types</option>
          <option value="wholesale">Wholesale</option>
          <option value="retail">Retail</option>
          <option value="distributor">Distributor</option>
        </select>
      </div>

      {/* Customer List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ width: '36px', height: '36px', border: '4px solid #e2e8f0', borderTop: '4px solid #6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: '#64748b' }}>Loading customers...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : customers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <UserCircle size={48} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: '#64748b', marginBottom: '16px' }}>No customers found</p>
          <button onClick={() => { resetForm(); setEditingId(null); setShowModal(true); }}
            style={{ background: '#6366f1', color: 'white', padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>Add First Customer</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
          {customers.map((cust) => {
            const tc = typeColors[cust.type] || typeColors.retail;
            return (
              <div key={cust._id} style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', transition: 'all 0.15s ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: tc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <UserCircle size={22} color={tc.color} />
                    </div>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a' }}>{cust.name}</div>
                      {cust.company && <div style={{ fontSize: '12px', color: '#64748b' }}>{cust.company}</div>}
                    </div>
                  </div>
                  <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', background: tc.bg, color: tc.color }}>{tc.label}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px', fontSize: '13px', color: '#64748b' }}>
                  {cust.contact?.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Phone size={14} /> {cust.contact.phone}</div>
                  )}
                  {cust.contact?.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Mail size={14} /> {cust.contact.email}</div>
                  )}
                  {cust.address?.city && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><MapPin size={14} /> {cust.address.city}{cust.address.state ? `, ${cust.address.state}` : ''}</div>
                  )}
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', gap: '12px', padding: '10px 0', borderTop: '1px solid #f1f5f9', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                    <ShoppingCart size={14} color="#6366f1" />
                    <span style={{ color: '#334155', fontWeight: '600' }}>{cust.totalPurchases || 0}</span>
                    <span style={{ color: '#94a3b8' }}>orders</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                    <DollarSign size={14} color="#10b981" />
                    <span style={{ color: '#334155', fontWeight: '600' }}>${(cust.totalSpent || 0).toLocaleString()}</span>
                    <span style={{ color: '#94a3b8' }}>spent</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => { setSelectedCustomer(cust); fetchCustomerSales(cust._id); setShowHistoryModal(true); }}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}>
                    <ShoppingCart size={14} /> View Orders
                  </button>
                  <button onClick={() => handleEdit(cust)}
                    style={{ padding: '8px 12px', background: '#eef2ff', border: '1px solid #c7d2fe', color: '#4338ca', borderRadius: '6px', cursor: 'pointer' }}>
                    <Edit size={14} />
                  </button>
                  <button onClick={() => handleDelete(cust._id)}
                    style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '6px', cursor: 'pointer' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '28px', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>{editingId ? 'Edit' : 'Add'} Customer</h2>
              <button onClick={() => { setShowModal(false); setEditingId(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={22} color="#64748b" /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px', color: '#334155' }}>Name *</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px', color: '#334155' }}>Company</label>
                  <input type="text" value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px', color: '#334155' }}>Type</label>
                  <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', background: 'white' }}>
                    <option value="retail">Retail</option>
                    <option value="wholesale">Wholesale</option>
                    <option value="distributor">Distributor</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px', color: '#334155' }}>Phone *</label>
                  <input type="tel" required value={formData.contact.phone} onChange={(e) => setFormData({ ...formData, contact: { ...formData.contact, phone: e.target.value } })}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }} />
                </div>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px', color: '#334155' }}>Email</label>
                <input type="email" value={formData.contact.email} onChange={(e) => setFormData({ ...formData, contact: { ...formData.contact, email: e.target.value } })}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }} />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px', color: '#334155' }}>Street Address</label>
                <input type="text" value={formData.address.street} onChange={(e) => setFormData({ ...formData, address: { ...formData.address, street: e.target.value } })}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px', color: '#334155' }}>City</label>
                  <input type="text" value={formData.address.city} onChange={(e) => setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px', color: '#334155' }}>State</label>
                  <input type="text" value={formData.address.state} onChange={(e) => setFormData({ ...formData, address: { ...formData.address, state: e.target.value } })}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px', color: '#334155' }}>ZIP Code</label>
                  <input type="text" value={formData.address.zipCode} onChange={(e) => setFormData({ ...formData, address: { ...formData.address, zipCode: e.target.value } })}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }} />
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px', color: '#334155' }}>Notes</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows="2"
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => { setShowModal(false); setEditingId(null); }}
                  style={{ flex: 1, padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', cursor: 'pointer', fontWeight: '500', fontSize: '14px' }}>Cancel</button>
                <button type="submit"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', background: 'linear-gradient(135deg, #4338ca, #6366f1)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', fontSize: '14px' }}>
                  <Save size={16} /> {editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Purchase History Modal */}
      {showHistoryModal && selectedCustomer && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '28px', maxWidth: '800px', width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 4px' }}>{selectedCustomer.name}</h2>
                <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Purchase History</p>
              </div>
              <button onClick={() => { setShowHistoryModal(false); setSelectedCustomer(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={22} color="#64748b" />
              </button>
            </div>

            {/* Customer Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
              <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: '12px', color: '#16a34a', marginBottom: '4px' }}>Total Orders</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#15803d' }}>{selectedCustomer.totalPurchases || 0}</div>
              </div>
              <div style={{ background: '#eff6ff', padding: '16px', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
                <div style={{ fontSize: '12px', color: '#2563eb', marginBottom: '4px' }}>Total Spent</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#1d4ed8' }}>${(selectedCustomer.totalSpent || 0).toLocaleString()}</div>
              </div>
              <div style={{ background: '#fef3c7', padding: '16px', borderRadius: '10px', border: '1px solid #fde68a' }}>
                <div style={{ fontSize: '12px', color: '#b45309', marginBottom: '4px' }}>Avg Order</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#92400e' }}>
                  ${selectedCustomer.totalPurchases > 0 ? ((selectedCustomer.totalSpent || 0) / selectedCustomer.totalPurchases).toFixed(0) : 0}
                </div>
              </div>
            </div>

            {/* Contact & Address */}
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', marginBottom: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px' }}>
                <div>
                  <div style={{ color: '#64748b', marginBottom: '4px' }}>Phone</div>
                  <div style={{ fontWeight: '500', color: '#0f172a' }}>{selectedCustomer.contact?.phone || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', marginBottom: '4px' }}>Email</div>
                  <div style={{ fontWeight: '500', color: '#0f172a' }}>{selectedCustomer.contact?.email || 'N/A'}</div>
                </div>
                {selectedCustomer.address?.street && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{ color: '#64748b', marginBottom: '4px' }}>Address</div>
                    <div style={{ fontWeight: '500', color: '#0f172a' }}>
                      {selectedCustomer.address.street}<br />
                      {selectedCustomer.address.city}, {selectedCustomer.address.state} {selectedCustomer.address.zipCode}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sales History */}
            <h3 style={{ fontSize: '16px', fontight: '600', marginBottom: '12px' }}>Sales History</h3>
            {loadingHistory ? (
              <div style={{ textAlign: 'center', padding: '32px' }}>
                <div style={{ width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
              </div>
            ) : customerSales.length > 0 ? (
              <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                {customerSales.map((sale) => (
                  <div key={sale._id} style={{ padding: '16px', background: '#fafafa', borderRadius: '10px', marginBottom: '12px', border: '1px solid #e2e8f0' }}>
                    {/* Sale Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>{sale.saleNumber}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{new Date(sale.createdAt).toLocaleString()}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: '#10b981' }}>${sale.totalAmount?.toFixed(2)}</div>
                        <div style={{ fontSize: '12px', color: '#059669' }}>+${sale.totalProfit?.toFixed(2)} profit</div>
                      </div>
                    </div>
                    
                    {/* Items */}
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Items ({sale.items?.length || 0})</div>
                      {sale.items?.map((item, idx) => (
                        <div key={idx} style={{ fontSize: '13px', padding: '6px 0', borderBottom: '1px dashed #e2e8f0' }}>
                          <div style={{ fontWeight: '500', color: '#0f172a' }}>{item.brand} {item.model}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{item.imei} · {item.storage} {item.color}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '2px' }}>
                            <span style={{ color: '#64748b' }}>Sale Price</span>
                            <span style={{ fontWeight: '600', color: '#0f172a' }}>${item.salePrice?.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Shipping */}
                    {sale.shipping?.trackingNumber && (
                      <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', fontSize: '12px', marginBottom: '10px' }}>
                        <div style={{ fontWeight: '600', color: '#0f172a', marginBottom: '4px'}}>Shipping</div>
                        <div style={{ color: '#64748b' }}>{sale.shipping.carrier} · {sale.shipping.trackingNumber}</div>
                        {sale.shipping.address?.name && (
                          <div style={{ color: '#64748b', marginTop: '2px' }}>
                            {sale.shipping.address.name}<br />
                            {sale.shipping.address.street}<br />
                            {sale.shipping.address.city}, {sale.shipping.address.state} {sale.shipping.address.zipCode}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Financial Summary */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '11px' }}>
                      <div>
                        <div style={{ color: '#64748b' }}>Channel</div>
                        <div style={{ fontWeight: '600', color: '#0f172a' }}>{sale.salesChannel?.rplace('_', ' ')}</div>
                      </div>
                      <div>
                        <div style={{ color: '#64748b' }}>Payment</div>
                        <div style={{ fontWeight: '600', color: '#0f172a' }}>{sale.paymentMethod}</div>
                      </div>
                      <div>
                        <div style={{ color: '#64748b' }}>Status</div>
                        <div style={{ fontWeight: '600', color: '#10b981' }}>{sale.status}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px', background: '#f8fafc', borderRadius: '8px' }}>
                <ShoppingCart size={32} color="#cbd5e1" style={{ margin: '0 auto 8px' }} />
                <p style={{ color: '#64748b', fontSize: '14px' }}>No sales yet</p>
              </div>
            )}

            <button onClick={() => navigate(`/sales?customerId=${selectedCustomer._id}`)}
              style={{ width: '100%', marginTop: '16px', padding: '12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Plus size={18} /> Create New Sale
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
