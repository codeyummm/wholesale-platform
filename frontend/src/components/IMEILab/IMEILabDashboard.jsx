import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import IMEIOrders from './IMEIOrders';
import IMEIStats from './IMEIStats';
import { 
  Zap, Search, RefreshCw, CreditCard, Box, AlertTriangle, ShieldCheck, Cpu, Pin, PinOff 
} from 'lucide-react';

export default function IMEILabDashboard() {
  const [accountInfo, setAccountInfo] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  const [imei, setImei] = useState('');
  const [bulkImei, setBulkImei] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [orderResult, setOrderResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('new_order');

  const [searchQuery, setSearchQuery] = useState('');
  const [pinnedServices, setPinnedServices] = useState(() => {
    try {
      const stored = localStorage.getItem('pinned_imei_services');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const togglePin = (e, serviceId) => {
    e.stopPropagation();
    setPinnedServices(prev => {
      const newPins = prev.includes(serviceId) ? prev.filter(id => id !== serviceId) : [...prev, serviceId];
      localStorage.setItem('pinned_imei_services', JSON.stringify(newPins));
      return newPins;
    });
  };

  const filteredServices = services.filter(srv => {
    if (!searchQuery) return true;
    const lowerQ = searchQuery.toLowerCase();
    return srv.SERVICEID.includes(lowerQ) || srv.SERVICENAME.toLowerCase().includes(lowerQ);
  }).sort((a, b) => {
    const aPinned = pinnedServices.includes(a.SERVICEID);
    const bPinned = pinnedServices.includes(b.SERVICEID);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return 0;
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const accRes = await api.get('/imeilab/account');
      if (accRes.data.success && accRes.data.data.SUCCESS) {
        setAccountInfo(accRes.data.data.SUCCESS[0].AccoutInfo);
      }
      
      const srvRes = await api.get('/imeilab/services');
      if (srvRes.data.success && srvRes.data.data.SUCCESS) {
        const groupsObj = srvRes.data.data.SUCCESS[0].LIST;
        let allServices = [];
        for (const groupKey in groupsObj) {
           const group = groupsObj[groupKey];
           if (group.SERVICES) {
              for (const srvKey in group.SERVICES) {
                 allServices.push({
                    ...group.SERVICES[srvKey],
                    GROUPNAME: group.GROUPNAME
                 });
              }
           }
        }
        setServices(allServices);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch data from API provider.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!imei && !bulkImei) {
      setError('Please provide at least one IMEI.');
      return;
    }
    if (!selectedService) {
      setError('Please select a service.');
      return;
    }
    setSubmitting(true);
    setError('');
    setOrderResult(null);

    try {
      const srv = services.find(s => s.SERVICEID === selectedService);
      
      const imeiList = [];
      if (imei) imeiList.push(imei.trim());
      if (bulkImei) {
         const bulks = bulkImei.split(/[\n,]+/).map(i => i.trim()).filter(Boolean);
         imeiList.push(...bulks);
      }
      
      // Deduplicate IMEIs
      const uniqueImeis = [...new Set(imeiList)];
      
      let results = [];
      let hasError = false;
      
      // Process sequentially to not hammer the API
      for (const currentImei of uniqueImeis) {
        const payload = {
          ID: selectedService,
          IMEI: currentImei,
          cost: srv ? parseFloat(srv.CREDIT) : 0,
          serviceName: srv ? srv.SERVICENAME : 'Unknown Service'
        };
        
        try {
           const res = await api.post('/imeilab/order', payload);
           if (res.data.success) {
             results.push({ imei: currentImei, status: 'Success', data: res.data.data });
           } else {
             results.push({ imei: currentImei, status: 'Failed', error: 'Order failed on backend' });
             hasError = true;
           }
        } catch (err) {
           results.push({ imei: currentImei, status: 'Error', error: err.message });
           hasError = true;
        }
      }
      
      if (uniqueImeis.length === 1) {
         if (hasError) setError('Order failed.');
         else setOrderResult(results[0].data);
      } else {
         // Bulk result
         setOrderResult({
           bulkSummary: `Processed ${uniqueImeis.length} IMEIs`,
           details: results
         });
      }
      
      // Clear inputs on success
      if (!hasError) {
         setImei('');
         setBulkImei('');
      }
      
    } catch (err) {
      console.error(err);
      setError('Error processing orders.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#f6f6f9] min-h-screen p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Zap className="text-[#009EF7]" size={28} /> IMEI Lab
          </h1>
          <p className="text-gray-500 text-[13px] font-medium mt-1">
            Global IMEI Unlocking & Checking Gateway
          </p>
        </div>
        <div className="flex items-center gap-4">
          {accountInfo ? (
            <div className="flex gap-4">
              <div className="bg-white border border-gray-200 px-4 py-2 rounded-xl flex items-center gap-3 shadow-sm">
                 <div className="bg-blue-50 p-1.5 rounded-md"><CreditCard size={16} className="text-blue-500" /></div>
                 <div>
                   <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Credits</p>
                   <p className="text-[14px] font-black text-gray-900">{accountInfo.credit || '0.00'}</p>
                 </div>
              </div>
              <div className="bg-white border border-gray-200 px-4 py-2 rounded-xl flex items-center gap-3 shadow-sm">
                 <div className="bg-emerald-50 p-1.5 rounded-md"><Box size={16} className="text-emerald-500" /></div>
                 <div>
                   <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Account</p>
                   <p className="text-[14px] font-black text-gray-900">{accountInfo.mail || 'Active'}</p>
                 </div>
              </div>
            </div>
          ) : (
            <button onClick={fetchData} className="px-4 py-2 bg-white border border-gray-200 text-[13px] font-bold rounded-lg shadow-sm flex items-center gap-2 text-gray-600 hover:bg-gray-50">
               <RefreshCw size={14}/> Connect API
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-6 mb-6 border-b border-gray-200">
        <button onClick={() => setActiveTab('new_order')} className={`pb-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'new_order' ? 'border-[#009EF7] text-[#009EF7]' : 'border-transparent text-gray-500 hover:text-gray-900'}`}>New Order</button>
        <button onClick={() => setActiveTab('history')} className={`pb-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'history' ? 'border-[#009EF7] text-[#009EF7]' : 'border-transparent text-gray-500 hover:text-gray-900'}`}>Order History</button>
        <button onClick={() => setActiveTab('analytics')} className={`pb-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'analytics' ? 'border-[#009EF7] text-[#009EF7]' : 'border-transparent text-gray-500 hover:text-gray-900'}`}>Analytics</button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-[#009EF7] rounded-full animate-spin mb-4" />
          <p className="text-gray-500 font-medium text-sm">Connecting to GSMA Network...</p>
        </div>
      ) : activeTab === 'new_order' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Order Form */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
              <h3 className="text-[15px] font-bold text-gray-900 flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
                <Search size={18} className="text-[#009EF7]" /> New Look-up / Unlock Order
              </h3>
              
              {error && (
                <div className="mb-4 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl flex items-start gap-3 text-[13px] font-medium">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5"/> {error}
                </div>
              )}

              <form onSubmit={handlePlaceOrder} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Target IMEI / SN</label>
                  <input 
                    type="text" 
                    value={imei}
                    onChange={(e) => setImei(e.target.value)}
                    placeholder="Enter Single IMEI..."
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[14px] font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Bulk IMEI / SN</label>
                    <span className="text-[10px] text-gray-400 font-bold bg-gray-100 px-2 py-0.5 rounded">Optional</span>
                  </div>
                  <textarea 
                    rows={4}
                    value={bulkImei}
                    onChange={(e) => setBulkImei(e.target.value)}
                    placeholder="Paste multiple IMEIs here... (separated by commas or new lines)"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[13px] font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none resize-y"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Select Service</label>
                  <select 
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[13px] font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                  >
                    <option value="">-- Choose a service --</option>
                    {filteredServices.map(srv => (
                      <option key={srv.SERVICEID} value={srv.SERVICEID}>
                        [{srv.SERVICEID}] {srv.SERVICENAME} ({srv.CREDIT} CR)
                      </option>
                    ))}
                  </select>
                </div>

                <button 
                  disabled={submitting}
                  type="submit" 
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-gray-900 text-white font-black text-[13px] rounded-xl hover:bg-gray-800 transition-all uppercase tracking-widest shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Processing...' : 'Place Order'}
                </button>
              </form>
            </div>
            
            {orderResult && (
               <div className="bg-emerald-50 p-6 rounded-2xl shadow-sm border border-emerald-100 animate-in fade-in slide-in-from-bottom-4">
                 <h3 className="text-[15px] font-bold text-emerald-800 flex items-center gap-2 mb-2">
                   <ShieldCheck size={18} /> Order Submitted
                 </h3>
                 <pre className="text-[11px] text-emerald-700 font-mono whitespace-pre-wrap overflow-x-auto bg-white/50 p-3 rounded-lg border border-emerald-100">
                   {JSON.stringify(orderResult, null, 2)}
                 </pre>
               </div>
            )}
          </div>

          {/* Service List / Directory */}
          <div className="lg:col-span-2 flex flex-col h-full max-h-[800px]">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col flex-1">
              <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-[15px] font-bold text-gray-900 flex items-center gap-2">
                    <Cpu size={18} className="text-gray-400" /> Available Services Directory
                  </h3>
                  <div className="text-[12px] font-bold text-gray-400 mt-1">
                    {filteredServices.length} Services Available
                  </div>
                </div>
                <div className="relative w-full sm:w-64">
                   <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                   <input 
                     type="text" 
                     placeholder="Search ID, name, phrase..."
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-[13px] font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                   />
                </div>
              </div>
              <div className="overflow-y-auto p-2 flex-1 relative bg-gray-50/30">
                 <div className="divide-y divide-gray-100">
                   {filteredServices.map(srv => {
                     const isPinned = pinnedServices.includes(srv.SERVICEID);
                     return (
                       <div key={srv.SERVICEID} className={`p-4 hover:bg-white bg-transparent rounded-xl transition-colors cursor-pointer group flex items-start gap-4 ${isPinned ? 'bg-amber-50/30 hover:bg-amber-50/50' : ''}`} onClick={() => setSelectedService(srv.SERVICEID)}>
                          <div className={`w-10 h-10 border rounded-lg flex items-center justify-center shrink-0 transition-colors ${isPinned ? 'bg-amber-100 border-amber-200 text-amber-600' : 'bg-gray-100 border-gray-200 text-gray-500 group-hover:bg-[#009EF7] group-hover:text-white group-hover:border-[#009EF7]'}`}>
                            <span className="text-[10px] font-black uppercase tracking-tighter">#{srv.SERVICEID}</span>
                          </div>
                          <div className="flex-1">
                            <h4 className="text-[14px] font-bold text-gray-900 leading-tight mb-1 group-hover:text-[#009EF7] transition-colors">{srv.SERVICENAME}</h4>
                            <p className="text-[12px] text-gray-500 font-medium">Delivery: {srv.TIME} • Req: IMEI</p>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <div className="text-right">
                              <div className="text-[14px] font-black text-gray-900">{srv.CREDIT} CR</div>
                              <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Cost</div>
                            </div>
                            <button 
                              onClick={(e) => togglePin(e, srv.SERVICEID)} 
                              className={`p-1.5 rounded-md transition-colors ${isPinned ? 'text-amber-500 bg-amber-100 hover:bg-amber-200' : 'text-gray-300 hover:bg-gray-100 hover:text-gray-600 opacity-0 group-hover:opacity-100'}`}
                              title={isPinned ? "Unpin Service" : "Pin Service"}
                            >
                              {isPinned ? <Pin size={14} className="fill-current" /> : <Pin size={14} />}
                            </button>
                          </div>
                       </div>
                     );
                   })}
                   
                   {filteredServices.length === 0 && (
                     <div className="p-8 text-center text-gray-400 text-[13px] font-medium">
                       No services matching "{searchQuery}"
                     </div>
                   )}
                 </div>
              </div>
            </div>
          </div>

        </div>
      ) : activeTab === 'history' ? (
        <IMEIOrders />
      ) : (
        <IMEIStats />
      )}
    </div>
  );
}
