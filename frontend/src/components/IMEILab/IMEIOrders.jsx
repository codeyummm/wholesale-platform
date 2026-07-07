import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { RefreshCw, Search, Clock, CheckCircle, XCircle, FileText, ChevronUp, ChevronDown, Download, Copy, Check } from 'lucide-react';

export default function IMEIOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState(null);

  const [showFilters, setShowFilters] = useState(false); // Default hide filters if we have a generic search
  const [globalSearch, setGlobalSearch] = useState('');
  const [filters, setFilters] = useState({
    id: '', referenceId: '', imei: '', bulkImei: '', status: '', service: '', fromDate: '', toDate: ''
  });
  
  const [copiedId, setCopiedId] = useState(null);
  const [expandedImeis, setExpandedImeis] = useState({});

  const toggleExpand = (imei) => {
    setExpandedImeis(prev => ({ ...prev, [imei]: !prev[imei] }));
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const stripHtml = (html) => {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return (tmp.textContent || tmp.innerText || '').trim();
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get('/imeilab/orders');
      if (res.data.success) {
        setOrders(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Auto-refresh UI if there are any pending orders
  useEffect(() => {
    const hasPending = orders.some(o => o.status === 'Pending' || o.status === 'In Process' || o.status === 'Unknown');
    if (!hasPending) return;

    const interval = setInterval(() => {
      fetchOrders();
    }, 15000); // Poll every 15 seconds

    return () => clearInterval(interval);
  }, [orders]);

  const handleSync = async (id) => {
    setSyncingId(id);
    try {
      const res = await api.post(`/imeilab/order/${id}/sync`);
      if (res.data.success) {
        setOrders(prev => prev.map(o => o._id === id ? res.data.data : o));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSyncingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Success': return <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded text-xs font-bold flex items-center gap-1 w-max"><CheckCircle size={12}/> Success</span>;
      case 'Rejected': 
      case 'Refunded':
      case 'Canceled': return <span className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs font-bold flex items-center gap-1 w-max"><XCircle size={12}/> {status}</span>;
      default: return <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-bold flex items-center gap-1 w-max"><Clock size={12}/> {status}</span>;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <FileText size={20} className="text-[#009EF7]" /> Order History
          </h2>
          <p className="text-gray-500 text-sm font-medium mt-1">Manage and track your API orders.</p>
        </div>
        
        <div className="flex items-center gap-3 flex-1 justify-end ml-8">
          <div className="relative w-full max-w-xs hidden sm:block">
             <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
             <input 
               type="text" 
               placeholder="Search any order, IMEI, status..."
               value={globalSearch}
               onChange={(e) => setGlobalSearch(e.target.value)}
               className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[13px] font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-[#009EF7]/20 outline-none transition-all"
             />
          </div>

          <button onClick={() => setShowFilters(!showFilters)} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${showFilters ? 'bg-gray-100 text-gray-700' : 'bg-[#009EF7] text-white hover:bg-[#008BE5]'}`}>
            {showFilters ? 'Hide search filters' : 'Show search filters'} {showFilters ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
          </button>
          <button className="px-4 py-2 bg-gray-600 text-white hover:bg-gray-700 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors">
            <Download size={16}/> Export
          </button>
          <button onClick={fetchOrders} className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors border border-gray-200">
             <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <h3 className="text-[15px] font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">Search Order</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 max-w-4xl">
            {/* Left Column */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <label className="text-[13px] font-bold text-gray-600 sm:w-1/3">ID</label>
                <input type="text" value={filters.id} onChange={e => setFilters({...filters, id: e.target.value})} className="flex-1 px-3 py-1.5 bg-white border border-gray-300 rounded focus:ring-2 focus:ring-[#009EF7]/20 outline-none text-[13px] font-medium" />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <label className="text-[13px] font-bold text-gray-600 sm:w-1/3">Order Code</label>
                <input type="text" value={filters.referenceId} onChange={e => setFilters({...filters, referenceId: e.target.value})} className="flex-1 px-3 py-1.5 bg-white border border-gray-300 rounded focus:ring-2 focus:ring-[#009EF7]/20 outline-none text-[13px] font-medium" />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <label className="text-[13px] font-bold text-gray-600 sm:w-1/3">IMEI</label>
                <input type="text" value={filters.imei} onChange={e => setFilters({...filters, imei: e.target.value})} className="flex-1 px-3 py-1.5 bg-white border border-gray-300 rounded focus:ring-2 focus:ring-[#009EF7]/20 outline-none text-[13px] font-medium" />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <label className="text-[13px] font-bold text-gray-600 sm:w-1/3 mt-2">Bulk Imei</label>
                <textarea rows={4} value={filters.bulkImei} onChange={e => setFilters({...filters, bulkImei: e.target.value})} className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded focus:ring-2 focus:ring-[#009EF7]/20 outline-none text-[13px] font-medium resize-y" />
              </div>
            </div>
            
            {/* Right Column */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <label className="text-[13px] font-bold text-gray-600 sm:w-1/3">Status</label>
                <select value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})} className="flex-1 px-3 py-1.5 bg-white border border-gray-300 rounded focus:ring-2 focus:ring-[#009EF7]/20 outline-none text-[13px] font-medium">
                  <option value="">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="In Process">In Process</option>
                  <option value="Success">Success</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Refunded">Refunded</option>
                  <option value="Canceled">Canceled</option>
                </select>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <label className="text-[13px] font-bold text-gray-600 sm:w-1/3">Service</label>
                <select value={filters.service} onChange={e => setFilters({...filters, service: e.target.value})} className="flex-1 px-3 py-1.5 bg-white border border-gray-300 rounded focus:ring-2 focus:ring-[#009EF7]/20 outline-none text-[13px] font-medium">
                  <option value="">All Services</option>
                  {[...new Set(orders.map(o => o.serviceName))].map(name => (
                     <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <label className="text-[13px] font-bold text-gray-600 sm:w-1/3">From Date</label>
                <input type="date" value={filters.fromDate} onChange={e => setFilters({...filters, fromDate: e.target.value})} className="flex-1 px-3 py-1.5 bg-white border border-gray-300 rounded focus:ring-2 focus:ring-[#009EF7]/20 outline-none text-[13px] font-medium" />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <label className="text-[13px] font-bold text-gray-600 sm:w-1/3">To Date</label>
                <input type="date" value={filters.toDate} onChange={e => setFilters({...filters, toDate: e.target.value})} className="flex-1 px-3 py-1.5 bg-white border border-gray-300 rounded focus:ring-2 focus:ring-[#009EF7]/20 outline-none text-[13px] font-medium" />
              </div>
            </div>
          </div>
          <div className="mt-6 flex items-center gap-2 pl-0 sm:pl-[calc(33.333%+8px)]">
             <button className="px-5 py-2 bg-[#337ab7] hover:bg-[#286090] text-white text-sm font-bold rounded flex items-center gap-2 transition-colors">
               <Search size={14}/> Search
             </button>
             <button onClick={() => setFilters({id: '', referenceId: '', imei: '', bulkImei: '', status: '', service: '', fromDate: '', toDate: ''})} className="px-5 py-2 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-700 text-sm font-bold rounded flex items-center gap-2 transition-colors">
               Reset <RefreshCw size={14}/>
             </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest">Order ID / Date</th>
              <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest">Service & IMEI</th>
              <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest">Cost</th>
              <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest">Status</th>
              <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.length === 0 && !loading && (
              <tr>
                <td colSpan="5" className="p-8 text-center text-gray-500 font-medium">No orders found.</td>
              </tr>
            )}
            {(() => {
              const filteredOrders = orders.filter(order => {
                if (globalSearch) {
                   const q = globalSearch.toLowerCase();
                   const match = (order.apiOrderId && order.apiOrderId.toLowerCase().includes(q)) ||
                                 (order.referenceId && order.referenceId.toLowerCase().includes(q)) ||
                                 (order.imei && order.imei.toLowerCase().includes(q)) ||
                                 (order.serviceName && order.serviceName.toLowerCase().includes(q)) ||
                                 (order.status && order.status.toLowerCase().includes(q));
                   if (!match) return false;
                }

                if (filters.id && !order.apiOrderId.includes(filters.id)) return false;
                if (filters.referenceId && order.referenceId && !order.referenceId.includes(filters.referenceId)) return false;
                if (filters.imei && !order.imei.includes(filters.imei)) return false;
                if (filters.status && order.status !== filters.status) return false;
                if (filters.service && order.serviceName !== filters.service) return false;
                
                if (filters.bulkImei) {
                   const bulkList = filters.bulkImei.split(/[\n,]+/).map(i => i.trim()).filter(Boolean);
                   if (bulkList.length > 0 && !bulkList.includes(order.imei)) return false;
                }
                
                if (filters.fromDate) {
                   if (new Date(order.createdAt) < new Date(filters.fromDate)) return false;
                }
                if (filters.toDate) {
                   const to = new Date(filters.toDate);
                   to.setHours(23, 59, 59, 999);
                   if (new Date(order.createdAt) > to) return false;
                }
                
                return true;
              });

              // Group by IMEI
              const groupedOrders = {};
              filteredOrders.forEach(order => {
                 if (!groupedOrders[order.imei]) groupedOrders[order.imei] = [];
                 groupedOrders[order.imei].push(order);
              });

              const groupedArray = Object.values(groupedOrders).map(group => {
                 return group.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
              }).sort((a, b) => new Date(b[0].createdAt) - new Date(a[0].createdAt));

              return groupedArray.map(group => {
                const mainOrder = group[0];
                const history = group.slice(1);
                const isExpanded = expandedImeis[mainOrder.imei];

                return (
                  <React.Fragment key={mainOrder.imei}>
                    <tr className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4">
                        <div className="text-sm font-bold text-gray-900">#{mainOrder.apiOrderId}</div>
                        <div className="text-xs font-medium text-gray-500 mt-0.5">{new Date(mainOrder.createdAt).toLocaleString()}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-bold text-gray-900">{mainOrder.serviceName}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="text-xs font-mono text-gray-500 tracking-wider bg-gray-100 px-1.5 py-0.5 rounded w-max">{mainOrder.imei}</div>
                          <button 
                            onClick={() => handleCopy(mainOrder.imei, `imei-${mainOrder._id}`)}
                            className="text-gray-400 hover:text-[#009EF7] transition-colors"
                            title="Copy IMEI"
                          >
                            {copiedId === `imei-${mainOrder._id}` ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-black text-gray-900">{mainOrder.cost} CR</div>
                      </td>
                      <td className="p-4">
                        {getStatusBadge(mainOrder.status)}
                        {mainOrder.apiResponse?.CODE && (
                          <div className="mt-2 relative group max-w-xs">
                            <div className="text-[11px] leading-tight text-gray-600 bg-gray-50 border border-gray-200 p-2 rounded-md overflow-x-auto" 
                                 dangerouslySetInnerHTML={{ __html: mainOrder.apiResponse.CODE }} />
                            <button 
                              onClick={() => handleCopy(stripHtml(mainOrder.apiResponse.CODE), `code-${mainOrder._id}`)}
                              className="absolute bottom-2 right-2 p-1.5 bg-white border border-gray-200 rounded-md text-gray-400 hover:text-[#009EF7] shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                              title="Copy Result Text"
                            >
                              {copiedId === `code-${mainOrder._id}` ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-right align-top">
                        <div className="flex flex-col items-end gap-2">
                          <button 
                            onClick={() => handleSync(mainOrder._id)}
                            disabled={syncingId === mainOrder._id || mainOrder.status === 'Success' || mainOrder.status === 'Rejected' || mainOrder.status === 'Refunded'}
                            className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-bold hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all disabled:opacity-50 flex items-center gap-1.5 ml-auto"
                          >
                            <RefreshCw size={12} className={syncingId === mainOrder._id ? "animate-spin" : ""} /> Sync Status
                          </button>
                          {history.length > 0 && (
                            <button 
                              onClick={() => toggleExpand(mainOrder.imei)}
                              className="text-xs font-bold text-[#009EF7] flex items-center gap-1 mt-2 hover:underline"
                            >
                              {history.length} Previous {history.length === 1 ? 'Check' : 'Checks'} {isExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    
                    {isExpanded && history.map((order, idx) => (
                      <tr key={order._id} className="bg-blue-50/20 border-t border-dashed border-gray-200">
                        <td className="p-4 pl-8 border-l-4 border-[#009EF7]">
                          <div className="text-sm font-bold text-gray-700">#{order.apiOrderId}</div>
                          <div className="text-xs font-medium text-gray-500 mt-0.5">{new Date(order.createdAt).toLocaleString()}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm font-bold text-gray-700">{order.serviceName}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm font-black text-gray-700">{order.cost} CR</div>
                        </td>
                        <td className="p-4">
                          {getStatusBadge(order.status)}
                          {order.apiResponse?.CODE && (
                            <div className="mt-2 relative group max-w-xs opacity-80 hover:opacity-100 transition-opacity">
                              <div className="text-[11px] leading-tight text-gray-600 bg-white border border-gray-200 p-2 rounded-md overflow-x-auto" 
                                   dangerouslySetInnerHTML={{ __html: order.apiResponse.CODE }} />
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-right align-top">
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              });
            })()}
          </tbody>
        </table>
      </div>
    </div>
  );
}
