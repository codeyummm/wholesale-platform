import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft, ArrowRight, Save, Image as ImageIcon, Plus, Trash2, Star, Upload, Package,
  Zap, CheckCircle2, AlertTriangle, Info, Loader2, Sparkles, Globe, Wand2, Layers, Maximize, Download
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../utils/api';
import { PlatformLogo } from './PlatformLogo';
import FilerobotImageEditor, { TABS, TOOLS } from 'react-filerobot-image-editor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const PLATFORMS = [
  { key: 'ebay',    label: 'eBay',     icon: '🔴', maxTitle: 80,  rules: 'Max 80 chars. No promo language. Include brand, model, specs.' },
  { key: 'etsy',    label: 'Etsy',     icon: '🧶', maxTitle: 140, rules: 'Max 140 chars. Comma-separated terms. Handmade/vintage feel.' },
  { key: 'shopify', label: 'Shopify',  icon: '🛍️', maxTitle: 255, rules: 'Conversational brand-focused. Google Shopping optimized.' },
  { key: 'amazon',  label: 'Amazon',   icon: '📦', maxTitle: 200, rules: 'Start with brand. No subjective claims. Spec-focused.' },
  { key: 'tiktok',  label: 'TikTok',   icon: '🎵', maxTitle: 255, rules: 'Engaging, trending language. Accurate but exciting.' },
];

const COMMON_BRANDS = [
  'Apple', 'Samsung', 'Google', 'OnePlus', 'Sony', 'Motorola', 'Xiaomi', 'LG', 'Huawei', 
  'Nokia', 'Oppo', 'Vivo', 'Realme', 'Asus', 'Lenovo', 'HP', 'Dell', 'Microsoft', 'Acer', 
  'Nintendo', 'PlayStation', 'Xbox', 'Amazon', 'Fitbit', 'Garmin', 'Bose', 'Beats', 'JBL', 'Sonos'
];

function CharCounter({ value = '', max, warn = 0.85 }) {
  const len = value.length;
  const pct = len / max;
  const color = pct >= 1 ? 'text-red-600' : pct >= warn ? 'text-amber-600' : 'text-gray-400';
  return <span className={`text-xs tabular-nums ${color}`}>{len}/{max}</span>;
}

function ComplianceBadge({ items = [] }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {items.map((item, i) => {
        const isOk = item.startsWith('✅');
        const isWarn = item.startsWith('⚠️');
        return (
          <span key={i} className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            isOk ? 'bg-green-100 text-green-700' : isWarn ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {item}
          </span>
        );
      })}
    </div>
  );
}

