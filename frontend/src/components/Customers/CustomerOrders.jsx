import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import axios from 'axios';
import { MapContainer, TileLayer, Polyline, Marker, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  ArrowLeft, X, Mail, Phone, MapPin, Globe, Clock,
  ShoppingCart, TrendingUp, DollarSign, CreditCard,
  TrendingDown, Plus, Eye, Pencil, ChevronUp, ChevronDown,
  UserCircle, Building, Save, Package, Truck, CheckCircle2, Box, Info
} from 'lucide-react';

// Reset leaflet markers
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon, shadowUrl: iconShadow, iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function CustomerOrders() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [trackingData, setTrackingData] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState('');
  
  // Tracking UI enhancements
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [pathCoordinates, setPathCoordinates] = useState([]);
  const [geocoding, setGeocoding] = useState(false);

  const fetchTrackingInfo = async () => {
    if (!selectedOrder?.shipping?.trackingNumber || !selectedOrder?.shipping?.carrier) {
      setTrackingError('No tracking number or carrier registered for this order.');
      return;
    }
    setTrackingLoading(true);
    setTrackingError('');
    try {
      const response = await api.get(`/tracking/${selectedOrder.shipping.carrier}/${selectedOrder.shipping.trackingNumber}`);
      setTrackingData(response.data);
    } catch (error) {
      console.error('Tracking Error', error);
      setTrackingError(error.response?.data?.error || 'Failed to fetch tracking data');
    } finally {
      setTrackingLoading(false);
    }
  };

  useEffect(() => {
    setTrackingData(null);
    setTrackingError('');
    setShowAllEvents(false);
    setPathCoordinates([]);

    if (selectedOrder?.shipping?.trackingNumber && selectedOrder?.shipping?.carrier) {
       fetchTrackingInfo();
    }
  }, [selectedOrder]);

  // Geocoding effect listener
  useEffect(() => {
    const geocodePath = async () => {
      if (!trackingData?.scanEvents || trackingData.scanEvents.length === 0) return;
      setGeocoding(true);
      
      const uniqueLocations = [];
      const seen = new Set();
      // Scans are newest first, loop sequentially to generate chronological trail
      for(let ev of trackingData.scanEvents) {
         if (ev.scanLocation?.city) {
            const locStr = `${ev.scanLocation.city.trim()}, ${ev.scanLocation.stateOrProvinceCode||''}`.trim();
            if(!seen.has(locStr) && ev.scanLocation.city) {
               seen.add(locStr);
               uniqueLocations.unshift(locStr); 
            }
         }
      }

      const coords = [];
      for (let loc of uniqueLocations) {
         try {
           const res = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(loc)}`);
           if (res.data && res.data.length > 0) {
             coords.push([parseFloat(res.data[0].lat), parseFloat(res.data[0].lon)]);
           }
           await new Promise(r => setTimeout(r, 600)); // Rate limit 1s
         } catch (e) { console.error("Geocoding dropped for", loc) }
      }
      setPathCoordinates(coords);
      setGeocoding(false);
    };

    geocodePath();
  }, [trackingData]);

  // Background Status Synchronization
  useEffect(() => {
    if (!trackingData || !trackingData.latestStatusDetail || !selectedOrder) return;
    const statusStr = trackingData.latestStatusDetail.statusByLocale?.toLowerCase() || '';
    let newStatus = 'shipped';
    
    if (statusStr.includes('deliver')) {
      newStatus = 'delivered';
    } else if (statusStr.includes('transit') || statusStr.includes('way') || statusStr.includes('out for') || statusStr.includes('facility') || statusStr.includes('depart') || statusStr.includes('carrier') || statusStr.includes('processing')) {
      newStatus = 'in_transit';
    }
    
    // Only fire background PUT if mismatch exists to prevent loops
    if (selectedOrder.status !== newStatus && selectedOrder.deliveryStatus !== newStatus) {
       api.put(`/sales/${selectedOrder._id}`, { status: newStatus, deliveryStatus: newStatus, skipHistory: true })
          .then(() => {
             setSelectedOrder(prev => ({ ...prev, status: newStatus, deliveryStatus: newStatus }));
          })
          .catch(e => console.error('Background sync failed', e));
    }
  }, [trackingData, selectedOrder]);

  const [formData, setFormData] = useState({
    name: '', company: '', type: 'retail',
    contact: { email: '', phone: '', alternatePhone: '' },
    address: { street: '', city: '', state: '', zipCode: '' },
    taxId: '', notes: ''
  });

  const handleEdit = () => {
    setFormData({
      name: customer.name || '',
      company: customer.company || '',
      type: customer.type || 'retail',
      contact: customer.contact || { email: '', phone: '', alternatePhone: '' },
      address: customer.address || { street: '', city: '', state: '', zipCode: '' },
      taxId: customer.taxId || '',
      notes: customer.notes || ''
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/customers/${customer._id}`, formData);
      setShowEditModal(false);
      fetchCustomerData();
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.message || err.message));
    }
  };

  useEffect(() => { fetchCustomerData(); }, [customerId]);

  const fetchCustomerData = async () => {
    try {
      const [customerRes, salesRes] = await Promise.all([
        api.get(`/customers/${customerId}`),
        api.get(`/sales?customerId=${customerId}`)
      ]);
      setCustomer(customerRes.data.data);
      setSales(salesRes.data.data || []);
    } catch (err) {
      console.error('Failed to fetch customer data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-[13px] text-gray-500 font-medium">Loading customer profile...</span>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-8">
        <button onClick={() => navigate('/customers')} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-[13px] font-medium mb-4 hover:bg-gray-50">
          <ArrowLeft size={16} /> Back to Customers
        </button>
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500">Customer not found.</p>
        </div>
      </div>
    );
  }

  const totalOrders = sales.length;
  const totalRevenue = sales.reduce((sum, sale) => sum + (Number(sale.totalAmount) || 0), 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const shortId = customer._id?.slice(-6).toUpperCase() + '-XT';
  const initials = customer.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const tabs = ['Overview', 'Orders', 'Billing Details', 'Activity'];

  return (
    <div className="bg-[#f6f6f9] min-h-screen">

      {/* ── Page Toolbar ── */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-gray-200 bg-white">
        <button
          onClick={() => navigate('/customers')}
          className="flex items-center gap-2 text-[13px] font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Customers
        </button>
        <h2 className="text-[15px] font-semibold text-gray-900">Customer Details</h2>
        <button
          onClick={() => navigate('/customers')}
          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <div className="px-8 py-6">

        {/* ── Customer Name / Status / Actions Row ── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-[22px] font-bold text-gray-900">{customer.name}</h1>
              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-600 text-[11px] font-semibold rounded border border-emerald-100">
                {totalOrders > 0 ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-gray-500 font-medium">
              <span>Customer ID: <span className="font-bold text-gray-700">{shortId}</span></span>
              <span className="w-1 h-1 rounded-full bg-gray-300 hidden sm:block" />
              <span>Joined <span className="font-bold text-gray-700">{new Date(customer.createdAt || Date.now()).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</span></span>
              <span className="w-1 h-1 rounded-full bg-gray-300 hidden sm:block" />
              <span>Last Visit <span className="font-bold text-gray-700">{sales.length > 0 ? new Date(sales[0]?.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</span></span>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button onClick={() => navigate('/customers')} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
              Close
            </button>
            <button onClick={() => { if(customer.contact?.email) window.location.href = `mailto:${customer.contact.email}`; }} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-2">
              <Mail size={14} /> Send Email
            </button>
            <button onClick={handleEdit} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-[13px] font-medium hover:bg-gray-800 transition-colors shadow-sm flex items-center gap-2">
              <Pencil size={14} /> Edit Details
            </button>
          </div>
        </div>

        {/* ── Two-column layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">

          {/* ── LEFT: Profile sidebar ── */}
          <div className="space-y-5">

            {/* Avatar Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="h-[160px] bg-gray-100 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                  <div className="text-gray-400">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </div>
                </div>
              </div>
              <div className="px-4 py-3 border-t border-gray-100 flex justify-center">
                <button onClick={() => alert('Profile photo upload coming in Phase 3.')} className="px-5 py-1.5 bg-white border border-gray-300 rounded-lg text-[12px] font-medium text-gray-600 hover:bg-gray-50 shadow-sm transition-colors">
                  Upload
                </button>
              </div>
            </div>

            {/* Details */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
              {[
                { label: 'Company', value: customer.company || '—' },
                { label: 'Email', value: customer.contact?.email || '—' },
                { label: 'Phone No.', value: customer.contact?.phone || '—' },
                { label: 'eBay User', value: customer.ebayUsername || '—' },
                { label: 'Country', value: customer.address?.country || 'USA', flag: true },
                { label: 'Time Zone', value: 'EST, New York' },
              ].map(({ label, value, flag }) => (
                <div key={label} className="px-4 py-3 flex items-center justify-between gap-2">
                  <span className="text-[12px] text-gray-500 font-medium w-20 shrink-0">{label}</span>
                  <span className="text-[13px] font-semibold text-gray-900 text-right flex items-center gap-1.5">
                    {flag && <span className="text-[14px]">🇺🇸</span>}
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT: Tabs + Content ── */}
          <div className="space-y-5">

            {/* Tab Bar */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex border-b border-gray-200 px-4">
                {tabs.map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab.toLowerCase().replace(' ', '-'))}
                    className={`px-4 py-4 text-[13px] font-medium transition-colors border-b-2 -mb-px ${
                      activeTab === tab.toLowerCase().replace(' ', '-')
                        ? 'border-gray-900 text-gray-900 font-semibold'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* ── Overview Tab ── */}
              {activeTab === 'overview' && (
                <div className="p-5">
                  {/* 4-col Metrics */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 border border-gray-200 rounded-xl overflow-hidden mb-5">
                    {[
                      {
                        value: totalOrders.toLocaleString(),
                        label: 'Total Orders',
                        trend: '',
                        trendLabel: 'Lifetime',
                        up: true,
                      },
                      {
                        value: `$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                        label: 'Cumulative Spend',
                        trend: '',
                        trendLabel: 'Lifetime',
                        up: true,
                      },
                      {
                        value: `$${avgOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                        label: 'Avg. Order Value (AOV)',
                        trend: '',
                        trendLabel: 'Lifetime',
                        up: true,
                      },
                      {
                        value: customer.company || 'N/A',
                        label: 'Company',
                        trend: '',
                        trendLabel: 'Corporate Record',
                        up: true,
                      },
                    ].map((stat, i) => (
                      <div key={i} className={`p-5 ${i !== 3 ? 'border-r border-gray-200' : ''}`}>
                        <div className="text-[20px] font-bold text-gray-900 mb-1">{stat.value}</div>
                        <div className="text-[12px] text-gray-500 mb-3">{stat.label}</div>
                        {stat.trend && (
                          <div className={`flex items-center gap-1.5 text-[11px] font-semibold ${stat.up ? 'text-emerald-600' : 'text-red-500'}`}>
                            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-bold ${stat.up ? 'bg-emerald-50' : 'bg-red-50'}`}>
                              {stat.up ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                              {stat.trend}
                            </span>
                            <span className="text-gray-400 font-normal">{stat.trendLabel}</span>
                          </div>
                        )}
                        {!stat.trend && (
                           <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400">
                             <span className="font-normal">{stat.trendLabel}</span>
                           </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Orders Tab ── */}
              {activeTab === 'orders' && (
                <div className="p-5">
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          {['Order #', 'Date', 'Items', 'Total', 'Profit', 'Channel'].map(h => (
                            <th key={h} className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {sales.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-12 text-center text-gray-400 text-[13px]">
                              No orders found for this customer.
                            </td>
                          </tr>
                        ) : sales.map(sale => (
                          <tr key={sale._id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3 text-[13px] font-semibold text-blue-500">#{sale.saleNumber}</td>
                            <td className="px-4 py-3 text-[13px] text-gray-600">{new Date(sale.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                            <td className="px-4 py-3 text-[13px] text-gray-600">{sale.items?.length || 0}</td>
                            <td className="px-4 py-3 text-[13px] font-semibold text-gray-900">${sale.totalAmount?.toFixed(2)}</td>
                            <td className="px-4 py-3 text-[13px] font-semibold text-emerald-600">+${sale.totalProfit?.toFixed(2)}</td>
                            <td className="px-4 py-3 text-[13px] text-gray-600 capitalize">{sale.salesChannel?.replace('_', ' ')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'billing-details' && (
                <div className="p-6">
                  <h3 className="text-sm font-bold text-gray-900 mb-4">Billing & Tax Information</h3>
                  <div className="space-y-4">
                    <div>
                      <span className="block text-xs font-semibold text-gray-500 mb-1">Company / Tax ID</span>
                      <span className="text-sm text-gray-900">{customer.company || 'N/A'} {customer.taxId ? `(Tax ID: ${customer.taxId})` : ''}</span>
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-gray-500 mb-1">Registered Address</span>
                      <span className="text-sm text-gray-900">
                        {customer.address?.street ? (
                          <>{customer.address.street}<br/>{customer.address.city}, {customer.address.state} {customer.address.zipCode}<br/>{customer.address.country}</>
                        ) : 'No address on file'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'activity' && (
                <div className="p-6">
                  <h3 className="text-sm font-bold text-gray-900 mb-4">Account Activity Log</h3>
                  <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gray-200">
                     <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-blue-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                          <Plus size={16} />
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-gray-200 bg-white shadow-sm">
                           <div className="flex items-center justify-between mb-1">
                             <h4 className="font-bold text-gray-900 text-[13px]">Account Created</h4>
                             <time className="text-[11px] font-medium text-gray-400">{new Date(customer.createdAt).toLocaleDateString('en-US')}</time>
                           </div>
                           <div className="text-[12px] text-gray-500">Customer profile was registered in the system.</div>
                        </div>
                     </div>
                     {sales.map((sale, idx) => (
                       <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-emerald-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                            <ShoppingCart size={16} />
                          </div>
                          <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-gray-200 bg-white shadow-sm hover:border-[#009EF7] transition-colors cursor-pointer" onClick={() => setSelectedOrder(sale)}>
                             <div className="flex items-center justify-between mb-1">
                               <h4 className="font-bold text-gray-900 text-[13px]">Order Placed: #{sale.saleNumber}</h4>
                               <time className="text-[11px] font-medium text-gray-400">{new Date(sale.createdAt).toLocaleDateString('en-US')}</time>
                             </div>
                             <div className="text-[12px] text-gray-500">
                               Purchased {sale.items?.length || 0} item(s) for a total of ${(sale.totalAmount||0).toFixed(2)}.
                             </div>
                          </div>
                       </div>
                     ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Recent Orders Section (Overview only) ── */}
            {activeTab === 'overview' && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                  <h3 className="text-[14px] font-semibold text-gray-900">Recent Orders</h3>
                  <button
                    onClick={() => setActiveTab('orders')}
                    className="text-[12px] font-medium text-blue-500 hover:text-blue-600 transition-colors"
                  >
                    View All
                  </button>
                </div>

                {sales.length === 0 ? (
                  <div className="px-5 py-12 text-center">
                    <ShoppingCart className="mx-auto text-gray-200 mb-3" size={40} />
                    <p className="text-[13px] text-gray-500 font-medium mb-3">No orders found</p>
                    <button
                      onClick={() => navigate(`/sales?customerId=${customerId}&openModal=true`)}
                      className="px-4 py-2 bg-gray-900 text-white rounded-lg text-[12px] font-medium hover:bg-gray-800 transition-colors flex items-center gap-2 mx-auto"
                    >
                      <Plus size={14} /> Create Sale
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {sales.slice(0, 5).map((sale) => (
                      <div key={sale._id} className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                            <ShoppingCart size={15} />
                          </div>
                          <div>
                            <div className="text-[13px] font-semibold text-gray-900">#{sale.saleNumber}</div>
                            <div className="text-[12px] text-gray-400">
                              {sale.items?.length || 0} item{sale.items?.length !== 1 ? 's' : ''} •{' '}
                              {new Date(sale.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-[13px] font-semibold text-gray-900">${sale.totalAmount?.toFixed(2)}</div>
                            <div className="text-[11px] text-emerald-600 font-medium">+${sale.totalProfit?.toFixed(2)}</div>
                          </div>
                          <button
                            onClick={() => navigate('/sales/' + sale._id)}
                            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[12px] font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                          >
                            View Sale
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {/* ── Bottom action bar ── */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-5 border-t border-gray-200">
          <button
            onClick={() => navigate('/customers')}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-[13px] font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
          >
            Close
          </button>
          <button onClick={() => { if(customer.contact?.email) window.location.href = `mailto:${customer.contact.email}`; }} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-[13px] font-medium text-gray-700 hover:bg-gray-50 shadow-sm flex items-center gap-2">
            <Mail size={14} /> Send Email
          </button>
          <button onClick={handleEdit} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-[13px] font-medium hover:bg-gray-800 shadow-sm flex items-center gap-2">
            <Pencil size={14} /> Edit Details
          </button>
        </div>

      </div>


      {showEditModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-in fade-in transition-opacity">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in duration-200">
            <div className="flex shrink-0 items-center justify-between px-8 py-6 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-black text-gray-900">Modify Customer Profile</h2>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">Account Management Subsystem</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"><X size={24}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 pt-6">
              <form onSubmit={handleEditSubmit} id="customer-edit-form" className="space-y-6">
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

                <div className="space-y-2 pt-2">
                  <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-100 pb-2 flex items-center gap-1.5 w-full">
                    Tax / Corporate ID
                  </label>
                  <input type="text" placeholder="Tax ID" value={formData.taxId} onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                         className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[14px] font-bold focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none" />
                </div>

                <div className="space-y-2">
                   <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Internal Notes</label>
                   <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows="2" placeholder="Prefered contact times, business focus, etc..."
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[14px] font-medium focus:bg-white transition-all outline-none resize-none placeholder:font-normal" />
                </div>
              </form>
            </div>

            <div className="shrink-0 p-8 pt-0 flex gap-4">
              <button type="button" onClick={() => setShowEditModal(false)}
                className="flex-1 py-3.5 bg-gray-100 text-gray-700 font-black text-[13px] rounded-xl hover:bg-gray-200 transition-all uppercase tracking-widest active:scale-95 shadow-sm">
                Cancel
              </button>
              <button type="submit" form="customer-edit-form"
                className="flex-[1.5] flex items-center justify-center gap-2 py-3.5 bg-[#009EF7] text-white font-black text-[13px] rounded-xl hover:bg-[#008de0] transition-all uppercase tracking-widest active:scale-95 shadow-lg shadow-blue-500/30">
                <Save size={18} />
                Update Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
