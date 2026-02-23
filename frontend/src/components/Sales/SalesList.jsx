import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../utils/api';
import SaleScanner from '../SaleScanner';
import {
  Plus, Search, Camera, Trash2, ChevronLeft, ChevronRight, Loader2,
  ShoppingCart, DollarSign, TrendingUp, X, Save, Smartphone,
  Receipt, Eye, Calendar, Filter, Truck, Package, MapPin, Copy, ExternalLink
} from 'lucide-react';

// Auto-detect carrier from tracking number
function detectCarrier(tracking) {
  if (!tracking) return '';
  const t = tracking.replace(/\s/g, '').toUpperCase();
  // USPS
  if (/^(94|93|92|94|95)\d{20,22}$/.test(t)) return 'usps';
  if (/^[A-Z]{2}\d{9}US$/.test(t)) return 'usps';
  if (/^(420)\d{5,}/.test(t)) return 'usps';
  if (/^(82|70)\d{8,}/.test(t)) return 'usps';
  // UPS
  if (/^1Z[A-Z0-9]{16}$/.test(t)) return 'ups';
  if (/^(T|K|J)\d{10}$/.test(t)) return 'ups';
  // FedEx
  if (/^\d{12,15}$/.test(t) && t.length >= 12 && t.length <= 15) return 'fedex';
  if (/^\d{20,22}$/.test(t)) return 'fedex';
  if (/^(96\d{20}|61\d{18})$/.test(t)) return 'fedex';
  // DHL
  if (/^\d{10,11}$/.test(t)) return 'dhl';
  if (/^[A-Z]{3}\d{7,}/.test(t)) return 'dhl';
  // Amazon
  if (/^TBA\d{10,}/.test(t)) return 'amazon';
  // OnTrac
  if (/^(C|D)\d{14}$/.test(t)) return 'ontrac';
  return '';
}

function getCarrierTrackingUrl(carrier, tracking) {
  const urls = {
    usps: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${tracking}`,
    ups: `https://www.ups.com/track?tracknum=${tracking}`,
    fedex: `https://www.fedex.com/fedextrack/?trknbr=${tracking}`,
    dhl: `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${tracking}`,
    amazon: `https://track.amazon.com/tracking/${tracking}`,
  };
  return urls[carrier] || '';
}

const carrierLabels = { 'ups': 'UPS', 'usps': 'USPS', 'fedex': 'FedEx', 'dhl': 'DHL', 'amazon': 'Amazon', 'ontrac': 'OnTrac', 'lasership': 'LaserShip', 'other': 'Other' };
const carrierColors = { usps: '#004B87', ups: '#351C15', fedex: '#4D148C', dhl: '#FFCC00', amazon: '#FF9900', ontrac: '#0072CE', lasership: '#00AA4F', other: '#64748b' };

const channelLabels = { in_store: 'In-Store', online: 'Online', wholesale: 'Wholesale', marketplace: 'Marketplace', phone: 'Phone Order', other: 'Other' };
const channelColors = { in_store: { bg: '#ecfdf5', color: '#059669' }, online: { bg: '#eef2ff', color: '#4338ca' }, wholesale: { bg: '#fef3c7', color: '#b45309' }, marketplace: { bg: '#f5f3ff', color: '#7c3aed' }, phone: { bg: '#fce7f3', color: '#be185d' }, other: { bg: '#f1f5f9', color: '#475569' } };

