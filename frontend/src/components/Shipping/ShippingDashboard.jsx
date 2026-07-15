import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Package, Truck, MapPin, Search, ChevronRight, ChevronDown, AlertCircle, CheckCircle, CheckCircle2, Weight, Building, Printer, Filter, RefreshCw, ArrowUpRight, Camera, X, Upload } from 'lucide-react';
import printJS from 'print-js';
import api from '../../utils/api';



export default function ShippingDashboard() {
  const [activeTab, setActiveTab] = useState('awaiting');
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  // Receipt Scanner State
  const [isReceiptScannerOpen, setIsReceiptScannerOpen] = useState(false);
  const [receiptImage, setReceiptImage] = useState(null);
  const [scanningReceipt, setScanningReceipt] = useState(false);
  const [receiptScanResult, setReceiptScanResult] = useState(null);
  const fileInputRef = useRef(null);

  // Bulk Label State
  const [selectedOrdersToShip, setSelectedOrdersToShip] = useState([]);
  const [isBulkPurchasing, setIsBulkPurchasing] = useState(false);
  const [isBulkPrinting, setIsBulkPrinting] = useState(false);
  const [isBulkBuyModalOpen, setIsBulkBuyModalOpen] = useState(false);

  // Preset State
  const [successLabelData, setSuccessLabelData] = useState(null);
  const [rateError, setRateError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const defaultPresetValues = {
    confirmation: 'none',
    insurance: 'none',
    dangerousGoods: false,
    nonMachinable: false,
    regulatedContent: 'none',
    returnLabel: false,
    printPostage: false,
    doNotNotify: false
  };

  const [singlePreset, setSinglePreset] = useState(() => {
    return JSON.parse(localStorage.getItem('shipping_single_preset')) || { name: 'Standard Single', carrier: 'ups', service: 'ups_ground', package: 'package', weightLbs: 1, weightOz: 0, dimL: 7, dimW: 4, dimH: 2, ...defaultPresetValues };
  });
  const [savedSinglePresets, setSavedSinglePresets] = useState(() => {
    return JSON.parse(localStorage.getItem('shipping_saved_single_presets')) || [];
  });

  const [bulkPreset, setBulkPreset] = useState(() => {
    return JSON.parse(localStorage.getItem('shipping_bulk_preset')) || { name: 'Standard Bulk', carrier: 'ups', service: 'ups_ground', package: 'package', weightLbs: 1, weightOz: 0, dimL: 7, dimW: 4, dimH: 2, ...defaultPresetValues };
  });
  const [savedBulkPresets, setSavedBulkPresets] = useState(() => {
    return JSON.parse(localStorage.getItem('shipping_saved_bulk_presets')) || [];
  });

  const handleSaveSinglePreset = () => {
    if (!singlePreset.name) {
      alert("Please enter a preset name before saving.");
      return;
    }
    localStorage.setItem('shipping_single_preset', JSON.stringify(singlePreset));
    let newList = [...savedSinglePresets];
    const existingIndex = newList.findIndex(p => p.name.toLowerCase() === singlePreset.name.toLowerCase());
    if (existingIndex >= 0) newList[existingIndex] = singlePreset;
    else newList.push(singlePreset);
    setSavedSinglePresets(newList);
    localStorage.setItem('shipping_saved_single_presets', JSON.stringify(newList));
    showToast('Single preset saved successfully!');
  };

  const handleSaveBulkPreset = () => {
    if (!bulkPreset.name) {
      alert("Please enter a preset name before saving.");
      return;
    }
    localStorage.setItem('shipping_bulk_preset', JSON.stringify(bulkPreset));
    let newList = [...savedBulkPresets];
    const existingIndex = newList.findIndex(p => p.name.toLowerCase() === bulkPreset.name.toLowerCase());
    if (existingIndex >= 0) newList[existingIndex] = bulkPreset;
    else newList.push(bulkPreset);
    setSavedBulkPresets(newList);
    localStorage.setItem('shipping_saved_bulk_presets', JSON.stringify(newList));
    showToast('Bulk preset saved successfully!');
  };

  const handleDeleteSinglePreset = (presetName) => {
    if (window.confirm(`Are you sure you want to delete the single preset "${presetName}"?`)) {
      const newList = savedSinglePresets.filter(p => p.name !== presetName);
      setSavedSinglePresets(newList);
      localStorage.setItem('shipping_saved_single_presets', JSON.stringify(newList));
      showToast(`Preset deleted.`);
    }
  };

  const handleDeleteBulkPreset = (presetName) => {
    if (window.confirm(`Are you sure you want to delete the bulk preset "${presetName}"?`)) {
      const newList = savedBulkPresets.filter(p => p.name !== presetName);
      setSavedBulkPresets(newList);
      localStorage.setItem('shipping_saved_bulk_presets', JSON.stringify(newList));
      showToast(`Preset deleted.`);
    }
  };

  const [rates, setRates] = useState([]);
  const [loadingRates, setLoadingRates] = useState(false);
  const [selectedRate, setSelectedRate] = useState(null);
  const [rateDetails, setRateDetails] = useState({ base: 0, signature: 0, insurance: 0 });
  const [showBreakup, setShowBreakup] = useState(false);
  
  // Dimensions
  const [weightLbs, setWeightLbs] = useState(singlePreset.weightLbs);
  const [weightOz, setWeightOz] = useState(singlePreset.weightOz);
  const [dimL, setDimL] = useState(singlePreset.dimL);
  const [dimW, setDimW] = useState(singlePreset.dimW);
  const [dimH, setDimH] = useState(singlePreset.dimH);
  const [confirmation, setConfirmation] = useState('none');
  const [insuranceProvider, setInsuranceProvider] = useState('none');
  const [insureAmount, setInsureAmount] = useState('');
  const [syncToEbay, setSyncToEbay] = useState(true);
  const [otherOptionsOpen, setOtherOptionsOpen] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  
  const [carriers, setCarriers] = useState([]);
  const [allServices, setAllServices] = useState([]);
  const [allPackages, setAllPackages] = useState([]);
  const [selectedServiceCode, setSelectedServiceCode] = useState('');
  const [selectedCarrierCode, setSelectedCarrierCode] = useState('');
  const [selectedPackageCode, setSelectedPackageCode] = useState('');
  const [loadingServices, setLoadingServices] = useState(false);

  const [orders, setOrders] = useState({ awaiting: [], shipped: [], cancelled: [] });
  const [loadingOrders, setLoadingOrders] = useState(false);

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const resPending = await api.get('/sales?deliveryStatus=pending&limit=100');
      const resShipped = await api.get('/sales?deliveryStatus=shipped&limit=100');
      
      setOrders({
        awaiting: resPending.data?.data || [],
        shipped: resShipped.data?.data || [],
        cancelled: []
      });
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch Warehouses
        const whRes = await api.get('/shipping/warehouses');
        if (whRes.data.success && whRes.data.warehouses) {
          setWarehouses(whRes.data.warehouses);
          const defaultWh = whRes.data.warehouses.find(w => w.isDefault);
          if (defaultWh) setSelectedWarehouseId(defaultWh.warehouseId);
          else if (whRes.data.warehouses.length > 0) setSelectedWarehouseId(whRes.data.warehouses[0].warehouseId);
        }

        // Fetch Carriers, Services, Packages
        setLoadingServices(true);
        const carrierRes = await api.get('/shipping/carriers');
        if (carrierRes.data.success && carrierRes.data.carriers) {
          const fetchedCarriers = carrierRes.data.carriers;
          
          // ShipStation sometimes returns 15+ duplicates of GlobalPost. Deduplicate to avoid 429 Rate Limits!
          const uniqueCarriers = Array.from(new Set(fetchedCarriers.map(c => c.code)))
            .map(code => fetchedCarriers.find(c => c.code === code));
            
          setCarriers(uniqueCarriers);

          let servicesArray = [];
          let packagesArray = [];

          // Parallel fetch services and packages for each UNIQUE carrier
          await Promise.all(uniqueCarriers.map(async (carrier) => {
            try {
              const [svcRes, pkgRes] = await Promise.all([
                api.get(`/shipping/services?carrierCode=${carrier.code}`),
                api.get(`/shipping/packages?carrierCode=${carrier.code}`)
              ]);
              if (svcRes.data.success) {
                const s = svcRes.data.services.map(s => ({ ...s, carrierName: carrier.name, carrierCode: carrier.code }));
                servicesArray = [...servicesArray, ...s];
              }
              if (pkgRes.data.success) {
                const p = pkgRes.data.packages.map(p => ({ ...p, carrierName: carrier.name, carrierCode: carrier.code }));
                packagesArray = [...packagesArray, ...p];
              }
            } catch (err) {
               console.error(`Failed to fetch details for carrier ${carrier.code}`, err);
            }
          }));

          setAllServices(servicesArray);
          setAllPackages(packagesArray);

          if (servicesArray.length > 0) {
            setSelectedServiceCode(servicesArray[0].code);
            setSelectedCarrierCode(servicesArray[0].carrierCode);
          }
          if (packagesArray.length > 0) {
            setSelectedPackageCode(packagesArray[0].code);
          }
        }
      } catch (error) {
        console.error('Failed to fetch ShipStation data:', error);
      } finally {
        setLoadingServices(false);
      }
    };
    fetchInitialData();
    fetchOrders();
  }, []);

  // Load singlePreset when opening order label panel
  useEffect(() => {
    if (selectedOrder) {
      if (singlePreset.carrier) setSelectedCarrierCode(singlePreset.carrier);
      if (singlePreset.service) setSelectedServiceCode(singlePreset.service);
      if (singlePreset.package) setSelectedPackageCode(singlePreset.package);
      if (singlePreset.shipFrom) setSelectedWarehouseId(singlePreset.shipFrom);
      
      setWeightLbs(singlePreset.weightLbs || 1);
      setWeightOz(singlePreset.weightOz || 0);
      setDimL(singlePreset.dimL || 7);
      setDimW(singlePreset.dimW || 4);
      setDimH(singlePreset.dimH || 2);
      
      setConfirmation(singlePreset.confirmation || 'none');
      setInsuranceProvider(singlePreset.insurance || 'none');
    }
  }, [selectedOrder, singlePreset]);

  // Update packages when service changes
  const handleServiceChange = (e) => {
    const serviceCode = e.target.value;
    setSelectedServiceCode(serviceCode);
    const serviceObj = allServices.find(s => s.code === serviceCode);
    if (serviceObj) {
      setSelectedCarrierCode(serviceObj.carrierCode);
      const filteredPackages = allPackages.filter(p => p.carrierCode === serviceObj.carrierCode);
      if (filteredPackages.length > 0) {
        setSelectedPackageCode(filteredPackages[0].code);
      }
    }
  };

  const fetchRates = useCallback(async () => {
    if (!selectedOrder || !selectedCarrierCode || !selectedServiceCode) return;
    setLoadingRates(true);
    try {
      const insuranceOptions = insuranceProvider !== 'none' ? {
        provider: insuranceProvider,
        insureShipment: true,
        insuredValue: parseFloat(insureAmount) || 0
      } : null;

      setRateError(null);
      const response = await api.post('/shipping/rates', {
        carrierCode: selectedCarrierCode,
        serviceCode: selectedServiceCode,
        fromPostalCode: warehouses.find(w => w.warehouseId.toString() === selectedWarehouseId.toString())?.originAddress?.postalCode || '90210',
        toState: selectedOrder.state,
        toCountry: 'US',
        toPostalCode: selectedOrder.postalCode,
        weight: { value: (parseFloat(weightLbs) * 16) + parseFloat(weightOz), units: 'ounces' },
        dimensions: { length: parseFloat(dimL), width: parseFloat(dimW), height: parseFloat(dimH), units: 'inches' },
        confirmation: confirmation,
        insuranceOptions: insuranceOptions
      });
      if (response.data.success && response.data.rates) {
        setRates(response.data.rates);
        if (response.data.rates.length > 0) {
          const baseRate = response.data.rates[0].shipmentCost || 0;
          const otherRate = response.data.rates[0].otherCost || 0;
          let estimatedInsurance = 0;
          
          if (insuranceProvider !== 'none' && parseFloat(insureAmount) > 0) {
            // ShipStation's API does not return Shipsurance cost in /getrates.
            // ParcelGuard explicitly charges exactly $0.99 per $100 of value (rounded up to the nearest $100).
            estimatedInsurance = Math.ceil(parseFloat(insureAmount) / 100) * 0.99;
          }
          
          setRateDetails({ base: baseRate, signature: otherRate, insurance: estimatedInsurance });
          setSelectedRate(baseRate + otherRate + estimatedInsurance);
        } else {
          setSelectedRate(null);
          setRateDetails({ base: 0, signature: 0, insurance: 0 });
          setRateError("This service combination (weight, dims, insurance, confirmation) returned no valid rates.");
        }
      } else {
        setSelectedRate(null);
        setRateDetails({ base: 0, signature: 0, insurance: 0 });
        setRateError("Failed to fetch rates from the provider.");
      }
    } catch (error) {
      console.error("Error fetching rates:", error);
      setSelectedRate(null);
      setRateDetails({ base: 0, signature: 0, insurance: 0 });
      let errMsg = error.response?.data?.error || error.response?.data?.ExceptionMessage || error.message;
      setRateError(errMsg || "An error occurred while fetching rates.");
    } finally {
      setLoadingRates(false);
    }
  }, [selectedOrder, selectedCarrierCode, selectedServiceCode, selectedWarehouseId, weightLbs, weightOz, dimL, dimW, dimH, confirmation, insuranceProvider, insureAmount, warehouses]);

  // Debounced auto-fetch rates
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRates();
    }, 800); // 800ms debounce
    return () => clearTimeout(timer);
  }, [fetchRates]);

  const handleBulkBuyLabels = async () => {
    setIsBulkBuyModalOpen(false);
    setIsBulkPurchasing(true);
    try {
      const payload = {
        saleIds: selectedOrdersToShip,
        carrierCode: bulkPreset.carrier, 
        serviceCode: bulkPreset.service,
        packageCode: bulkPreset.package,
        weight: { value: (parseInt(bulkPreset.weightLbs)||0) * 16 + (parseInt(bulkPreset.weightOz)||0), units: "ounces" },
        dimensions: { length: parseFloat(bulkPreset.dimL)||7, width: parseFloat(bulkPreset.dimW)||4, height: parseFloat(bulkPreset.dimH)||2, units: "inches" },
        shipFrom: selectedWarehouseId || 'default_warehouse_id'
      };
      
      const response = await api.post('/shipping/bulk-label', payload);
      
      if (response.data.success) {
        alert(`Successfully bought ${response.data.updatedCount} labels! You can now click Print Labels.`);
        fetchOrders();
      }
    } catch (err) {
      console.error(err);
      alert('Failed to buy bulk labels: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsBulkPurchasing(false);
    }
  };

  const handleBulkPrintLabels = async () => {
    if (selectedOrdersToShip.length === 0) return;
    
    setIsBulkPrinting(true);
    try {
      const response = await api.post('/shipping/bulk-print', { saleIds: selectedOrdersToShip });
      
      if (response.data.success) {
        // Print the bulk PDF
        const url = response.data.labelImage;
        const byteCharacters = atob(url.split(',')[1]);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to print labels: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsBulkPrinting(false);
    }
  };

  const handleBuyLabel = async () => {
    if (!selectedOrder) return;
    try {
      setLoadingRates(true); // reuse loading state for the button

      const insuranceOptions = insuranceProvider !== 'none' ? {
        provider: insuranceProvider,
        insureShipment: true,
        insuredValue: parseFloat(insureAmount) || 0
      } : null;

      const payload = {
        carrierCode: selectedCarrierCode,
        serviceCode: selectedServiceCode,
        packageCode: selectedPackageCode,
        shipTo: {
          name: selectedOrder.customer,
          street1: selectedOrder.rawOrder?.shipping?.address?.street || '123 Test St',
          city: selectedOrder.rawOrder?.shipping?.address?.city || 'Austin',
          state: selectedOrder.rawOrder?.shipping?.address?.state || 'TX',
          postalCode: selectedOrder.rawOrder?.shipping?.address?.zipCode || '78701',
          country: selectedOrder.rawOrder?.shipping?.address?.country || 'US',
          phone: selectedOrder.rawOrder?.shipping?.address?.phone || '5555555555'
        },
        shipFrom: warehouses.find(w => w.warehouseId.toString() === selectedWarehouseId.toString())?.originAddress,
        weight: { value: (parseFloat(weightLbs) * 16) + parseFloat(weightOz), units: 'ounces' },
        dimensions: { length: parseFloat(dimL), width: parseFloat(dimW), height: parseFloat(dimH), units: 'inches' },
        confirmation: confirmation,
        insuranceOptions: insuranceOptions
      };

      const response = await api.post('/shipping/label', payload);
      
      if (response.data.success) {
        const { trackingNumber, labelData, labelUrl, shipmentCost, insuranceCost, shipmentId } = response.data;
        const pdfDataUrl = labelUrl || `data:application/pdf;base64,${labelData}`;
        const finalTrueCost = (shipmentCost || 0) + (insuranceCost || 0);
        
        // Map ShipStation carrier codes to clean names
        let cleanCarrier = selectedCarrierCode;
        if (selectedCarrierCode.toLowerCase().includes('ups')) cleanCarrier = 'UPS';
        else if (selectedCarrierCode.toLowerCase().includes('usps') || selectedCarrierCode.toLowerCase().includes('stamps')) cleanCarrier = 'USPS';
        else if (selectedCarrierCode.toLowerCase().includes('fedex')) cleanCarrier = 'FedEx';
        else if (selectedCarrierCode.toLowerCase().includes('dhl')) cleanCarrier = 'DHL';

        await api.put(`/sales/${selectedOrder._id}`, {
          deliveryStatus: 'shipped',
          shipping: {
            ...selectedOrder.rawOrder.shipping,
            trackingNumber: trackingNumber,
            shippingCost: finalTrueCost,
            labelImage: pdfDataUrl,
            carrier: cleanCarrier,
            shipmentId: shipmentId
          }
        });

        // Automatically fulfill the order on eBay if it's an eBay order and the user opted in
        if (selectedOrder.paymentMethod === 'ebay' && syncToEbay) {
          try {
            await api.post(`/ebay/fulfill/${selectedOrder._id}`);
            console.log('Successfully fulfilled on eBay');
          } catch (ebayErr) {
            console.error('Failed to update eBay:', ebayErr);
          }
        }

        // Open the label PDF automatically for printing
        const byteCharacters = atob(labelData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);
        // window.open(blobUrl, '_blank');

        setSuccessLabelData({ 
            trackingNumber, 
            labelUrl: blobUrl, 
            orderId: selectedOrder.id,
            customer: selectedOrder.customer
        });
        setSelectedOrder(null);
        fetchOrders();
      } else {
        throw new Error(response.data.error || 'Failed to create label.');
      }

    } catch (error) {
      console.error("Error creating label:", error);
      const errorMsg = error.response?.data?.error || error.message;
      
      alert('Failed to buy label: ' + errorMsg);
    } finally {
      setLoadingRates(false);
    }
  };

  const renderPresetsTab = () => {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <Package size={20} className="text-indigo-600" /> Shipping Presets
          </h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Configure default settings for single and bulk label purchases.</p>
        </div>
        
        <div className="p-8 space-y-12">
          {/* Single Label Preset */}
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-md font-bold text-gray-900 flex items-center gap-2">Single Label Settings</h3>
                <p className="text-[13px] text-gray-500 font-medium">These settings load automatically when you click "Create Label" for a single order.</p>
              </div>
              <button 
                onClick={handleSaveSinglePreset}
                className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-md hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Save Single Preset
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-6 bg-gray-50 p-6 rounded-xl border border-gray-100">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Preset Name</label>
                <input type="text" value={singlePreset.name || ''} onChange={e => setSinglePreset({...singlePreset, name: e.target.value})} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Standard iPhone Box" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Ship From</label>
                <select value={singlePreset.shipFrom || ''} onChange={e => setSinglePreset({...singlePreset, shipFrom: e.target.value})} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm outline-none">
                  {warehouses.length === 0 && <option value="">Loading locations...</option>}
                  {warehouses.map(wh => (
                    <option key={wh.warehouseId} value={wh.warehouseId}>
                      {wh.originAddress?.company || 'Shipping Center'} ({wh.originAddress?.state || 'NY'})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Default Carrier</label>
                <select value={singlePreset.carrier} onChange={e => setSinglePreset({...singlePreset, carrier: e.target.value, service: allServices.find(s => s.carrierCode === e.target.value)?.code || ''})} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm outline-none">
                  {carriers.map(c => <option key={c.code} value={c.code}>{c.name.replace(/ (by|from) ShipStation/gi, '')}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Default Service</label>
                <select value={singlePreset.service} onChange={e => setSinglePreset({...singlePreset, service: e.target.value})} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm outline-none">
                  {allServices.filter(s => s.carrierCode === singlePreset.carrier).map(s => (
                    <option key={s.code} value={s.code}>{s.name}</option>
                  ))}
                  {allServices.filter(s => s.carrierCode === singlePreset.carrier).length === 0 && <option value="">No services found</option>}
                </select>
              </div>
              <div className="col-span-2 grid grid-cols-2 gap-6 pt-4 border-t border-gray-200 mt-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Default Package</label>
                  <select value={singlePreset.package} onChange={e => setSinglePreset({...singlePreset, package: e.target.value})} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm outline-none">
                    {allPackages.filter(p => p.carrierCode === singlePreset.carrier).map(p => (
                      <option key={p.code} value={p.code}>{p.name}</option>
                    ))}
                    {allPackages.filter(p => p.carrierCode === singlePreset.carrier).length === 0 && <option value="package">Package</option>}
                  </select>
                </div>
                <div className="space-y-2">
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-1">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Weight</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input type="number" value={singlePreset.weightLbs} onChange={e => setSinglePreset({...singlePreset, weightLbs: e.target.value})} className="w-full pr-8 pl-3 py-2 border border-gray-300 rounded-md text-sm text-center outline-none" title="Lbs" />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">LBS</span>
                        </div>
                        <div className="relative flex-1">
                          <input type="number" value={singlePreset.weightOz} onChange={e => setSinglePreset({...singlePreset, weightOz: e.target.value})} className="w-full pr-8 pl-3 py-2 border border-gray-300 rounded-md text-sm text-center outline-none" title="Oz" />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">OZ</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex-[1.5] space-y-1">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Dimensions (in)</label>
                      <div className="flex gap-1 items-center bg-white border border-gray-300 rounded-md px-1">
                        <input type="number" value={singlePreset.dimL} onChange={e => setSinglePreset({...singlePreset, dimL: e.target.value})} className="w-full py-2 text-center text-sm outline-none bg-transparent" placeholder="L" />
                        <span className="text-gray-300 text-xs font-black">×</span>
                        <input type="number" value={singlePreset.dimW} onChange={e => setSinglePreset({...singlePreset, dimW: e.target.value})} className="w-full py-2 text-center text-sm outline-none bg-transparent" placeholder="W" />
                        <span className="text-gray-300 text-xs font-black">×</span>
                        <input type="number" value={singlePreset.dimH} onChange={e => setSinglePreset({...singlePreset, dimH: e.target.value})} className="w-full py-2 text-center text-sm outline-none bg-transparent" placeholder="H" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Advanced Options Single */}
              <div className="col-span-2 pt-4 border-t border-gray-200 mt-2 space-y-4">
                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Confirmation</label>
                    <select value={singlePreset.confirmation || 'none'} onChange={e => setSinglePreset({...singlePreset, confirmation: e.target.value})} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm outline-none">
                      <option value="none">No Confirmation</option>
                      <option value="signature">Signature Required</option>
                      <option value="adult_signature">Adult Signature</option>
                      <option value="delivery">Delivery</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Insurance</label>
                    <select value={singlePreset.insurance || 'none'} onChange={e => setSinglePreset({...singlePreset, insurance: e.target.value})} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm outline-none">
                      <option value="none">None</option>
                      <option value="shipsurance">Shipsurance</option>
                      <option value="carrier">Carrier</option>
                      <option value="provider">Provider</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Regulated Content</label>
                    <select value={singlePreset.regulatedContent || 'none'} onChange={e => setSinglePreset({...singlePreset, regulatedContent: e.target.value})} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm outline-none">
                      <option value="none">None</option>
                      <option value="battery">Lithium Battery</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">Shipment Options</h4>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={singlePreset.dangerousGoods || false} onChange={e => setSinglePreset({...singlePreset, dangerousGoods: e.target.checked})} className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                      <span className="text-sm font-medium text-gray-700">Dangerous goods</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={singlePreset.nonMachinable || false} onChange={e => setSinglePreset({...singlePreset, nonMachinable: e.target.checked})} className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                      <span className="text-sm font-medium text-gray-700">Non-machinable</span>
                    </label>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">Label & Marketplace</h4>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={singlePreset.returnLabel || false} onChange={e => setSinglePreset({...singlePreset, returnLabel: e.target.checked})} className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                      <span className="text-sm font-medium text-gray-700">Include return label</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={singlePreset.printPostage || false} onChange={e => setSinglePreset({...singlePreset, printPostage: e.target.checked})} className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                      <span className="text-sm font-medium text-gray-700">Print postage on label</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={singlePreset.doNotNotify || false} onChange={e => setSinglePreset({...singlePreset, doNotNotify: e.target.checked})} className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                      <span className="text-sm font-medium text-gray-700">Do not notify marketplace</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Saved Single Presets List */}
            {savedSinglePresets.length > 0 && (
              <div className="pt-2">
                <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-3">Saved Single Presets</h4>
                <div className="grid grid-cols-3 gap-3">
                  {savedSinglePresets.map((preset, idx) => {
                    const isSelected = singlePreset.name === preset.name && singlePreset.carrier === preset.carrier;
                    return (
                      <div key={idx} className={`flex flex-col justify-between p-3 border rounded-xl transition-all shadow-sm ${isSelected ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                        <div className="mb-2 relative pr-6">
                          <h5 className={`text-sm font-bold truncate ${isSelected ? 'text-indigo-900' : 'text-gray-900'}`}>{preset.name}</h5>
                          <p className={`text-[11px] font-medium mt-0.5 ${isSelected ? 'text-indigo-600/80' : 'text-gray-500'}`}>
                            {allServices.find(s => s.code === preset.service)?.name || preset.service} • {preset.weightLbs}lb {preset.weightOz}oz
                          </p>
                          <button onClick={() => handleDeleteSinglePreset(preset.name)} className="absolute top-0 right-0 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Delete Preset">
                            <X size={14} />
                          </button>
                        </div>
                        <div className="flex items-center justify-end border-t border-gray-100/50 pt-2 mt-auto">
                          {isSelected ? (
                            <span className="flex items-center gap-1 text-[11px] font-bold text-indigo-600">
                              <CheckCircle2 size={12} /> Active Default
                            </span>
                          ) : (
                            <button 
                              onClick={() => {
                                setSinglePreset(preset);
                                localStorage.setItem('shipping_single_preset', JSON.stringify(preset));
                                showToast(`Loaded '${preset.name}'`);
                              }} 
                              className="text-xs font-bold text-gray-700 hover:text-indigo-600 bg-gray-100 hover:bg-indigo-50 px-3 py-1 rounded-md transition-colors"
                            >
                              Load / Edit
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          
          <hr className="border-gray-200" />
          
          {/* Bulk Label Preset */}
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-md font-bold text-gray-900 flex items-center gap-2">Bulk Label Settings</h3>
                <p className="text-[13px] text-gray-500 font-medium">These settings apply universally when buying labels for multiple orders at once.</p>
              </div>
              <button 
                onClick={handleSaveBulkPreset}
                className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-md hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Save Bulk Preset
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-6 bg-indigo-50 p-6 rounded-xl border border-indigo-100">
              <div className="space-y-1">
                <label className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Preset Name</label>
                <input type="text" value={bulkPreset.name || ''} onChange={e => setBulkPreset({...bulkPreset, name: e.target.value})} className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Standard Bulk iPhone Box" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Ship From</label>
                <select value={bulkPreset.shipFrom || ''} onChange={e => setBulkPreset({...bulkPreset, shipFrom: e.target.value})} className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-md text-sm outline-none">
                  {warehouses.length === 0 && <option value="">Loading locations...</option>}
                  {warehouses.map(wh => (
                    <option key={wh.warehouseId} value={wh.warehouseId}>
                      {wh.originAddress?.company || 'Shipping Center'} ({wh.originAddress?.state || 'NY'})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Default Carrier</label>
                <select value={bulkPreset.carrier} onChange={e => setBulkPreset({...bulkPreset, carrier: e.target.value, service: allServices.find(s => s.carrierCode === e.target.value)?.code || ''})} className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-md text-sm outline-none">
                  {carriers.map(c => <option key={c.code} value={c.code}>{c.name.replace(/ (by|from) ShipStation/gi, '')}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Default Service</label>
                <select value={bulkPreset.service} onChange={e => setBulkPreset({...bulkPreset, service: e.target.value})} className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-md text-sm outline-none">
                  {allServices.filter(s => s.carrierCode === bulkPreset.carrier).map(s => (
                    <option key={s.code} value={s.code}>{s.name}</option>
                  ))}
                  {allServices.filter(s => s.carrierCode === bulkPreset.carrier).length === 0 && <option value="">No services found</option>}
                </select>
              </div>
              <div className="col-span-2 grid grid-cols-2 gap-6 pt-4 border-t border-indigo-200 mt-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Default Package</label>
                  <select value={bulkPreset.package} onChange={e => setBulkPreset({...bulkPreset, package: e.target.value})} className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-md text-sm outline-none">
                    {allPackages.filter(p => p.carrierCode === bulkPreset.carrier).map(p => (
                      <option key={p.code} value={p.code}>{p.name}</option>
                    ))}
                    {allPackages.filter(p => p.carrierCode === bulkPreset.carrier).length === 0 && <option value="package">Package</option>}
                  </select>
                </div>
                <div className="space-y-2">
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-1">
                      <label className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Weight</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input type="number" value={bulkPreset.weightLbs} onChange={e => setBulkPreset({...bulkPreset, weightLbs: e.target.value})} className="w-full pr-8 pl-3 py-2 border border-indigo-200 rounded-md text-sm text-center outline-none" title="Lbs" />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-indigo-400">LBS</span>
                        </div>
                        <div className="relative flex-1">
                          <input type="number" value={bulkPreset.weightOz} onChange={e => setBulkPreset({...bulkPreset, weightOz: e.target.value})} className="w-full pr-8 pl-3 py-2 border border-indigo-200 rounded-md text-sm text-center outline-none" title="Oz" />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-indigo-400">OZ</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex-[1.5] space-y-1">
                      <label className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Dimensions (in)</label>
                      <div className="flex gap-1 items-center bg-white border border-indigo-200 rounded-md px-1">
                        <input type="number" value={bulkPreset.dimL} onChange={e => setBulkPreset({...bulkPreset, dimL: e.target.value})} className="w-full py-2 text-center text-sm outline-none bg-transparent" placeholder="L" />
                        <span className="text-indigo-300 text-xs font-black">×</span>
                        <input type="number" value={bulkPreset.dimW} onChange={e => setBulkPreset({...bulkPreset, dimW: e.target.value})} className="w-full py-2 text-center text-sm outline-none bg-transparent" placeholder="W" />
                        <span className="text-indigo-300 text-xs font-black">×</span>
                        <input type="number" value={bulkPreset.dimH} onChange={e => setBulkPreset({...bulkPreset, dimH: e.target.value})} className="w-full py-2 text-center text-sm outline-none bg-transparent" placeholder="H" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Advanced Options Bulk */}
              <div className="col-span-2 pt-4 border-t border-indigo-200 mt-2 space-y-4">
                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Confirmation</label>
                    <select value={bulkPreset.confirmation || 'none'} onChange={e => setBulkPreset({...bulkPreset, confirmation: e.target.value})} className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-md text-sm outline-none">
                      <option value="none">No Confirmation</option>
                      <option value="signature">Signature Required</option>
                      <option value="adult_signature">Adult Signature</option>
                      <option value="delivery">Delivery</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Insurance</label>
                    <select value={bulkPreset.insurance || 'none'} onChange={e => setBulkPreset({...bulkPreset, insurance: e.target.value})} className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-md text-sm outline-none">
                      <option value="none">None</option>
                      <option value="shipsurance">Shipsurance</option>
                      <option value="carrier">Carrier</option>
                      <option value="provider">Provider</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Regulated Content</label>
                    <select value={bulkPreset.regulatedContent || 'none'} onChange={e => setBulkPreset({...bulkPreset, regulatedContent: e.target.value})} className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-md text-sm outline-none">
                      <option value="none">None</option>
                      <option value="battery">Lithium Battery</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-black text-indigo-400 uppercase tracking-wider mb-2">Shipment Options</h4>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={bulkPreset.dangerousGoods || false} onChange={e => setBulkPreset({...bulkPreset, dangerousGoods: e.target.checked})} className="w-4 h-4 text-indigo-600 border-indigo-300 rounded focus:ring-indigo-500" />
                      <span className="text-sm font-medium text-gray-700">Dangerous goods</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={bulkPreset.nonMachinable || false} onChange={e => setBulkPreset({...bulkPreset, nonMachinable: e.target.checked})} className="w-4 h-4 text-indigo-600 border-indigo-300 rounded focus:ring-indigo-500" />
                      <span className="text-sm font-medium text-gray-700">Non-machinable</span>
                    </label>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-black text-indigo-400 uppercase tracking-wider mb-2">Label & Marketplace</h4>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={bulkPreset.returnLabel || false} onChange={e => setBulkPreset({...bulkPreset, returnLabel: e.target.checked})} className="w-4 h-4 text-indigo-600 border-indigo-300 rounded focus:ring-indigo-500" />
                      <span className="text-sm font-medium text-gray-700">Include return label</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={bulkPreset.printPostage || false} onChange={e => setBulkPreset({...bulkPreset, printPostage: e.target.checked})} className="w-4 h-4 text-indigo-600 border-indigo-300 rounded focus:ring-indigo-500" />
                      <span className="text-sm font-medium text-gray-700">Print postage on label</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={bulkPreset.doNotNotify || false} onChange={e => setBulkPreset({...bulkPreset, doNotNotify: e.target.checked})} className="w-4 h-4 text-indigo-600 border-indigo-300 rounded focus:ring-indigo-500" />
                      <span className="text-sm font-medium text-gray-700">Do not notify marketplace</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Saved Bulk Presets List */}
            {savedBulkPresets.length > 0 && (
              <div className="pt-2">
                <h4 className="text-[11px] font-black text-indigo-400 uppercase tracking-wider mb-3">Saved Bulk Presets</h4>
                <div className="grid grid-cols-3 gap-3">
                  {savedBulkPresets.map((preset, idx) => {
                    const isSelected = bulkPreset.name === preset.name && bulkPreset.carrier === preset.carrier;
                    return (
                      <div key={idx} className={`flex flex-col justify-between p-3 border rounded-xl transition-all shadow-sm ${isSelected ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                        <div className="mb-2 relative pr-6">
                          <h5 className={`text-sm font-bold truncate ${isSelected ? 'text-indigo-900' : 'text-gray-900'}`}>{preset.name}</h5>
                          <p className={`text-[11px] font-medium mt-0.5 ${isSelected ? 'text-indigo-600/80' : 'text-gray-500'}`}>
                            {allServices.find(s => s.code === preset.service)?.name || preset.service} • {preset.weightLbs}lb {preset.weightOz}oz
                          </p>
                          <button onClick={() => handleDeleteBulkPreset(preset.name)} className="absolute top-0 right-0 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Delete Preset">
                            <X size={14} />
                          </button>
                        </div>
                        <div className="flex items-center justify-end border-t border-gray-100/50 pt-2 mt-auto">
                          {isSelected ? (
                            <span className="flex items-center gap-1 text-[11px] font-bold text-indigo-600">
                              <CheckCircle2 size={12} /> Active Default
                            </span>
                          ) : (
                            <button 
                              onClick={() => {
                                setBulkPreset(preset);
                                localStorage.setItem('shipping_bulk_preset', JSON.stringify(preset));
                                showToast(`Loaded '${preset.name}'`);
                              }} 
                              className="text-xs font-bold text-gray-700 hover:text-indigo-600 bg-gray-100 hover:bg-indigo-50 px-3 py-1 rounded-md transition-colors"
                            >
                              Load / Edit
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (successLabelData) {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col" style={{ minHeight: 'calc(100vh - 120px)' }}>
          <div className="p-6 border-b border-gray-200 bg-emerald-50 flex flex-col sm:flex-row sm:items-center justify-between shrink-0 gap-4">
            <div>
              <h2 className="text-xl font-black text-emerald-900 flex items-center gap-2">
                <CheckCircle2 size={24} className="text-emerald-600" /> Label Created Successfully!
              </h2>
              <p className="text-sm text-emerald-800/80 mt-1 font-medium">
                Tracking: <span className="font-bold tracking-wide select-all bg-emerald-100/50 px-1.5 py-0.5 rounded ml-1">{successLabelData.trackingNumber}</span> for {successLabelData.customer} (Order {successLabelData.orderId})
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => window.open(successLabelData.labelUrl, '_blank')} className="px-4 py-2 bg-white text-gray-700 hover:text-indigo-600 border border-gray-200 hover:border-indigo-200 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2">
                <Printer size={16} /> Print
              </button>
              <a href={successLabelData.labelUrl} download={`label_${successLabelData.trackingNumber}.pdf`} className="px-4 py-2 bg-white text-gray-700 hover:text-indigo-600 border border-gray-200 hover:border-indigo-200 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2">
                <ArrowUpRight size={16} /> Download
              </a>
              <button onClick={() => {
                navigator.clipboard.writeText(successLabelData.trackingNumber);
                showToast('Tracking number copied!');
              }} className="px-4 py-2 bg-white text-gray-700 hover:text-indigo-600 border border-gray-200 hover:border-indigo-200 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2">
                Copy Tracking
              </button>
              <button onClick={() => setSuccessLabelData(null)} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white border border-transparent rounded-lg text-sm font-bold shadow-sm transition-colors ml-2">
                Done
              </button>
            </div>
          </div>
          <div className="flex-1 bg-gray-100 p-6 flex justify-center items-start overflow-auto relative">
            <object data={successLabelData.labelUrl} type="application/pdf" className="w-full max-w-3xl min-h-[800px] shadow-lg rounded-xl bg-white border border-gray-200">
               <div className="flex flex-col items-center justify-center h-full text-gray-500 font-medium">
                 Your browser does not support inline PDFs. 
                 <a href={successLabelData.labelUrl} download={`label_${successLabelData.trackingNumber}.pdf`} className="text-indigo-600 underline mt-2 font-bold">Download Label Instead</a>
               </div>
            </object>
          </div>
        </div>
      );
    }

    if (activeTab === 'presets') return renderPresetsTab();

    const currentOrders = activeTab === 'awaiting' ? orders.awaiting : activeTab === 'shipped' ? orders.shipped : orders.cancelled;
    
    if (currentOrders.length > 0 || loadingOrders) {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2 capitalize">
              <Package size={18} className="text-indigo-500" /> {activeTab} Shipment ({currentOrders.length})
            </h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search orders..." 
                  className="pl-8 pr-4 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
              </div>
              <button className="p-1.5 border border-gray-200 rounded-md bg-white hover:bg-gray-50 text-gray-600 transition-colors">
                <Filter size={16} />
              </button>
            </div>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-200 text-xs font-black text-gray-500 uppercase tracking-wider">
                <th className="p-4 w-12 text-center">
                  <input 
                    type="checkbox" 
                    className="rounded border-gray-300 cursor-pointer" 
                    checked={currentOrders.length > 0 && selectedOrdersToShip.length === currentOrders.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedOrdersToShip(currentOrders.map(o => o._id));
                      } else {
                        setSelectedOrdersToShip([]);
                      }
                    }}
                  />
                </th>
                <th className="p-4">Order ID</th>
                <th className="p-4">Recipient</th>
                <th className="p-4">Destination</th>
                <th className="p-4">Items / Value</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loadingOrders ? (
                <tr><td colSpan="7" className="p-8 text-center text-gray-500 text-sm">Loading orders...</td></tr>
              ) : currentOrders.map(order => (
                <tr key={order._id} className={`transition-colors ${selectedOrdersToShip.includes(order._id) ? 'bg-indigo-50/50' : 'hover:bg-indigo-50/30'}`}>
                  <td className="p-4 text-center">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 cursor-pointer" 
                      checked={selectedOrdersToShip.includes(order._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedOrdersToShip([...selectedOrdersToShip, order._id]);
                        } else {
                          setSelectedOrdersToShip(selectedOrdersToShip.filter(id => id !== order._id));
                        }
                      }}
                    />
                  </td>
                  <td className="p-4">
                    <span 
                      onClick={() => window.open(`/sales/${order._id}`, '_blank')}
                      className="text-sm font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer transition-colors"
                      title="Open Order Details in new tab"
                    >
                      {order.saleNumber}
                    </span>
                    <div className="text-[11px] text-gray-400 font-medium">{new Date(order.createdAt).toLocaleDateString()}</div>
                  </td>
                  <td className="p-4 text-sm font-bold text-gray-900">{order.customerName}</td>
                  <td className="p-4 text-sm font-medium text-gray-600">
                    {order.shipping?.address?.city || 'Unknown City'}, {order.shipping?.address?.state || ''}
                  </td>
                  <td className="p-4">
                    <div className="text-sm font-bold text-gray-900">{order.items?.length || 0} items</div>
                    <div className="text-xs text-gray-500">${(order.totalAmount || 0).toFixed(2)}</div>
                  </td>
                  <td className="p-4">
                    {order.shipping?.address?.street ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-md border border-green-200">
                        <CheckCircle size={12} /> Ready to Ship
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 text-xs font-bold rounded-md border border-red-200">
                        <AlertCircle size={12} /> Invalid Address
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    {order.shipping?.labelImage ? (
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => {
                            setSelectedOrder({
                              id: order.saleNumber,
                              _id: order._id,
                              customer: order.customerName,
                              destination: `${order.shipping?.address?.city}, ${order.shipping?.address?.state} ${order.shipping?.address?.zipCode}`,
                              postalCode: order.shipping?.address?.zipCode,
                              state: order.shipping?.address?.state,
                              paymentMethod: order.paymentMethod,
                              rawOrder: order
                            });
                          }}
                          className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-md hover:bg-gray-200 transition-colors shadow-sm flex items-center gap-1.5"
                        >
                          Manage
                        </button>
                        <button 
                          onClick={() => {
                            const url = order.shipping.labelImage;
                            if (url.startsWith('data:application/pdf')) {
                               const byteCharacters = atob(url.split(',')[1]);
                               const byteNumbers = new Array(byteCharacters.length);
                               for (let i = 0; i < byteCharacters.length; i++) {
                                 byteNumbers[i] = byteCharacters.charCodeAt(i);
                               }
                               const byteArray = new Uint8Array(byteNumbers);
                               const blob = new Blob([byteArray], { type: 'application/pdf' });
                               const blobUrl = URL.createObjectURL(blob);
                               window.open(blobUrl, '_blank');
                            } else {
                               window.open(url, '_blank');
                            }
                          }}
                          className="px-4 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-md hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-1.5"
                        >
                          <Printer size={14} /> Print
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => {
                          // Apply single preset
                          setWeightLbs(singlePreset.weightLbs);
                          setWeightOz(singlePreset.weightOz);
                          setDimL(singlePreset.dimL);
                          setDimW(singlePreset.dimW);
                          setDimH(singlePreset.dimH);
                          
                          setSelectedOrder({
                            id: order.saleNumber,
                            _id: order._id,
                            customer: order.customerName,
                            destination: `${order.shipping?.address?.city}, ${order.shipping?.address?.state} ${order.shipping?.address?.zipCode}`,
                            postalCode: order.shipping?.address?.zipCode,
                            state: order.shipping?.address?.state,
                            paymentMethod: order.paymentMethod,
                            rawOrder: order
                          });
                        }}
                        disabled={!order.shipping?.address?.street}
                        className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-1.5 ml-auto"
                      >
                        <Printer size={14} /> Create Label
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
           <Truck size={32} className="text-gray-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">No data to display</h3>
        <p className="text-sm text-gray-500 font-medium">This section is currently empty.</p>
      </div>
    );
  };

  return (
    <div className="p-8 bg-[#f8fafc] min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Truck className="text-indigo-600" size={28} /> ShipStation Fulfillment
          </h1>
          <p className="text-gray-500 text-[13px] font-medium mt-1">
            Manage shipments, compare carrier rates, and print labels directly from pending orders.
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsReceiptScannerOpen(true)}
            className="px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-sm"
          >
            <Camera size={16} /> Scan Drop-off Receipt
          </button>
          <button onClick={fetchOrders} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-sm">
            <RefreshCw size={16} className={loadingOrders ? 'animate-spin' : ''} /> Sync Orders
          </button>
          <button className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-sm">
            <ArrowUpRight size={16} /> Connect Carrier
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Nav */}
        <div className="w-56 shrink-0 space-y-1">
          <button 
            onClick={() => setActiveTab('awaiting')}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-bold transition-colors ${activeTab === 'awaiting' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            Awaiting Shipment
            {orders.awaiting.length > 0 && <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'awaiting' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-600'}`}>{orders.awaiting.length}</span>}
          </button>
          <button 
            onClick={() => setActiveTab('shipped')}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-bold transition-colors ${activeTab === 'shipped' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            Shipped
          </button>
          <button 
            onClick={() => setActiveTab('cancelled')}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-bold transition-colors ${activeTab === 'cancelled' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            Cancelled
          </button>
          
          <div className="pt-4 mt-4 border-t border-gray-200">
             <div className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Settings</div>
             <button className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">
               Carrier Accounts
             </button>
             <button 
               onClick={() => setActiveTab('presets')}
               className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'presets' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
             >
               Shipping Presets
             </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 relative">
          
          {/* Bulk Action Bar */}
          {selectedOrdersToShip.length > 0 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 z-40 animate-in slide-in-from-top-4">
              <span className="text-sm font-bold">{selectedOrdersToShip.length} Orders Selected</span>
              <div className="w-px h-4 bg-gray-700"></div>
              
              <button 
                onClick={() => setIsBulkBuyModalOpen(true)}
                disabled={isBulkPurchasing || isBulkPrinting}
                className="text-sm font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-2"
              >
                {isBulkPurchasing ? <RefreshCw size={16} className="animate-spin"/> : <Package size={16}/>}
                Buy Labels
              </button>

              <button 
                onClick={handleBulkPrintLabels}
                disabled={isBulkPurchasing || isBulkPrinting}
                className="text-sm font-bold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-2"
              >
                {isBulkPrinting ? <RefreshCw size={16} className="animate-spin"/> : <Printer size={16}/>}
                Print Labels
              </button>
            </div>
          )}

          {renderContent()}
        </div>
      </div>

      {/* Create Label Side Panel (Mockup) */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-end backdrop-blur-sm transition-opacity">
          <div className="w-[500px] bg-white h-full shadow-2xl animate-in slide-in-from-right flex flex-col">
            <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-gray-900">Create Shipping Label</h2>
                <p className="text-sm font-medium text-gray-500 mt-1">Order {selectedOrder.id}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600 bg-white border border-gray-200 rounded-md p-1.5">
                 Close
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Previous Label Info */}
              {selectedOrder.rawOrder?.shipping?.labelImage && (
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Active Shipment</h3>
                    <p className="text-[13px] font-bold text-emerald-900">
                      {selectedOrder.rawOrder.shipping.carrier || 'Carrier'} • {selectedOrder.rawOrder.shipping.trackingNumber}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                      <button 
                        onClick={async () => {
                          if (!window.confirm('Are you sure you want to void this label? This cannot be undone.')) return;
                          try {
                            setIsPurchasing(true);
                            await api.post('/shipping/void', {
                              shipmentId: selectedOrder.rawOrder.shipping.shipmentId,
                              saleId: selectedOrder._id
                            });
                            alert('Label voided successfully!');
                            setSelectedOrder(null);
                            fetchOrders();
                          } catch (err) {
                            alert(err.response?.data?.error || 'Failed to void label');
                          } finally {
                            setIsPurchasing(false);
                          }
                        }}
                        className="px-3 py-1.5 bg-white text-red-600 border border-red-200 text-xs font-bold rounded-md hover:bg-red-50 transition-colors shadow-sm"
                      >
                        Void Label
                      </button>
                    <button 
                      onClick={() => {
                        const url = selectedOrder.rawOrder.shipping.labelImage;
                        if (url.startsWith('data:application/pdf')) {
                           const byteCharacters = atob(url.split(',')[1]);
                           const byteNumbers = new Array(byteCharacters.length);
                           for (let i = 0; i < byteCharacters.length; i++) {
                             byteNumbers[i] = byteCharacters.charCodeAt(i);
                           }
                           const byteArray = new Uint8Array(byteNumbers);
                           const blob = new Blob([byteArray], { type: 'application/pdf' });
                           const blobUrl = URL.createObjectURL(blob);
                           window.open(blobUrl, '_blank');
                        } else {
                           window.open(url, '_blank');
                        }
                      }}
                      className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-md hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <Printer size={14} /> Print
                    </button>
                  </div>
                </div>
              )}
              {/* Destination */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <ArrowUpRight size={14} className="text-indigo-500"/> Ship To
                </h3>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="font-bold text-gray-900 text-sm">{selectedOrder.customer}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedOrder.rawOrder?.shipping?.address?.street}<br/>
                    {selectedOrder.destination}
                  </p>
                </div>
              </div>

              {/* Form matching ShipStation UI */}
              <div className="space-y-5">
                
                {/* Ship From */}
                <div className="space-y-1">
                  <label className="text-[13px] font-bold text-gray-900">Ship From</label>
                  <select 
                    value={selectedWarehouseId}
                    onChange={(e) => setSelectedWarehouseId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none appearance-none"
                  >
                    {warehouses.length === 0 && <option>Loading locations...</option>}
                    {warehouses.map(wh => (
                      <option key={wh.warehouseId} value={wh.warehouseId}>
                        {wh.storeName ? `${wh.storeName} - ` : ''}{wh.originAddress?.company || wh.originAddress?.name || 'Shipping Center'} ({wh.originAddress?.state})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Weight */}
                <div className="space-y-1">
                  <label className="text-[13px] font-bold text-gray-900">Weight</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">lbs</span>
                      <input type="number" value={weightLbs} onChange={e => setWeightLbs(parseInt(e.target.value)||0)} className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm text-right focus:ring-1 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">oz</span>
                      <input type="number" value={weightOz} onChange={e => setWeightOz(parseInt(e.target.value)||0)} className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md text-sm text-right focus:ring-1 focus:ring-indigo-500 outline-none" />
                    </div>
                    <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 text-sm text-gray-700">
                      <Package size={14} /> Scale
                    </button>
                  </div>
                </div>

                {/* Service */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[13px] font-bold text-gray-900">Service</label>
                    {loadingRates && (
                      <span className="text-[12px] text-gray-500 flex items-center gap-1 font-medium">
                        <RefreshCw size={12} className="animate-spin" /> Calculating...
                      </span>
                    )}
                  </div>
                  <select 
                    value={selectedServiceCode}
                    onChange={handleServiceChange}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  >
                    {loadingServices && <option>Loading services...</option>}
                    {!loadingServices && carriers.map(carrier => {
                      const carrierServices = allServices.filter(s => s.carrierCode === carrier.code);
                      if (carrierServices.length === 0) return null;
                      return (
                        <optgroup key={carrier.code} label={carrier.name.replace(/ (by|from) ShipStation/gi, '')}>
                          {carrierServices.map(svc => (
                            <option key={svc.code} value={svc.code}>{svc.name}</option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </select>
                </div>

                {/* Package */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[13px] font-bold text-gray-900">Package</label>
                    <button className="text-[12px] text-blue-600 hover:underline flex items-center gap-1 font-medium">
                      + Add Package
                    </button>
                  </div>
                  <select 
                    value={selectedPackageCode}
                    onChange={(e) => setSelectedPackageCode(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  >
                    {loadingServices && <option>Loading packages...</option>}
                    {!loadingServices && allPackages
                      .filter(pkg => pkg.carrierCode === selectedCarrierCode)
                      .map(pkg => (
                        <option key={pkg.code} value={pkg.code}>{pkg.name}</option>
                      ))
                    }
                  </select>
                </div>

                {/* Size */}
                <div className="space-y-1">
                  <label className="text-[13px] font-bold text-gray-900">Size (in)</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">L</span>
                      <input type="number" value={dimL} onChange={e => setDimL(e.target.value)} className="w-full pl-7 pr-2 py-2 border border-gray-300 rounded-md text-sm text-right focus:ring-1 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">W</span>
                      <input type="number" value={dimW} onChange={e => setDimW(e.target.value)} className="w-full pl-8 pr-2 py-2 border border-gray-300 rounded-md text-sm text-right focus:ring-1 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">H</span>
                      <input type="number" value={dimH} onChange={e => setDimH(e.target.value)} className="w-full pl-8 pr-2 py-2 border border-gray-300 rounded-md text-sm text-right focus:ring-1 focus:ring-indigo-500 outline-none" />
                    </div>
                  </div>
                </div>

                {/* Confirmation */}
                <div className="space-y-1">
                  <label className="text-[13px] font-bold text-gray-900">Confirmation</label>
                  <select 
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  >
                    <option value="none">No Confirmation</option>
                    <option value="delivery">Delivery</option>
                    <option value="signature">Signature Required</option>
                    <option value="adult_signature">Adult Signature Required</option>
                    <option value="direct_signature">Direct Signature Required</option>
                  </select>
                </div>

                {/* Insurance */}
                <div className="space-y-1">
                  <label className="text-[13px] font-bold text-gray-900">Insurance</label>
                  <select 
                    value={insuranceProvider}
                    onChange={(e) => setInsuranceProvider(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  >
                    <option value="none">None</option>
                    <option value="parcelguard">ParcelGuard</option>
                    <option value="carrier">Carrier</option>
                  </select>
                </div>
                
                {insuranceProvider !== 'none' && (
                  <div className="space-y-1">
                    <label className="text-[13px] font-bold text-gray-900">Insure Amount</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                      <input 
                        type="number" 
                        value={insureAmount} 
                        onChange={(e) => setInsureAmount(e.target.value)} 
                        placeholder="0.00"
                        className={`w-full pl-7 pr-3 py-2 bg-white border rounded-md text-sm outline-none text-right transition-colors ${
                          !insureAmount || parseFloat(insureAmount) <= 0
                            ? 'border-red-500 focus:ring-1 focus:ring-red-500 focus:border-red-500 bg-red-50/30'
                            : 'border-gray-300 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500'
                        }`}
                      />
                    </div>
                    {(!insureAmount || parseFloat(insureAmount) <= 0) && (
                      <p className="text-xs text-red-500 mt-1 font-medium">Enter insurance amount to add insurance</p>
                    )}
                  </div>
                )}

                {/* Other Shipping Options */}
                <div className="border border-gray-200 rounded-lg overflow-hidden bg-white mt-4">
                  <button 
                    onClick={() => setOtherOptionsOpen(!otherOptionsOpen)}
                    className="w-full px-4 py-3 flex items-center justify-between text-sm font-bold text-gray-900 bg-gray-50 hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-2">
                      <ChevronDown size={16} className={`transform transition-transform ${otherOptionsOpen ? 'rotate-180' : ''}`} />
                      Other Shipping Options
                    </div>
                  </button>
                  
                  {otherOptionsOpen && (
                    <div className="p-4 space-y-4 border-t border-gray-200">
                      <div className="space-y-1">
                        <label className="text-[13px] font-bold text-gray-900">Shipping Account</label>
                        <p className="text-sm text-gray-700 font-medium">teckship (Primary)</p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[13px] font-bold text-gray-900">Shipment Options</label>
                        <label className="flex items-center gap-2">
                          <input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                          <span className="text-sm text-gray-700">This shipment contains dangerous goods</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                          <span className="text-sm text-gray-700">This shipment is non-machinable</span>
                        </label>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[13px] text-gray-700 font-medium">Regulated Content</label>
                        <select className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 outline-none">
                          <option>None</option>
                        </select>
                      </div>

                      <div className="space-y-2 pt-2">
                        <label className="text-[13px] font-bold text-gray-900">Label Options</label>
                        <label className="flex items-center gap-2">
                          <input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                          <span className="text-sm text-gray-700">Include a return label with the outgoing shipping label</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                          <span className="text-sm text-gray-700">Print postage on the shipping label for this shipment</span>
                        </label>
                      </div>

                      <div className="space-y-2 pt-2">
                        <label className="text-[13px] font-bold text-gray-900">Marketplace Options</label>
                        <label className="flex items-center gap-2">
                          <input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                          <span className="text-sm text-gray-700">Do not notify marketplace</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-white">
              <div className="flex items-center justify-between mb-4 relative">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-500">Total Cost</span>
                  <button 
                    onClick={() => setShowBreakup(!showBreakup)}
                    className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded hover:bg-indigo-100 transition-colors"
                  >
                    View Breakup
                  </button>
                  <button 
                    onClick={fetchRates}
                    className="text-gray-400 hover:text-indigo-600 transition-colors"
                    title="Refresh Rates"
                  >
                    <RefreshCw size={14} className={loadingRates ? 'animate-spin' : ''} />
                  </button>
                </div>
                <span className="text-xl font-black text-gray-900">${selectedRate ? selectedRate.toFixed(2) : '0.00'}</span>

                {showBreakup && selectedRate && (
                  <div className="absolute bottom-full right-0 mb-4 w-64 bg-white border border-gray-200 rounded-lg shadow-xl p-4 z-50 text-sm">
                    <button onClick={() => setShowBreakup(false)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600">&times;</button>
                    <h4 className="font-bold text-gray-900 mb-2 border-b pb-1">Cost Breakdown</h4>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Postage</span>
                        <span className="font-medium text-gray-900">${rateDetails.base.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Confirmation</span>
                        <span className="font-medium text-gray-900">${rateDetails.signature.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center group relative">
                        <span className="text-gray-600 flex items-center gap-1">
                          Insurance
                        </span>
                        <span className="font-medium text-gray-900">${rateDetails.insurance.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t flex justify-between font-bold text-gray-900">
                      <span>Total Quote</span>
                      <span>${selectedRate.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>

              {rateError && (
                <div className="mb-4 text-xs font-medium text-red-600 bg-red-50 p-2 rounded-md border border-red-100 flex items-start gap-2">
                  <span className="shrink-0 font-bold mt-0.5">!</span>
                  <span>{rateError}</span>
                </div>
              )}

              <button 
                onClick={handleBuyLabel} 
                disabled={!selectedRate || loadingRates || isPurchasing || (insuranceProvider !== 'none' && (!insureAmount || parseFloat(insureAmount) <= 0))} 
                className="w-full py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPurchasing ? (
                  <>
                    <RefreshCw className="animate-spin" size={18} />
                    Purchasing Label...
                  </>
                ) : (
                  <>
                    {loadingRates ? <RefreshCw className="animate-spin" size={18} /> : <Printer size={18} />}
                    {loadingRates ? 'Processing...' : 'Buy & Print Label'}
                  </>
                )}
              </button>
            </div>

            {selectedOrder.paymentMethod === 'ebay' && (
              <div className="mt-4 pt-4 border-t px-6 pb-6 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Sync to eBay</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={syncToEbay}
                    onChange={(e) => setSyncToEbay(e.target.checked)}
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  <span className="ml-3 text-xs text-gray-500">
                    Automatically upload tracking to eBay
                  </span>
                </label>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Receipt Scanner Modal */}
      {isReceiptScannerOpen && (
        <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsReceiptScannerOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-black text-gray-900">Bulk Receipt Scanner</h3>
                <p className="text-[13px] text-gray-500 font-medium">Extract tracking numbers and attach receipt to matching orders</p>
              </div>
              <button onClick={() => { setIsReceiptScannerOpen(false); setReceiptImage(null); setReceiptScanResult(null); }} className="text-gray-400 hover:bg-gray-100 p-2 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
              {!receiptImage ? (
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer flex flex-col items-center justify-center py-16"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={40} className="text-indigo-400 mb-4" />
                  <p className="text-gray-900 font-bold">Click to upload drop-off receipt</p>
                  <p className="text-gray-500 text-sm mt-1">JPEG, PNG, or HEIC</p>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*,.heic" 
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      setReceiptImage(URL.createObjectURL(file));
                      setScanningReceipt(true);
                      setReceiptScanResult(null);
                      
                      const formData = new FormData();
                      formData.append('receiptImage', file);
                      
                      try {
                        const response = await api.post('/sale-scanner/scan-receipt', formData, {
                          headers: { 'Content-Type': 'multipart/form-data' }
                        });
                        setReceiptScanResult(response.data.data);
                        fetchOrders();
                      } catch (error) {
                        alert(error.response?.data?.message || 'Failed to scan receipt');
                        setReceiptImage(null);
                      } finally {
                        setScanningReceipt(false);
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-100 h-48">
                    <img src={receiptImage} alt="Receipt" className="w-full h-full object-contain" />
                    {scanningReceipt && (
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm">
                        <RefreshCw size={32} className="text-white animate-spin mb-3" />
                        <p className="text-white font-bold tracking-widest text-sm">AI EXTRACTING TRACKING DATA...</p>
                      </div>
                    )}
                  </div>
                  
                  {receiptScanResult && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                          <p className="text-emerald-600 text-xs font-bold uppercase tracking-widest mb-1">Total Found</p>
                          <p className="text-2xl font-black text-emerald-900">{receiptScanResult.totalExtracted}</p>
                        </div>
                        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                          <p className="text-indigo-600 text-xs font-bold uppercase tracking-widest mb-1">Orders Updated</p>
                          <p className="text-2xl font-black text-indigo-900">{receiptScanResult.totalUpdated}</p>
                        </div>
                      </div>
                      
                      {receiptScanResult.matchedSales.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Matched & Updated Orders</h4>
                          <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                            {receiptScanResult.matchedSales.map((sale, i) => (
                              <div key={i} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <span className="font-bold text-gray-900">{sale.saleNumber}</span>
                                <span className="text-gray-500 text-xs font-mono">{sale.shipping.trackingNumber}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {receiptScanResult.unmatchedTrackingNumbers.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-2">Unmatched Numbers (Not in DB)</h4>
                          <div className="space-y-2">
                            {receiptScanResult.unmatchedTrackingNumbers.map((num, i) => (
                              <div key={i} className="bg-orange-50 text-orange-800 text-xs font-mono p-2 rounded border border-orange-100">
                                {num}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {receiptScanResult && (
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                <p className="text-sm font-bold text-gray-500 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  Successfully attached to orders
                </p>
                <button 
                  onClick={() => { setIsReceiptScannerOpen(false); setReceiptImage(null); setReceiptScanResult(null); }}
                  className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bulk Buy Confirmation Modal */}
      {isBulkBuyModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsBulkBuyModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Truck className="text-indigo-600" size={20} />
                <h3 className="text-lg font-black text-gray-900">Purchase Labels</h3>
              </div>
              <button onClick={() => setIsBulkBuyModalOpen(false)} className="text-gray-400 hover:bg-gray-100 p-1.5 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-600 font-medium leading-relaxed">
                You are about to purchase shipping labels for <span className="font-black text-gray-900">{selectedOrdersToShip.length}</span> selected orders. 
                They will all use the default <strong>{bulkPreset.service.replace(/_/g, ' ').toUpperCase()}</strong> setting ({bulkPreset.weightLbs}lb {bulkPreset.weightOz}oz, {bulkPreset.dimL}x{bulkPreset.dimW}x{bulkPreset.dimH}).
              </p>
              <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-lg flex items-start gap-3">
                <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={16} />
                <p className="text-[13px] text-amber-800 font-medium leading-snug">
                  This action will charge your ShipStation carrier balance. Are you sure you want to proceed?
                </p>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button 
                onClick={() => setIsBulkBuyModalOpen(false)} 
                className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleBulkBuyLabels}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors"
              >
                Confirm Purchase
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 z-[9999] animate-in slide-in-from-bottom-5 fade-in duration-300">
          <CheckCircle2 size={18} className="text-emerald-400" />
          <span className="text-sm font-bold">{toastMessage}</span>
        </div>
      )}

    </div>
  );
}
