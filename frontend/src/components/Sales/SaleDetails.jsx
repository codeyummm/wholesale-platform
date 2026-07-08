import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import printJS from 'print-js';
import {
  ArrowLeft, Mail, Truck, CheckCircle2, Box, Download, FileText, Eye, Printer, Copy, Check, Upload
} from 'lucide-react';

// Reset leaflet markers
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon, shadowUrl: iconShadow, iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const getServerUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  const baseUrl = api.defaults.baseURL.replace(/\/api$/, '');
  return `${baseUrl}${path}`;
};

// Opens the PDF blob in a new window and auto-triggers the print dialog
// Opens the PDF blob in a new window and auto-triggers the print dialog.
// Scales the PDF to 106% via the backend first so it prints correctly at 100%.
const printPdfDirectly = async (base64Data) => {
  let pdfBase64 = base64Data;

  // Scale the PDF to 106% via backend (baked-in, no manual dialog adjustment needed)
  try {
    const resp = await api.post('/shipping/scale-pdf', { labelBase64: base64Data, scale: 1.06 });
    if (resp.data?.success && resp.data.labelBase64) {
      pdfBase64 = resp.data.labelBase64.includes(',')
        ? resp.data.labelBase64.split(',')[1]
        : resp.data.labelBase64;
    }
  } catch (e) {
    console.warn('PDF scale failed, using original:', e.message);
  }

  const binaryString = atob(pdfBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const blobUrl = URL.createObjectURL(blob);

  // Open PDF natively in a new window (Safari's clean PDF viewer)
  const newWin = window.open(blobUrl, '_blank');

  if (newWin) {
    // Wait for the PDF to render, then auto-trigger Cmd+P
    setTimeout(() => {
      try {
        newWin.focus();
        newWin.print();
      } catch (e) {
        console.warn('Auto-print blocked by browser:', e);
      }
    }, 1500);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 120000);
  }
};