export default function ListingEditor() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [activeTab, setActiveTab] = useState('core');
  const [aiState, setAiState] = useState({ loading: false, data: null, error: null });
  const [isGeneratingMasterSEO, setIsGeneratingMasterSEO] = useState(false);
  const [activePlatformPreview, setActivePlatformPreview] = useState('ebay');
  const [isNanoBananOpen, setIsNanoBananOpen] = useState(false);
  const [nanoSourceImageIndex, setNanoSourceImageIndex] = useState(null);
  const [nanoPrompt, setNanoPrompt] = useState('');
  const [nanoProcessingType, setNanoProcessingType] = useState(null);
  const [nanoSettings, setNanoSettings] = useState({
    background: 'white', // 'white', 'studio', 'remove', 'original'
    removeGlare: false,
    enhanceLighting: true,
    autoCenter: true
  });
  const fileInputRef = useRef(null);
  const [draggedImageIndex, setDraggedImageIndex] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    sku: '',
    price: 0,
    compareAtPrice: 0,
    quantity: 0,
    condition: 'used',
    brand: '',
    category: '',
    barcode: '',
    weight: 0,
    tags: [],
    images: [],
    status: 'draft',
    platformSettings: {
      ebay:    { 
        categoryId: '9355', 
        conditionId: '3000', 
        returnProfileId: '', 
        shippingProfileId: '', 
        paymentProfileId: '',
        shipping: { 
          packageWeightMajor: '', 
          packageWeightMinor: '', 
          packageLength: '', 
          packageWidth: '', 
          packageDepth: '', 
          packageType: 'PackageThickEnvelope', 
          shippingType: 'Flat', 
          shippingService: 'USPSGroundAdvantage', 
          shippingCost: '12.00', 
          freeShipping: false 
        }
      },
      etsy:    { taxonomyId: '', whoMade: 'i_did', whenMade: 'made_to_order', isSupply: false, shippingProfileId: '' },
      shopify: { productType: '', weightUnit: 'lb' },
      amazon:  { asin: '', fulfillmentChannel: 'MFN' },
      tiktok:  { brandId: '', categoryId: '' },
    },
    platformTitles: { ebay: '', etsy: '', shopify: '', amazon: '', tiktok: '' },
    platformDescriptions: { ebay: '', etsy: '', shopify: '', amazon: '', tiktok: '' },
  });

  const predictedBrand = useMemo(() => {
    if (!formData?.title) return null;
    const lowerTitle = formData.title.toLowerCase();
    for (const brand of COMMON_BRANDS) {
      if (lowerTitle.includes(brand.toLowerCase())) {
        return brand;
      }
    }
    return null;
  }, [formData?.title]);

  const [isShippingModalOpen, setIsShippingModalOpen] = useState(false);
  const [shippingRates, setShippingRates] = useState(null);
  const [loadingRates, setLoadingRates] = useState(false);
  const [shippingSearch, setShippingSearch] = useState('');
  const [tempSelectedService, setTempSelectedService] = useState(null);
  const [urlInput, setUrlInput] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);

  const handleFetchUrl = async () => {
    if (!urlInput.trim()) {
      alert('Please enter a URL');
      return;
    }
    try {
      setIsFetchingUrl(true);
      const res = await api.post('/listings/fetch-url', { url: urlInput });
      if (res.data.success && res.data.data) {
        const d = res.data.data;
        setFormData(prev => {
          const newImages = (d.images || []).map(url => ({
            url,
            alt: d.title || '',
            isPrimary: false
          }));
          
          return {
            ...prev,
            title: d.title || prev.title,
            description: d.description || prev.description,
            brand: d.brand || prev.brand,
            category: d.category || prev.category,
            condition: d.condition || prev.condition,
            price: d.price || prev.price,
            sku: d.sku || prev.sku,
            images: prev.images.length === 0 && newImages.length > 0 
              ? newImages.map((img, i) => i === 0 ? { ...img, isPrimary: true } : img)
              : [...prev.images, ...newImages]
          };
        });
        alert('Successfully fetched data from URL!');
        setUrlInput('');
      } else {
        alert(res.data.message || 'Failed to fetch URL data');
      }
    } catch (err) {
      console.error(err);
      alert('Error fetching URL: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const fetchShippingRates = async () => {
    try {
      setLoadingRates(true);
      const ship = formData?.platformSettings?.ebay?.shipping || {};
      const res = await api.post('/ebay/shipping-rates', {
        weightMajor: ship.packageWeightMajor,
        weightMinor: ship.packageWeightMinor,
        length: ship.packageLength,
        width: ship.packageWidth,
        depth: ship.packageDepth
      });
      if (res.data.success) {
        setShippingRates(res.data.rates);
        setTempSelectedService(ship.shippingService || 'USPSGroundAdvantage');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRates(false);
    }
  };

  useEffect(() => {
    fetchShippingRates();
  }, [
    formData?.platformSettings?.ebay?.shipping?.packageWeightMajor,
    formData?.platformSettings?.ebay?.shipping?.packageWeightMinor,
    formData?.platformSettings?.ebay?.shipping?.packageLength,
    formData?.platformSettings?.ebay?.shipping?.packageWidth,
    formData?.platformSettings?.ebay?.shipping?.packageDepth
  ]);

  useEffect(() => {
    if (isShippingModalOpen && !shippingRates) {
      fetchShippingRates();
    }
  }, [isShippingModalOpen]);

  // Helper to find the current active service in rates
  let activeServiceObj = null;
  if (shippingRates) {
    const activeId = formData?.platformSettings?.ebay?.shipping?.shippingService || 'USPSGroundAdvantage';
    ['recommended', 'economy', 'standard'].forEach(cat => {
      if (shippingRates[cat]) {
        const found = shippingRates[cat].find(s => s.id === activeId);
        if (found) activeServiceObj = found;
      }
    });
  }

  useEffect(() => { if (id) fetchListing(); }, [id]);

  const fetchListing = async () => {
    try {
      const res = await api.get(`/listings/${id}`);
      if (res.data.success) {
        const l = res.data.listing;
        setFormData(prev => ({
          ...prev,
          ...l,
          platformSettings: {
            ebay:    { 
              ...prev.platformSettings.ebay,    
              ...(l.platformSettings?.ebay || {}),
              shipping: {
                ...(prev.platformSettings.ebay?.shipping || {}),
                ...(l.platformSettings?.ebay?.shipping || {})
              }
            },
            etsy:    { ...prev.platformSettings.etsy,    ...(l.platformSettings?.etsy    || {}) },
            shopify: { ...prev.platformSettings.shopify, ...(l.platformSettings?.shopify || {}) },
            amazon:  { ...prev.platformSettings.amazon,  ...(l.platformSettings?.amazon  || {}) },
            tiktok:  { ...prev.platformSettings.tiktok,  ...(l.platformSettings?.tiktok  || {}) },
          },
          platformTitles:       l.platformTitles       || prev.platformTitles,
          platformDescriptions: l.platformDescriptions || prev.platformDescriptions,
        }));
      }
    } catch (err) { console.error('Failed to fetch listing', err); }
  };

  const handleInput = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ['price', 'compareAtPrice', 'quantity', 'weight'].includes(name) ? Number(value) : value,
    }));
  };

  const handlePlatformChange = (platform, field, value) => {
    setFormData(prev => ({
      ...prev,
      platformSettings: { ...prev.platformSettings, [platform]: { ...prev.platformSettings[platform], [field]: value } },
    }));
  };

  const handlePlatformTitle = (platform, value) => {
    setFormData(prev => ({ ...prev, platformTitles: { ...prev.platformTitles, [platform]: value } }));
  };

  const handlePlatformDesc = (platform, value) => {
    setFormData(prev => ({ ...prev, platformDescriptions: { ...prev.platformDescriptions, [platform]: value } }));
  };

  // AI Platform SEO
  const handleGeneratePlatformSEO = async () => {
    if (!formData.title) { setErrorMsg('Please enter a title before generating AI suggestions.'); return; }
    setAiState({ loading: true, data: null, error: null });
    try {
      const res = await api.post('/ai/generate-platform-seo', {
        title: formData.title,
        description: formData.description,
        brand: formData.brand,
        condition: formData.condition,
        category: formData.category,
        barcode: formData.barcode,
      });
      if (res.data.success) {
        setAiState({ loading: false, data: res.data.data, error: null });
      } else {
        throw new Error(res.data.message);
      }
    } catch (err) {
      setAiState({ loading: false, data: null, error: err.response?.data?.message || err.message });
    }
  };

  const applyAISuggestion = (platform) => {
    const pd = aiState.data?.platforms?.[platform];
    if (!pd) return;
    handlePlatformTitle(platform, pd.title || '');
    handlePlatformDesc(platform, pd.description || '');
    // Apply master to core fields if master exists
    if (platform === 'ebay' && aiState.data?.master) {
      setFormData(prev => ({
        ...prev,
        title: aiState.data.master.title || prev.title,
        description: aiState.data.master.description || prev.description,
      }));
    }
  };

  const applyAllSuggestions = () => {
    if (!aiState.data?.master || !aiState.data?.platforms) return;
    setFormData(prev => ({
      ...prev,
      title: aiState.data.master.title || prev.title,
      description: aiState.data.master.description || prev.description,
      platformTitles: {
        ebay:    aiState.data.platforms.ebay?.title    || prev.platformTitles.ebay,
        etsy:    aiState.data.platforms.etsy?.title    || prev.platformTitles.etsy,
        shopify: aiState.data.platforms.shopify?.title || prev.platformTitles.shopify,
        amazon:  aiState.data.platforms.amazon?.title  || prev.platformTitles.amazon,
        tiktok:  aiState.data.platforms.tiktok?.title  || prev.platformTitles.tiktok,
      },
      platformDescriptions: {
        ebay:    aiState.data.platforms.ebay?.description    || prev.platformDescriptions.ebay,
        etsy:    aiState.data.platforms.etsy?.description    || prev.platformDescriptions.etsy,
        shopify: aiState.data.platforms.shopify?.description || prev.platformDescriptions.shopify,
        amazon:  aiState.data.platforms.amazon?.description  || prev.platformDescriptions.amazon,
        tiktok:  aiState.data.platforms.tiktok?.description  || prev.platformDescriptions.tiktok,
      },
    }));
  };

  const handleGenerateMasterSEO = async () => {
    if (!formData.title) {
      alert("Please enter at least a few words in the title as a starting point (e.g. 'pixel 10 pro xl 512gb').");
      return;
    }
    try {
      setIsGeneratingMasterSEO(true);
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
      } else {
        alert(res.data.message || 'Failed to generate SEO');
      }
    } catch (err) {
      alert('AI Generation failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsGeneratingMasterSEO(false);
    }
  };

  const moveImage = (index, direction) => {
    setFormData(prev => {
      const newImages = [...prev.images];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= newImages.length) return prev;
      const temp = newImages[index];
      newImages[index] = newImages[targetIndex];
      newImages[targetIndex] = temp;
      return { ...prev, images: newImages };
    });
  };

  const handleDragStart = (e, index) => {
    setDraggedImageIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedImageIndex === null || draggedImageIndex === targetIndex) return;

    setFormData(prev => {
      const newImages = [...prev.images];
      const draggedItem = newImages[draggedImageIndex];
      newImages.splice(draggedImageIndex, 1);
      newImages.splice(targetIndex, 0, draggedItem);
      return { ...prev, images: newImages };
    });
    setDraggedImageIndex(null);
  };

  const handleNanoProcess = async (type) => {
    let imagesToProcess = [];
    if (type === 'single') {
      if (nanoSourceImageIndex !== null && formData.images[nanoSourceImageIndex]?.url) {
        imagesToProcess.push(formData.images[nanoSourceImageIndex].url);
      } else {
        alert("Please select a specific image for single processing.");
        return;
      }
    } else {
      imagesToProcess = formData.images.map(img => img.url).filter(Boolean);
      if (imagesToProcess.length === 0) {
        alert("No images available to process.");
        return;
      }
    }

    setNanoProcessingType(type);
    try {
      const res = await api.post('/ai/nanobanan', {
        prompt: nanoPrompt,
        settings: nanoSettings,
        images: imagesToProcess
      });
      
      if (res.data.success && res.data.data?.length > 0) {
        const newImages = res.data.data.map(url => ({ url, alt: 'AI Generated', isPrimary: false, source: 'ai' }));
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, ...newImages]
        }));
        setIsNanoBananOpen(false);
        setNanoPrompt('');
      } else {
        throw new Error("No images generated.");
      }
    } catch (err) {
      alert('NanoBanan AI failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setNanoProcessingType(null);
    }
  };

  // File Upload
  const handleFileUpload = async (e) => {
    let files = Array.from(e.target.files);
    if (!files.length) return;
    try {
      setIsUploadingImage(true);
      setErrorMsg(null);
      
      const uploadedImages = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        if (res.data.success) {
          uploadedImages.push({ url: res.data.url, alt: file.name.split('.')[0], source: 'original' });
        }
      }

      if (uploadedImages.length > 0) {
        setFormData(prev => {
          const newImages = [...prev.images];
          uploadedImages.forEach((img) => {
            newImages.push({ ...img, isPrimary: newImages.length === 0 });
          });
          return { ...prev, images: newImages };
        });
      }
    } catch (err) {
      setErrorMsg('Upload failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async (asDraft = false) => {
    try {
      if (asDraft) setIsSavingDraft(true); else setIsSaving(true);
      setErrorMsg(null);
      if (!formData.title || !formData.sku) throw new Error('Title and SKU are required.');
      const payload = { ...formData, status: asDraft ? 'draft' : (formData.status === 'draft' ? 'active' : formData.status) };
      if (id) { await api.put(`/listings/${id}`, payload); }
      else     { await api.post('/listings', payload); }
      navigate('/sales-channels/listings');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error saving listing';
      setErrorMsg(msg);
    } finally {
      setIsSavingDraft(false);
      setIsSaving(false);
    }
  };

  const tabs = [
    { key: 'core',      label: 'Core Details',     icon: Package },
    { key: 'seo',       label: '✨ AI SEO',         icon: Sparkles },
    { key: 'platforms', label: 'Platform Settings', icon: Globe },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/sales-channels/listings" className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">{id ? 'Edit Listing' : 'Create Listing'}</h1>
              <p className="text-xs text-gray-500">Master record — sync to any marketplace</p>
            </div>
          </div>
            <div className="flex items-center gap-3">
            {errorMsg && (
              <div className="flex items-center gap-1.5 text-red-600 text-sm bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg">
                <AlertTriangle size={14} /> {errorMsg}
              </div>
            )}
            <Button
              onClick={() => handleSave(true)}
              disabled={isSavingDraft || isSaving}
              variant="outline"
            >
              {isSavingDraft ? <Loader2 size={15} className="animate-spin mr-2" /> : <Save size={15} className="mr-2" />}
              Save Draft
            </Button>
            <Button
              onClick={() => handleSave(false)}
              disabled={isSaving || isSavingDraft}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isSaving ? <Loader2 size={15} className="animate-spin mr-2" /> : <CheckCircle2 size={15} className="mr-2" />}
              {id ? 'Update Listing' : 'Publish Listing'}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-6xl mx-auto px-6 flex border-t border-gray-100">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === tab.key
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">

        {/* CORE DETAILS TAB */}
        {activeTab === 'core' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">
            
              {/* Auto-Fill URL Section */}
              <Card className="border border-indigo-100 shadow-sm overflow-hidden">
                <div className="bg-indigo-50/50 px-5 py-3 border-b border-indigo-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-indigo-700 font-medium">
                    <Sparkles size={16} className="text-indigo-500" />
                    Auto-Fill from URL
                  </div>
                </div>
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Globe className="absolute left-3 top-2.5 text-gray-400" size={16} />
                      <Input
                        type="url"
                        placeholder="Paste an Amazon, Shopify, or Walmart product URL..."
                        value={urlInput}
                        onChange={e => setUrlInput(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Button 
                      onClick={handleFetchUrl} 
                      disabled={isFetchingUrl || !urlInput.trim()}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      {isFetchingUrl ? <Loader2 size={16} className="animate-spin mr-2" /> : <Download size={16} className="mr-2" />}
                      Fetch Data
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    AI will automatically extract the title, description, brand, pricing, and images from the link.
                  </p>
                </CardContent>
              </Card>

              {/* Basic Information */}
              {/* Title & Description */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-3">
                        <Label>Master Title *</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleGenerateMasterSEO}
                          disabled={isGeneratingMasterSEO}
                          className="h-6 px-2 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                        >
                          {isGeneratingMasterSEO ? <Loader2 size={12} className="animate-spin mr-1" /> : <Sparkles size={12} className="mr-1" />}
                          AI Auto-Write
                        </Button>
                      </div>
                      <CharCounter value={formData.title} max={80} />
                    </div>
                    <Input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInput}
                      placeholder="e.g. Apple iPhone 12 64GB Unlocked Smartphone"
                    />
                    <p className="text-xs text-gray-400 mt-1">This is your base title. AI SEO tab will generate platform-specific versions.</p>
                  </div>
                  <div>
                    <Label className="block mb-1">Master Description</Label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInput}
                      rows={5}
                      placeholder="Describe the product in detail — features, condition, specifications..."
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Product Media */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Product Media</CardTitle>
                    <p className="text-xs text-gray-400 mt-0.5">Upload to DigitalOcean Spaces. First image = primary. eBay allows up to 12, Etsy up to 10, Poshmark up to 16.</p>
                  </div>
                  <div className="flex gap-2">
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" multiple className="hidden" />
                    <Button
                      type="button"
                      onClick={() => setIsNanoBananOpen(true)}
                      className="bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
                    >
                      <Wand2 size={15} className="mr-2" /> NanoBanan AI
                    </Button>
                    <Button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingImage}
                      variant="outline"
                    >
                      {isUploadingImage ? <Loader2 size={15} className="animate-spin mr-2" /> : <Upload size={15} className="mr-2" />}
                      {isUploadingImage ? 'Uploading...' : 'Upload Image'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setFormData(prev => ({ ...prev, images: [...prev.images, { url: '', alt: '', isPrimary: prev.images.length === 0 }] }))}
                    >
                      <Plus size={15} className="mr-2" /> Add URL
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>

                {formData.images.length === 0 ? (
                  <div
                    className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-all"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={32} className="text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">Drop images here or click to upload</p>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP up to 20MB. Stored on DigitalOcean Spaces.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {formData.images.map((image, index) => (
                      <div 
                        key={index} 
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={() => setDraggedImageIndex(null)}
                        className={`relative group rounded-xl border-2 overflow-hidden cursor-move ${image.isPrimary ? 'border-indigo-500' : 'border-gray-200'} ${draggedImageIndex === index ? 'opacity-40 border-dashed border-indigo-400' : 'opacity-100'} transition-all`}
                      >
                        <div className="aspect-square bg-gray-100 relative">
                          {image.url ? (
                            <img src={image.url} alt="preview" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon size={32} className="text-gray-300" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                            <Button 
                              size="sm" 
                              className="bg-purple-600 hover:bg-purple-700 text-white border-0 w-32"
                              onClick={(e) => { e.stopPropagation(); setNanoSourceImageIndex(index); setIsNanoBananOpen(true); }}
                            >
                              <Wand2 size={14} className="mr-2" /> Magic Edit
                            </Button>
                          </div>
                        </div>
                        <div className="p-2 bg-white flex flex-col gap-2">
                          {!image.url && (
                            <input
                              type="text"
                              placeholder="https://..."
                              value={image.url}
                              onChange={e => {
                                const imgs = [...formData.images]; imgs[index].url = e.target.value;
                                setFormData(prev => ({ ...prev, images: imgs }));
                              }}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          )}
                          <div className="flex items-center justify-between">
                            <button
                              onClick={(e) => { 
                                e.preventDefault(); 
                                const imgs = formData.images.map((img, i) => ({ ...img, isPrimary: i === index })); 
                                setFormData(prev => ({ ...prev, images: imgs })); 
                              }}
                              className={`text-xs px-2 py-1.5 rounded font-medium transition-colors flex items-center ${image.isPrimary ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                              <Star size={12} className={`mr-1 ${image.isPrimary ? 'fill-indigo-700' : ''}`} /> {image.isPrimary ? 'Primary' : 'Set Primary'}
                            </button>

                            <div className="flex items-center gap-0.5">
                              {/* Edit Button */}
                              {image.url && (
                                <button
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setNanoSourceImageIndex(index); setIsNanoBananOpen(true); }}
                                  className="p-1.5 rounded text-purple-600 hover:bg-purple-50 transition-colors"
                                  title="Edit Image"
                                >
                                  <Wand2 size={14} />
                                </button>
                              )}
                              
                              {/* Download Button */}
                              {image.url && (
                                <a
                                  href={image.url}
                                  download={`product-image-${index}.jpg`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-1.5 rounded text-blue-600 hover:bg-blue-50 transition-colors"
                                  title="Download"
                                >
                                  <Download size={14} />
                                </a>
                              )}

                              {/* Delete Button */}
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  const imgs = formData.images.filter((_, i) => i !== index);
                                  if (image.isPrimary && imgs.length > 0) imgs[0].isPrimary = true;
                                  setFormData(prev => ({ ...prev, images: imgs }));
                                }}
                                className="p-1.5 rounded text-red-500 hover:bg-red-50 transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                        {image.isPrimary && (
                          <div className="absolute top-2 left-2 bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded font-medium shadow">Primary</div>
                        )}
                        {image.source === 'ai' && (
                          <div className="absolute top-2 right-2 bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded font-medium shadow flex items-center gap-1">
                            <Wand2 size={10} /> AI Enhanced
                          </div>
                        )}
                        {image.source === 'original' && (
                          <div className="absolute top-2 right-2 bg-gray-600 text-white text-[10px] px-1.5 py-0.5 rounded font-medium shadow">
                            Original
                          </div>
                        )}
                        {image.source === 'resized' && (
                          <div className="absolute top-2 right-2 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded font-medium shadow">
                            Resized
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                </CardContent>
              </Card>

              {/* Pricing & Inventory */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Pricing & Inventory</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div>
                      <Label className="block mb-1">Base Price (USD)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-400 text-sm">$</span>
                        <Input type="number" name="price" value={formData.price} onChange={handleInput} className="pl-7" min="0" step="0.01" />
                      </div>
                    </div>
                    <div>
                      <Label className="block mb-1">Compare-At Price</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-400 text-sm">$</span>
                        <Input type="number" name="compareAtPrice" value={formData.compareAtPrice} onChange={handleInput} className="pl-7" min="0" step="0.01" />
                      </div>
                    </div>
                  <div>
                    <Label className="block mb-1">Quantity</Label>
                    <Input type="number" name="quantity" value={formData.quantity} onChange={handleInput} min="0" />
                  </div>
                  <div>
                    <Label className="block mb-1">Weight (for shipping)</Label>
                    <Input type="number" name="weight" value={formData.weight} onChange={handleInput} placeholder="0.00" min="0" step="0.01" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Identifiers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-3">
                      <Label>SKU *</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
                          setFormData(prev => ({ ...prev, sku: `SKU-${Date.now().toString().slice(-6)}-${randomStr}` }));
                        }}
                        className="h-6 px-2 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                      >
                        <Zap size={12} className="mr-1" />
                        Auto-Generate
                      </Button>
                    </div>
                  </div>
                  <Input type="text" name="sku" value={formData.sku} onChange={handleInput} placeholder="e.g. IPH-12-64-BLK" />
                </div>
                <div>
                  <Label className="block mb-1">Barcode (UPC/GTIN)</Label>
                  <Input type="text" name="barcode" value={formData.barcode} onChange={handleInput} placeholder="Required for Amazon, Walmart" />
                  {!formData.barcode && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1"><AlertTriangle size={11} /> Required by Amazon & Walmart</p>
                  )}
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label>Brand</Label>
                    {predictedBrand && formData.brand?.toLowerCase() !== predictedBrand.toLowerCase() && (
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, brand: predictedBrand }))}
                        className="text-[10px] bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-1.5 py-0.5 rounded transition-colors"
                      >
                        ✨ Suggested: {predictedBrand}
                      </button>
                    )}
                  </div>
                  <Input type="text" name="brand" value={formData.brand} onChange={handleInput} placeholder="e.g. Apple" />
                </div>
                <div>
                  <Label className="block mb-1">Category</Label>
                  <Input type="text" name="category" value={formData.category} onChange={handleInput} placeholder="e.g. Electronics / Phones" />
                </div>
                <div>
                  <Label className="block mb-1">Condition</Label>
                  <select name="condition" value={formData.condition} onChange={handleInput} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                    <option value="new">New</option>
                    <option value="refurbished">Refurbished</option>
                    <option value="used">Used</option>
                  </select>
                </div>
                <div>
                  <Label className="block mb-1">Listing Status</Label>
                  <select name="status" value={formData.status} onChange={handleInput} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        )}

        {/* AI SEO TAB */}
        {activeTab === 'seo' && (
          <div className="space-y-6">
            {/* Hero AI panel */}
            <div className="bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-700 rounded-2xl p-6 text-white shadow-xl">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles size={20} />
                    <h2 className="text-xl font-bold">Platform-Aware AI SEO</h2>
                  </div>
                  <p className="text-indigo-200 text-sm max-w-2xl">
                    Generate optimized titles and descriptions for every platform simultaneously. AI follows each platform's exact rules — eBay 80 char limit, Etsy's handmade tone, Amazon's brand-first format, TikTok's viral language, and Google SEO best practices.
                  </p>
                </div>
                <Button
                  onClick={handleGeneratePlatformSEO}
                  disabled={aiState.loading || !formData.title}
                  className="ml-6 bg-white text-indigo-700 hover:bg-indigo-50 shadow-lg"
                >
                  {aiState.loading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Zap size={16} className="mr-2" />}
                  {aiState.loading ? 'Generating...' : 'Generate All Platforms'}
                </Button>
              </div>

              {!formData.title && (
                <div className="mt-4 bg-white/10 rounded-xl p-3 flex items-center gap-2 text-sm">
                  <Info size={15} /> Please fill in the Core Details tab first (title required).
                </div>
              )}

              {aiState.error && (
                <div className="mt-4 bg-red-500/20 border border-red-300/30 rounded-xl p-3 flex items-center gap-2 text-sm">
                  <AlertTriangle size={15} /> {aiState.error}
                </div>
              )}
            </div>

            {/* AI Results */}
            {aiState.data && (
              <>
                {/* Master + Keywords */}
                {aiState.data.master && (
                  <div className="bg-white rounded-xl border border-indigo-200 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Sparkles size={16} className="text-indigo-500" /> Master Optimized Content
                      </h3>
                      <button
                        onClick={applyAllSuggestions}
                        className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
                      >
                        <CheckCircle2 size={14} /> Apply All to Listing
                      </button>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Master Title</label>
                        <p className="mt-1 text-gray-900 font-medium p-3 bg-gray-50 rounded-lg text-sm">{aiState.data.master.title}</p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">SEO Keywords</label>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {(aiState.data.master.keywords || []).map((kw, i) => (
                            <span key={i} className="bg-indigo-100 text-indigo-700 text-xs px-2.5 py-1 rounded-full font-medium">{kw}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Per-Platform tabs */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="flex border-b border-gray-100 overflow-x-auto">
                    {PLATFORMS.map(p => (
                      <button
                        key={p.key}
                        onClick={() => setActivePlatformPreview(p.key)}
                        className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                          activePlatformPreview === p.key
                            ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                            : 'border-transparent text-gray-500 hover:text-gray-800'
                        }`}
                      >
                        <PlatformLogo platform={p.key} size={16} grey={activePlatformPreview !== p.key} />
                        {p.label}
                        {aiState.data?.platforms?.[p.key] && <CheckCircle2 size={12} className="text-green-500" />}
                      </button>
                    ))}
                  </div>

                  {PLATFORMS.map(p => {
                    const pd = aiState.data?.platforms?.[p.key];
                    const currentTitle = formData.platformTitles[p.key];
                    return activePlatformPreview === p.key ? (
                      <div key={p.key} className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                              <PlatformLogo platform={p.key} size={20} grey={false} /> {p.label} Optimized
                            </h3>
                            <p className="text-xs text-gray-400 mt-0.5">{p.rules}</p>
                          </div>
                          {pd && (
                            <button
                              onClick={() => applyAISuggestion(p.key)}
                              className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-1.5"
                            >
                              <CheckCircle2 size={13} /> Apply to Listing
                            </button>
                          )}
                        </div>

                        {pd ? (
                          <div className="space-y-4">
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <label className="text-sm font-medium text-gray-700">AI Suggested Title</label>
                                <CharCounter value={pd.title || ''} max={p.maxTitle} />
                              </div>
                              <p className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-gray-800">{pd.title}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-700 mb-1 block">AI Suggested Description</label>
                              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-gray-700 max-h-48 overflow-y-auto" dangerouslySetInnerHTML={{ __html: pd.description }} />
                            </div>
                            {pd.compliance && <ComplianceBadge items={pd.compliance} />}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-400">
                            <Sparkles size={32} className="mx-auto mb-2 opacity-30" />
                            <p>Click "Generate All Platforms" to see AI suggestions for {p.label}</p>
                          </div>
                        )}

                        {/* Current value display */}
                        {currentTitle && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Currently Applied Title for {p.label}</label>
                            <p className="mt-1 text-gray-600 text-sm">{currentTitle}</p>
                          </div>
                        )}
                      </div>
                    ) : null;
                  })}
                </div>
              </>
            )}

            {/* Manual overrides */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base mb-1">Manual Platform Title Overrides</CardTitle>
                <p className="text-xs text-gray-400">Optionally set custom titles per platform (will override the master title when publishing)</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {PLATFORMS.map(p => (
                    <div key={p.key}>
                      <div className="flex justify-between items-center mb-1">
                        <Label className="flex items-center gap-1.5">
                          <PlatformLogo platform={p.key} size={14} grey={false} /> {p.label} Title Override
                        </Label>
                        <CharCounter value={formData.platformTitles[p.key] || ''} max={p.maxTitle} />
                      </div>
                      <Input
                        type="text"
                        value={formData.platformTitles[p.key] || ''}
                        onChange={e => handlePlatformTitle(p.key, e.target.value)}
                        placeholder={`Leave blank to use master title (max ${p.maxTitle} chars)`}
                        maxLength={p.maxTitle}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* PLATFORM SETTINGS TAB */}
        {activeTab === 'platforms' && (
          <div className="space-y-5">
            {/* eBay */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 mb-2"><PlatformLogo platform="ebay" size={16} /> eBay Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-500 mb-6">Configure extensive options for your eBay listing to ensure accurate mapping and search visibility.</div>
                
                {/* Listing Details & Condition */}
                <div className="space-y-4 border border-gray-100 rounded-lg p-4 bg-gray-50/50">
                  <h4 className="font-semibold text-sm text-gray-700">Listing Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="block mb-1 text-xs">Category ID</Label>
                      <Input type="text" className="h-9" value={formData.platformSettings.ebay.categoryId || ''} onChange={e => handlePlatformChange('ebay', 'categoryId', e.target.value)} />
                    </div>
                    <div>
                      <Label className="block mb-1 text-xs">Store Category ID</Label>
                      <Input type="text" className="h-9" value={formData.platformSettings.ebay.storeCategoryId || ''} onChange={e => handlePlatformChange('ebay', 'storeCategoryId', e.target.value)} />
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <Label className="block mb-3 text-sm font-semibold text-gray-700">Item condition</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="block mb-1 text-xs">Condition ID</Label>
                        <select value={formData.platformSettings.ebay.conditionId || '1000'} onChange={e => handlePlatformChange('ebay', 'conditionId', e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500">
                          <option value="1000">New</option>
                          <option value="2000">Manufacturer Refurbished</option>
                          <option value="2500">Seller Refurbished</option>
                          <option value="3000">Used</option>
                          <option value="4000">Very Good</option>
                          <option value="5000">Good</option>
                          <option value="6000">Acceptable</option>
                          <option value="7000">For parts or not working</option>
                        </select>
                      </div>
                      <div>
                        <Label className="block mb-1 text-xs">Condition Description (Optional)</Label>
                        <Input type="text" className="h-9" value={formData.platformSettings.ebay.conditionDescription || ''} onChange={e => handlePlatformChange('ebay', 'conditionDescription', e.target.value)} placeholder="e.g. Minor scratches on back" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pricing & Formats */}
                <div className="mt-6 space-y-4 border border-gray-100 rounded-lg p-4 bg-gray-50/50">
                   <h4 className="font-semibold text-sm text-gray-700">Pricing & Formats</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                       <Label className="block mb-1 text-xs">Format</Label>
                       <select value={formData.platformSettings.ebay.format || 'FixedPrice'} onChange={e => {
                         handlePlatformChange('ebay', 'format', e.target.value);
                         if (e.target.value === 'Auction') {
                           handlePlatformChange('ebay', 'duration', 'Days_7');
                         } else {
                           handlePlatformChange('ebay', 'duration', 'GTC');
                         }
                       }} className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500">
                         <option value="FixedPrice">Buy It Now (FixedPrice)</option>
                         <option value="Auction">Auction</option>
                       </select>
                     </div>
                     <div>
                       <Label className="block mb-1 text-xs">Duration</Label>
                       <select value={formData.platformSettings.ebay.duration || 'GTC'} onChange={e => handlePlatformChange('ebay', 'duration', e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500">
                         {formData.platformSettings.ebay.format === 'Auction' ? (
                           <>
                             <option value="Days_1">1 Day</option>
                             <option value="Days_3">3 Days</option>
                             <option value="Days_5">5 Days</option>
                             <option value="Days_7">7 Days</option>
                             <option value="Days_10">10 Days</option>
                           </>
                         ) : (
                           <option value="GTC">Good 'Til Cancelled</option>
                         )}
                       </select>
                     </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                     <div>
                       <Label className="block mb-1 text-xs">Item Price</Label>
                       <div className="relative">
                         <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                         <Input type="number" className="h-9 pl-7" value={formData.price || ''} onChange={e => handleInput({ target: { name: 'price', value: e.target.value } })} placeholder="0.00" />
                       </div>
                     </div>
                     {formData.platformSettings.ebay.format === 'Auction' ? (
                       <>
                         <div>
                           <Label className="block mb-1 text-xs">Buy It Now price</Label>
                           <div className="relative">
                             <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                             <Input type="number" className="h-9 pl-7" value={formData.platformSettings.ebay.buyItNowPrice || ''} onChange={e => handlePlatformChange('ebay', 'buyItNowPrice', e.target.value)} placeholder="0.00" />
                           </div>
                         </div>
                         <div>
                           <Label className="block mb-1 text-xs">Reserve price</Label>
                           <div className="relative">
                             <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                             <Input type="number" className="h-9 pl-7" value={formData.platformSettings.ebay.reservePrice || ''} onChange={e => handlePlatformChange('ebay', 'reservePrice', e.target.value)} placeholder="0.00" />
                           </div>
                         </div>
                       </>
                     ) : (
                       <div>
                         <Label className="block mb-1 text-xs">Cost (Internal)</Label>
                         <div className="relative">
                           <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                           <Input type="number" className="h-9 pl-7" value={formData.cost || ''} onChange={e => handleInput({ target: { name: 'cost', value: e.target.value } })} placeholder="0.00" />
                         </div>
                       </div>
                     )}
                   </div>
                   
                   {formData.platformSettings.ebay.format !== 'Auction' && (
                     <div className="pt-2">
                       <label className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
                         <input type="checkbox" checked={formData.platformSettings.ebay.requireImmediatePayment || false} onChange={e => handlePlatformChange('ebay', 'requireImmediatePayment', e.target.checked)} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                         <span>Require immediate payment when buyer uses Buy It Now</span>
                       </label>
                     </div>
                   )}
                </div>

                {/* Allow Offers (Standalone) */}
                <div className="mt-6 space-y-4 border border-gray-100 rounded-lg p-4 bg-gray-50/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-sm text-gray-700">Allow offers (optional)</h4>
                      <p className="text-xs text-gray-500 mt-1">Interested buyers can send an offer for this item. You can accept, counter, or decline.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={formData.platformSettings.ebay.bestOfferEnabled || false} 
                        onChange={e => handlePlatformChange('ebay', 'bestOfferEnabled', e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  {formData.platformSettings.ebay.bestOfferEnabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100 mt-3">
                      <div>
                        <Label className="block mb-1 text-xs">Minimum offer</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                          <Input type="number" className="h-9 pl-7" value={formData.platformSettings.ebay.bestOfferAutoDecline || ''} onChange={e => handlePlatformChange('ebay', 'bestOfferAutoDecline', e.target.value)} placeholder="0.00" />
                        </div>
                      </div>
                      <div>
                        <Label className="block mb-1 text-xs">Auto accept</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                          <Input type="number" className="h-9 pl-7" value={formData.platformSettings.ebay.bestOfferAutoAccept || ''} onChange={e => handlePlatformChange('ebay', 'bestOfferAutoAccept', e.target.value)} placeholder="0.00" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Item Specifics */}
                <div className="mt-6 border border-gray-100 rounded-lg p-4 bg-gray-50/50">
                  <div className="flex justify-between items-center mb-4">
                     <div>
                       <Label className="block text-sm font-semibold text-gray-700 uppercase">Item Specifics</Label>
                     </div>
                     <div className="flex items-center space-x-2">
                       {/* eBay AutoFill Button */}
                       <button
                         type="button"
                         onClick={async () => {
                           if (!formData.title) {
                              alert('Please enter a title first to auto-fill specs.');
                              return;
                           }
                           try {
                              const btn = document.getElementById('autofill-btn');
                              if (btn) btn.innerHTML = '<span class="animate-spin inline-block mr-2">⟳</span> Fetching...';
                              
                              const res = await fetch(`http://localhost:5000/api/ebay/catalog/search?q=${encodeURIComponent(formData.title)}`, {
                                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                              });
                              const data = await res.json();
                              
                              if (btn) btn.innerHTML = '<span class="mr-1">✨</span> Auto-Fill from eBay';
                              
                              if (data.success && data.itemSpecifics) {
                                 const currentSpecs = formData.platformSettings?.ebay?.itemSpecifics || {};
                                 const newSpecs = { ...currentSpecs };
                                 let addedCount = 0;
                                 
                                 for (const [k, v] of Object.entries(data.itemSpecifics)) {
                                   if (!newSpecs[k]) {
                                     newSpecs[k] = v;
                                     addedCount++;
                                   }
                                 }
                                 
                                 if (addedCount > 0) {
                                   handlePlatformChange('ebay', 'itemSpecifics', newSpecs);
                                   alert(`Auto-filled ${addedCount} item specific(s) successfully!`);
                                 } else {
                                   alert('No new specifics found or all fields were already filled.');
                                 }
                              } else {
                                 alert(data.message || 'Could not find matching device in catalog.');
                              }
                           } catch (err) {
                              console.error(err);
                              alert('Error fetching specs.');
                              const btn = document.getElementById('autofill-btn');
                              if (btn) btn.innerHTML = '<span class="mr-1">✨</span> Auto-Fill from eBay';
                           }
                         }}
                         id="autofill-btn"
                         className="flex items-center text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors border border-blue-200 shadow-sm"
                       >
                         <span className="mr-1">✨</span> Auto-Fill from eBay
                       </button>

                       {/* Gemini AI AutoFill Button */}
                       <button
                         type="button"
                         onClick={async () => {
                           if (!formData.title) {
                              alert('Please enter a title first to auto-fill specs.');
                              return;
                           }
                           try {
                              const btn = document.getElementById('gemini-btn');
                              if (btn) btn.innerHTML = '<span class="animate-spin inline-block mr-2">⟳</span> Analyzing...';
                              
                              const res = await fetch(`http://localhost:5000/api/ai/extract-specs`, {
                                method: 'POST',
                                headers: { 
                                  'Authorization': `Bearer ${localStorage.getItem('token')}`,
                                  'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ title: formData.title })
                              });
                              const data = await res.json();
                              
                              if (btn) btn.innerHTML = '<span class="mr-1">🤖</span> Auto-Fill with Gemini';
                              
                              if (data.success && data.itemSpecifics) {
                                 const currentSpecs = formData.platformSettings?.ebay?.itemSpecifics || {};
                                 const newSpecs = { ...currentSpecs };
                                 let addedCount = 0;
                                 
                                 for (const [k, v] of Object.entries(data.itemSpecifics)) {
                                   if (v && v.trim() !== '' && !newSpecs[k]) {
                                     newSpecs[k] = v;
                                     addedCount++;
                                   }
                                 }
                                 
                                 if (addedCount > 0) {
                                   handlePlatformChange('ebay', 'itemSpecifics', newSpecs);
                                   alert(`Auto-filled ${addedCount} item specific(s) using Gemini AI!`);
                                 } else {
                                   alert('No new specifics found or all fields were already filled.');
                                 }
                              } else {
                                 alert(data.message || 'Gemini could not extract specs.');
                              }
                           } catch (err) {
                              console.error(err);
                              alert('Error extracting specs with Gemini.');
                              const btn = document.getElementById('gemini-btn');
                              if (btn) btn.innerHTML = '<span class="mr-1">🤖</span> Auto-Fill with Gemini';
                           }
                         }}
                         id="gemini-btn"
                         className="flex items-center text-xs font-medium text-purple-600 bg-purple-50 px-3 py-1.5 rounded-full hover:bg-purple-100 transition-colors border border-purple-200 shadow-sm"
                       >
                         <span className="mr-1">🤖</span> Auto-Fill with Gemini
                       </button>
                     </div>
                  </div>
                  
                  <div className="space-y-6 bg-white p-4 border rounded-md">
                    {/* Required Specifics */}
                    <div>
                      <div className="mb-3">
                         <h5 className="font-bold text-sm text-gray-800">Required</h5>
                         <p className="text-xs text-gray-500">Buyers need these details to find your item.</p>
                      </div>
                      <div className="space-y-3">
                        {[
                          'Brand', 'Model', 'Storage Capacity', 'Color'
                        ].map(spec => (
                          <div key={spec} className="grid grid-cols-1 md:grid-cols-3 items-center gap-2 border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                             <Label className="text-sm font-medium text-gray-700 md:col-span-1">{spec}</Label>
                             <Input 
                               type="text" 
                               className="h-9 md:col-span-2 text-sm" 
                               placeholder={`Enter ${spec}`}
                               value={formData.platformSettings?.ebay?.itemSpecifics?.[spec] || ''} 
                               onChange={e => {
                                 const newSpecifics = { ...(formData.platformSettings.ebay.itemSpecifics || {}) };
                                 if (e.target.value) {
                                   newSpecifics[spec] = e.target.value;
                                 } else {
                                   delete newSpecifics[spec];
                                 }
                                 handlePlatformChange('ebay', 'itemSpecifics', newSpecifics);
                               }} 
                             />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Additional Specifics */}
                    <div className="pt-4 border-t border-gray-100">
                      <div className="mb-3">
                         <h5 className="font-bold text-sm text-gray-800">Additional</h5>
                         <p className="text-xs text-gray-500">Add more details to help buyers decide.</p>
                      </div>
                      <div className="space-y-3">
                        {[
                          'UPC', 'ePID', 'MPN', 'Network', 'Screen Size', 'RAM', 'Processor', 'Operating System', 'Features'
                        ].map(spec => (
                          <div key={spec} className="grid grid-cols-1 md:grid-cols-3 items-center gap-2 border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                             <Label className="text-sm font-medium text-gray-700 md:col-span-1">{spec}</Label>
                             <Input 
                               type="text" 
                               className="h-9 md:col-span-2 text-sm" 
                               placeholder={`Enter ${spec}`}
                               value={formData.platformSettings?.ebay?.itemSpecifics?.[spec] || ''} 
                               onChange={e => {
                                 const newSpecifics = { ...(formData.platformSettings.ebay.itemSpecifics || {}) };
                                 if (e.target.value) {
                                   newSpecifics[spec] = e.target.value;
                                 } else {
                                   delete newSpecifics[spec];
                                 }
                                 handlePlatformChange('ebay', 'itemSpecifics', newSpecifics);
                               }} 
                             />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Shipping & Fulfillment */}
                <div className="mt-6 space-y-6">
                  {/* Package Details */}
                  <div className="border border-gray-100 rounded-lg p-4 bg-gray-50/50">
                     <h4 className="font-semibold text-sm text-gray-700 mb-3">Package Details</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div>
                         <Label className="block mb-2 text-xs font-semibold text-gray-800">Package weight <span className="text-gray-500 font-normal">(optional)</span></Label>
                         <div className="flex items-center space-x-2">
                           <div className="relative w-24">
                             <Input type="number" className="h-9 pr-8" placeholder="0" value={formData.platformSettings.ebay.shipping?.packageWeightMajor || ''} onChange={e => {
                                const newShipping = { ...(formData.platformSettings.ebay.shipping || {}), packageWeightMajor: e.target.value };
                                handlePlatformChange('ebay', 'shipping', newShipping);
                             }} />
                             <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">lbs.</span>
                           </div>
                           <div className="relative w-24">
                             <Input type="number" className="h-9 pr-8" placeholder="0" value={formData.platformSettings.ebay.shipping?.packageWeightMinor || ''} onChange={e => {
                                const newShipping = { ...(formData.platformSettings.ebay.shipping || {}), packageWeightMinor: e.target.value };
                                handlePlatformChange('ebay', 'shipping', newShipping);
                             }} />
                             <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">oz.</span>
                           </div>
                         </div>
                       </div>
                       
                       <div>
                         <Label className="block mb-2 text-xs font-semibold text-gray-800">Package dimensions <span className="text-gray-500 font-normal">(optional)</span></Label>
                         <div className="flex items-center space-x-2">
                           <div className="relative w-20">
                             <Input type="number" className="h-9 pr-6" placeholder="L" value={formData.platformSettings.ebay.shipping?.packageLength || ''} onChange={e => {
                                const newShipping = { ...(formData.platformSettings.ebay.shipping || {}), packageLength: e.target.value };
                                handlePlatformChange('ebay', 'shipping', newShipping);
                             }} />
                             <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">in.</span>
                           </div>
                           <span className="text-gray-400 text-sm">x</span>
                           <div className="relative w-20">
                             <Input type="number" className="h-9 pr-6" placeholder="W" value={formData.platformSettings.ebay.shipping?.packageWidth || ''} onChange={e => {
                                const newShipping = { ...(formData.platformSettings.ebay.shipping || {}), packageWidth: e.target.value };
                                handlePlatformChange('ebay', 'shipping', newShipping);
                             }} />
                             <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">in.</span>
                           </div>
                           <span className="text-gray-400 text-sm">x</span>
                           <div className="relative w-20">
                             <Input type="number" className="h-9 pr-6" placeholder="H" value={formData.platformSettings.ebay.shipping?.packageDepth || ''} onChange={e => {
                                const newShipping = { ...(formData.platformSettings.ebay.shipping || {}), packageDepth: e.target.value };
                                handlePlatformChange('ebay', 'shipping', newShipping);
                             }} />
                             <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">in.</span>
                           </div>
                         </div>
                       </div>
                     </div>
                     <p className="text-xs text-gray-500 mt-2 mb-4">These details are an estimate based on listings like yours: 2 lbs 0 oz, 10.0 x 8.0 x 4.0 in.</p>
                     
                     <label className="flex items-start space-x-2 text-sm text-gray-800 cursor-pointer">
                       <input type="checkbox" className="rounded border-gray-400 text-blue-600 focus:ring-blue-500 mt-0.5" checked={formData.platformSettings.ebay.shipping?.packageType === 'Irregular'} onChange={e => {
                          const newShipping = { ...(formData.platformSettings.ebay.shipping || {}), packageType: e.target.checked ? 'Irregular' : 'PackageThickEnvelope' };
                          handlePlatformChange('ebay', 'shipping', newShipping);
                       }} />
                       <div>
                         <span className="font-semibold block">Irregular package</span>
                         <span className="text-gray-500 text-xs">Carriers may charge extra for items not shipped in standard packages. <a href="#" className="underline">Learn more</a></span>
                       </div>
                     </label>
                  </div>

                  {/* Domestic Shipping */}
                  <div className="border border-gray-100 rounded-lg p-4 bg-gray-50/50">
                     <h4 className="font-semibold text-sm text-gray-700 mb-4">Domestic shipping</h4>
                     
                     <div className="mb-6 w-full md:w-1/2">
                       <Label className="block mb-2 text-xs text-gray-800">Cost type</Label>
                       <select value={formData.platformSettings.ebay.shipping?.shippingType || 'Flat'} onChange={e => {
                          const newShipping = { ...(formData.platformSettings.ebay.shipping || {}), shippingType: e.target.value };
                          handlePlatformChange('ebay', 'shipping', newShipping);
                       }} className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500">
                         <option value="Flat">Flat: Same cost to all buyers</option>
                         <option value="Calculated">Calculated: Cost varies by buyer location</option>
                       </select>
                     </div>

                     <div className="mb-4">
                       <Label className="block mb-2 text-xs font-semibold text-gray-800">Primary service</Label>
                       <div className="border border-gray-200 bg-white rounded-lg p-4 flex flex-col md:flex-row justify-between items-start md:items-center relative">
                         <div className="flex items-start gap-4">
                           <div className="w-16 h-12 flex items-center justify-center bg-gray-50 rounded">
                             <img src={activeServiceObj ? activeServiceObj.logo : "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/USPS_logo_with_wordmark.svg/320px-USPS_logo_with_wordmark.svg.png"} alt="Carrier" className="max-h-full max-w-full object-contain" />
                           </div>
                           <div className="text-sm">
                             <div className="font-semibold text-gray-800">{activeServiceObj ? activeServiceObj.name : 'USPS Ground Advantage'}</div>
                             <div className="text-gray-600">{activeServiceObj ? activeServiceObj.transit : '2 - 5 business days'}</div>
                             <div className="text-gray-600">Insurance {activeServiceObj ? activeServiceObj.insurance : '$100.00'}</div>
                             <div className="text-gray-600">Tracking included: {activeServiceObj ? (activeServiceObj.tracking ? 'Yes' : 'No') : 'Yes'}</div>
                             <div className="text-gray-600">Max. {activeServiceObj ? activeServiceObj.maxWeight : '70 lb'}</div>
                             {formData.platformSettings.ebay.shipping?.shippingType === 'Flat' && (
                               <>
                                 <div className="mt-1 font-semibold text-gray-700">
                                   ${activeServiceObj ? activeServiceObj.minPrice.toFixed(2) : '6.57'} - ${activeServiceObj ? activeServiceObj.maxPrice.toFixed(2) : '11.84'} 
                                   <span className="line-through text-gray-400 font-normal ml-1">${activeServiceObj ? (activeServiceObj.minPrice * 1.5).toFixed(2) : '10.80'} - ${activeServiceObj ? (activeServiceObj.maxPrice * 1.5).toFixed(2) : '19.05'}</span>
                                 </div>
                                 <div className="text-green-700 font-medium mt-0.5">Save when you buy a label on eBay</div>
                               </>
                             )}
                           </div>
                         </div>
                         
                         <div className="mt-4 md:mt-0 flex items-center gap-3 border-l border-gray-100 pl-4 ml-4 h-full min-h-[80px]">
                           {formData.platformSettings.ebay.shipping?.shippingType === 'Calculated' ? (
                             <div>
                               <Label className="block text-[13px] font-bold text-gray-900 mb-1">Buyer pays:</Label>
                               <div className="font-bold text-gray-600">
                                 ${activeServiceObj ? activeServiceObj.minPrice.toFixed(2) : '6.57'} - ${activeServiceObj ? activeServiceObj.maxPrice.toFixed(2) : '11.84'} 
                                 <span className="line-through text-gray-400 font-normal ml-1">${activeServiceObj ? (activeServiceObj.minPrice * 1.5).toFixed(2) : '10.80'} - ${activeServiceObj ? (activeServiceObj.maxPrice * 1.5).toFixed(2) : '19.05'}</span>
                               </div>
                               <div className="text-green-700 font-medium mt-0.5 text-sm">Save when you buy a label on eBay</div>
                             </div>
                           ) : (
                             <div className="border border-gray-300 rounded-md p-2 w-48 bg-gray-50/50">
                               <Label className="block text-[11px] text-gray-500 mb-1">Buyer pays</Label>
                               <div className="relative">
                                 <span className="absolute left-1 top-1/2 -translate-y-1/2 text-gray-800 font-medium">$</span>
                                 <Input type="number" className="h-6 py-0 pr-0 pl-5 text-sm font-medium border-0 focus-visible:ring-0 shadow-none bg-transparent" placeholder="" value={formData.platformSettings.ebay.shipping?.shippingCost || ''} onChange={e => {
                                    const newShipping = { ...(formData.platformSettings.ebay.shipping || {}), shippingCost: e.target.value };
                                    handlePlatformChange('ebay', 'shipping', newShipping);
                                 }} />
                               </div>
                             </div>
                           )}
                           
                           <button onClick={() => setIsShippingModalOpen(true)} className="h-8 w-8 rounded-full hover:bg-gray-100 flex flex-col justify-center items-center text-gray-600 transition-colors self-center">
                             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                           </button>
                         </div>
                       </div>
                     </div>

                     <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                       <label className="flex items-start space-x-3 text-sm text-gray-800 cursor-pointer">
                         <input type="checkbox" className="rounded border-gray-400 text-blue-600 focus:ring-blue-500 mt-1 w-4 h-4" checked={formData.platformSettings.ebay.shipping?.freeShipping || false} onChange={e => {
                            const newShipping = { ...(formData.platformSettings.ebay.shipping || {}), freeShipping: e.target.checked };
                            handlePlatformChange('ebay', 'shipping', newShipping);
                         }} />
                         <div>
                           <span className="font-bold block">Offer free shipping</span>
                           <span className="text-gray-600 text-xs block mt-0.5">Entice buyers by offering free shipping for your primary shipping service.</span>
                         </div>
                       </label>
                     </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Etsy */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 mb-2"><PlatformLogo platform="etsy" size={16} /> Etsy Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="block mb-1">Taxonomy ID (Category)</Label>
                    <Input type="text" value={formData.platformSettings.etsy.taxonomyId} onChange={e => handlePlatformChange('etsy', 'taxonomyId', e.target.value)} />
                  </div>
                  <div>
                    <Label className="block mb-1">Who Made It?</Label>
                    <select value={formData.platformSettings.etsy.whoMade} onChange={e => handlePlatformChange('etsy', 'whoMade', e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                      <option value="i_did">I did</option>
                      <option value="someone_else">Someone else (production partner)</option>
                      <option value="collective">A collective</option>
                    </select>
                  </div>
                  <div>
                    <Label className="block mb-1">When Was It Made?</Label>
                    <select value={formData.platformSettings.etsy.whenMade} onChange={e => handlePlatformChange('etsy', 'whenMade', e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                      <option value="made_to_order">Made to order</option>
                      <option value="2020_2024">2020–2024</option>
                      <option value="2010_2019">2010–2019</option>
                      <option value="2000_2009">2000–2009</option>
                      <option value="before_2000">Before 2000</option>
                      <option value="1990_1999">1990–1999</option>
                      <option value="before_1990">Before 1990 (Vintage)</option>
                    </select>
                  </div>
                  <div>
                    <Label className="block mb-1">Shipping Profile ID</Label>
                    <Input type="text" value={formData.platformSettings.etsy.shippingProfileId} onChange={e => handlePlatformChange('etsy', 'shippingProfileId', e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <Label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.platformSettings.etsy.isSupply} onChange={e => handlePlatformChange('etsy', 'isSupply', e.target.checked)} className="rounded text-indigo-600" />
                      This is a craft supply or tool
                    </Label>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-orange-50 rounded-lg">
                  <p className="text-xs text-orange-700"><strong>Etsy Rules:</strong> Max 140 chars title. Must be handmade, vintage (20+ years), or craft supply. Production partners must be disclosed. AI-generated content must be disclosed.</p>
                </div>
              </CardContent>
            </Card>

            {/* Shopify */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 mb-2"><PlatformLogo platform="shopify" size={16} /> Shopify Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="block mb-1">Product Type</Label>
                    <Input type="text" value={formData.platformSettings.shopify.productType} onChange={e => handlePlatformChange('shopify', 'productType', e.target.value)} placeholder="e.g. Smartphones" />
                  </div>
                  <div>
                    <Label className="block mb-1">Weight Unit</Label>
                    <select value={formData.platformSettings.shopify.weightUnit} onChange={e => handlePlatformChange('shopify', 'weightUnit', e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                      <option value="lb">lb (Pounds)</option>
                      <option value="oz">oz (Ounces)</option>
                      <option value="kg">kg (Kilograms)</option>
                      <option value="g">g (Grams)</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Amazon stub */}
            <Card className="border-dashed border-amber-300">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base flex items-center gap-2"><PlatformLogo platform="amazon" size={16} /> Amazon Settings</CardTitle>
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">API Approval Required</span>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="block mb-1">GTIN / UPC</Label>
                    <Input type="text" value={formData.platformSettings.amazon?.gtin || ''} onChange={e => handlePlatformChange('amazon', 'gtin', e.target.value)} placeholder="e.g. 0123456789012" />
                  </div>
                  <div>
                    <Label className="block mb-1">ASIN (if updating existing)</Label>
                    <Input type="text" value={formData.platformSettings.amazon?.asin || ''} onChange={e => handlePlatformChange('amazon', 'asin', e.target.value)} placeholder="e.g. B08L5WHFT9" />
                  </div>
                  <div>
                    <Label className="block mb-1">Fulfillment Channel</Label>
                    <select value={formData.platformSettings.amazon?.fulfillmentChannel || 'MFN'} onChange={e => handlePlatformChange('amazon', 'fulfillmentChannel', e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                      <option value="MFN">MFN (Merchant Fulfilled)</option>
                      <option value="AFN">AFN (Amazon FBA)</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-amber-50 rounded-lg">
                  <p className="text-xs text-amber-700"><strong>Amazon Rules:</strong> UPC/GTIN required for new products. Main image must have pure white background. No promotional language in listings. Category approval required for many verticals.</p>
                </div>
              </CardContent>
            </Card>

            {/* TikTok stub */}
            <Card className="border-dashed border-gray-300">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base flex items-center gap-2"><PlatformLogo platform="tiktok" size={16} /> TikTok Shop Settings</CardTitle>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-medium">Coming Soon</span>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="block mb-1">TikTok Brand ID</Label>
                    <Input type="text" value={formData.platformSettings.tiktok?.brandId || ''} onChange={e => handlePlatformChange('tiktok', 'brandId', e.target.value)} placeholder="From TikTok Seller Center" />
                  </div>
                  <div>
                    <Label className="block mb-1">TikTok Category ID</Label>
                    <Input type="text" value={formData.platformSettings.tiktok?.categoryId || ''} onChange={e => handlePlatformChange('tiktok', 'categoryId', e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {isNanoBananOpen && (
        <div className="fixed inset-0 z-40 bg-black/80" aria-hidden="true" onClick={() => setIsNanoBananOpen(false)} />
      )}
      <Dialog open={isNanoBananOpen} onOpenChange={setIsNanoBananOpen} modal={false}>
        <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 overflow-hidden bg-gray-50 z-50" onInteractOutside={e => {
          if (e.target.closest('.FilerobotImageEditor') || e.target.closest('[class*="Sfx"]') || e.target.closest('[class*="Filerobot"]')) {
            e.preventDefault();
          }
        }}>
          <DialogHeader className="px-6 py-4 bg-white border-b border-gray-200 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-purple-700 text-xl font-bold">
              <Wand2 size={24} /> NanoBanan AI Studio <span className="text-sm font-normal text-gray-500 ml-2">| Pro Phone Editing Suite</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            {/* Left Column: Image Preview */}
            <div className="w-full md:w-3/5 bg-gray-100 p-0 flex flex-col items-center justify-center border-r border-gray-200 h-full relative">
              {nanoSourceImageIndex !== null && formData.images[nanoSourceImageIndex]?.url ? (
                <FilerobotImageEditor
                  key={nanoSourceImageIndex + formData.images[nanoSourceImageIndex].url}
                  source={api.defaults.baseURL + '/upload/proxy?url=' + encodeURIComponent(formData.images[nanoSourceImageIndex].url)}
                  onSave={async (editedImageObject, designState) => {
                    try {
                      setIsUploadingImage(true);
                      const res = await fetch(editedImageObject.imageBase64);
                      const blob = await res.blob();
                      const fd = new FormData();
                      fd.append('file', blob, `edited-${Date.now()}.${editedImageObject.extension}`);
                      const apiRes = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                      if (apiRes.data.success) {
                        setFormData(prev => {
                          const newImages = [...prev.images];
                          newImages[nanoSourceImageIndex].url = apiRes.data.url;
                          newImages[nanoSourceImageIndex].source = 'manual_edit';
                          return { ...prev, images: newImages };
                        });
                      }
                    } catch (err) {
                      console.error(err);
                      alert('Failed to save edited image');
                    } finally {
                      setIsUploadingImage(false);
                    }
                  }}
                  onBeforeSave={() => false}
                  annotationsCommon={{ fill: '#ff0000' }}
                  Text={{ text: 'Text...' }}
                  Rotate={{ angle: 90, componentType: 'slider' }}
                  Crop={{
                    ratio: 'custom',
                    presetsItems: [
                      { titleKey: 'custom', descriptionKey: 'custom', ratio: 'custom' },
                      { titleKey: 'original', descriptionKey: 'original', ratio: 'original' },
                      { titleKey: 'landscape', descriptionKey: '16:9', ratio: 16 / 9 },
                      { titleKey: 'portrait', descriptionKey: '9:16', ratio: 9 / 16 },
                      { titleKey: 'classicTv', descriptionKey: '4:3', ratio: 4 / 3 },
                    ]
                  }}
                  tabsIds={[TABS.ADJUST, TABS.ANNOTATE, TABS.WATERMARK, TABS.FILTERS, TABS.FINETUNE, TABS.RESIZE]}
                  defaultTabId={TABS.ADJUST}
                  defaultToolId={TOOLS.CROP}
                />
              ) : (
                <div className="text-center text-gray-400">
                  <ImageIcon size={64} className="mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium text-gray-500">Batch Processing Mode</p>
                  <p className="text-sm">AI will apply these settings to all {formData.images.length} images.</p>
                </div>
              )}
            </div>

            {/* Right Column: Settings & Controls */}
            <div className="w-full md:w-2/5 bg-white flex flex-col h-full">
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                
                {/* Background Controls */}
                <section>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Background Canvas</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setNanoSettings(p => ({ ...p, background: 'white' }))} className={`p-3 text-left rounded-xl border-2 transition-all ${nanoSettings.background === 'white' ? 'border-purple-600 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}`}>
                      <div className="w-full h-8 bg-white border border-gray-200 rounded mb-2 shadow-sm" />
                      <p className="text-sm font-medium text-gray-900">Pure White</p>
                      <p className="text-xs text-gray-500 mt-0.5">Perfect for Amazon</p>
                    </button>
                    <button onClick={() => setNanoSettings(p => ({ ...p, background: 'studio' }))} className={`p-3 text-left rounded-xl border-2 transition-all ${nanoSettings.background === 'studio' ? 'border-purple-600 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}`}>
                      <div className="w-full h-8 bg-gradient-to-br from-gray-100 to-gray-300 border border-gray-200 rounded mb-2 shadow-sm" />
                      <p className="text-sm font-medium text-gray-900">Studio Grey</p>
                      <p className="text-xs text-gray-500 mt-0.5">Premium look</p>
                    </button>
                    <button onClick={() => setNanoSettings(p => ({ ...p, background: 'remove' }))} className={`p-3 text-left rounded-xl border-2 transition-all ${nanoSettings.background === 'remove' ? 'border-purple-600 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}`}>
                      <div className="w-full h-8 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAHElEQVQYV2N89uzZfwY8QFJSEp84zYhUeYw4NQMARu4oF/c1mXwAAAAASUVORK5CYII=')] border border-gray-200 rounded mb-2 shadow-sm" />
                      <p className="text-sm font-medium text-gray-900">Transparent</p>
                      <p className="text-xs text-gray-500 mt-0.5">PNG format</p>
                    </button>
                    <button onClick={() => setNanoSettings(p => ({ ...p, background: 'original' }))} className={`p-3 text-left rounded-xl border-2 transition-all ${nanoSettings.background === 'original' ? 'border-purple-600 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}`}>
                      <div className="w-full h-8 bg-gray-200 border border-gray-200 rounded mb-2 shadow-sm flex items-center justify-center text-gray-400"><ImageIcon size={14} /></div>
                      <p className="text-sm font-medium text-gray-900">Keep Original</p>
                      <p className="text-xs text-gray-500 mt-0.5">No change</p>
                    </button>
                  </div>
                </section>

                {/* Enhancement Controls */}
                <section>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Device Enhancements</h3>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Fix Screen Glare</p>
                        <p className="text-xs text-gray-500">AI removes reflections from the glass</p>
                      </div>
                      <div className={`w-11 h-6 rounded-full transition-colors relative ${nanoSettings.removeGlare ? 'bg-purple-600' : 'bg-gray-200'}`}>
                        <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${nanoSettings.removeGlare ? 'translate-x-5' : ''}`} />
                      </div>
                      <input type="checkbox" className="hidden" checked={nanoSettings.removeGlare} onChange={e => setNanoSettings(p => ({ ...p, removeGlare: e.target.checked }))} />
                    </label>

                    <label className="flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Enhance Device Lighting</p>
                        <p className="text-xs text-gray-500">Improves shadows and highlights</p>
                      </div>
                      <div className={`w-11 h-6 rounded-full transition-colors relative ${nanoSettings.enhanceLighting ? 'bg-purple-600' : 'bg-gray-200'}`}>
                        <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${nanoSettings.enhanceLighting ? 'translate-x-5' : ''}`} />
                      </div>
                      <input type="checkbox" className="hidden" checked={nanoSettings.enhanceLighting} onChange={e => setNanoSettings(p => ({ ...p, enhanceLighting: e.target.checked }))} />
                    </label>
                    
                    <label className="flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Auto-Center & Crop</p>
                        <p className="text-xs text-gray-500">Perfectly aligns the phone in frame</p>
                      </div>
                      <div className={`w-11 h-6 rounded-full transition-colors relative ${nanoSettings.autoCenter ? 'bg-purple-600' : 'bg-gray-200'}`}>
                        <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${nanoSettings.autoCenter ? 'translate-x-5' : ''}`} />
                      </div>
                      <input type="checkbox" className="hidden" checked={nanoSettings.autoCenter} onChange={e => setNanoSettings(p => ({ ...p, autoCenter: e.target.checked }))} />
                    </label>
                  </div>
                </section>

                {/* Custom Instructions */}
                <section>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">Custom AI Instructions <span className="text-xs font-normal text-gray-400 normal-case">(Optional)</span></h3>
                  <textarea
                    value={nanoPrompt}
                    onChange={(e) => setNanoPrompt(e.target.value)}
                    placeholder="e.g. Add a soft drop shadow underneath the phone..."
                    className="flex w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600"
                    rows={3}
                  />
                </section>
              </div>

              {/* Sticky Footer / Action Buttons */}
              <div className="p-6 bg-gray-50 border-t border-gray-200 shrink-0 space-y-3">
                <Button
                  className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-md text-base"
                  onClick={() => handleNanoProcess(nanoSourceImageIndex !== null ? 'single' : 'all')}
                  disabled={nanoProcessingType !== null}
                >
                  {nanoProcessingType !== null ? (
                    <Loader2 size={20} className="animate-spin mr-2" />
                  ) : (
                    <Sparkles size={20} className="mr-2" />
                  )}
                  {nanoProcessingType !== null ? 'AI Processing...' : (nanoSourceImageIndex !== null ? 'Apply AI to Current Image' : `Apply AI to All Images (${formData.images.length})`)}
                </Button>
                
                {nanoSourceImageIndex !== null && formData.images.length > 1 && (
                  <Button
                    variant="ghost"
                    className="w-full text-purple-700 hover:bg-purple-100"
                    onClick={() => handleNanoProcess('all')}
                    disabled={nanoProcessingType !== null}
                  >
                    Apply to all {formData.images.length} images instead
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Shipping Service Modal */}
      <Dialog open={isShippingModalOpen} onOpenChange={setIsShippingModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b relative">
            <DialogTitle className="text-center text-lg font-bold">Change service</DialogTitle>
            <button onClick={() => setIsShippingModalOpen(false)} className="absolute right-4 top-4 text-blue-600 hover:text-blue-800 text-sm font-semibold">Done</button>
          </DialogHeader>
          
          <div className="px-6 py-4 border-b bg-gray-50/50">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <Input 
                type="text" 
                placeholder="Find a shipping service" 
                className="pl-9 h-10"
                value={shippingSearch}
                onChange={e => setShippingSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-8">
            {loadingRates ? (
              <div className="flex justify-center items-center h-32 text-gray-500">Loading rates...</div>
            ) : shippingRates ? (
              <>
                {/* Selected / Recommended */}
                {shippingRates.recommended && shippingRates.recommended.length > 0 && (
                  <div>
                    <h3 className="font-bold text-gray-900 mb-4 text-lg">Selected</h3>
                    <div className="space-y-4">
                      {shippingRates.recommended.map(service => (
                        <label key={service.id} className="flex items-start gap-3 cursor-pointer group">
                          <input 
                            type="radio" 
                            name="shippingService"
                            value={service.id}
                            checked={tempSelectedService === service.id}
                            onChange={() => setTempSelectedService(service.id)}
                            className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-600 rounded border border-blue-200">RECOMMENDED</span>
                            </div>
                            <div className="font-semibold text-gray-900 mt-1 group-hover:text-blue-600 transition-colors">{service.name}</div>
                            <div className="text-gray-500 text-sm mt-0.5">{service.transit}</div>
                            <div className="text-gray-500 text-sm">Insurance {service.insurance}</div>
                            <div className="text-gray-500 text-sm">Tracking included: {service.tracking ? 'Yes' : 'No'}</div>
                            <div className="text-gray-500 text-sm">Max. {service.maxWeight}</div>
                            <div className="font-semibold text-gray-900 mt-1">
                              $\\{service.minPrice.toFixed(2)} - $\\{service.maxPrice.toFixed(2)}
                            </div>
                            <div className="text-green-700 text-sm font-medium mt-0.5">Save when you buy a label on eBay</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Economy Services */}
                {shippingRates.economy && shippingRates.economy.length > 0 && (
                  <div>
                    <h3 className="font-bold text-gray-900 mb-4 text-lg">Economy services</h3>
                    <div className="space-y-6">
                      {shippingRates.economy.map(service => (
                        <label key={service.id} className="flex items-start gap-3 cursor-pointer group">
                          <input 
                            type="radio" 
                            name="shippingService"
                            value={service.id}
                            checked={tempSelectedService === service.id}
                            onChange={() => setTempSelectedService(service.id)}
                            className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          />
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{service.name}</div>
                            <div className="text-gray-500 text-sm mt-0.5">{service.transit}</div>
                            <div className="text-gray-500 text-sm">Insurance {service.insurance}</div>
                            <div className="text-gray-500 text-sm">Tracking included: {service.tracking ? 'Yes' : 'No'}</div>
                            <div className="text-gray-500 text-sm">Max. {service.maxWeight}</div>
                            <div className="font-semibold text-gray-900 mt-1">
                              $\\{service.minPrice.toFixed(2)} - $\\{service.maxPrice.toFixed(2)}
                            </div>
                            <div className="text-green-700 text-sm font-medium mt-0.5">Save when you buy a label on eBay</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Standard Services */}
                {shippingRates.standard && shippingRates.standard.length > 0 && (
                  <div>
                    <h3 className="font-bold text-gray-900 mb-4 text-lg">Standard services</h3>
                    <div className="space-y-6">
                      {shippingRates.standard.map(service => (
                        <label key={service.id} className="flex items-start gap-3 cursor-pointer group">
                          <input 
                            type="radio" 
                            name="shippingService"
                            value={service.id}
                            checked={tempSelectedService === service.id}
                            onChange={() => setTempSelectedService(service.id)}
                            className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          />
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{service.name}</div>
                            <div className="text-gray-500 text-sm mt-0.5">{service.transit}</div>
                            <div className="text-gray-500 text-sm">Insurance {service.insurance}</div>
                            <div className="text-gray-500 text-sm">Tracking included: {service.tracking ? 'Yes' : 'No'}</div>
                            <div className="text-gray-500 text-sm">Max. {service.maxWeight}</div>
                            <div className="font-semibold text-gray-900 mt-1">
                              $\\{service.minPrice.toFixed(2)} - $\\{service.maxPrice.toFixed(2)}
                            </div>
                            <div className="text-green-700 text-sm font-medium mt-0.5">Save when you buy a label on eBay</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex justify-center items-center h-32 text-gray-500">No rates available.</div>
            )}
          </div>
          
          <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsShippingModalOpen(false)}>Cancel</Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white" 
              onClick={() => {
                if (tempSelectedService && shippingRates) {
                  // Find the service in any category to get its price
                  let selectedServiceObj = null;
                  ['recommended', 'economy', 'standard'].forEach(cat => {
                    if (shippingRates[cat]) {
                      const found = shippingRates[cat].find(s => s.id === tempSelectedService);
                      if (found) selectedServiceObj = found;
                    }
                  });
                  
                  const newShipping = { ...(formData.platformSettings.ebay.shipping || {}), shippingService: tempSelectedService };
                  if (selectedServiceObj) {
                     newShipping.shippingCost = selectedServiceObj.maxPrice.toFixed(2);
                  }
                  handlePlatformChange('ebay', 'shipping', newShipping);
                }
                setIsShippingModalOpen(false);
              }}
            >
              Apply Selection
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Shipping Service Modal */}
      <Dialog open={isShippingModalOpen} onOpenChange={setIsShippingModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b relative">
            <DialogTitle className="text-center text-lg font-bold">Change service</DialogTitle>
            <button onClick={() => setIsShippingModalOpen(false)} className="absolute right-4 top-4 text-blue-600 hover:text-blue-800 text-sm font-semibold">Done</button>
          </DialogHeader>
          
          <div className="px-6 py-4 border-b bg-gray-50/50">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <Input 
                type="text" 
                placeholder="Find a shipping service" 
                className="pl-9 h-10"
                value={shippingSearch}
                onChange={e => setShippingSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-8">
            {loadingRates ? (
              <div className="flex justify-center items-center h-32 text-gray-500">Loading rates...</div>
            ) : shippingRates ? (
              <>
                {/* Selected / Recommended */}
                {shippingRates.recommended && shippingRates.recommended.length > 0 && (
                  <div>
                    <h3 className="font-bold text-gray-900 mb-4 text-lg">Selected</h3>
                    <div className="space-y-4">
                      {shippingRates.recommended.map(service => (
                        <label key={service.id} className="flex items-start gap-3 cursor-pointer group">
                          <input 
                            type="radio" 
                            name="shippingService"
                            value={service.id}
                            checked={tempSelectedService === service.id}
                            onChange={() => setTempSelectedService(service.id)}
                            className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-600 rounded border border-blue-200">RECOMMENDED</span>
                            </div>
                            <div className="font-semibold text-gray-900 mt-1 group-hover:text-blue-600 transition-colors">{service.name}</div>
                            <div className="text-gray-500 text-sm mt-0.5">{service.transit}</div>
                            <div className="text-gray-500 text-sm">Insurance {service.insurance}</div>
                            <div className="text-gray-500 text-sm">Tracking included: {service.tracking ? 'Yes' : 'No'}</div>
                            <div className="text-gray-500 text-sm">Max. {service.maxWeight}</div>
                            <div className="font-semibold text-gray-900 mt-1">
                              $\\{service.minPrice.toFixed(2)} - $\\{service.maxPrice.toFixed(2)}
                            </div>
                            <div className="text-green-700 text-sm font-medium mt-0.5">Save when you buy a label on eBay</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Economy Services */}
                {shippingRates.economy && shippingRates.economy.length > 0 && (
                  <div>
                    <h3 className="font-bold text-gray-900 mb-4 text-lg">Economy services</h3>
                    <div className="space-y-6">
                      {shippingRates.economy.map(service => (
                        <label key={service.id} className="flex items-start gap-3 cursor-pointer group">
                          <input 
                            type="radio" 
                            name="shippingService"
                            value={service.id}
                            checked={tempSelectedService === service.id}
                            onChange={() => setTempSelectedService(service.id)}
                            className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          />
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{service.name}</div>
                            <div className="text-gray-500 text-sm mt-0.5">{service.transit}</div>
                            <div className="text-gray-500 text-sm">Insurance {service.insurance}</div>
                            <div className="text-gray-500 text-sm">Tracking included: {service.tracking ? 'Yes' : 'No'}</div>
                            <div className="text-gray-500 text-sm">Max. {service.maxWeight}</div>
                            <div className="font-semibold text-gray-900 mt-1">
                              $\\{service.minPrice.toFixed(2)} - $\\{service.maxPrice.toFixed(2)}
                            </div>
                            <div className="text-green-700 text-sm font-medium mt-0.5">Save when you buy a label on eBay</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Standard Services */}
                {shippingRates.standard && shippingRates.standard.length > 0 && (
                  <div>
                    <h3 className="font-bold text-gray-900 mb-4 text-lg">Standard services</h3>
                    <div className="space-y-6">
                      {shippingRates.standard.map(service => (
                        <label key={service.id} className="flex items-start gap-3 cursor-pointer group">
                          <input 
                            type="radio" 
                            name="shippingService"
                            value={service.id}
                            checked={tempSelectedService === service.id}
                            onChange={() => setTempSelectedService(service.id)}
                            className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          />
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{service.name}</div>
                            <div className="text-gray-500 text-sm mt-0.5">{service.transit}</div>
                            <div className="text-gray-500 text-sm">Insurance {service.insurance}</div>
                            <div className="text-gray-500 text-sm">Tracking included: {service.tracking ? 'Yes' : 'No'}</div>
                            <div className="text-gray-500 text-sm">Max. {service.maxWeight}</div>
                            <div className="font-semibold text-gray-900 mt-1">
                              $\\{service.minPrice.toFixed(2)} - $\\{service.maxPrice.toFixed(2)}
                            </div>
                            <div className="text-green-700 text-sm font-medium mt-0.5">Save when you buy a label on eBay</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex justify-center items-center h-32 text-gray-500">No rates available.</div>
            )}
          </div>
          
          <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsShippingModalOpen(false)}>Cancel</Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white" 
              onClick={() => {
                if (tempSelectedService && shippingRates) {
                  // Find the service in any category to get its price
                  let selectedServiceObj = null;
                  ['recommended', 'economy', 'standard'].forEach(cat => {
                    if (shippingRates[cat]) {
                      const found = shippingRates[cat].find(s => s.id === tempSelectedService);
                      if (found) selectedServiceObj = found;
                    }
                  });
                  
                  const newShipping = { ...(formData.platformSettings.ebay.shipping || {}), shippingService: tempSelectedService };
                  if (selectedServiceObj) {
                     newShipping.shippingCost = selectedServiceObj.maxPrice.toFixed(2);
                  }
                  handlePlatformChange('ebay', 'shipping', newShipping);
                }
                setIsShippingModalOpen(false);
              }}
            >
              Apply Selection
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
