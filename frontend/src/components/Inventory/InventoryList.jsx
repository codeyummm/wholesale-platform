import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { Plus, Search, Trash2, Edit, Camera, ChevronDown, ChevronUp, X, Save, Smartphone, Printer, Loader2, DollarSign, History } from 'lucide-react';
import QRCode from 'qrcode';
import Barcode from 'react-barcode';
import InvoiceScanner from '../InvoiceScanner';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

export default function InventoryList() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDeviceHistory, setShowDeviceHistory] = useState(false);
  const [selectedDeviceHistory, setSelectedDeviceHistory] = useState(null);
  const [showScanModal, setShowScanModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeviceEditModal, setShowDeviceEditModal] = useState(false);
  const [showLabelModal, setShowLabelModal] = useState(false);

  const [editItem, setEditItem] = useState(null);
  const [editDevice, setEditDevice] = useState(null);
  const [editDeviceIndex, setEditDeviceIndex] = useState(null);
  const [editInventoryId, setEditInventoryId] = useState(null);
  const [labelDevice, setLabelDevice] = useState(null);
  const [labelInventory, setLabelInventory] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [expandedRows, setExpandedRows] = useState({});
  const labelRef = useRef(null);

  // ── Stats & Filters ──────────────────────────────────────────
  const [stats, setStats]               = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [showStats, setShowStats]       = useState(true);
  const [filterBrand, setFilterBrand]   = useState('');
  const [filterCondition, setFilterCondition] = useState('');
  const [filterStock, setFilterStock]   = useState(''); // 'low' | 'out' | 'ok'
  const [filterStatus, setFilterStatus] = useState(''); // 'available' | 'sold'
  const [formData, setFormData] = useState({
    model: '',
    brand: '',
    quantity: 1,
    price: { cost: 0, retail: 0 },
    specifications: { storage: '', color: '', ram: '' }
  });

  useEffect(() => { fetchInventory(); }, [search, filterBrand, filterCondition, filterStock, filterStatus]);
  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/inventory/stats`);
      if (res.data.success) setStats(res.data.data);
    } catch (err) { console.error(err); }
    finally { setStatsLoading(false); }
  };

  const fetchInventory = async () => {
    try {
      let url = `${import.meta.env.VITE_API_URL}/inventory?search=${search}`;
      if (filterBrand)     url += `&brand=${encodeURIComponent(filterBrand)}`;
      if (filterCondition) url += `&condition=${encodeURIComponent(filterCondition)}`;
      if (filterStock === 'low')  url += `&lowStock=true`;
      if (filterStock === 'out')  url += `&outOfStock=true`;
      if (filterStatus === 'available') url += `&available=true`;
      if (filterStatus === 'sold')      url += `&hasSold=true`;
      const res = await axios.get(url);
      let data = res.data.data || [];

      // Client-side filtering for conditions not yet on backend
      if (filterBrand)     data = data.filter(i => i.brand?.toLowerCase() === filterBrand.toLowerCase());
      if (filterCondition) data = data.filter(i => i.devices?.some(d => d.condition === filterCondition));
      if (filterStock === 'low')  data = data.filter(i => { const a = i.devices?.filter(d=>!d.isSold).length ?? i.quantity; return a > 0 && a < 10; });
      if (filterStock === 'out')  data = data.filter(i => { const a = i.devices?.filter(d=>!d.isSold).length ?? i.quantity; return a === 0; });
      if (filterStatus === 'available') data = data.filter(i => (i.devices?.filter(d=>!d.isSold).length ?? i.quantity) > 0);
      if (filterStatus === 'sold')      data = data.filter(i => i.devices?.some(d => d.isSold));

      setInventory(data);
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

  

  const handleEditDevice = (inventoryId, device, deviceIndex, inventoryItem) => {
    setEditInventoryId(inventoryId);
    setEditDevice(JSON.parse(JSON.stringify(device)));
    setEditDeviceIndex(deviceIndex);
    setEditItem(inventoryItem);
    setShowDeviceEditModal(true);
  };
  const handleViewDeviceHistory = async (inventoryId, device) => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/inventory/${inventoryId}`);
      if (res.data.success) {
        const foundDevice = res.data.data.devices.find(d => d.imei === device.imei);
        setSelectedDeviceHistory({ ...foundDevice, inventoryId, brand: res.data.data.brand, model: res.data.data.model });
        setShowDeviceHistory(true);
      }
    } catch (err) { console.error(err); }
  };

  const handleUpdateDevice = async () => {
    try {
      const item = inventory.find(i => i._id === editInventoryId);
      if (!item) return;
      const updatedDevices = [...item.devices];
      updatedDevices[editDeviceIndex] = editDevice;
      await axios.put(`${import.meta.env.VITE_API_URL}/inventory/${editInventoryId}`, { ...item, devices: updatedDevices });
      setShowDeviceEditModal(false);
      setEditDevice(null);
      setEditDeviceIndex(null);
      setEditInventoryId(null);
      fetchInventory();
      alert('Device updated successfully!');
    } catch (err) {
      alert('Failed to update: ' + (err.response?.data?.message || err.message));
    }
  };

  const handlePrintLabel = async (device, inventoryItem) => {
    setLabelDevice(device);
    setLabelInventory(inventoryItem);
    const deviceUrl = `${window.location.origin}/device/${inventoryItem._id}/${device.imei}`;
    try {
      const qrUrl = await QRCode.toDataURL(deviceUrl, { width: 80, margin: 1 });
      setQrCodeUrl(qrUrl);
    } catch (err) {
      console.error('QR generation error:', err);
    }
    setShowLabelModal(true);
  };

  const printLabel = () => {
    const printContent = labelRef.current;
    const printWindow = window.open('', '', 'width=400,height=300');
    printWindow.document.write('<html><head><title>Print Label</title><style>@page { size: auto; margin: 0; } body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; } .label { width: 2.125in; height: 1in; box-sizing: border-box; font-family: Arial, sans-serif; }</style></head><body>' + printContent.outerHTML + '</body></html>');
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
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

  const updateEditField = (field, value) => setEditItem(prev => ({ ...prev, [field]: value }));
  const updateEditPrice = (field, value) => setEditItem(prev => ({ ...prev, price: { ...prev.price, [field]: parseFloat(value) || 0 } }));
  const updateEditSpec = (field, value) => setEditItem(prev => ({ ...prev, specifications: { ...prev.specifications, [field]: value } }));
  const updateDeviceImei = (deviceIndex, value) => setEditItem(prev => { const newDevices = [...(prev.devices || [])]; newDevices[deviceIndex] = { ...newDevices[deviceIndex], imei: value }; return { ...prev, devices: newDevices }; });
  const updateDeviceField = (deviceIndex, field, value) => setEditItem(prev => { const newDevices = [...(prev.devices || [])]; newDevices[deviceIndex] = { ...newDevices[deviceIndex], [field]: value }; return { ...prev, devices: newDevices }; });

  const addDevice = () => setEditItem(prev => ({ ...prev, quantity: (prev.quantity || 0) + 1, devices: [...(prev.devices || []), { imei: '555500000000000', unlockStatus: 'unlocked', condition: 'used', grade: 'Grade 5', isSold: false }] }));
  const removeDevice = (deviceIndex) => setEditItem(prev => ({ ...prev, quantity: Math.max(0, (prev.quantity || 1) - 1), devices: prev.devices.filter((_, i) => i !== deviceIndex) }));
  const toggleRow = (id) => setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  const resetForm = () => setFormData({ model: '', brand: '', quantity: 1, price: { cost: 0, retail: 0 }, specifications: { storage: '', color: '', ram: '' } });
  const handleScanComplete = () => { setShowScanModal(false); fetchInventory(); alert('Invoice scanned and saved successfully!'); };

  const COLORS = ['#009EF7','#7239EA','#50CD89','#F1416C','#FFC700','#3F4254','#7E8299','#181C32'];

  const fmt = (n) => n >= 1000000 ? `$${(n/1000000).toFixed(1)}M` : n >= 1000 ? `$${(n/1000).toFixed(1)}K` : `$${n.toFixed(0)}`;

  const allBrands = stats?.brandBreakdown?.map(b => b.brand) || [];

  const hasActiveFilter = filterBrand || filterCondition || filterStock || filterStatus;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <div className="flex gap-3">
            <button
              onClick={() => setShowStats(prev => !prev)}
              className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-all border ${
                showStats ? 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}>
              {showStats ? 'Hide Stats' : 'Show Stats'}
            </button>
            <button onClick={() => setShowScanModal(true)} className="flex items-center gap-2 bg-purple-100 hover:bg-purple-200 text-purple-700 px-5 py-2.5 rounded-lg font-medium transition-all"><Camera size={20} />Scan Invoice</button>
            <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-cyan-100 hover:bg-cyan-200 text-cyan-700 px-5 py-2.5 rounded-lg font-medium transition-colors"><Plus size={20} />Add Item</button>
          </div>
        </div>

        {/* ── Stats Dashboard ───────────────────────────────────────── */}
        {showStats && (
          <div className="mb-6">
            {statsLoading ? (
              <div className="flex items-center justify-center h-40 bg-white rounded-2xl border border-gray-200">
                <Loader2 className="animate-spin text-indigo-500" size={28} />
              </div>
            ) : stats ? (
              <div className="space-y-4">
                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  {[
                    { label: 'SKUs',          value: stats.totals.totalItems.toLocaleString(),   accent: '#009EF7' },
                    { label: 'Total Units',   value: stats.totals.totalUnits.toLocaleString(),   accent: '#7239EA' },
                    { label: 'Available',     value: stats.totals.availDevices.toLocaleString(), accent: '#50CD89' },
                    { label: 'Sold Devices',  value: stats.totals.soldDevices.toLocaleString(),  accent: '#3F4254' },
                    { label: 'Low Stock',     value: stats.totals.lowStock.toLocaleString(),     accent: '#FFC700' },
                    { label: 'Cost Value',    value: fmt(stats.totals.totalCostVal),              accent: '#F1416C' },
                    { label: 'Retail Value',  value: fmt(stats.totals.totalRetailVal),            accent: '#009EF7' },
                  ].map((card, i) => (
                    <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col gap-1.5" style={{ borderLeft: `3px solid ${card.accent}` }}>
                      <div className="text-xl font-bold text-gray-900 leading-tight">{card.value}</div>
                      <div className="text-xs font-medium text-gray-500">{card.label}</div>
                    </div>
                  ))}
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

                  {/* Brand Bar Chart */}
                  <div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Units by Brand</h3>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={stats.brandBreakdown} margin={{ top:0, right:10, left:-10, bottom:0 }}>
                        <XAxis dataKey="brand" tick={{ fontSize: 11, fill: '#7E8299' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#7E8299' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E4E6EF' }} formatter={(v) => [v, 'Units']} />
                        <Bar dataKey="units" radius={[4,4,0,0]}>
                          {stats.brandBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Condition Pie */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Condition Mix</h3>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={stats.conditionBreakdown.filter(d=>d.value>0)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 10 }}>
                          {stats.conditionBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E4E6EF' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Stock Distribution */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Stock Levels</h3>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={stats.stockBuckets} margin={{ top:0, right:10, left:-10, bottom:0 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#7E8299' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#7E8299' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E4E6EF' }} formatter={(v) => [v, 'SKUs']} />
                        <Bar dataKey="value" radius={[4,4,0,0]}>
                          {stats.stockBuckets.map((entry, i) => (
                            <Cell key={i} fill={entry.name === 'Out of Stock' ? '#F1416C' : entry.name === '1-5' ? '#FFC700' : '#009EF7'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* ── Filters + Search ─────────────────────────────────────── */}
        <div className="mb-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input type="text" placeholder="Search by model, brand, or IMEI..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
          </div>

          {/* Filter row */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-semibold text-gray-500">Filter:</span>

            {/* Brand */}
            <select value={filterBrand} onChange={e => setFilterBrand(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 cursor-pointer">
              <option value="">All Brands</option>
              {allBrands.map(b => <option key={b} value={b}>{b}</option>)}
            </select>

            {/* Condition */}
            <select value={filterCondition} onChange={e => setFilterCondition(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 cursor-pointer">
              <option value="">All Conditions</option>
              <option value="new">New</option>
              <option value="refurbished">Refurbished</option>
              <option value="used">Used</option>
            </select>

            {/* Stock level */}
            <select value={filterStock} onChange={e => setFilterStock(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 cursor-pointer">
              <option value="">All Stock Levels</option>
              <option value="low">⚠️ Low Stock (&lt;10)</option>
              <option value="out">🔴 Out of Stock</option>
            </select>

            {/* Availability */}
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 cursor-pointer">
              <option value="">All Status</option>
              <option value="available">✅ Has Available</option>
              <option value="sold">📦 Has Sold</option>
            </select>

            {/* Clear filters */}
            {hasActiveFilter && (
              <button onClick={() => { setFilterBrand(''); setFilterCondition(''); setFilterStock(''); setFilterStatus(''); }}
                className="px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-500 border border-red-200 rounded-full hover:bg-red-100 transition-colors flex items-center gap-1">
                <X size={12} /> Clear
              </button>
            )}

            <span className="ml-auto text-xs text-gray-400 font-medium">{inventory.length} items shown</span>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200">
            <Loader2 className="animate-spin text-[#009EF7] mb-4" size={40} />
            <p className="text-gray-500 font-medium">Loading inventory...</p>
          </div>
        ) : inventory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <Smartphone size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">No Inventory Found</h3>
            <p className="text-gray-500 mb-6">Start by adding items manually or scanning an invoice.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowScanModal(true)} className="px-5 py-2.5 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-xl text-sm font-bold transition-colors shadow-sm">Scan Invoice</button>
              <button onClick={() => setShowModal(true)} className="px-5 py-2.5 bg-[#009EF7] hover:bg-[#0086d1] text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-blue-500/20">Add Manually</button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700"></th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Product</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Specs</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Stock</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Price</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((item) => {
                    const available = item.devices?.filter(d => !d.isSold).length || 0;
                    const isExpanded = expandedRows[item._id];
                    return (
                      <React.Fragment key={item._id}>
                        <tr className={`border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${isExpanded ? 'bg-gray-50/50' : ''}`}>
                          <td className="px-6 py-4">
                            <button onClick={() => toggleRow(item._id)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                              {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-gray-900">{item.model}</div>
                            <div className="text-sm text-gray-500">{item.brand}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              {item.specifications?.storage && <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium">{item.specifications.storage}</span>}
                              {item.specifications?.color && <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium">{item.specifications.color}</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${available < 10 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>{available} / {item.quantity}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-gray-900">${item.price?.retail?.toFixed(2) || '0.00'}</div>
                            <div className="text-sm text-gray-500">Cost: ${item.price?.cost?.toFixed(2) || '0.00'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button onClick={() => handleEdit(item)} className="p-2 text-gray-400 hover:text-[#009EF7] hover:bg-blue-50 rounded-lg transition-colors" title="Edit Item"><Edit size={18} /></button>
                              <button onClick={() => handleDelete(item._id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete Item"><Trash2 size={18} /></button>
                            </div>
                          </td>
                        </tr>
                      {isExpanded && (
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <td colSpan="6" className="p-0">
                            <div className="px-8 py-5">
                              <div className="flex justify-between items-center mb-4">
                                <h4 className="text-sm font-bold text-gray-900 m-0">Devices ({item.devices?.length || 0})</h4>
                                <button onClick={() => handleEdit(item)} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#009EF7]/10 text-[#009EF7] hover:bg-[#009EF7]/20 rounded-lg text-xs font-bold transition-colors">
                                  <Plus size={14} /> Add Device
                                </button>
                              </div>
                              {item.devices && item.devices.length > 0 ? (
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {item.devices.map((device, idx) => (
                                      <div key={idx} className={`flex flex-col bg-white p-4 rounded-xl border ${device.isSold ? 'border-red-100 shadow-[0_2px_10px_rgba(239,68,68,0.04)] opacity-80' : 'border-gray-200 shadow-[0_2px_10px_rgba(0,0,0,0.03)]'} transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] group`}>
                                        <div className="flex justify-between items-center mb-3">
                                          <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">#{idx + 1}</span>
                                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${device.isSold ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                            {device.isSold ? 'Sold' : 'Available'}
                                          </span>
                                        </div>
                                        <div className="font-mono text-xs text-gray-800 mb-3 bg-gray-50/80 p-2 rounded-lg border border-gray-100/80 flex items-center justify-center gap-2">
                                          <span className="text-gray-400 font-sans text-[10px]">IMEI</span> 
                                          <span className="font-bold tracking-wider">{device.imei || 'N/A'}</span>
                                        </div>
                                        <div className="flex flex-wrap justify-center gap-1.5 mb-3">
                                          <span className="px-2 py-0.5 bg-white border border-gray-200 shadow-sm text-gray-600 rounded text-[10px] font-semibold capitalize">{device.unlockStatus?.replace('_', ' ')}</span>
                                          <span className="px-2 py-0.5 bg-white border border-gray-200 shadow-sm text-gray-600 rounded text-[10px] font-semibold capitalize">{device.condition}</span>
                                          <span className="px-2 py-0.5 bg-white border border-gray-200 shadow-sm text-gray-600 rounded text-[10px] font-semibold capitalize">{device.grade}</span>
                                        </div>
                                        <div className="flex flex-wrap justify-center gap-2 mt-auto">
                                          <button onClick={() => handleEditDevice(item._id, device, idx, item)} className="flex-1 min-w-[70px] flex items-center justify-center gap-1.5 px-2 py-2 bg-white border border-gray-200 hover:border-[#009EF7] hover:bg-blue-50 text-gray-600 hover:text-[#009EF7] rounded-xl text-[11px] font-bold transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-md">
                                            <Edit size={13} /> Edit
                                          </button>
                                          <button onClick={() => handlePrintLabel(device, item)} className="flex-1 min-w-[70px] flex items-center justify-center gap-1.5 px-2 py-2 bg-white border border-gray-200 hover:border-emerald-400 hover:bg-emerald-50 text-gray-600 hover:text-emerald-600 rounded-xl text-[11px] font-bold transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-md">
                                            <Printer size={13} /> Label
                                          </button>
                                          <button onClick={() => handleViewDeviceHistory(item._id, device)} className="flex-1 min-w-[80px] flex items-center justify-center gap-1.5 px-2 py-2 bg-white border border-gray-200 hover:border-amber-400 hover:bg-amber-50 text-gray-600 hover:text-amber-600 rounded-xl text-[11px] font-bold transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-md">
                                            <History size={13} /> History
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>   ) : (
                                <div className="text-center py-6 bg-white rounded-xl border border-gray-200 border-dashed">
                                  <p className="text-sm text-gray-500">No devices registered. Click Edit to add IMEIs.</p>
                                </div>
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
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Add New Item</h2>
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Model *</label>
                    <input type="text" required value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} placeholder="iPhone 15 Pro" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#009EF7]/20 focus:border-[#009EF7] outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Brand *</label>
                    <input type="text" required value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} placeholder="Apple" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#009EF7]/20 focus:border-[#009EF7] outline-none transition-all" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Storage</label>
                    <input type="text" value={formData.specifications.storage} onChange={(e) => setFormData({ ...formData, specifications: { ...formData.specifications, storage: e.target.value } })} placeholder="256GB" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#009EF7]/20 focus:border-[#009EF7] outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Color</label>
                    <input type="text" value={formData.specifications.color} onChange={(e) => setFormData({ ...formData, specifications: { ...formData.specifications, color: e.target.value } })} placeholder="Black" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#009EF7]/20 focus:border-[#009EF7] outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Quantity *</label>
                    <input type="number" required min="1" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#009EF7]/20 focus:border-[#009EF7] outline-none transition-all" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Cost Price *</label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input type="number" required min="0" step="0.01" value={formData.price.cost} onChange={(e) => setFormData({ ...formData, price: { ...formData.price, cost: parseFloat(e.target.value) } })} placeholder="999.00" className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#009EF7]/20 focus:border-[#009EF7] outline-none transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Retail Price *</label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input type="number" required min="0" step="0.01" value={formData.price.retail} onChange={(e) => setFormData({ ...formData, price: { ...formData.price, retail: parseFloat(e.target.value) } })} placeholder="1199.00" className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#009EF7]/20 focus:border-[#009EF7] outline-none transition-all" />
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="flex-1 px-4 py-3 rounded-xl font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-3 bg-[#009EF7] hover:bg-[#0086d1] text-white rounded-xl font-bold transition-colors shadow-lg shadow-blue-500/20">Add Item</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showEditModal && editItem && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 m-0">Edit Inventory Item</h2>
                <button onClick={() => setShowEditModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"><X size={24} /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div><label className="block text-sm font-bold text-gray-700 mb-1.5">Model</label><input type="text" value={editItem.model || ''} onChange={(e) => updateEditField('model', e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#009EF7]/20 focus:border-[#009EF7] outline-none transition-all" /></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-1.5">Brand</label><input type="text" value={editItem.brand || ''} onChange={(e) => updateEditField('brand', e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#009EF7]/20 focus:border-[#009EF7] outline-none transition-all" /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-5">
                <div><label className="block text-sm font-bold text-gray-700 mb-1.5">Storage</label><input type="text" value={editItem.specifications?.storage || ''} onChange={(e) => updateEditSpec('storage', e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#009EF7]/20 focus:border-[#009EF7] outline-none transition-all" /></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-1.5">Color</label><input type="text" value={editItem.specifications?.color || ''} onChange={(e) => updateEditSpec('color', e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#009EF7]/20 focus:border-[#009EF7] outline-none transition-all" /></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-1.5">Cost Price</label><div className="relative"><DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} /><input type="number" step="0.01" value={editItem.price?.cost || 0} onChange={(e) => updateEditPrice('cost', e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#009EF7]/20 focus:border-[#009EF7] outline-none transition-all" /></div></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-1.5">Retail Price</label><div className="relative"><DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} /><input type="number" step="0.01" value={editItem.price?.retail || 0} onChange={(e) => updateEditPrice('retail', e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#009EF7]/20 focus:border-[#009EF7] outline-none transition-all" /></div></div>
              </div>
              <div className="bg-gray-50 rounded-xl p-5 mb-8 border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900 m-0">Devices / IMEIs ({editItem.devices?.length || 0})</h3>
                  <button onClick={addDevice} className="flex items-center gap-2 px-4 py-2 bg-[#009EF7] hover:bg-[#0086d1] text-white rounded-lg text-sm font-bold transition-colors"><Plus size={16} /> Add Device</button>
                </div>
                <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {editItem.devices && editItem.devices.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      {editItem.devices.map((device, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-bold text-gray-700">Device #{idx + 1}</span>
                            <button onClick={() => removeDevice(idx)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={16} /></button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                            <div className="col-span-1 md:col-span-4"><label className="block text-xs font-bold text-gray-500 mb-1">IMEI</label><input type="text" value={device.imei || ''} onChange={(e) => updateDeviceImei(idx, e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#009EF7]/20 focus:border-[#009EF7] outline-none font-mono text-sm" /></div>
                            <div className="col-span-1 md:col-span-3"><label className="block text-xs font-bold text-gray-500 mb-1">Status</label><select value={device.unlockStatus || 'unlocked'} onChange={(e) => updateDeviceField(idx, 'unlockStatus', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#009EF7]/20 focus:border-[#009EF7] outline-none text-sm bg-white"><option value="unlocked">Unlocked</option><option value="locked">Locked</option><option value="carrier_locked">Carrier</option></select></div>
                            <div className="col-span-1 md:col-span-3"><label className="block text-xs font-bold text-gray-500 mb-1">Condition</label><select value={device.condition || 'used'} onChange={(e) => updateDeviceField(idx, 'condition', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#009EF7]/20 focus:border-[#009EF7] outline-none text-sm bg-white"><option value="new">New</option><option value="refurbished">Refurbished</option><option value="used">Used</option></select></div>
                            <div className="col-span-1 md:col-span-2"><label className="block text-xs font-bold text-gray-500 mb-1">Sold?</label><select value={device.isSold ? 'yes' : 'no'} onChange={(e) => updateDeviceField(idx, 'isSold', e.target.value === 'yes')} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#009EF7]/20 focus:border-[#009EF7] outline-none text-sm bg-white"><option value="no">No</option><option value="yes">Yes</option></select></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 bg-white rounded-xl border border-gray-200 border-dashed">No devices. Click "Add Device" to add IMEIs.</div>
                  )}
                </div>
              </div>
              <div className="flex gap-4">
                <button onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-3 rounded-xl font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 transition-colors">Cancel</button>
                <button onClick={handleUpdateItem} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#009EF7] hover:bg-[#0086d1] text-white rounded-xl font-bold transition-colors shadow-lg shadow-blue-500/20"><Save size={18} /> Save Changes</button>
              </div>
            </div>
          </div>
        )}

        {showDeviceEditModal && editDevice && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-xl w-full animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 m-0">Edit Device</h2>
                <button onClick={() => setShowDeviceEditModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"><X size={24} /></button>
              </div>
              <div className="mb-5">
                <label className="block text-sm font-bold text-gray-700 mb-1.5">IMEI</label>
                <input type="text" value={editDevice.imei || ''} onChange={(e) => setEditDevice({ ...editDevice, imei: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#009EF7]/20 focus:border-[#009EF7] outline-none font-mono transition-all" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Unlock Status</label>
                  <select value={editDevice.unlockStatus || 'unlocked'} onChange={(e) => setEditDevice({ ...editDevice, unlockStatus: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#009EF7]/20 focus:border-[#009EF7] outline-none bg-white transition-all">
                    <option value="unlocked">Unlocked</option>
                    <option value="locked">Locked</option>
                    <option value="carrier_locked">Carrier Locked</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Condition</label>
                  <select value={editDevice.condition || 'used'} onChange={(e) => setEditDevice({ ...editDevice, condition: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#009EF7]/20 focus:border-[#009EF7] outline-none bg-white transition-all">
                    <option value="new">New</option>
                    <option value="refurbished">Refurbished</option>
                    <option value="used">Used</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Grade</label>
                  <input type="text" value={editDevice.grade || ''} onChange={(e) => setEditDevice({ ...editDevice, grade: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#009EF7]/20 focus:border-[#009EF7] outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Sold Status</label>
                  <select value={editDevice.isSold ? 'yes' : 'no'} onChange={(e) => setEditDevice({ ...editDevice, isSold: e.target.value === 'yes' })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#009EF7]/20 focus:border-[#009EF7] outline-none bg-white transition-all">
                    <option value="no">Available</option>
                    <option value="yes">Sold</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-4">
                <button onClick={() => setShowDeviceEditModal(false)} className="flex-1 px-4 py-3 rounded-xl font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 transition-colors">Cancel</button>
                <button onClick={handleUpdateDevice} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#009EF7] hover:bg-[#0086d1] text-white rounded-xl font-bold transition-colors shadow-lg shadow-blue-500/20"><Save size={18} /> Save</button>
              </div>
            </div>
          </div>
        )}

        {showLabelModal && labelDevice && labelInventory && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 m-0">Print Label</h2>
                <button onClick={() => setShowLabelModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"><X size={24} /></button>
              </div>
              <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-6 mb-6">
                <p className="text-xs font-bold text-gray-500 mb-3 text-center uppercase tracking-wider">Label Preview (1" x 2-1/8")</p>
                <div ref={labelRef} className="label" style={{ width: '2.125in', height: '1in', background: 'white', border: '1.5px solid black', borderRadius: '6px', margin: '0 auto', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'Arial, sans-serif', color: 'black' }}>
                  {/* Top Section */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 6px', borderBottom: '1px solid black', height: '24px', flexShrink: 0, overflow: 'hidden' }}>
                    <img src="/udeal-logo.png" alt="Udeal Logo" style={{ height: '18px', objectFit: 'contain', flexShrink: 0, transform: 'scaleX(1.1)', transformOrigin: 'left center' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: '1', minWidth: 0, marginLeft: '6px' }}>
                      <div style={{ fontSize: '8px', fontWeight: '800', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                        {labelInventory.brand === 'Apple' ? labelInventory.model : `${labelInventory.brand} ${labelInventory.model}`}
                      </div>
                      <div style={{ fontSize: '6px', fontWeight: '500', marginTop: '2px', whiteSpace: 'nowrap' }}>
                        {[labelInventory.specifications?.storage, labelInventory.specifications?.color].filter(Boolean).join(' | ') || '128GB | Red'}
                      </div>
                    </div>
                  </div>

                  {/* Barcode Section (Full Width, Center Aligned) */}
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '22px', borderBottom: '1px solid black', flexShrink: 0, overflow: 'hidden', paddingTop: '2px', width: '100%' }}>
                    <Barcode value={labelDevice.imei || '000000000000000'} width={1.1} height={18} fontSize={0} margin={0} displayValue={false} />
                  </div>

                  {/* Lower Half */}
                  <div style={{ display: 'flex', height: '46px', flexShrink: 0 }}>
                    
                    {/* Left Side (IMEI + Pills) */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      
                      {/* IMEI Box */}
                      <div style={{ padding: '2px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '28px', minWidth: 0, borderBottom: '1px solid black' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, justifyContent: 'center' }}>
                          <div style={{ fontSize: '5px', fontWeight: '400', whiteSpace: 'nowrap' }}>{labelDevice.imei2 ? 'IMEI (1):' : 'IMEI:'} {labelDevice.imei}</div>
                          {labelDevice.imei2 && <div style={{ fontSize: '5px', fontWeight: '400', whiteSpace: 'nowrap' }}>IMEI (2): {labelDevice.imei2}</div>}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start', minWidth: 0, paddingLeft: '4px', paddingRight: '4px', justifyContent: 'center' }}>
                          <div style={{ fontSize: '5px', fontWeight: '400', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '60px' }}>SN: {labelDevice.serialNumber || 'N/A'}</div>
                          <div style={{ fontSize: '5px', fontWeight: '400', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '60px' }}>ID: {labelDevice.systemId || labelDevice._id?.slice(-6).toUpperCase() || 'N/A'}</div>
                        </div>
                      </div>

                      {/* Pills Row */}
                      <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', padding: '0 4px', height: '18px', gap: '3px' }}>
                        <span style={{ fontSize: '5.5px', fontWeight: '700', background: 'black', color: 'white', padding: '2px 3px', borderRadius: '2px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                          {labelDevice.condition || 'USED'}
                        </span>
                        <span style={{ fontSize: '5.5px', fontWeight: '700', background: 'black', color: 'white', padding: '2px 3px', borderRadius: '2px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                          {labelDevice.unlockStatus?.replace('_', ' ') || 'UNLOCKED'}
                        </span>
                        {labelDevice.labData && (
                          <span style={{ fontSize: '5.5px', fontWeight: '700', background: 'black', color: 'white', padding: '2px 3px', borderRadius: '2px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                            IMEI LAB ✓
                          </span>
                        )}
                        {labelDevice.testResults && labelDevice.testResults.length > 0 && (
                          <span style={{ fontSize: '5.5px', fontWeight: '700', background: 'black', color: 'white', padding: '2px 3px', borderRadius: '2px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                            DEV CHK ✓
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right Side (QR Code) */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '56px', flexShrink: 0, padding: '2px', borderLeft: '1px solid black' }}>
                      <div style={{ fontSize: '3.5px', fontWeight: '700', textAlign: 'center', lineHeight: '1.1', marginBottom: '2px', whiteSpace: 'nowrap' }}>
                        SCAN ME FOR<br/>DEVICE CHECK REPORT
                      </div>
                      <div style={{ border: '1px solid black', borderRadius: '4px', padding: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '32px', width: '32px' }}>
                        {qrCodeUrl ? <img src={qrCodeUrl} alt="QR" style={{ width: '100%', height: '100%' }} /> : <div style={{width: '100%', height: '100%'}}></div>}
                      </div>
                    </div>

                  </div>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200 text-sm">
                <div className="flex justify-between mb-2"><span className="text-gray-500 font-bold">Model:</span> <span className="text-gray-900 font-semibold">{labelInventory.model}</span></div>
                <div className="flex justify-between mb-2"><span className="text-gray-500 font-bold">IMEI:</span> <span className="text-gray-900 font-mono">{labelDevice.imei}</span></div>
                <div className="flex justify-between"><span className="text-gray-500 font-bold">Status:</span> <span className="text-gray-900 font-semibold capitalize">{labelDevice.unlockStatus?.replace('_', ' ')} | {labelDevice.condition}</span></div>
              </div>
              <div className="flex gap-4">
                <button onClick={() => setShowLabelModal(false)} className="flex-1 px-4 py-3 rounded-xl font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 transition-colors">Cancel</button>
                <button onClick={printLabel} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#009EF7] hover:bg-[#0086d1] text-white rounded-xl font-bold transition-colors shadow-lg shadow-blue-500/20"><Printer size={18} /> Print</button>
              </div>
            </div>
          </div>
        )}

        {showScanModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl relative animate-in zoom-in-95 duration-200">
              <button onClick={() => setShowScanModal(false)} className="absolute top-4 right-4 z-10 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"><X size={24} /></button>
              <div className="p-6">
                <InvoiceScanner onScanComplete={handleScanComplete} />
              </div>
            </div>
          </div>
        )}
      </div>
        {showDeviceHistory && selectedDeviceHistory && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 m-0">Device History</h2>
                  <p className="text-sm font-mono text-gray-500 mt-1">{selectedDeviceHistory.brand} {selectedDeviceHistory.model} - {selectedDeviceHistory.imei}</p>
                </div>
                <button onClick={() => setShowDeviceHistory(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"><X size={24} /></button>
              </div>
              
              <div className="mb-6">
                <div className="text-sm font-bold text-gray-700 mb-3">Current Status</div>
                <div className="flex flex-wrap gap-2">
                  <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${selectedDeviceHistory.isSold ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    {selectedDeviceHistory.isSold ? 'Sold' : 'Available'}
                  </span>
                  <span className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold capitalize">{selectedDeviceHistory.condition}</span>
                  <span className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold capitalize">{selectedDeviceHistory.unlockStatus?.replace('_', ' ')}</span>
                  <span className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold capitalize">{selectedDeviceHistory.grade}</span>
                </div>
              </div>
              
              {selectedDeviceHistory.history && selectedDeviceHistory.history.length > 0 ? (
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <div className="text-sm font-bold text-gray-700 mb-4">Journey Timeline</div>
                  <div className="space-y-3">
                    {selectedDeviceHistory.history.map((entry, idx) => (
                      <div key={idx} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-[#009EF7]">
                        <div className="flex justify-between mb-1">
                          <span className="font-bold text-gray-900 text-sm">{entry.action}</span>
                          <span className="text-xs font-semibold text-gray-500">{new Date(entry.date).toLocaleString()}</span>
                        </div>
                        {entry.details && <div className="text-sm text-gray-600 mt-2">{entry.details}</div>}
                        {entry.user && <div className="text-xs text-gray-400 mt-2 font-medium">by {entry.user}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-12 bg-gray-50 rounded-xl border border-gray-200 border-dashed text-center">
                  <div className="font-bold text-gray-500 mb-1">No history entries yet</div>
                  <div className="text-sm text-gray-400">History will appear when this device is sold or edited</div>
                </div>
              )}
              
              <div className="mt-6 pt-6 border-t border-gray-100">
                <button onClick={() => setShowDeviceHistory(false)} className="w-full px-4 py-3 rounded-xl font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 transition-colors">Close</button>
              </div>
            </div>
          </div>
        )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
