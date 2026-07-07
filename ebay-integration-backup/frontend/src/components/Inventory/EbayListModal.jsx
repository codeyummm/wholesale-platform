import React, { useState, useEffect } from 'react';
import { X, ShoppingBag, CheckCircle, AlertCircle, Sparkles, Loader2, ExternalLink } from 'lucide-react';
import api from '../../utils/api';

export default function EbayListModal({ isOpen, onClose, item, onSuccess }) {
  const [sku, setSku] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [condition, setCondition] = useState('used');
  const [marketplaceId, setMarketplaceId] = useState('EBAY_US');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successData, setSuccessData] = useState(null);

  useEffect(() => {
    if (isOpen && item) {
      const generatedSku = `SKU-${item._id}-${Date.now().toString().slice(-6)}`;
      setSku(generatedSku);
      setTitle(`${item.brand} ${item.model}`);
      
      const storage = item.specifications?.storage || '';
      const color = item.specifications?.color || '';
      const network = item.specifications?.carrier || '';
      
      setDescription(
        `Certified Pre-Owned ${item.brand} ${item.model} ${storage ? `(${storage})` : ''} ${color ? `- ${color}` : ''} ${network ? `[${network}]` : ''}.\n\nTested and fully functional. Ready for immediate shipping.`
      );
      
      setPrice(item.price?.retail?.toString() || '');
      setQuantity(item.devices?.length?.toString() || '1');
      
      // Attempt to map grading / condition to eBay format
      // Common wholesale values: 'Grade A', 'Grade B', 'New', 'Refurbished'
      const condLower = (item.condition || '').toLowerCase();
      if (condLower.includes('new')) {
        setCondition('new');
      } else if (condLower.includes('refurb') || condLower.includes('renew')) {
        setCondition('refurbished');
      } else {
        setCondition('used');
      }
      
      setErrorMsg('');
      setSuccessData(null);
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessData(null);

    try {
      const response = await api.post('/ebay/listings', {
        inventoryId: item._id,
        title,
        description,
        price: parseFloat(price),
        quantity: parseInt(quantity),
        condition,
        sku,
        marketplaceId
      });

      if (response.data.success) {
        setSuccessData(response.data);
        if (onSuccess) {
          onSuccess(response.data);
        }
      } else {
        setErrorMsg(response.data.message || 'Failed to list product on eBay.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err.response?.data?.message || 
        err.response?.data?.details?.[0]?.message || 
        'An error occurred while calling the eBay listing service.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-indigo-50/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/10">
              <ShoppingBag size={22} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                List on eBay <span className="text-xs py-0.5 px-2 bg-blue-100 text-blue-800 font-bold rounded-full">Beta</span>
              </h2>
              <p className="text-gray-500 text-[11px] font-medium mt-0.5">Publish details of your inventory model directly to eBay Marketplace</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-100 hover:bg-gray-200 p-2 rounded-full disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Success View */}
        {successData ? (
          <div className="p-8 text-center flex-1 overflow-y-auto flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center border border-green-200 mb-6">
              <CheckCircle size={36} className="text-green-500" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">Successfully Listed!</h3>
            <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
              Your item is now live and listed on eBay. Buyers can find and purchase this model.
            </p>

            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 w-full max-w-md text-left space-y-3 mb-8">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400 font-bold uppercase tracking-wider">eBay Listing ID</span>
                <span className="font-mono font-black text-gray-800 bg-white border border-gray-200 px-2 py-0.5 rounded shadow-xs">{successData.listingId}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400 font-bold uppercase tracking-wider">Seller SKU</span>
                <span className="font-mono font-bold text-gray-700">{successData.sku}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400 font-bold uppercase tracking-wider">Marketplace</span>
                <span className="font-bold text-gray-700">{marketplaceId}</span>
              </div>
            </div>

            <div className="flex gap-4 w-full max-w-md">
              <button 
                onClick={onClose}
                className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Done
              </button>
              <a 
                href={`https://www.ebay.com/itm/${successData.listingId}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-blue-700 transition-all flex items-center justify-center gap-1.5"
              >
                View Listing <ExternalLink size={14} />
              </a>
            </div>
          </div>
        ) : (
          /* Form View */
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
            {errorMsg && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3 animate-in fade-in slide-in-from-top-2">
                <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-red-900">Listing Error</h4>
                  <p className="text-[12px] font-medium text-red-800 mt-0.5 leading-relaxed">{errorMsg}</p>
                </div>
              </div>
            )}

            {/* Product Meta */}
            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex gap-4">
              <div className="h-14 w-14 rounded-xl bg-white border border-blue-200 flex items-center justify-center text-blue-600 shadow-sm shrink-0">
                <ShoppingBag size={24} />
              </div>
              <div>
                <h4 className="text-sm font-black text-gray-900">{item.brand} {item.model}</h4>
                <p className="text-[12px] font-semibold text-gray-500 mt-0.5">
                  Available in Stock: <span className="text-blue-600 font-bold">{item.devices?.length || 0} units</span> | Wholesale Cost: ${item.price?.cost || 0}
                </p>
                <div className="flex gap-2 mt-2">
                  {item.specifications?.storage && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold">{item.specifications.storage}</span>
                  )}
                  {item.specifications?.color && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold">{item.specifications.color}</span>
                  )}
                  {item.condition && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold">{item.condition}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* SKU */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  eBay Custom SKU <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  required
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  placeholder="e.g. SKU-12345"
                />
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider">
                  Listing Title <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  required
                  maxLength={80}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  placeholder="e.g. Apple iPhone 11 - 64GB - Black"
                />
                <p className="text-[10px] text-gray-400 text-right font-medium">{title.length}/80 chars (eBay limit)</p>
              </div>

              {/* Price */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider">
                  Price (USD $) <span className="text-red-500">*</span>
                </label>
                <input 
                  type="number" 
                  required
                  step="0.01"
                  min="0.99"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  placeholder="0.00"
                />
              </div>

              {/* Quantity */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider">
                  Quantity To List <span className="text-red-500">*</span>
                </label>
                <input 
                  type="number" 
                  required
                  min="1"
                  max={item.devices?.length || 100}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  placeholder="1"
                />
              </div>

              {/* Condition mapping */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider">
                  eBay Condition Category <span className="text-red-500">*</span>
                </label>
                <select 
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                >
                  <option value="new">New (Brand New in Sealed Box)</option>
                  <option value="refurbished">Certified/Excellent Refurbished</option>
                  <option value="used">Used - Good/Very Good Condition</option>
                </select>
              </div>

              {/* Marketplace */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider">
                  eBay Marketplace Site <span className="text-red-500">*</span>
                </label>
                <select 
                  value={marketplaceId}
                  onChange={(e) => setMarketplaceId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                >
                  <option value="EBAY_US">eBay US (EBAY_US)</option>
                  <option value="EBAY_GB">eBay UK (EBAY_GB)</option>
                  <option value="EBAY_CA">eBay Canada (EBAY_CA)</option>
                  <option value="EBAY_DE">eBay Germany (EBAY_DE)</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider">
                eBay Listing HTML Description
              </label>
              <textarea 
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-mono"
                placeholder="Write description or paste listing template..."
              />
            </div>

            {/* Notice */}
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-2">
              <Sparkles size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-800 font-medium leading-relaxed">
                By publishing, this model will be listed in the <strong>Cell Phones & Smartphones (CategoryId: 9355)</strong> category. Your default fulfillment, payment, and return policies on eBay will be auto-applied.
              </p>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-gray-100 flex gap-3">
              <button 
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-50 transition-colors shadow-xs"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={loading}
                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm rounded-xl hover:opacity-95 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Publishing to eBay...
                  </>
                ) : (
                  'Publish Live Listing'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