const lbl = { display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '3px', color: '#64748b' };
const inp = { width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px' };
const sel = { width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', background: 'white' };

export default function SalesList() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSaleScanner, setShowSaleScanner] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [stats, setStats] = useState({ today: {}, thisMonth: {}, allTime: {} });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [filters, setFilters] = useState({ search: '', status: '' });

  // Create sale form state
  const [customers, setCustomers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [saleForm, setSaleForm] = useState({
    customerId: '', customerName: 'Walk-in Customer',
    items: [], discount: 0, tax: 0,
    paymentMethod: 'cash', paymentStatus: 'paid', notes: '',
    salesChannel: 'in_store',
    shipping: {
      trackingNumber: '', carrier: '', shippingMethod: '', shippingCost: 0,
      address: { name: '', street: '', city: '', state: '', zipCode: '', country: 'USA', phone: '' }
    },
    costs: { handling: 0, packaging: 0, marketplaceFees: 0, other: 0 }
  });
  const [selectedInventory, setSelectedInventory] = useState('');
  const [selectedDevice, setSelectedDevice] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [showShipping, setShowShipping] = useState(false);
  const [searchParams] = useSearchParams();
  const hasAutoOpened = useRef(false);

  useEffect(() => { fetchSales(); fetchStats(); }, [pagination.page, filters.status]);

  // Auto-open create modal when customerId param exists
  useEffect(() => {
    const customerId = searchParams.get('customerId');
    const openModal = searchParams.get('openModal');
    if (customerId && openModal === 'true' && !hasAutoOpened.current) {
      hasAutoOpened.current = true;
      openCreateModal();
    }
  }, [searchParams]);

  const fetchSales = async () => {
    setLoading(true);
    try {
      let url = `/sales?page=${pagination.page}&limit=${pagination.limit}`;
      if (filters.search) url += `&search=${filters.search}`;
      if (filters.status) url += `&status=${filters.status}`;
      const res = await api.get(url);
      if (res.data.success) {
        setSales(res.data.data);
        setPagination(prev => ({ ...prev, ...res.data.pagination }));
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/sales/stats');
      if (res.data.success) setStats(res.data.data);
    } catch (err) { console.error(err); }
  };

  const openCreateModal = async () => {
    try {
      const [custRes, invRes] = await Promise.all([
        api.get('/customers'),
        api.get('/inventory?limit=200')
      ]);
      setCustomers(custRes.data.data || []);
      setInventory(invRes.data.data || []);
      
      // Pre-populate customer if customerId in URL
      const urlCustomerId = searchParams.get('customerId');
      let selectedCustomer = null;
      if (urlCustomerId) {
        selectedCustomer = (custRes.data.data || []).find(c => c._id === urlCustomerId);
      }
      
      setSaleForm({
        customerId: selectedCustomer?._id || '', 
        customerName: selectedCustomer?.name || 'Walk-in Customer',
        items: [], discount: 0, tax: 0,
        paymentMethod: 'cash', paymentStatus: 'paid', notes: '',
        salesChannel: 'in_store',
        shipping: selectedCustomer ? {
          trackingNumber: '', carrier: '', shippingMethod: '', shippingCost: 0,
          address: {
            name: selectedCustomer.name || '',
            street: selectedCustomer.address?.street || '',
            city: selectedCustomer.address?.city || '',
            state: selectedCustomer.address?.state || '',
            zipCode: selectedCustomer.address?.zipCode || '',
            country: 'USA',
            phone: selectedCustomer.contact?.phone || ''
          }
        } : {
          trackingNumber: '', carrier: '', shippingMethod: '', shippingCost: 0,
          address: { name: '', street: '', city: '', state: '', zipCode: '', country: 'USA', phone: '' }
        },
        costs: { handling: 0, packaging: 0, marketplaceFees: 0, other: 0 },
      });
    setShowShipping(false);
    setShowCreateModal(true);
    } catch (err) { console.error(err); }
  };

  const handleCustomerSelect = (e) => {
    const id = e.target.value;
    if (id === '') {
      setSaleForm(prev => ({ ...prev, customerId: '', customerName: 'Walk-in Customer' }));
    } else {
      const cust = customers.find(c => c._id === id);
      setSaleForm(prev => ({
        ...prev, customerId: id, customerName: cust?.name || '',
        shipping: {
          ...prev.shipping,
          address: {
            name: cust?.name || '',
            street: cust?.address?.street || '',
            city: cust?.address?.city || '',
            state: cust?.address?.state || '',
            zipCode: cust?.address?.zipCode || '',
            country: cust?.address?.country || 'USA',
            phone: cust?.contact?.phone || ''
          }
        }
      }));
    }
  };

  const handleScanComplete = (scanResult) => {
    // Process scanned device data
    if (scanResult.device && scanResult.device.imei) {
      const device = scanResult.device;
      
      // Try to find matching inventory item by IMEI
      let matchedInventory = null;
      let matchedDevice = null;
      
      for (const inv of inventory) {
        const foundDevice = inv.devices?.find(d => d.imei === device.imei && !d.isSold);
        if (foundDevice) {
          matchedInventory = inv;
          matchedDevice = foundDevice;
          break;
        }
      }
      
      if (matchedInventory && matchedDevice) {
        // Add to sale items
        const newItem = {
          inventoryId: matchedInventory._id,
          model: matchedInventory.model,
          brand: matchedInventory.brand || "",
          storage: matchedInventory.specifications?.storage || "",
          color: matchedInventory.specifications?.color || "",
          imei: matchedDevice.imei,
          description: `${matchedInventory.brand} ${matchedInventory.model} ${matchedInventory.specifications?.storage || ''} ${matchedInventory.specifications?.color || ''}`.trim(),
          costPrice: matchedInventory.price?.cost || 0,
          salePrice: matchedInventory.price?.retail || 0,
          profit: (matchedInventory.price?.retail || 0) - (matchedInventory.price?.cost || 0)
        };
        
        setSaleForm(prev => ({
          ...prev,
          items: [...prev.items, newItem]
        }));
        
        alert(`Device added: ${newItem.description}`);
      } else {
        alert(`Device with IMEI ${device.imei} not found in inventory. Please add manually.`);
      }
    }
    
    // Process shipping info if available
    if (scanResult.shipping) {
      const shipping = scanResult.shipping;
      
      // Auto-detect carrier from tracking number
      let detectedCarrier = shipping.carrier || '';
      if (shipping.tracking_number && !detectedCarrier) {
        const cleaned = shipping.tracking_number.replace(/\s+/g, '').toUpperCase();
        if (/^1Z[A-Z0-9]{16}$/i.test(cleaned)) detectedCarrier = 'ups';
        else if (/^(94|93|92|95|82)\d{20,22}$/.test(cleaned)) detectedCarrier = 'usps';
        else if (/^\d{12,14}$/.test(cleaned)) detectedCarrier = 'fedex';
        else if (/^\d{10,11}$/.test(cleaned)) detectedCarrier = 'dhl';
      }
      
      console.log('Setting carrier to:', detectedCarrier);
      setSaleForm(prev => ({
        ...prev,
        shipping: {
          ...prev.shipping,
          trackingNumber: shipping.tracking_number || prev.shipping.trackingNumber,
          carrier: detectedCarrier || prev.shipping.carrier,
          address: {
            ...prev.shipping.address,
            name: shipping.recipient_name || prev.shipping.address.name,
            street: shipping.street_address || prev.shipping.address.street,
            city: shipping.city || prev.shipping.address.city,
            state: shipping.state || prev.shipping.address.state,
            zipCode: shipping.zip || prev.shipping.address.zipCode,
          }
        }
      }));
      setShowShipping(true);
    }
    
    setShowSaleScanner(false);
  };

  const handleTrackingChange = (val) => {
    const detected = detectCarrier(val);
    setSaleForm(prev => ({
      ...prev,
      shipping: { ...prev.shipping, trackingNumber: val, carrier: detected || prev.shipping.carrier }
    }));
  };

  const addItemFromInventory = () => {
    if (!selectedInventory) return;
    const inv = inventory.find(i => i._id === selectedInventory);
    if (!inv) return;
    let device = null;
    if (selectedDevice) device = inv.devices?.find(d => d.imei === selectedDevice && !d.isSold);

    const newItem = {
      inventoryId: inv._id, model: inv.model, brand: inv.brand || '',
      storage: inv.specifications?.storage || '', color: inv.specifications?.color || '',
      imei: device?.imei || '', condition: device?.condition || '', grade: device?.grade || '',
      costPrice: inv.price?.cost || 0, salePrice: parseFloat(manualPrice) || inv.price?.retail || 0,
    };
    newItem.profit = newItem.salePrice - newItem.costPrice;

    setSaleForm(prev => ({ ...prev, items: [...prev.items, newItem] }));
    setSelectedInventory(''); setSelectedDevice(''); setManualPrice('');
  };

  const removeItem = (index) => setSaleForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));

  const updateItemPrice = (index, price) => {
    setSaleForm(prev => {
      const items = [...prev.items];
      items[index].salePrice = parseFloat(price) || 0;
      items[index].profit = items[index].salePrice - items[index].costPrice;
      return { ...prev, items };
    });
  };

  const getSubtotal = () => saleForm.items.reduce((sum, item) => sum + item.salePrice, 0);
  const getTotal = () => {
    const shippingCost = parseFloat(saleForm.shipping?.shippingCost) || 0;
    const discount = parseFloat(saleForm.discount) || 0;
    const tax = parseFloat(saleForm.tax) || 0;
    return getSubtotal() - discount + tax + shippingCost;
  };
  const getTotalProfit = () => {
    const itemProfits = saleForm.items.reduce((sum, item) => sum + item.profit, 0);
    const shippingCost = parseFloat(saleForm.shipping?.shippingCost) || 0;
    const handlingCost = parseFloat(saleForm.costs?.handling) || 0;
    const packagingCost = parseFloat(saleForm.costs?.packaging) || 0;
    const marketplaceFees = parseFloat(saleForm.costs?.marketplaceFees) || 0;
    const otherCosts = parseFloat(saleForm.costs?.other) || 0;
    const totalCosts = shippingCost + handlingCost + packagingCost + marketplaceFees + otherCosts;
    return itemProfits - totalCosts;
  };

  const handleCreateSale = async () => {
    if (saleForm.items.length === 0) { alert('Add at least one item'); return; }
    try {
      const payload = { ...saleForm, amountPaid: getTotal() };
      console.log('📤 customerId:', saleForm.customerId);
      if (!showShipping) { payload.shipping = { shippingCost: saleForm.shipping?.shippingCost || 0 }; }
      const res = await api.post('/sales', payload);
      console.log("🔍 Backend response:", res.data);
      console.log("🔍 res.data.success:", res.data.success);
      if (res.data.success) {
        console.log("✅ Sale created, res.data:", res.data);
        const isWalkIn = saleForm.customerName === "Walk-in Customer";
        if (isWalkIn && saleForm.shipping?.address?.name) {
          const save = window.confirm(`Save "${saleForm.shipping.address.name}" as new customer?`);
          if (save) {
            try {
              const custResponse = await api.post("/customers", { name: saleForm.shipping.address.name, contact: { phone: saleForm.shipping.address.phone || "N/A" }, address: { street: saleForm.shipping.address.street, city: saleForm.shipping.address.city, state: saleForm.shipping.address.state, zipCode: saleForm.shipping.address.zipCode } });
              // Link the sale to the new customer
              if (custResponse.data.success && res.data.data._id) {
                await api.put(`/sales/${res.data.data._id}`, { customer: custResponse.data.data._id });
              }
              const custRes = await api.get('/customers');
              setCustomers(custRes.data.data || []);
            } catch (err) { 
              console.error('❌ Customer save error:', err);
              console.error('❌ Error response:', err.response?.data);
              console.error('❌ Error status:', err.response?.status);
            }
          }
        }
        setShowCreateModal(false); fetchSales(); fetchStats();
        alert("Sale created successfully!");
        alert('Sale created successfully!');
      }
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDeleteSale = async (id) => {
    if (!window.confirm('Delete this sale? Inventory will be restored.')) return;
    try { await api.delete(`/sales/${id}`); fetchSales(); fetchStats(); }
    catch (err) { alert('Failed to delete'); }
  };

  const viewSaleDetail = async (id) => {
    try {
      const res = await api.get(`/sales/${id}`);
      if (res.data.success) { setSelectedSale(res.data.data); setShowDetailModal(true); }
    } catch (err) { console.error(err); }
  };

  const copyToClipboard = (text) => { navigator.clipboard?.writeText(text); };

  const availableDevices = selectedInventory
    ? (inventory.find(i => i._id === selectedInventory)?.devices?.filter(d => !d.isSold) || []) : [];

  const statusColors = {
    completed: { bg: '#ecfdf5', color: '#059669' }, pending: { bg: '#fef3c7', color: '#b45309' },
    processing: { bg: '#eef2ff', color: '#4338ca' }, shipped: { bg: '#e0f2fe', color: '#0284c7' },
    delivered: { bg: '#dcfce7', color: '#15803d' }, cancelled: { bg: '#fef2f2', color: '#dc2626' },
    refunded: { bg: '#f1f5f9', color: '#475569' }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px' }}>Sales & Orders</h1>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Create sales and track revenue</p>
        </div>
        <button onClick={openCreateModal}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '500', fontSize: '14px' }}>
          <Plus size={18} /> New Sale
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        {[
          { label: 'Today', value: `$${(stats.today?.total || 0).toLocaleString()}`, sub: `${stats.today?.count || 0} sales`, icon: DollarSign, color: '#10b981', bg: '#ecfdf5' },
          { label: 'This Month', value: `$${(stats.thisMonth?.total || 0).toLocaleString()}`, sub: `${stats.thisMonth?.count || 0} sales`, icon: Calendar, color: '#6366f1', bg: '#eef2ff' },
          { label: 'Month Profit', value: `$${(stats.thisMonth?.profit || 0).toLocaleString()}`, sub: 'Net earnings', icon: TrendingUp, color: '#f59e0b', bg: '#fffbeb' },
          { label: 'All Time', value: `$${(stats.allTime?.total || 0).toLocaleString()}`, sub: `${stats.allTime?.count || 0} total sales`, icon: ShoppingCart, color: '#8b5cf6', bg: '#f5f3ff' },
        ].map((card, i) => (
          <div key={i} style={{ background: 'white', borderRadius: '10px', padding: '16px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>{card.label}</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <card.icon size={16} color={card.color} />
              </div>
            </div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a' }}>{card.value}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={18} />
          <input type="text" placeholder="Search sales, tracking #..." value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && fetchSales()}
            style={{ width: '100%', padding: '10px 10px 10px 40px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }} />
        </div>
        <select value={filters.status} onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
          style={{ padding: '10px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', background: 'white' }}>
          <option value="">All Status</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Sales Table */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
            <Loader2 size={32} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : sales.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <Receipt size={48} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: '#64748b' }}>No sales yet</p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
              <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <tr>
                  {['Sale #','Customer','Items','Channel','Total','Profit','Status','Tracking','Date','Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 14px', textAlign: h==='Total'||h==='Profit'||h==='Actions'?'right':h==='Status'||h==='Channel'?'center':'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => {
                  const sc = statusColors[sale.status] || statusColors.completed;
                  const cc = channelColors[sale.salesChannel] || channelColors.other;
                  return (
                    <tr key={sale._id} style={{ borderBottom: '1px solid #f1f5f9' }}
                      onMouseEnter={(e) => e.currentTarget.style.background='#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.background='white'}>
                      <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{sale.saleNumber}</td>
                      <td style={{ padding: '12px 14px', fontSize: '13px', color: '#334155' }}>{sale.customerName}</td>
                      <td style={{ padding: '12px 14px', fontSize: '13px', color: '#64748b' }}>{sale.items?.length || 0}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        {sale.salesChannel && <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '600', background: cc.bg, color: cc.color }}>{channelLabels[sale.salesChannel] || sale.salesChannel}</span>}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: '600', color: '#0f172a', textAlign: 'right' }}>${sale.totalAmount?.toFixed(2)}</td>
                      <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: '600', color: sale.totalProfit >= 0 ? '#059669' : '#dc2626', textAlign: 'right' }}>${sale.totalProfit?.toFixed(2)}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', background: sc.bg, color: sc.color }}>{sale.status}</span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '12px' }}>
                        {sale.shipping?.trackingNumber ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {sale.shipping.carrier && <span style={{ fontWeight: '600', color: carrierColors[sale.shipping.carrier] || '#64748b', fontSize: '10px', textTransform: 'uppercase' }}>{carrierLabels[sale.shipping.carrier]}</span>}
                            <span style={{ fontFamily: 'monospace', color: '#334155', fontSize: '11px' }}>{sale.shipping.trackingNumber.slice(-8)}</span>
                          </div>
                        ) : <span style={{ color: '#cbd5e1', fontSize: '11px' }}>—</span>}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '13px', color: '#64748b', whiteSpace: 'nowrap' }}>{new Date(sale.createdAt).toLocaleDateString()}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button onClick={() => viewSaleDetail(sale._id)} style={{ padding: '6px', background: '#eef2ff', border: 'none', borderRadius: '6px', cursor: 'pointer' }} title="View"><Eye size={15} color="#4338ca" /></button>
                          <button onClick={() => handleDeleteSale(sale._id)} style={{ padding: '6px', background: '#fef2f2', border: 'none', borderRadius: '6px', cursor: 'pointer' }} title="Delete"><Trash2 size={15} color="#dc2626" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
            {pagination.pages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <span style={{ fontSize: '13px', color: '#64748b' }}>Page {pagination.page} of {pagination.pages} ({pagination.total} sales)</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))} disabled={pagination.page === 1}
                    style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', background: 'white', cursor: 'pointer', opacity: pagination.page === 1 ? 0.5 : 1 }}><ChevronLeft size={16} /></button>
                  <button onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))} disabled={pagination.page >= pagination.pages}
                    style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', background: 'white', cursor: 'pointer', opacity: pagination.page >= pagination.pages ? 0.5 : 1 }}><ChevronRight size={16} /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* === CREATE SALE MODAL === */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '28px', maxWidth: '850px', width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>Create New Sale</h2>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button onClick={() => setShowSaleScanner(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                  <Camera size={16} /> Scan Sale
                </button>
                <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={22} color="#64748b" /></button>
              </div>
            </div>

            {/* Customer + Channel */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={lbl}>Customer</label>
                <select value={saleForm.customerId} onChange={handleCustomerSelect} style={sel}>
                  <option value="">Walk-in Customer</option>
                  {customers.map(c => <option key={c._id} value={c._id}>{c.name} {c.company ? `(${c.company})` : ''}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Sales Channel</label>
                <select value={saleForm.salesChannel} onChange={(e) => setSaleForm(prev => ({ ...prev, salesChannel: e.target.value }))} style={sel}>
                  <option value="in_store">In-Store</option>
                  <option value="online">Online</option>
                  <option value="wholesale">Wholesale</option>
                  <option value="marketplace">Marketplace</option>
                  <option value="phone">Phone Order</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Add Items */}
            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px', marginBottom: '14px', border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#334155' }}>Add Device</label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: 2, minWidth: '150px' }}>
                  <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '2px' }}>Product</label>
                  <select value={selectedInventory} onChange={(e) => { setSelectedInventory(e.target.value); setSelectedDevice(''); }}
                    style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', background: 'white' }}>
                    <option value="">Select product...</option>
                    {inventory.filter(i => i.devices?.some(d => !d.isSold)).map(i => (
                      <option key={i._id} value={i._id}>{i.brand} {i.model} {i.specifications?.storage || ''} ({i.devices?.filter(d => !d.isSold).length} avail)</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '2px' }}>Device (IMEI)</label>
                  <select value={selectedDevice} onChange={(e) => setSelectedDevice(e.target.value)}
                    style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', background: 'white' }}>
                    <option value="">Any / Manual</option>
                    {availableDevices.map((d, i) => <option key={i} value={d.imei}>{d.imei} ({d.condition})</option>)}
                  </select>
                </div>
                <div style={{ minWidth: '90px' }}>
                  <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '2px' }}>Price ($)</label>
                  <input type="number" step="0.01" value={manualPrice} onChange={(e) => setManualPrice(e.target.value)}
                    placeholder={selectedInventory ? String(inventory.find(i => i._id === selectedInventory)?.price?.retail || '') : '0'}
                    style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px' }} />
                </div>
                <button onClick={addItemFromInventory}
                  style={{ padding: '8px 16px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>+ Add</button>
              </div>
            </div>

            {/* Items List */}
            {saleForm.items.length > 0 && (
              <div style={{ marginBottom: '14px', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#f8fafc' }}>
                    <tr>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b' }}>Item</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b' }}>IMEI</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: '11px', fontWeight: '600', color: '#64748b' }}>Sale Price</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: '11px', fontWeight: '600', color: '#64748b' }}>Profit</th>
                      <th style={{ padding: '8px 12px', width: '30px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {saleForm.items.map((item, i) => (
                      <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 12px' }}>
                          <div style={{ fontSize: '13px', fontWeight: '500', color: '#0f172a' }}>{item.brand} {item.model}</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>{item.storage} {item.color}</div>
                        </td>
                        <td style={{ padding: '8px 12px', fontSize: '11px', fontFamily: 'monospace', color: '#64748b' }}>{item.imei || '-'}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                          <input type="number" step="0.01" value={item.salePrice} onChange={(e) => updateItemPrice(i, e.target.value)}
                            style={{ width: '80px', padding: '4px 6px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '13px', fontWeight: '600', textAlign: 'right' }} />
                        </td>
                        <td style={{ padding: '8px 12px', fontSize: '13px', fontWeight: '600', textAlign: 'right', color: item.profit >= 0 ? '#059669' : '#dc2626' }}>${item.profit.toFixed(2)}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <button onClick={() => removeItem(i)} style={{ padding: '3px', background: '#fef2f2', border: 'none', borderRadius: '4px', cursor: 'pointer' }}><Trash2 size={13} color="#dc2626" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Shipping Toggle */}
            <div style={{ marginBottom: '14px' }}>
              <button onClick={() => setShowShipping(!showShipping)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: showShipping ? '#eef2ff' : '#f8fafc', border: `1px solid ${showShipping ? '#c7d2fe' : '#e2e8f0'}`, borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: showShipping ? '#4338ca' : '#64748b', width: '100%' }}>
                <Truck size={16} /> {showShipping ? 'Shipping Info (enabled)' : 'Add Shipping Information'}
              </button>
            </div>

            {/* Shipping Section */}
            {showShipping && (
              <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '16px', marginBottom: '14px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Truck size={16} color="#4338ca" />
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>Shipping Details</span>
                </div>

                {/* Tracking + Carrier */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <label style={lbl}>Tracking Number</label>
                    <input type="text" value={saleForm.shipping.trackingNumber}
                      onChange={(e) => handleTrackingChange(e.target.value)}
                      placeholder="Enter tracking number..."
                      style={{ ...inp, fontFamily: 'monospace' }} />
                    {saleForm.shipping.trackingNumber && saleForm.shipping.carrier && (
                      <div style={{ marginTop: '4px', fontSize: '11px', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        ✓ Auto-detected: <strong>{carrierLabels[saleForm.shipping.carrier]}</strong>
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={lbl}>Carrier</label>
                    <select value={saleForm.shipping.carrier}
                      onChange={(e) => setSaleForm(prev => ({ ...prev, shipping: { ...prev.shipping, carrier: e.target.value } }))}
                      style={sel}>
                      <option value="">Select carrier</option>
                      {Object.entries(carrierLabels).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Shipping Cost ($)</label>
                    <input type="number" step="0.01" value={saleForm.shipping.shippingCost}
                      onChange={(e) => setSaleForm(prev => ({ ...prev, shipping: { ...prev.shipping, shippingCost: parseFloat(e.target.value) || 0 } }))}
                      style={inp} />
                  </div>
                </div>

                {/* Shipping Address */}
                <div style={{ background: 'white', borderRadius: '8px', padding: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                    <MapPin size={14} color="#64748b" />
                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>Ship To</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={lbl}>Recipient Name</label>
                      <input type="text" value={saleForm.shipping.address.name}
                        onChange={(e) => setSaleForm(prev => ({ ...prev, shipping: { ...prev.shipping, address: { ...prev.shipping.address, name: e.target.value } } }))}
                        style={inp} />
                    </div>
                    <div>
                      <label style={lbl}>Phone</label>
                      <input type="tel" value={saleForm.shipping.address.phone}
                        onChange={(e) => setSaleForm(prev => ({ ...prev, shipping: { ...prev.shipping, address: { ...prev.shipping.address, phone: e.target.value } } }))}
                        style={inp} />
                    </div>
                    <div style={{ gridColumn: '1/-1' }}>
                      <label style={lbl}>Street Address</label>
                      <input type="text" value={saleForm.shipping.address.street}
                        onChange={(e) => setSaleForm(prev => ({ ...prev, shipping: { ...prev.shipping, address: { ...prev.shipping.address, street: e.target.value } } }))}
                        style={inp} />
                    </div>
                    <div>
                      <label style={lbl}>City</label>
                      <input type="text" value={saleForm.shipping.address.city}
                        onChange={(e) => setSaleForm(prev => ({ ...prev, shipping: { ...prev.shipping, address: { ...prev.shipping.address, city: e.target.value } } }))}
                        style={inp} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={lbl}>State</label>
                        <input type="text" value={saleForm.shipping.address.state}
                          onChange={(e) => setSaleForm(prev => ({ ...prev, shipping: { ...prev.shipping, address: { ...prev.shipping.address, state: e.target.value } } }))}
                          style={inp} />
                      </div>
                      <div>
                        <label style={lbl}>ZIP</label>
                        <input type="text" value={saleForm.shipping.address.zipCode}
                          onChange={(e) => setSaleForm(prev => ({ ...prev, shipping: { ...prev.shipping, address: { ...prev.shipping.address, zipCode: e.target.value } } }))}
                          style={inp} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Totals + Payment */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div><label style={lbl}>Payment Method</label>
                    <select value={saleForm.paymentMethod} onChange={(e) => setSaleForm(prev => ({ ...prev, paymentMethod: e.target.value }))} style={sel}>
                      <option value="cash">Cash</option><option value="card">Card</option>
                      <option value="bank_transfer">Bank Transfer</option><option value="zelle">Zelle</option>
                      <option value="paypal">PayPal</option><option value="check">Check</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div><label style={lbl}>Payment Status</label>
                    <select value={saleForm.paymentStatus} onChange={(e) => setSaleForm(prev => ({ ...prev, paymentStatus: e.target.value }))} style={sel}>
                      <option value="paid">Paid</option><option value="partial">Partial</option><option value="unpaid">Unpaid</option>
                    </select>
                  </div>
                </div>
                <div><label style={lbl}>Notes</label>
                  <textarea value={saleForm.notes} onChange={(e) => setSaleForm(prev => ({ ...prev, notes: e.target.value }))} rows="2"
                    style={{ ...inp, resize: 'vertical' }} />
                </div>
              </div>
              <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px', border: '1px solid #e2e8f0' }}>
              <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px', border: '1px solid #e2e8f0' }}>
                {/* Cost & Revenue */}
                <div style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '10px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>REVENUE</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontSize: '12px' }}>
                    <span style={{ color: '#64748b' }}>Cost Price:</span>
                    <span style={{ fontWeight: '500', color: '#dc2626' }}>${saleForm.items.reduce((sum, item) => sum + (item.costPrice || 0), 0).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontSize: '12px' }}>
                    <span style={{ color: '#64748b' }}>Sale Price:</span>
                    <span style={{ fontWeight: '500' }}>${getSubtotal().toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', paddingTop: '4px', borderTop: '1px dashed #e2e8f0' }}>
                    <span style={{ color: '#059669', fontWeight: '500' }}>Gross Profit:</span>
                    <span style={{ fontWeight: '600', color: '#059669' }}>${(getSubtotal() - saleForm.items.reduce((sum, item) => sum + (item.costPrice || 0), 0)).toFixed(2)}</span>
                  </div>
                </div>
                
                {/* Deductions */}
                <div style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '10px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>DEDUCTIONS</div>
                  {parseFloat(saleForm.costs?.marketplaceFees) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', fontSize: '11px' }}>
                      <span style={{ color: '#64748b' }}>Platform Fees:</span>
                      <span style={{ color: '#dc2626' }}>-${parseFloat(saleForm.costs.marketplaceFees).toFixed(2)}</span>
                    </div>
                  )}
                  {parseFloat(saleForm.shipping?.shippingCost) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', fontSize: '11px' }}>
                      <span style={{ color: '#64748b' }}>Shipping:</span>
                      <span style={{ color: '#dc2626' }}>-${parseFloat(saleForm.shipping.shippingCost).toFixed(2)}</span>
                    </div>
                  )}
                  {parseFloat(saleForm.costs?.handling) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', fontSize: '11px' }}>
                      <span style={{ color: '#64748b' }}>Handling:</span>
                      <span style={{ color: '#dc2626' }}>-${parseFloat(saleForm.costs.handling).toFixed(2)}</span>
                    </div>
                  )}
                  {parseFloat(saleForm.costs?.packaging) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', fontSize: '11px' }}>
                      <span style={{ color: '#64748b' }}>Packaging:</span>
                      <span style={{ color: '#dc2626' }}>-${parseFloat(saleForm.costs.packaging).toFixed(2)}</span>
                    </div>
                  )}
                </div>
                
                {/* Adjustments */}
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px', alignItems: 'center' }}>
                    <span style={{ color: '#64748b' }}>Discount:</span>
                    <input type="number" step="0.01" value={saleForm.discount} onChange={(e) => setSaleForm(prev => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))}
                      style={{ width: '70px', padding: '3px 6px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '12px', textAlign: 'right' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', alignItems: 'center' }}>
                    <span style={{ color: '#64748b' }}>Tax:</span>
                    <input type="number" step="0.01" value={saleForm.tax} onChange={(e) => setSaleForm(prev => ({ ...prev, tax: parseFloat(e.target.value) || 0 }))}
                      style={{ width: '70px', padding: '3px 6px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '12px', textAlign: 'right' }} />
                  </div>
                </div>
                
                {/* Total */}
                <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>Customer Pays:</span>
                    <span style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>${getTotal().toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#059669' }}>Net Profit:</span>
                    <span style={{ fontSize: '16px', fontWeight: '700', color: '#059669' }}>${getTotalProfit().toFixed(2)}</span>
                  </div>
                </div>
              </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowCreateModal(false)}
                style={{ flex: 1, padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', cursor: 'pointer', fontWeight: '500' }}>Cancel</button>
              <button onClick={handleCreateSale}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
                <Save size={16} /> Complete Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === SALE DETAIL MODAL === */}
      {showDetailModal && selectedSale && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '28px', maxWidth: '650px', width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 4px' }}>Sale #{selectedSale.saleNumber}</h2>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>{new Date(selectedSale.createdAt).toLocaleString()}</p>
              </div>
              <button onClick={() => setShowDetailModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={22} color="#64748b" /></button>
            </div>

            {/* Customer + Channel */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '3px' }}>Customer</div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>{selectedSale.customerName}</div>
              </div>
              <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '3px' }}>Channel</div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>{channelLabels[selectedSale.salesChannel] || 'In-Store'}</div>
              </div>
            </div>

            {/* Items */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>Items ({selectedSale.items?.length || 0})</div>
              {selectedSale.items?.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: i % 2 === 0 ? '#f8fafc' : 'white', borderRadius: '6px', marginBottom: '4px' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '500' }}>{item.brand} {item.model}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{item.imei || 'No IMEI'} · {item.storage} {item.color}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600' }}>${item.salePrice?.toFixed(2)}</div>
                    <div style={{ fontSize: '11px', color: item.profit >= 0 ? '#059669' : '#dc2626' }}>+${item.profit?.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Shipping */}
            {selectedSale.shipping?.trackingNumber && (
              <div style={{ background: '#f0f9ff', borderRadius: '8px', padding: '14px', marginBottom: '16px', border: '1px solid #bae6fd' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <Truck size={16} color="#0284c7" />
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#0c4a6e' }}>Shipping</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', background: 'white', color: carrierColors[selectedSale.shipping.carrier] || '#64748b' }}>
                    {carrierLabels[selectedSale.shipping.carrier] || 'Unknown'}
                  </span>
                  <span style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>{selectedSale.shipping.trackingNumber}</span>
                  <button onClick={() => copyToClipboard(selectedSale.shipping.trackingNumber)} style={{ padding: '3px', background: 'none', border: 'none', cursor: 'pointer' }} title="Copy"><Copy size={13} color="#64748b" /></button>
                  {getCarrierTrackingUrl(selectedSale.shipping.carrier, selectedSale.shipping.trackingNumber) && (
                    <a href={getCarrierTrackingUrl(selectedSale.shipping.carrier, selectedSale.shipping.trackingNumber)} target="_blank" rel="noopener noreferrer"
                      style={{ padding: '3px', color: '#0284c7' }} title="Track"><ExternalLink size={13} /></a>
                  )}
                </div>
                {selectedSale.shipping.address?.street && (
                  <div style={{ fontSize: '12px', color: '#334155', marginTop: '8px', padding: '8px', background: 'white', borderRadius: '6px' }}>
                    <div style={{ fontWeight: '600' }}>{selectedSale.shipping.address.name}</div>
                    <div>{selectedSale.shipping.address.street}</div>
                    <div>{selectedSale.shipping.address.city}{selectedSale.shipping.address.state ? `, ${selectedSale.shipping.address.state}` : ''} {selectedSale.shipping.address.zipCode}</div>
                    {selectedSale.shipping.address.phone && <div style={{ color: '#64748b', marginTop: '2px' }}>{selectedSale.shipping.address.phone}</div>}
                  </div>
                )}
                {selectedSale.shipping.shippingCost > 0 && (
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>Shipping cost: <strong>${selectedSale.shipping.shippingCost.toFixed(2)}</strong></div>
                )}
              </div>
            )}

            {/* Financials */}
            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div><span style={{ fontSize: '12px', color: '#64748b' }}>Subtotal</span><div style={{ fontWeight: '600' }}>${selectedSale.subtotal?.toFixed(2)}</div></div>
              {selectedSale.shipping?.shippingCost > 0 && (
                <div><span style={{ fontSize: '12px', color: '#64748b' }}>Shipping</span><div style={{ fontWeight: '600' }}>${selectedSale.shipping.shippingCost?.toFixed(2)}</div></div>
              )}
              <div><span style={{ fontSize: '12px', color: '#64748b' }}>Discount</span><div style={{ fontWeight: '600' }}>-${selectedSale.discount?.toFixed(2)}</div></div>
              <div><span style={{ fontSize: '12px', color: '#64748b' }}>Total</span><div style={{ fontSize: '18px', fontWeight: '700' }}>${selectedSale.totalAmount?.toFixed(2)}</div></div>
              <div><span style={{ fontSize: '12px', color: '#64748b' }}>Profit</span><div style={{ fontSize: '18px', fontWeight: '700', color: '#059669' }}>${selectedSale.totalProfit?.toFixed(2)}</div></div>
              <div><span style={{ fontSize: '12px', color: '#64748b' }}>Payment</span><div style={{ fontWeight: '500', textTransform: 'capitalize' }}>{selectedSale.paymentMethod?.replace('_', ' ')}</div></div>
              <div><span style={{ fontSize: '12px', color: '#64748b' }}>Status</span><div style={{ fontWeight: '500', textTransform: 'capitalize' }}>{selectedSale.status}</div></div>
            </div>

            <button onClick={() => setShowDetailModal(false)}
              style={{ marginTop: '16px', width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', cursor: 'pointer', fontWeight: '500' }}>Close</button>
          </div>
        </div>
      )}

      {/* Sale Scanner Modal */}
      {showSaleScanner && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '12px', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
            <SaleScanner 
              onScanComplete={handleScanComplete}
              onClose={() => setShowSaleScanner(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
