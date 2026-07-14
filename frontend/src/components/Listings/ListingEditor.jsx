import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Image as ImageIcon, Plus, Trash2, Star, Wand2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../utils/api';

export default function ListingEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [isGeneratingSEO, setIsGeneratingSEO] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    sku: '',
    price: 0,
    quantity: 0,
    condition: 'used',
    brand: '',
    weight: 0,
    barcode: '',
    images: [],
    platformSettings: {
      ebay: {
        categoryId: '9355',
        conditionId: '3000',
        returnProfileId: '',
        shippingProfileId: '',
        paymentProfileId: ''
      },
      etsy: {
        taxonomyId: '',
        whoMade: 'i_did',
        whenMade: 'made_to_order',
        isSupply: false,
        shippingProfileId: ''
      },
      shopify: {
        productType: '',
        weightUnit: 'lb'
      }
    }
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [activeTab, setActiveTab] = useState('ebay');

  useEffect(() => {
    if (id) {
      fetchListing();
    }
  }, [id]);

  const fetchListing = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/listings/${id}`);
      if (res.data.success) {
        // Merge fetched data with default platformSettings to ensure no undefined nested objects
        setFormData(prev => ({
          ...res.data.listing,
          platformSettings: {
            ebay: { ...prev.platformSettings.ebay, ...(res.data.listing.platformSettings?.ebay || {}) },
            etsy: { ...prev.platformSettings.etsy, ...(res.data.listing.platformSettings?.etsy || {}) },
            shopify: { ...prev.platformSettings.shopify, ...(res.data.listing.platformSettings?.shopify || {}) }
          }
        }));
      }
    } catch (err) {
      console.error('Failed to fetch listing', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAIGenerate = async () => {
    try {
      setIsGeneratingSEO(true);
      const res = await api.post('/ai/generate-listing-seo', {
        title: formData.title,
        description: formData.description
      });
      if (res.data.success && res.data.data) {
        setFormData(prev => ({
          ...prev,
          title: res.data.data.title || prev.title,
          description: res.data.data.description || prev.description
        }));
      }
    } catch (err) {
      console.error('Failed to generate SEO', err);
      alert('Failed to generate SEO: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsGeneratingSEO(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'quantity' || name === 'weight' ? Number(value) : value
    }));
  };

  const handlePlatformChange = (platform, field, value) => {
    setFormData(prev => ({
      ...prev,
      platformSettings: {
        ...prev.platformSettings,
        [platform]: {
          ...prev.platformSettings[platform],
          [field]: value
        }
      }
    }));
  };

  const handleAddImage = () => {
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, { url: '', alt: '', isPrimary: prev.images.length === 0 }]
    }));
  };

  const handleUpdateImage = (index, field, value) => {
    const newImages = [...formData.images];
    newImages[index][field] = value;
    setFormData(prev => ({ ...prev, images: newImages }));
  };

  const handleRemoveImage = (index) => {
    const newImages = formData.images.filter((_, i) => i !== index);
    if (formData.images[index].isPrimary && newImages.length > 0) {
      newImages[0].isPrimary = true;
    }
    setFormData(prev => ({ ...prev, images: newImages }));
  };

  const handleSetPrimaryImage = (index) => {
    const newImages = formData.images.map((img, i) => ({
      ...img,
      isPrimary: i === index
    }));
    setFormData(prev => ({ ...prev, images: newImages }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      
      if (!formData.title || !formData.sku) {
        throw new Error('Title and SKU are required fields.');
      }

      if (id) {
        await api.put(`/listings/${id}`, formData);
      } else {
        await api.post('/listings', formData);
      }
      navigate('/sales-channels/listings');
    } catch (err) {
      console.error('Failed to save listing', err);
      const msg = err.response?.data?.message || err.message || 'Error saving listing';
      setErrorMsg(msg);
      alert(`Error saving listing: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link to="/sales-channels/listings" className="text-gray-500 hover:text-gray-900">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {id ? 'Edit Canonical Listing' : 'Create Canonical Listing'}
            </h1>
            <p className="text-gray-500 text-sm mt-1">This master record will be synced to your chosen marketplaces.</p>
          </div>
        </div>
        <button 
          onClick={handleSave}
          disabled={loading}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <Save size={18} /> {loading ? 'Saving...' : 'Save Listing'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Basic Information</h2>
              <button 
                type="button" 
                onClick={handleAIGenerate}
                disabled={isGeneratingSEO}
                className="text-sm bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 shadow-sm transition-all"
              >
                <Wand2 size={14} />
                {isGeneratingSEO ? 'Generating...' : 'AI SEO Optimize'}
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input 
                  type="text" 
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g. Handmade Leather Wallet"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea 
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="Describe the product..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <ImageIcon size={20} className="text-gray-500" /> Media
              </h2>
              <button 
                onClick={handleAddImage}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
              >
                <Plus size={16} /> Add Image URL
              </button>
            </div>
            
            {formData.images.length === 0 ? (
              <div className="text-center p-6 border-2 border-dashed border-gray-200 rounded-lg text-gray-500 text-sm">
                No images added yet. Click "Add Image URL" to add product photos.
              </div>
            ) : (
              <div className="space-y-4">
                {formData.images.map((image, index) => (
                  <div key={index} className="flex gap-4 p-4 border border-gray-100 rounded-lg bg-gray-50 items-start">
                    <div className="w-20 h-20 bg-gray-200 rounded overflow-hidden flex-shrink-0 border border-gray-300">
                      {image.url ? (
                        <img src={image.url} alt="preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <ImageIcon size={24} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <input
                          type="text"
                          placeholder="https://example.com/image.jpg"
                          value={image.url}
                          onChange={(e) => handleUpdateImage(index, 'url', e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Alt text (e.g. Front view)"
                          value={image.alt}
                          onChange={(e) => handleUpdateImage(index, 'alt', e.target.value)}
                          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <button
                          onClick={() => handleSetPrimaryImage(index)}
                          className={`px-3 py-1.5 text-xs font-medium rounded border flex items-center gap-1 ${
                            image.isPrimary 
                              ? 'bg-yellow-50 text-yellow-700 border-yellow-200' 
                              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <Star size={14} className={image.isPrimary ? 'fill-current' : ''} /> 
                          {image.isPrimary ? 'Primary' : 'Set Primary'}
                        </button>
                        <button
                          onClick={() => handleRemoveImage(index)}
                          className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded border border-transparent"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Pricing & Inventory</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Base Price (USD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input 
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input 
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Weight</label>
                <input 
                  type="number"
                  name="weight"
                  value={formData.weight}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Identifiers</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SKU *</label>
                <input 
                  type="text" 
                  name="sku"
                  value={formData.sku}
                  onChange={handleInputChange}
                  placeholder="e.g. HLW-BRN-01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Barcode (UPC/GTIN)</label>
                <input 
                  type="text" 
                  name="barcode"
                  value={formData.barcode}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                <input 
                  type="text" 
                  name="brand"
                  value={formData.brand}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                <select 
                  name="condition"
                  value={formData.condition}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="new">New</option>
                  <option value="refurbished">Refurbished</option>
                  <option value="used">Used</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Specifics */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          {['ebay', 'etsy', 'shopify'].map(platform => (
            <button
              key={platform}
              onClick={() => setActiveTab(platform)}
              className={`flex-1 py-4 px-6 text-center font-medium capitalize ${
                activeTab === platform 
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {platform} Defaults
            </button>
          ))}
        </div>
        
        <div className="p-6">
          {activeTab === 'ebay' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">eBay Category ID</label>
                <input 
                  type="text" 
                  value={formData.platformSettings.ebay.categoryId}
                  onChange={(e) => handlePlatformChange('ebay', 'categoryId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">eBay Condition ID</label>
                <select 
                  value={formData.platformSettings.ebay.conditionId}
                  onChange={(e) => handlePlatformChange('ebay', 'conditionId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="1000">New</option>
                  <option value="2000">Refurbished</option>
                  <option value="3000">Used</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Return Profile ID</label>
                <input 
                  type="text" 
                  value={formData.platformSettings.ebay.returnProfileId}
                  onChange={(e) => handlePlatformChange('ebay', 'returnProfileId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Profile ID</label>
                <input 
                  type="text" 
                  value={formData.platformSettings.ebay.shippingProfileId}
                  onChange={(e) => handlePlatformChange('ebay', 'shippingProfileId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {activeTab === 'etsy' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Taxonomy ID (Category)</label>
                <input 
                  type="text" 
                  value={formData.platformSettings.etsy.taxonomyId}
                  onChange={(e) => handlePlatformChange('etsy', 'taxonomyId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Who made it?</label>
                <select 
                  value={formData.platformSettings.etsy.whoMade}
                  onChange={(e) => handlePlatformChange('etsy', 'whoMade', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="i_did">I did</option>
                  <option value="someone_else">Someone else</option>
                  <option value="collective">A collective</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">When was it made?</label>
                <select 
                  value={formData.platformSettings.etsy.whenMade}
                  onChange={(e) => handlePlatformChange('etsy', 'whenMade', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="made_to_order">Made to order</option>
                  <option value="2020_2024">2020 - 2024</option>
                  <option value="2010_2019">2010 - 2019</option>
                  <option value="before_2005">Before 2005</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Profile ID</label>
                <input 
                  type="text" 
                  value={formData.platformSettings.etsy.shippingProfileId}
                  onChange={(e) => handlePlatformChange('etsy', 'shippingProfileId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="col-span-1 md:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
                  <input 
                    type="checkbox"
                    checked={formData.platformSettings.etsy.isSupply}
                    onChange={(e) => handlePlatformChange('etsy', 'isSupply', e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  This is a craft supply or tool
                </label>
              </div>
            </div>
          )}

          {activeTab === 'shopify' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Type</label>
                <input 
                  type="text" 
                  value={formData.platformSettings.shopify.productType}
                  onChange={(e) => handlePlatformChange('shopify', 'productType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Weight Unit</label>
                <select 
                  value={formData.platformSettings.shopify.weightUnit}
                  onChange={(e) => handlePlatformChange('shopify', 'weightUnit', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="lb">lb (Pounds)</option>
                  <option value="oz">oz (Ounces)</option>
                  <option value="kg">kg (Kilograms)</option>
                  <option value="g">g (Grams)</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