function MapUpdater({ pathCoordinates }) {
  const map = useMap();
  useEffect(() => {
    // Wait for map container to fully expand and transition
    const timer = setTimeout(() => {
      map.invalidateSize();
      if (pathCoordinates && pathCoordinates.length > 1) {
        map.fitBounds(pathCoordinates, { padding: [50, 50] });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [map, pathCoordinates]);
  return null;
}

export default function SaleDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const [trackingData, setTrackingData] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState('');
  
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [pathCoordinates, setPathCoordinates] = useState([]);
  const [geocoding, setGeocoding] = useState(false);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [activeLabelTab, setActiveLabelTab] = useState('system');
  const [copiedText, setCopiedText] = useState(null);

  useEffect(() => {
    if (selectedOrder?.shipping?.labelImage) {
      if (selectedOrder.shipping.labelImage.startsWith('data:application/pdf')) {
        setActiveLabelTab('system');
      } else {
        setActiveLabelTab('cutout');
      }
    }
  }, [selectedOrder?.shipping?.labelImage]);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const getActiveImageUrl = () => {
    if (!selectedOrder?.shipping) return null;
    const { labelImage, scannedLabel, fullImage, dropoffReceipt } = selectedOrder.shipping;
    
    if (activeLabelTab === 'system' && labelImage?.startsWith('data:application/pdf')) return labelImage;
    if (activeLabelTab === 'cutout') return scannedLabel || (!labelImage?.startsWith('data:application/pdf') ? labelImage : null);
    if (activeLabelTab === 'full') return fullImage;
    if (activeLabelTab === 'receipt') return dropoffReceipt;
    return null;
  };

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await api.get(`/sales/${id}`);
        setSelectedOrder(response.data.data);
      } catch (error) {
        console.error('Failed to load sale details:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);

  const handleDirectReceiptUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingReceipt(true);
    const formData = new FormData();
    formData.append('receiptImage', file);

    try {
      const response = await api.post(`/sale-scanner/direct-receipt/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSelectedOrder(prev => ({
        ...prev,
        shipping: {
          ...prev.shipping,
          dropoffReceipt: response.data.receiptUrl
        },
        deliveryStatus: 'in_transit'
      }));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to upload receipt');
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const trackingNumber = selectedOrder?.shipping?.trackingNumber;
    const carrier = selectedOrder?.shipping?.carrier;
    const isDelivered = selectedOrder?.status === 'delivered' || selectedOrder?.deliveryStatus === 'delivered';
    const cachedTrackingData = selectedOrder?.shipping?.trackingData;

    const loadTracking = async () => {
      if (!trackingNumber || !carrier) {
        if (!cancelled) setTrackingError('No tracking number or carrier registered for this order.');
        return;
      }

      if (!cancelled) {
        setTrackingLoading(true);
        setTrackingError('');
      }

      try {
        const response = await api.get(`/tracking/${carrier}/${trackingNumber}`);
        if (!cancelled) {
          const liveData = response.data;

          if (isDelivered) {
            // DB says delivered — override the live latestStatusDetail so no stale
            // "Out For Delivery Today" scan can display as the current status badge.
            // Scan events are still shown as-is (fresh from API).
            setTrackingData({
              ...liveData,
              latestStatusDetail: {
                ...(liveData.latestStatusDetail || {}),
                statusByLocale: 'Delivered',
              },
            });
          } else {
            setTrackingData(liveData);
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Tracking Error', error);
          // Fallback to cached data if available
          if (cachedTrackingData) {
            setTrackingData(isDelivered ? {
              ...cachedTrackingData,
              latestStatusDetail: { statusByLocale: 'Delivered' },
            } : cachedTrackingData);
          } else {
            setTrackingError(error.response?.data?.error || 'Failed to fetch tracking data');
          }
        }
      } finally {
        if (!cancelled) {
          setTrackingLoading(false);
        }
      }
    };


    if (trackingNumber && carrier) {
      loadTracking();
    } else {
      setTrackingData(null);
      setTrackingError('');
      setShowAllEvents(false);
      setPathCoordinates([]);
    }

    return () => { cancelled = true; };
  }, [selectedOrder?.shipping?.trackingNumber, selectedOrder?.shipping?.carrier]);

  const [pushingToEbay, setPushingToEbay] = useState(false);

  // Geocoding effect — proxied through backend to avoid CORS
  useEffect(() => {
    let cancelled = false;

    const geocodePath = async () => {
      if (!trackingData?.scanEvents || trackingData.scanEvents.length === 0) return;
      setGeocoding(true);
      
      const uniqueLocations = [];
      const seen = new Set();
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
         if (cancelled) break;
         try {
           const res = await api.get(`/tracking/geocode/search?q=${encodeURIComponent(loc)}`);
           if (res.data && res.data.length > 0) {
             coords.push([parseFloat(res.data[0].lat), parseFloat(res.data[0].lon)]);
           }
           await new Promise(r => setTimeout(r, 1100)); // Nominatim requires absolute max 1 req/sec
         } catch (e) { console.error('Geocoding dropped for', loc); }
      }

      if (!cancelled) {
        setPathCoordinates(coords);
        setGeocoding(false);
      }
    };

    geocodePath();
    return () => { cancelled = true; };
  }, [trackingData]);

  // Background Status Synchronization
  useEffect(() => {
    if (!trackingData || !trackingData.latestStatusDetail || !selectedOrder) return;
    const statusStr = trackingData.latestStatusDetail.statusByLocale?.toLowerCase() || '';
    let newStatus = 'shipped';
    let newDeliveryStatus = 'shipped';
    
    if (statusStr.includes('out for') || statusStr.includes('out-for')) {
      newStatus = 'shipped';
      newDeliveryStatus = 'out_for_delivery';
    } else if (statusStr.includes('deliver')) {
      newStatus = 'delivered';
      newDeliveryStatus = 'delivered';
    } else if (statusStr.includes('transit') || statusStr.includes('way') || statusStr.includes('facility') || statusStr.includes('depart') || statusStr.includes('carrier') || statusStr.includes('processing')) {
      newStatus = 'shipped';
      newDeliveryStatus = 'in_transit';
    }

    // --- FORWARD-ONLY GUARD ---
    // Status must never go backwards. Once delivered, nothing can downgrade it.
    const deliveryRank = { shipped: 1, in_transit: 2, out_for_delivery: 3, delivered: 4 };
    const currentRank = deliveryRank[selectedOrder.deliveryStatus] || 0;
    const newRank = deliveryRank[newDeliveryStatus] || 0;
    if (newRank < currentRank) return; // Refuse to downgrade
    // -------------------------

    const needsStatusUpdate = selectedOrder.status !== newStatus || selectedOrder.deliveryStatus !== newDeliveryStatus;
    
    const cachedStatusStr = selectedOrder.shipping?.trackingData?.latestStatusDetail?.statusByLocale?.toLowerCase() || '';
    const isCacheAlreadyDelivered = cachedStatusStr.includes('deliver');
    const needsTrackingCache = newDeliveryStatus === 'delivered' && !isCacheAlreadyDelivered;
    
    // Fire background PUT if status changed OR if it's delivered but we haven't cached the tracking data yet
    if (needsStatusUpdate || needsTrackingCache) {
       const updatePayload = { 
         status: newStatus, 
         deliveryStatus: newDeliveryStatus, 
         skipHistory: true 
       };
       
       if (needsTrackingCache) {
         // Use dot notation to avoid overwriting the entire shipping object in Mongoose
         updatePayload['shipping.trackingData'] = trackingData;
       }

       api.put(`/sales/${selectedOrder._id}`, updatePayload)
          .then(() => {
             setSelectedOrder(prev => ({ 
               ...prev, 
               status: newStatus, 
               deliveryStatus: newDeliveryStatus,
               shipping: needsTrackingCache ? { ...prev.shipping, trackingData: trackingData } : prev.shipping
             }));
             console.log('Background sync saved status:', newStatus);
          })
          .catch(e => {
             console.error('Background sync failed', e);
             toast.error('Failed to save tracking status to database');
          });
    }
  }, [trackingData, selectedOrder]);

  const handleFulfillEbay = async () => {
    if (!window.confirm("Push this tracking number to eBay? This will notify the buyer that the order has shipped.")) return;
    setPushingToEbay(true);
    try {
      await api.post(`/ebay/fulfill/${selectedOrder._id}`);
      alert("Success! The order has been marked as shipped on eBay.");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to push tracking to eBay");
    } finally {
      setPushingToEbay(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50/50 min-h-[500px]">
        <div className="text-gray-500 font-medium tracking-tight">Loading Sale Details...</div>
      </div>
    );
  }

  if (!selectedOrder) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50 min-h-screen">
          <div className="bg-white px-8 py-10 rounded-2xl shadow-sm border border-gray-200 text-center flex flex-col items-center">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Sale Not Found</h3>
            <p className="text-sm text-gray-500 mb-6">This order could not be loaded or retrieved.</p>
            <button onClick={() => navigate(-1)} className="px-5 py-2.5 bg-gray-900 border border-transparent rounded-lg text-[13px] font-bold text-white shadow-md">Go Back</button>
          </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#F5F8FA] min-h-screen">
      <div className="p-8 max-w-[1240px] mx-auto w-full flex flex-col">
        
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[13px] font-bold text-gray-400 hover:text-gray-900 transition-colors mb-6 w-fit">
          <ArrowLeft size={16} /> BACK TO ORDERS
        </button>

        {/* Title & Actions Bar */}
        <div className="flex flex-col md:flex-row md:items-end justify-between w-full gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
               <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Order: {selectedOrder.saleNumber}</h1>
               {(() => {
                 let text = 'PENDING';
                 let colorClasses = 'bg-amber-100 text-amber-700';

                 if (selectedOrder.status === 'delivered' || selectedOrder.status === 'completed' || selectedOrder.deliveryStatus === 'delivered') {
                   text = 'DELIVERED';
                   colorClasses = 'bg-emerald-100 text-emerald-700';
                 } else if (selectedOrder.deliveryStatus === 'out_for_delivery') {
                   text = 'OUT FOR DELIVERY';
                   colorClasses = 'bg-blue-100 text-blue-700';
                 } else if (selectedOrder.status === 'shipped' || selectedOrder.deliveryStatus === 'shipped' || selectedOrder.deliveryStatus === 'in_transit') {
                   text = 'SHIPPED';
                   colorClasses = 'bg-indigo-100 text-indigo-700';
                 } else if (selectedOrder.status === 'cancelled') {
                   text = 'CANCELLED';
                   colorClasses = 'bg-red-100 text-red-700';
                 }

                 return (
                   <span className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md ${colorClasses}`}>
                     {text}
                   </span>
                 );
               })()}
            </div>
            <div className="text-[13px] font-medium text-gray-400">
              Created <span className="text-gray-600 font-bold">{new Date(selectedOrder.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span> • 
              Customer: <span className="text-gray-700 font-bold ml-1">{selectedOrder.customerName || selectedOrder.customer?.name}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button className="px-5 py-2.5 bg-white border border-gray-200 rounded-lg text-[13px] font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-2">
                <FileText size={16}/> View Invoice
             </button>
          </div>
        </div>

        {/* Main Grid Two Columns */}
        <div className="flex flex-col lg:flex-row gap-6 w-full">
          
          {/* Left Column */}
          <div className="flex-1 space-y-6">
            
            {/* Team (Items) Block */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
              <div className="px-6 py-4 border-b border-gray-200 bg-white flex justify-between items-center">
                <h3 className="text-[14px] font-bold text-gray-900">Ordered Items</h3>
              </div>
              <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse">
                    <thead>
                       <tr className="bg-gray-50/50 text-[12px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">
                          <th className="px-6 py-3 font-bold">Product</th>
                          <th className="px-6 py-3 font-bold">Quantity</th>
                          <th className="px-6 py-3 font-bold">Unit Price</th>
                          <th className="px-6 py-3 font-bold">Total</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                       {(selectedOrder.items || []).map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                             <td className="px-6 py-4 flex items-center gap-4">
                                <div className="w-12 h-12 bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-center shrink-0">
                                   <Box size={20} className="text-gray-400" />
                                </div>
                                <div className="flex flex-col">
                                   <span className="text-[14px] font-bold text-gray-900">{item.brand} {item.model}</span>
                                   <span className="text-[12px] font-medium text-gray-400 mt-0.5">
                                      SKU: {item.imei || item._id?.slice(-8) || 'N/A'} • {item.storage || item.condition || 'N/A'}
                                   </span>
                                </div>
                             </td>
                             <td className="px-6 py-4 text-[14px] font-medium text-gray-700">1</td>
                             <td className="px-6 py-4 text-[14px] font-medium text-gray-700">${(item.salePrice || 0).toFixed(2)}</td>
                             <td className="px-6 py-4 text-[14px] font-bold text-gray-900">${(item.salePrice || 0).toFixed(2)}</td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
            </div>

            {/* Logistics & Tracking Block */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.02)] relative">
               <div className="px-6 py-4 border-b border-gray-200 bg-white flex justify-between items-center">
                 <h3 className="text-[14px] font-bold text-gray-900">Logistics & Tracking</h3>
                 <div className="flex items-center gap-4">
                    {!selectedOrder.shipping?.trackingNumber && (
                      <button 
                        onClick={() => navigate('/shipping')} 
                        className="px-3 py-1.5 bg-[#181C32] hover:bg-gray-800 text-white text-[11px] font-bold uppercase tracking-wider rounded-md transition-colors shadow-sm flex items-center gap-1.5"
                      >
                        <Printer size={12} /> Create Label
                      </button>
                    )}
                   {selectedOrder.paymentMethod === 'ebay' && (
                     <button 
                       onClick={handleFulfillEbay} 
                       disabled={pushingToEbay || !selectedOrder.shipping?.trackingNumber}
                       title={!selectedOrder.shipping?.trackingNumber ? "Add a tracking number first" : ""}
                       className="px-3 py-1.5 bg-[#009EF7] hover:bg-[#007AC0] disabled:bg-[#009EF7]/50 text-white text-[11px] font-bold uppercase tracking-wider rounded-md transition-colors shadow-sm"
                     >
                       {pushingToEbay ? 'Pushing...' : 'Push to eBay'}
                     </button>
                   )}
                   <span 
                     onClick={() => setShowMap(!showMap)}
                     className="text-[12px] font-bold text-[#009EF7] cursor-pointer hover:underline"
                   >
                     {showMap ? 'Hide Map' : 'Map View'}
                   </span>
                 </div>
               </div>
               
               <div className="p-6">
                  {/* Basic Shipping Details - Always Show */}
                  <div className="flex gap-8 mb-6">
                     <div>
                        <span className="text-[12px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Carrier</span>
                        <div className="flex items-center gap-2">
                          <Truck size={16} className={selectedOrder.shipping?.carrier ? "text-[#009EF7]" : "text-[#d87c24]"} />
                          <span className="text-[14px] font-bold text-gray-900">{selectedOrder.shipping?.carrier || 'Manual Dispatch'}</span>
                        </div>
                     </div>
                     <div>
                        <span className="text-[12px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Tracking #</span>
                        <span className="text-[14px] font-bold text-gray-900">{selectedOrder.shipping?.trackingNumber || 'N/A'}</span>
                     </div>
                     <div>
                        <span className="text-[12px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Delivery Method</span>
                        <span className="text-[14px] font-bold text-gray-900">{trackingData?.serviceType || 'Standard Shipping'}</span>
                     </div>
                  </div>

                  {/* Error State for Live Tracking */}
                  {trackingError ? (
                     <div className="text-sm font-bold text-red-500 bg-red-50 p-4 rounded-xl border border-red-100 mb-6">
                       {trackingError}
                     </div>
                  ) : (
                     <>
                        {/* Progress trackers - Map component combined with path lists */}
                        {trackingData ? (
                           <div className="space-y-4">
                               {showMap && pathCoordinates.length > 0 && (
                                 <div className="w-full h-[280px] rounded-xl overflow-hidden shadow-[inset_0_2px_8px_rgba(0,0,0,0.05)] mb-6 border border-gray-200 bg-gray-50">
                                    <MapContainer 
                                      key={pathCoordinates.length}
                                      bounds={pathCoordinates} 
                                      boundsOptions={{ padding: [50, 50], maxZoom: 6 }}
                                      scrollWheelZoom={false} 
                                      style={{ height: '100%', width: '100%' }}
                                      zoomControl={true}
                                    >
                                      <MapUpdater pathCoordinates={pathCoordinates} />
                                      <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                                      <Polyline positions={pathCoordinates} color="#009EF7" weight={4} opacity={0.8} />
                                      {pathCoordinates.map((pos, idx) => (
                                         <CircleMarker key={idx} center={pos} radius={5} fillColor="#009EF7" color="#ffffff" weight={3} fillOpacity={1} />
                                      ))}
                                    </MapContainer>
                                 </div>
                               )}
                              <div className="space-y-3">
                                 {(showAllEvents ? trackingData.scanEvents : trackingData.scanEvents?.slice(0, 4)).map((event, i) => (
                                     <div key={i} className="flex flex-col bg-white p-4 rounded-xl border border-gray-100 shadow-[0_2px_4px_rgba(0,0,0,0.02)] transition-colors hover:border-gray-200 hover:bg-gray-50/50">
                                        <div className="flex justify-between items-start mb-0.5">
                                           <span className="text-[13px] font-bold text-gray-900 flex items-center gap-2">
                                              <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
                                              {event.eventDescription}
                                           </span>
                                           <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest text-right shrink-0">
                                             {event.date ? new Date(event.date).toLocaleDateString('en-US') : ''}
                                             {event.time ? ` • ${event.time}` : ''}
                                           </div>
                                        </div>
                                        <div className="text-[12px] font-medium text-gray-500 ml-4">
                                           {event.scanLocation?.city}{event.scanLocation?.city ? ', ' : ''}{event.scanLocation?.stateOrProvinceCode} {event.scanLocation?.countryCode}
                                        </div>
                                     </div>
                                 ))}
                                 {trackingData.scanEvents && trackingData.scanEvents.length > 4 && (
                                    <button 
                                       onClick={() => setShowAllEvents(!showAllEvents)}
                                       className="w-full mt-2 py-3 border border-gray-200 rounded-xl text-[12px] font-bold text-gray-500 uppercase tracking-widest hover:bg-gray-50 transition-colors shadow-sm"
                                    >
                                       {showAllEvents ? 'SHOW LESS EVENTS' : `+ ${trackingData.scanEvents.length - 4} MORE EVENTS`}
                                    </button>
                                 )}
                              </div>
                           </div>
                        ) : (
                           <div className="p-8 text-center text-gray-400 font-medium text-[13px] bg-gray-50 rounded-xl border border-gray-100 border-dashed">
                             No realtime tracking data available yet.
                           </div>
                        )}
                     </>
                  )}
               </div>
            </div>

            {/* Shipping Document Attachment */}
            {selectedOrder.shipping && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.02)] relative mt-6">
                 <div className="px-6 py-4 border-b border-gray-200 bg-white flex justify-between items-center">
                   <div className="flex items-center gap-4">
                     <h3 className="text-[14px] font-bold text-gray-900">Shipping Documents</h3>
                     <div className="flex items-center bg-gray-100 rounded-lg p-1">
                       <button onClick={() => setActiveLabelTab('system')} className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${activeLabelTab === 'system' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>System Generated</button>
                       <button onClick={() => setActiveLabelTab('cutout')} className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${activeLabelTab === 'cutout' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Scanned Cutout</button>
                       <button onClick={() => setActiveLabelTab('full')} className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${activeLabelTab === 'full' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Full Scan</button>
                       <button onClick={() => setActiveLabelTab('receipt')} className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${activeLabelTab === 'receipt' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Drop-off Receipt</button>
                     </div>
                   </div>
                   {getActiveImageUrl() && (
                     <div className="flex items-center gap-3">
                       <button onClick={() => setIsLabelModalOpen(true)} className="flex items-center gap-1.5 text-[12px] font-bold text-gray-500 hover:text-gray-900 transition-colors">
                          <Eye size={14}/> View
                       </button>
                       <a href={getServerUrl(getActiveImageUrl())} download="ShippingDocument" className="flex items-center gap-1.5 text-[12px] font-bold text-gray-500 hover:text-gray-900 transition-colors">
                          <Download size={14}/> Download
                       </a>
                       <button onClick={() => {
                            const url = getServerUrl(getActiveImageUrl());
                            if (url.startsWith('data:application/pdf')) {
                               printPdfDirectly(url.split(',')[1]);
                            } else if (url.endsWith('.pdf')) {
                               printJS({ printable: url, type: 'pdf' });
                            } else {
                               printJS({ printable: url, type: 'image' });
                            }
                         }} className="flex items-center gap-1.5 text-[12px] font-bold text-[#009EF7] hover:text-[#007AC0] transition-colors">
                          <Printer size={14}/> Print
                       </button>
                     </div>
                   )}
                 </div>
                 <div className="flex justify-center bg-gray-50 w-full overflow-hidden min-h-[200px]">
                    {!getActiveImageUrl() ? (
                      <div className="flex items-center justify-center p-12 text-gray-400 font-medium text-[13px]">
                        {activeLabelTab === 'system' && 'No system generated label available.'}
                        {activeLabelTab === 'cutout' && 'No scanned cutout available.'}
                        {activeLabelTab === 'full' && 'No full scan image available.'}
                        {activeLabelTab === 'receipt' && (
                          <div className="flex flex-col items-center gap-4">
                            <p>No drop-off receipt attached yet.</p>
                            <label className="cursor-pointer bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-2">
                              <input 
                                type="file" 
                                className="hidden" 
                                accept="image/*,.heic" 
                                onChange={handleDirectReceiptUpload} 
                                disabled={isUploadingReceipt}
                              />
                              {isUploadingReceipt ? (
                                <span className="animate-pulse">Uploading...</span>
                              ) : (
                                <>
                                  <Upload size={16} className="text-indigo-600" /> 
                                  Upload Receipt
                                </>
                              )}
                            </label>
                          </div>
                        )}
                      </div>
                    ) : getServerUrl(getActiveImageUrl()).startsWith('data:application/pdf') ? (
                       <iframe src={getServerUrl(getActiveImageUrl()) + "#toolbar=0&navpanes=0&scrollbar=0"} className="w-full h-[600px] border-0" style={{ maxWidth: '400px' }} />
                    ) : (
                       <div className="p-4 flex justify-center items-center overflow-hidden">
                         <img src={getServerUrl(getActiveImageUrl())} alt="Document" className="max-h-[500px] w-auto border border-gray-200 rounded-lg shadow-sm cursor-zoom-in" onClick={() => setIsLabelModalOpen(true)} />
                       </div>
                    )}
                 </div>
              </div>
            )}

            {/* Label View Modal */}
            {isLabelModalOpen && selectedOrder.shipping?.labelImage && (
              <div className="fixed inset-0 bg-gray-900/90 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsLabelModalOpen(false)}>
                <div className="relative max-w-5xl w-full max-h-[95vh] flex flex-col bg-white rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-white">
                    <div className="flex items-center gap-4">
                      <h3 className="font-bold text-gray-900 flex items-center gap-2"><Box size={18} className="text-[#009EF7]"/> Document View</h3>
                      <div className="flex items-center bg-gray-100 rounded-lg p-1">
                        <button onClick={() => setActiveLabelTab('system')} className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${activeLabelTab === 'system' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>System Generated</button>
                        <button onClick={() => setActiveLabelTab('cutout')} className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${activeLabelTab === 'cutout' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Scanned Cutout</button>
                        <button onClick={() => setActiveLabelTab('full')} className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${activeLabelTab === 'full' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Full Scan</button>
                        <button onClick={() => setActiveLabelTab('receipt')} className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${activeLabelTab === 'receipt' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Drop-off Receipt</button>
                      </div>
                    </div>
                    {getActiveImageUrl() && (
                      <div className="flex items-center gap-3">
                        <button onClick={() => {
                           const url = getServerUrl(getActiveImageUrl());
                           if (url.startsWith('data:application/pdf')) {
                              printPdfDirectly(url.split(',')[1]);
                           } else if (url.endsWith('.pdf')) {
                              printJS({ printable: url, type: 'pdf' });
                           } else {
                              printJS({ printable: url, type: 'image' });
                           }
                         }} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[13px] font-bold rounded-lg transition-colors flex items-center gap-2">
                          <Printer size={14}/> Print
                        </button>
                        <button onClick={() => setIsLabelModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 overflow-auto bg-gray-100 p-8 flex justify-center items-center">
                    {!getActiveImageUrl() ? (
                      <div className="p-12 text-gray-400 font-medium text-[13px]">No document available for this view.</div>
                    ) : getServerUrl(getActiveImageUrl()).startsWith('data:application/pdf') ? (
                       <iframe src={getServerUrl(getActiveImageUrl())} className="w-full min-h-[70vh] border border-gray-200 rounded-lg shadow-xl" />
                    ) : (
                       <img src={getServerUrl(getActiveImageUrl())} alt="Document" className="max-w-full max-h-[80vh] shadow-xl border border-gray-200 rounded-lg object-contain transition-opacity duration-300" />
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Right Column (Sidebar) */}
          <div className="w-full lg:w-[380px] shrink-0 space-y-6">
            
            {/* Customer Information Block */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-[0_4px_12px_rgba(0,0,0,0.02)] overflow-hidden">
               <div className="px-6 py-4 border-b border-gray-200 bg-white">
                  <h3 className="text-[14px] font-bold text-gray-900 uppercase tracking-wide">Customer Details</h3>
               </div>
               <div className="p-6">
                  <div className="text-[16px] font-bold text-gray-900 mb-1">{selectedOrder.customerName || selectedOrder.customer?.name || 'Walk-in Customer'}</div>
                  <div className="text-[13px] font-medium text-gray-500 mb-6 flex flex-col gap-1.5 pt-1">
                     <span className="flex items-center gap-2"><Mail size={14}/> {selectedOrder.customer?.contact?.email || 'N/A'}</span>
                     {selectedOrder.externalOrderId ? (
                       <>
                         <span className="flex items-center gap-2"><span className="text-gray-400 text-xs font-black uppercase tracking-widest mr-[-2px] w-[20px] text-left">{selectedOrder.salesChannel === 'shopify' ? 'SHID' : 'EID'}</span> {selectedOrder.externalOrderId}</span>
                         <span className="flex items-center gap-2"><span className="text-gray-400 text-xs font-black uppercase tracking-widest mr-[-2px] w-[20px] text-left">SYS</span> {selectedOrder.saleNumber}</span>
                       </>
                     ) : (
                       <span className="flex items-center gap-2"><span className="text-gray-400 text-xs font-black uppercase tracking-widest mr-[-2px] w-[14px] text-center">ID</span> {selectedOrder.customer?._id || 'N/A'}</span>
                     )}
                  </div>
                  
                  <div className="border-t border-gray-100 pt-5">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Shipping Address</h4>
                      <button 
                        onClick={() => handleCopy(`${selectedOrder.shipping?.address?.name || selectedOrder.customerName}\n${selectedOrder.shipping?.address?.street || selectedOrder.customer?.address?.street || ''}\n${selectedOrder.shipping?.address?.city || selectedOrder.customer?.address?.city || ''}, ${selectedOrder.shipping?.address?.state || selectedOrder.customer?.address?.state || ''} ${selectedOrder.shipping?.address?.zipCode || selectedOrder.customer?.address?.zipCode || ''}\n${selectedOrder.shipping?.address?.country || selectedOrder.customer?.address?.country || 'United States'}\n${selectedOrder.shipping?.address?.phone || selectedOrder.customer?.contact?.phone || ''}`, 'all')}
                        className="text-[11px] font-bold text-[#009EF7] hover:text-[#007AC0] flex items-center gap-1 transition-colors"
                      >
                        {copiedText === 'all' ? <Check size={12} /> : <Copy size={12} />}
                        {copiedText === 'all' ? 'COPIED' : 'COPY ALL'}
                      </button>
                    </div>
                    <div className="translate-x-[2px] border-l-2 border-[#009EF7] pl-4 group/address">
                      <div className="text-[14px] text-gray-800 font-medium leading-relaxed space-y-1">
                        
                        {/* Name Line */}
                        <div className="flex items-center justify-between group/line">
                          <span className="font-bold text-gray-900 block">{selectedOrder.shipping?.address?.name || selectedOrder.customerName}</span>
                          <button onClick={() => handleCopy(selectedOrder.shipping?.address?.name || selectedOrder.customerName, 'name')} className="text-gray-400 hover:text-[#009EF7] opacity-0 group-hover/line:opacity-100 transition-opacity">
                            {copiedText === 'name' ? <Check size={14} className="text-emerald-500"/> : <Copy size={14}/>}
                          </button>
                        </div>

                        {/* Street Line */}
                        <div className="flex items-center justify-between group/line">
                          <span>{selectedOrder.shipping?.address?.street || selectedOrder.customer?.address?.street || '123 Enterprise Blvd.'}</span>
                          <button onClick={() => handleCopy(selectedOrder.shipping?.address?.street || selectedOrder.customer?.address?.street, 'street')} className="text-gray-400 hover:text-[#009EF7] opacity-0 group-hover/line:opacity-100 transition-opacity">
                            {copiedText === 'street' ? <Check size={14} className="text-emerald-500"/> : <Copy size={14}/>}
                          </button>
                        </div>

                        {/* City, State Zip Line */}
                        <div className="flex items-center justify-between group/line">
                          <span>{selectedOrder.shipping?.address?.city || selectedOrder.customer?.address?.city || 'Dallas'}, {selectedOrder.shipping?.address?.state || selectedOrder.customer?.address?.state || 'TX'} {selectedOrder.shipping?.address?.zipCode || selectedOrder.customer?.address?.zipCode || '75201'}</span>
                          <button onClick={() => handleCopy(`${selectedOrder.shipping?.address?.city || selectedOrder.customer?.address?.city}, ${selectedOrder.shipping?.address?.state || selectedOrder.customer?.address?.state} ${selectedOrder.shipping?.address?.zipCode || selectedOrder.customer?.address?.zipCode}`, 'city')} className="text-gray-400 hover:text-[#009EF7] opacity-0 group-hover/line:opacity-100 transition-opacity">
                            {copiedText === 'city' ? <Check size={14} className="text-emerald-500"/> : <Copy size={14}/>}
                          </button>
                        </div>

                        {/* Country Line */}
                        <div className="flex items-center justify-between group/line">
                          <span className="text-gray-500">{selectedOrder.shipping?.address?.country || selectedOrder.customer?.address?.country || 'United States'}</span>
                          <button onClick={() => handleCopy(selectedOrder.shipping?.address?.country || selectedOrder.customer?.address?.country || 'United States', 'country')} className="text-gray-400 hover:text-[#009EF7] opacity-0 group-hover/line:opacity-100 transition-opacity">
                            {copiedText === 'country' ? <Check size={14} className="text-emerald-500"/> : <Copy size={14}/>}
                          </button>
                        </div>

                        {/* Phone Line */}
                        <div className="flex items-center justify-between group/line pt-1">
                          <span className="font-bold text-gray-900">{selectedOrder.shipping?.address?.phone || selectedOrder.customer?.contact?.phone || 'No phone provided'}</span>
                          <button onClick={() => handleCopy(selectedOrder.shipping?.address?.phone || selectedOrder.customer?.contact?.phone, 'phone')} className="text-gray-400 hover:text-[#009EF7] opacity-0 group-hover/line:opacity-100 transition-opacity">
                            {copiedText === 'phone' ? <Check size={14} className="text-emerald-500"/> : <Copy size={14}/>}
                          </button>
                        </div>

                      </div>
                    </div>
                  </div>
               </div>
            </div>

            {/* Financial Summary Block */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-[0_4px_12px_rgba(0,0,0,0.02)] overflow-hidden">
               <div className="px-6 py-4 border-b border-gray-200 bg-white">
                  <h3 className="text-[14px] font-bold text-gray-900 uppercase tracking-wide">Financial Summary</h3>
               </div>
               <div className="p-6 pb-4">
                  
                  {/* What your buyer paid Section */}
                  <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">What your buyer paid</h4>
                  <div className="space-y-3 mb-6">
                     <div className="flex justify-between items-center text-[13px] font-medium text-gray-600">
                        <span>Subtotal:</span>
                        <span className="text-gray-900 font-bold">${(selectedOrder.items?.reduce((sum, item) => sum + (item.salePrice || 0), 0) || 0).toFixed(2)}</span>
                     </div>
                     {selectedOrder.shipping?.shippingCollected > 0 && (
                       <div className="flex justify-between items-center text-[13px] font-medium text-gray-600">
                          <span>Shipping:</span>
                          <span className="text-gray-900 font-bold">${(selectedOrder.shipping?.shippingCollected || 0).toFixed(2)}</span>
                       </div>
                     )}
                     <div className="flex justify-between items-center text-[13px] font-medium text-gray-600">
                        <span>{selectedOrder.paymentMethod === 'ebay' ? 'Sales tax*' : 'Tax:'}</span>
                        <span className="text-gray-900 font-bold">${(selectedOrder.tax || selectedOrder.taxAmount || 0).toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between items-center text-[13px] font-bold text-gray-900 pt-2 border-t border-gray-100">
                        <span>Order total paid by customer**:</span>
                        <span>${(selectedOrder.totalAmount || 0).toFixed(2)}</span>
                     </div>
                  </div>

                  {/* Deductions Section */}
                  <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Deductions</h4>
                  <div className="space-y-3 mb-6">
                     {selectedOrder.paymentMethod === 'ebay' && (
                        <div className="flex justify-between items-center text-[13px] font-medium text-gray-600">
                           <span>Tax (Collected by eBay):</span>
                           <span className="text-red-600 font-bold">-${(selectedOrder.tax || selectedOrder.taxAmount || 0).toFixed(2)}</span>
                        </div>
                     )}
                     <div className="flex justify-between items-center text-[13px] font-medium text-gray-600">
                        <span>Platform Fees:</span>
                        <span className="text-red-600 font-bold">-${(selectedOrder.costs?.marketplaceFees || 0).toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between items-center text-[13px] font-medium text-gray-600">
                        <span>Discount:</span>
                        <span className="text-red-600 font-bold">-${(selectedOrder.discount || 0).toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between items-center text-[13px] font-medium text-gray-600">
                        <span>Item Cost (Cost Price):</span>
                        <span className="text-red-600 font-bold">-${(selectedOrder.items?.reduce((sum, item) => sum + (item.costPrice || 0), 0) || 0).toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between items-center text-[13px] font-medium text-gray-600">
                        <span>Shipping Cost:</span>
                        <span className="text-red-600 font-bold">-${(selectedOrder.shipping?.shippingCost || 0).toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between items-center text-[13px] font-medium text-gray-600">
                        <span>Handling:</span>
                        <span className="text-red-600 font-bold">-${(selectedOrder.costs?.handling || 0).toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between items-center text-[13px] font-medium text-gray-600">
                        <span>Packaging:</span>
                        <span className="text-red-600 font-bold">-${(selectedOrder.costs?.packaging || 0).toFixed(2)}</span>
                     </div>
                  </div>

                  {/* Totals Section */}
                  <div className="pt-5 mt-3 border-t-2 border-gray-100 space-y-3 bg-[#F9FBFC] -mx-6 px-6 pb-6 border-b border-gray-200">
                     <div className="flex justify-between items-center">
                        <span className="text-[15px] font-bold text-[#059669]">Net Profit:</span>
                        <span className="text-[18px] font-black text-[#059669]">${(selectedOrder.totalProfit || 0).toFixed(2)}</span>
                     </div>
                  </div>
                  
                  <div className="pt-4 grid grid-cols-2 gap-4">
                     <div>
                       <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Payment Status</span>
                       <span className="text-[13px] font-bold text-gray-900 capitalize">{selectedOrder.paymentStatus || 'Paid'}</span>
                     </div>
                     <div>
                       <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Payment Method</span>
                       <span className="text-[13px] font-bold text-gray-900 capitalize flex items-center gap-1.5">
                          {selectedOrder.paymentMethod || 'Credit Card'}
                       </span>
                     </div>
                  </div>
               </div>
          </div>

            {/* Edit History Block */}
            {selectedOrder.editHistory && selectedOrder.editHistory.length > 0 && (
              <div className="bg-[#fef3c7] rounded-xl border border-[#fcd34d] shadow-[0_4px_12px_rgba(0,0,0,0.02)] overflow-hidden">
                 <div className="px-6 py-4">
                    <h3 className="text-[14px] font-bold text-[#92400e] uppercase tracking-wide">Edit History</h3>
                 </div>
                 <div className="px-4 pb-4 space-y-2">
                    {selectedOrder.editHistory.map((edit, idx) => (
                       <div key={idx} className="p-3 bg-white rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-amber-100/50">
                          <div className="flex justify-between items-center mb-1">
                             <span className="text-[13px] font-bold text-gray-900">{edit.editedBy}</span>
                             <span className="text-[11px] font-medium text-gray-500">{new Date(edit.editedAt).toLocaleString('en-US')}</span>
                          </div>
                          <div className="text-[12px] font-medium text-gray-600 leading-relaxed">{edit.changes}</div>
                       </div>
                    ))}
                 </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
