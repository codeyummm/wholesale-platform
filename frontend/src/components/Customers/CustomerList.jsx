import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import {
  Plus, Search, Edit, Trash2, Phone, Mail, MapPin,
  UserCircle, Building, X, Save, Filter, DollarSign, ShoppingCart,
  Download, MoreHorizontal, ChevronDown, Eye, AlertTriangle
} from 'lucide-react';

export default function CustomerList() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
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

  const handleDelete = (id) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/customers/${deleteId}`);
      fetchCustomers();
    } catch (err) {
      alert('Failed to delete');
    } finally {
      setDeleteId(null);
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
    wholesale: { bg: 'bg-indigo-50/50', border: 'border-indigo-100', text: 'text-indigo-600', label: 'Wholesale Client' },
    retail: { bg: 'bg-emerald-50/50', border: 'border-emerald-100', text: 'text-emerald-600', label: 'Retail Buyer' },
    distributor: { bg: 'bg-amber-50/50', border: 'border-amber-100', text: 'text-amber-600', label: 'Distributor' }
  };

  return (
    <div className="bg-[#1e1e2d] min-h-screen lg:bg-[#f6f6f9] p-4 lg:p-8">
      {/* High-Level Header (Metronic Toolbar Style) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-6 mb-6 border-b border-gray-200">
        <div className="mb-4 lg:mb-0">
          <h1 className="text-[1.25rem] font-bold text-gray-900 mb-1 tracking-tight">Customer List</h1>
          <div className="text-[0.875rem] text-gray-500 font-medium flex items-center gap-1">
            {customers.length.toLocaleString()} Customers found. {Math.round((customers.filter(c => c.totalPurchases > 0).length / customers.length) * 100 || 0)}% are active
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
            <Download size={14} className="text-gray-500" /> Export
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
            More Actions <ChevronDown size={14} className="text-gray-500" />
          </button>
          <button 
            onClick={() => { resetForm(); setEditingId(null); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-[13px] font-medium hover:bg-gray-800 transition-colors shadow-sm"
          >
            <Plus size={14} /> New
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Search & Internal Header (Metronic Card Header) */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-5 border-b border-gray-200">
          <h3 className="text-[1.05rem] font-semibold text-gray-900 w-full sm:w-auto mb-4 sm:mb-0">Customers</h3>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search by ID, Name, Order #, IMEI..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-[13px] text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-gray-400"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {/* Metronic DataGrid Table Mimic */}
          <table className="w-full align-middle text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50/50">
              <tr className="border-b border-gray-200 text-[12px] font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-5 py-4 w-10 text-center">
                  <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                </th>
                <th className="px-5 py-4 font-semibold text-gray-600 cursor-pointer hover:bg-gray-100/50 transition-colors">
                  <div className="flex items-center gap-1.5">User ID <span className="text-[9px] text-gray-300 flex flex-col -space-y-1"><span>▲</span><span>▼</span></span></div>
                </th>
                <th className="px-5 py-4 font-semibold text-gray-600 cursor-pointer hover:bg-gray-100/50 transition-colors">
                  <div className="flex items-center gap-1.5">Customer <span className="text-[9px] text-gray-300 flex flex-col -space-y-1"><span>▲</span><span>▼</span></span></div>
                </th>
                <th className="px-5 py-4 font-semibold text-gray-600 cursor-pointer hover:bg-gray-100/50 transition-colors">
                  <div className="flex items-center gap-1.5">Country <span className="text-[9px] text-gray-300 flex flex-col -space-y-1"><span>▲</span><span>▼</span></span></div>
                </th>
                <th className="px-5 py-4 font-semibold text-gray-600 cursor-pointer hover:bg-gray-100/50 transition-colors">
                  <div className="flex items-center gap-1.5">Orders <span className="text-[9px] text-gray-300 flex flex-col -space-y-1"><span>▲</span><span>▼</span></span></div>
                </th>
                <th className="px-5 py-4 font-semibold text-gray-600 cursor-pointer hover:bg-gray-100/50 transition-colors">
                  <div className="flex items-center gap-1.5">Total Spent <span className="text-[9px] text-gray-300 flex flex-col -space-y-1"><span>▲</span><span>▼</span></span></div>
                </th>
                <th className="px-5 py-4 font-semibold text-gray-600 cursor-pointer hover:bg-gray-100/50 transition-colors">
                  <div className="flex items-center gap-1.5">Avg. Spent <span className="text-[9px] text-gray-300 flex flex-col -space-y-1"><span>▲</span><span>▼</span></span></div>
                </th>
                <th className="px-5 py-4 font-semibold text-gray-600 cursor-pointer hover:bg-gray-100/50 transition-colors">
                  <div className="flex items-center gap-1.5">Status <span className="text-[9px] text-gray-300 flex flex-col -space-y-1"><span>▲</span><span>▼</span></span></div>
                </th>
                <th className="px-5 py-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100/50 transition-colors border-l border-gray-200">
                  <div className="flex items-center gap-1.5 text-[13px]">Last Order <span className="text-[14px] text-gray-400 font-normal">↓</span></div>
                </th>
                <th className="px-5 py-4 w-28 border-l border-gray-200"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                   <td colSpan="10" className="px-5 py-12 text-center border-b border-gray-200">
                      <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
                      <span className="text-[13px] font-medium text-gray-500">Loading records...</span>
                   </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                   <td colSpan="10" className="px-5 py-20 text-center border-b border-gray-200">
                      <UserCircle className="mx-auto text-gray-300 mb-4" size={48} />
                      <span className="text-[14px] font-semibold text-gray-900 block mb-1">No customers found</span>
                      <span className="text-[13px] text-gray-500 block mb-4">You haven't added any customers matching this criteria.</span>
                      <button 
                        onClick={() => { resetForm(); setEditingId(null); setShowModal(true); }}
                        className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-[13px] font-bold hover:bg-blue-100 transition-colors"
                      >
                        Add Customer
                      </button>
                   </td>
                </tr>
              ) : (
                customers.map((cust) => {
                  const initials = cust.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                  const shortId = cust._id.slice(-5).toUpperCase() + '-' + initials.substring(0,2);
                  const isActive = cust.totalPurchases > 0;
                  const avgSpent = cust.totalPurchases > 0 ? (cust.totalSpent || 0) / cust.totalPurchases : 0;
                  
                  return (
                    <tr key={cust._id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-5 py-3 text-center border-r border-gray-100/0"><input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" /></td>
                      <td className="px-5 py-3 border-r border-gray-100/0">
                        <span className="text-[13px] font-medium text-blue-500 hover:text-blue-600 hover:underline cursor-pointer">
                          {shortId}
                        </span>
                      </td>
                      <td className="px-5 py-3 border-r border-gray-100/0">
                        <div className="flex items-center gap-2.5">
                          {/* Metronic style Avatar */}
                          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-[12px] font-semibold text-orange-600 shrink-0 border border-orange-200">
                            {initials}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[13px] font-medium text-gray-900 leading-tight focus:outline-none">{cust.name}</span>
                            <span className="text-[12px] text-gray-500 leading-tight">{cust.contact?.email || 'no-email@client.com'}</span>
                            {cust.ebayUsername && <span className="text-[11px] text-[#009EF7] font-bold mt-0.5 tracking-tight flex items-center gap-1"><ShoppingCart size={10} /> {cust.ebayUsername}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 border-r border-gray-100/0">
                         <div className="flex items-center gap-1.5">
                           <span className="text-[14px]">🇺🇸</span>
                           <span className="text-[13px] font-medium text-gray-700">USA</span>
                         </div>
                      </td>
                      <td className="px-5 py-3 text-[13px] font-medium text-gray-700 border-r border-gray-100/0">
                        {cust.totalPurchases || 0}
                      </td>
                      <td className="px-5 py-3 text-[13px] font-medium text-gray-900 border-r border-gray-100/0">
                        ${(cust.totalSpent || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </td>
                      <td className="px-5 py-3 text-[13px] font-medium text-gray-700 border-r border-gray-100/0">
                        ${avgSpent.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </td>
                      <td className="px-5 py-3 border-r border-gray-100/0">
                        {isActive ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 text-[11px] font-medium border border-emerald-100 inline-block text-center min-w-[50px]">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-600 text-[11px] font-medium border border-amber-100 inline-block text-center min-w-[50px]">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-[14px] font-medium text-gray-900 border-l border-gray-200">
                         28 Apr, 2025
                      </td>
                      <td className="px-5 py-3 border-l text-center border-gray-200">
                        <div className="flex items-center justify-center gap-4">
                          <button onClick={() => navigate(`/customers/${cust._id}/orders`)} className="text-gray-500 hover:text-blue-500 transition-colors" title="View"><Eye size={18} strokeWidth={1.5} /></button>
                          <button onClick={() => handleEdit(cust)} className="text-gray-500 hover:text-blue-500 transition-colors" title="Edit"><Edit size={18} strokeWidth={1.5} /></button>
                          <button onClick={() => handleDelete(cust._id)} className="text-gray-500 hover:text-red-500 transition-colors" title="Delete"><Trash2 size={18} strokeWidth={1.5} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Premium Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-in fade-in transition-opacity">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in duration-200">
            <div className="flex shrink-0 items-center justify-between px-8 py-6 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-black text-gray-900">{editingId ? 'Modify' : 'Register'} Customer</h2>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">Account Management Subsystem</p>
              </div>
              <button onClick={() => { setShowModal(false); setEditingId(null); }} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"><X size={24}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 pt-6">
              <form onSubmit={handleSubmit} id="customer-form" className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                      <UserCircle size={14} className="text-[#009EF7]" /> Full Name
                    </label>
                    <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[14px] font-bold focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Building size={14} className="text-[#009EF7]" /> Company
                    </label>
                    <input type="text" value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[14px] font-bold focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                      Account Type
                    </label>
                    <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[14px] font-black focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none cursor-pointer">
                      <option value="retail">Retail Account</option>
                      <option value="wholesale">Wholesale Account</option>
                      <option value="distributor">Distributor Account</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Phone size={14} className="text-[#009EF7]" /> Contact Phone
                    </label>
                    <input type="tel" required value={formData.contact.phone} onChange={(e) => setFormData({ ...formData, contact: { ...formData.contact, phone: e.target.value } })}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[14px] font-bold focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Mail size={14} className="text-[#009EF7]" /> Email Address
                  </label>
                  <input type="email" value={formData.contact.email} onChange={(e) => setFormData({ ...formData, contact: { ...formData.contact, email: e.target.value } })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[14px] font-bold focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none placeholder:font-normal" placeholder="email@client.com" />
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-100 pb-2 flex items-center gap-1.5 w-full">
                    <MapPin size={14} className="text-[#009EF7]" /> Billing/Shipping Address
                  </label>
                  <div className="space-y-4 pt-2">
                    <input type="text" placeholder="Street Address" value={formData.address.street} onChange={(e) => setFormData({ ...formData, address: { ...formData.address, street: e.target.value } })}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[14px] font-bold focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none" />
                    <div className="grid grid-cols-3 gap-3">
                      <input type="text" placeholder="City" value={formData.address.city} onChange={(e) => setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-[14px] font-bold focus:bg-white transition-all outline-none" />
                      <input type="text" placeholder="ST" value={formData.address.state} onChange={(e) => setFormData({ ...formData, address: { ...formData.address, state: e.target.value } })}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-[14px] font-bold focus:bg-white transition-all outline-none text-center" />
                      <input type="text" placeholder="ZIP" value={formData.address.zipCode} onChange={(e) => setFormData({ ...formData, address: { ...formData.address, zipCode: e.target.value } })}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-[14px] font-bold focus:bg-white transition-all outline-none" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Internal Notes</label>
                   <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows="2" placeholder="Prefered contact times, business focus, etc..."
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[14px] font-medium focus:bg-white transition-all outline-none resize-none placeholder:font-normal" />
                </div>
              </form>
            </div>

            <div className="shrink-0 p-8 pt-0 flex gap-4">
              <button type="button" onClick={() => { setShowModal(false); setEditingId(null); }}
                className="flex-1 py-3.5 bg-gray-100 text-gray-700 font-black text-[13px] rounded-xl hover:bg-gray-200 transition-all uppercase tracking-widest active:scale-95 shadow-sm">
                Cancel
              </button>
              <button type="submit" form="customer-form"
                className="flex-[1.5] flex items-center justify-center gap-2 py-3.5 bg-[#009EF7] text-white font-black text-[13px] rounded-xl hover:bg-[#008de0] transition-all uppercase tracking-widest active:scale-95 shadow-lg shadow-blue-500/30">
                <Save size={18} />
                {editingId ? 'Update Profile' : 'Confirm Registration'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4 animate-in fade-in transition-opacity">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in zoom-in duration-200">
            <div className="flex shrink-0 items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-black text-gray-900">Delete Customer</h2>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">Permanent Action</p>
              </div>
              <button onClick={() => setDeleteId(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"><X size={20}/></button>
            </div>
            
            <div className="p-6">
               <div className="bg-red-50 text-red-600 rounded-xl p-4 flex items-start gap-4 border border-red-100 mb-6">
                 <div className="bg-red-100 p-2 rounded-lg shrink-0 mt-0.5">
                   <AlertTriangle size={20} className="text-red-600" />
                 </div>
                 <div>
                   <h3 className="text-[14px] font-bold">Are you absolutely sure?</h3>
                   <p className="text-[13px] font-medium opacity-90 mt-1 leading-relaxed">This action cannot be undone. This will permanently delete the customer profile, historical data, and remove their records.</p>
                 </div>
               </div>
               
               <div className="flex gap-4">
                  <button onClick={() => setDeleteId(null)}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 font-black text-[13px] rounded-xl hover:bg-gray-200 transition-all uppercase tracking-widest active:scale-95 shadow-sm">
                    Cancel
                  </button>
                  <button onClick={confirmDelete}
                    className="flex-1 py-3 bg-red-500 text-white font-black text-[13px] rounded-xl hover:bg-red-600 transition-all uppercase tracking-widest active:scale-95 shadow-lg shadow-red-500/30 flex justify-center items-center gap-2">
                    <Trash2 size={16} /> Delete Data
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
