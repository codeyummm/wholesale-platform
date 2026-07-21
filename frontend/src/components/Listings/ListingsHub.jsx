import React, { useState, useEffect } from 'react';
import {
  Package, Search, Plus, Filter, Globe, Loader2, CheckCircle2, XCircle, X,
  RefreshCw, Download, UploadCloud, ArrowUpDown, MoreHorizontal, AlertTriangle,
  TrendingUp, Store, ShoppingBag, Layers, ChevronDown, Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import SyncModal from './SyncModal';
import { PlatformLogo } from './PlatformLogo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const PLATFORM_META = {
  shopify:  { label: 'Shopify',  color: '#96bf48', bg: '#f0f7e6', icon: '🛍️' },
  ebay:     { label: 'eBay',     color: '#e53238', bg: '#fef2f2', icon: '🔴' },
  etsy:     { label: 'Etsy',     color: '#f56400', bg: '#fff7ed', icon: '🧶' },
  amazon:   { label: 'Amazon',   color: '#ff9900', bg: '#fffbeb', icon: '📦' },
  tiktok:   { label: 'TikTok',   color: '#010101', bg: '#f9f9f9', icon: '🎵' },
  walmart:  { label: 'Walmart',  color: '#0071dc', bg: '#eff6ff', icon: '🏬' },
  facebook: { label: 'Facebook', color: '#1877f2', bg: '#eff6ff', icon: '👥' },
};

function PlatformBadge({ platform }) {
  const meta = PLATFORM_META[platform] || { label: platform, color: '#6b7280', bg: '#f9fafb' };
  return (
    <Badge
      variant="outline"
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: meta.bg, color: meta.color, borderColor: `${meta.color}30` }}
    >
      <PlatformLogo platform={platform} size={12} grey={false} />
      {meta.label}
    </Badge>
  );
}

function ImportModal({ onClose, onSuccess }) {
  const [platform, setPlatform] = useState('shopify');
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [message, setMessage] = useState('');

  const importActions = {
    shopify: () => api.post('/shopify/import-products'),
    ebay:    () => api.post('/ebay/import-listings'),
    etsy:    () => api.post('/etsy/import-listings'),
    amazon:  () => api.post('/amazon/import-listings'),
    walmart: () => api.post('/walmart/import-listings'),
    tiktok:  () => api.post('/tiktok/import-listings'),
  };

  const handleImport = async () => {
    setStatus('loading');
    setMessage('');
    try {
      const fn = importActions[platform];
      if (!fn) throw new Error(`Import from ${platform} is not yet supported.`);
      const res = await fn();
      if (res.data.success) {
        setStatus('success');
        setMessage(`Imported ${res.data.imported ?? res.data.count ?? 0} new listings from ${platform}.`);
        onSuccess?.();
      } else {
        throw new Error(res.data.message || 'Import failed');
      }
    } catch (err) {
      setStatus('error');
      setMessage(err.response?.data?.message || err.message || 'Import failed');
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Listings</DialogTitle>
          <p className="text-sm text-gray-500 mt-0.5">Pull existing listings from a connected platform</p>
        </DialogHeader>

        <div className="space-y-4">
          {status === 'idle' || status === 'loading' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Platform</label>
                <div className="grid grid-cols-3 gap-2">
                  {['shopify', 'ebay', 'etsy', 'amazon', 'walmart', 'tiktok'].map(p => (
                    <button
                      key={p}
                      onClick={() => setPlatform(p)}
                      className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                        platform === p
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <PlatformLogo platform={p} size={32} grey={platform !== p} />
                      <span className="text-xs font-medium text-gray-700">{PLATFORM_META[p]?.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <Button
                onClick={handleImport}
                disabled={status === 'loading'}
                className="w-full"
              >
                {status === 'loading' ? <Loader2 size={18} className="animate-spin mr-2" /> : <Download size={18} className="mr-2" />}
                {status === 'loading' ? `Importing from ${PLATFORM_META[platform]?.label}...` : `Import from ${PLATFORM_META[platform]?.label}`}
              </Button>
            </>
          ) : status === 'success' ? (
            <div className="text-center py-4">
              <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-3" />
              <h4 className="text-lg font-bold text-gray-900 mb-1">Import Complete!</h4>
              <p className="text-gray-500 text-sm">{message}</p>
              <Button onClick={onClose} className="mt-4 w-full">
                View Listings
              </Button>
            </div>
          ) : (
            <div className="text-center py-4">
              <XCircle className="w-14 h-14 text-red-500 mx-auto mb-3" />
              <h4 className="text-lg font-bold text-gray-900 mb-1">Import Failed</h4>
              <p className="text-gray-500 text-sm">{message}</p>
              <Button onClick={() => setStatus('idle')} variant="outline" className="mt-4 w-full">
                Try Again
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ListingsHub() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterChannel, setFilterChannel] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const itemsPerPage = 50;

  const filteredListings = listings.filter(listing => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!listing.title?.toLowerCase().includes(q) && !listing.sku?.toLowerCase().includes(q)) return false;
    }
    if (filterStatus !== 'all' && listing.status !== filterStatus) return false;
    if (filterChannel !== 'all' && (!listing.channels || !listing.channels.includes(filterChannel))) return false;
    return true;
  });

  useEffect(() => { setCurrentPage(1); }, [searchQuery, filterStatus, filterChannel]);

  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentListings = filteredListings.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredListings.length / itemsPerPage);

  useEffect(() => { fetchListings(); }, []);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/listings');
      if (res.data.success) setListings(res.data.listings);
    } catch (err) {
      console.error('Failed to fetch listings', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSync = (listing) => {
    setSelectedListing(listing);
    setSyncModalOpen(true);
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === currentListings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(currentListings.map(l => l._id)));
    }
  };

  // Stats
  const totalActive = listings.filter(l => l.status === 'active').length;
  const totalDraft = listings.filter(l => l.status === 'draft').length;
  const totalSynced = listings.filter(l => l.channels && l.channels.length > 0).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Layers size={22} />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Listings Hub</h1>
              </div>
              <p className="text-gray-500 text-sm">Create master listings and sync them to any marketplace in one click</p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => setShowImportModal(true)}
                variant="outline"
              >
                <Download size={16} className="mr-2" /> Import Listings
              </Button>
              <Link to="/sales-channels/listings/new">
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                  <Plus size={16} className="mr-2" /> Create Listing
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            {[
              { label: 'Total Listings', value: listings.length, icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { label: 'Active', value: totalActive, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
              { label: 'Drafts', value: totalDraft, icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50' },
              { label: 'Synced to Channels', value: totalSynced, icon: Globe, color: 'text-blue-600', bg: 'bg-blue-50' },
            ].map(stat => (
              <Card key={stat.label} className="shadow-sm border border-gray-200">
                <CardContent className="p-4 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`p-1.5 rounded-lg ${stat.bg}`}>
                      <stat.icon size={16} className={stat.color} />
                    </div>
                    <span className="text-gray-500 text-xs font-medium">{stat.label}</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Filters */}
        <Card className="mb-4">
          <div className="p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                <Input
                  type="text"
                  placeholder="Search by title or SKU..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant={showFilters ? "secondary" : "outline"}
                size="sm"
                className="gap-1.5"
              >
                <Filter size={15} /> Filters
                <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </Button>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-500">
              {selectedIds.size > 0 && (
                <span className="text-indigo-600 font-medium">{selectedIds.size} selected</span>
              )}
              <span>{filteredListings.length} listings</span>
              <Button onClick={fetchListings} variant="ghost" size="icon" title="Refresh">
                <RefreshCw size={15} className={loading ? 'animate-spin text-indigo-500' : 'text-gray-400'} />
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="px-4 pb-4 pt-1 border-t flex flex-wrap gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</label>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Channel</label>
                <select value={filterChannel} onChange={e => setFilterChannel(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                  <option value="all">All Channels</option>
                  <option value="shopify">Shopify</option>
                  <option value="ebay">eBay</option>
                  <option value="etsy">Etsy</option>
                  <option value="amazon">Amazon</option>
                  <option value="tiktok">TikTok</option>
                </select>
              </div>
            </div>
          )}
        </Card>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="w-10">
                  <input type="checkbox" onChange={toggleSelectAll} checked={selectedIds.size === currentListings.length && currentListings.length > 0} className="rounded text-indigo-600" />
                </TableHead>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Channels</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                      <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-2" />
                      <p className="text-gray-400 text-sm">Loading listings...</p>
                  </TableCell>
                </TableRow>
              ) : currentListings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-64 text-center">
                    <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium mb-1">No listings found</p>
                    <p className="text-gray-400 text-sm mb-4">Create a listing or import from a platform to get started.</p>
                    <div className="flex justify-center gap-3">
                      <Link to="/sales-channels/listings/new">
                        <Button className="bg-indigo-600 hover:bg-indigo-700">
                          <Plus size={15} className="mr-2" /> Create Listing
                        </Button>
                      </Link>
                      <Button variant="outline" onClick={() => setShowImportModal(true)}>
                        <Download size={15} className="mr-2" /> Import
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                currentListings.map(listing => (
                  <TableRow key={listing._id} className={selectedIds.has(listing._id) ? 'bg-indigo-50/50' : ''}>
                    <TableCell>
                      <input type="checkbox" checked={selectedIds.has(listing._id)} onChange={() => toggleSelect(listing._id)} className="rounded text-indigo-600" />
                    </TableCell>
                    <TableCell>
                        <div className="flex items-center gap-3">
                          {listing.images && listing.images.length > 0 ? (
                            <img src={listing.images[0]?.url} alt={listing.title} className="w-10 h-10 object-cover rounded-lg border border-gray-200 flex-shrink-0" />
                          ) : (
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Package size={16} className="text-gray-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900 text-sm leading-tight line-clamp-1">{listing.title}</p>
                            <p className="text-xs text-gray-400 mt-0.5 capitalize">{listing.condition}</p>
                          </div>
                        </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500 font-mono">{listing.sku}</TableCell>
                    <TableCell>
                      <Badge variant={listing.quantity > 0 ? "default" : "destructive"} className={listing.quantity > 0 ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-red-100 text-red-700 hover:bg-red-100'}>
                        {listing.quantity ?? 0} in stock
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold">${(listing.price || 0).toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {listing.channels && listing.channels.length > 0 ? (
                          listing.channels.map(c => <PlatformBadge key={c} platform={c} />)
                        ) : (
                          <span className="text-gray-400 text-xs italic">Not published</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`capitalize ${
                        listing.status === 'active' ? 'bg-blue-100 text-blue-700' :
                        listing.status === 'draft'  ? 'bg-yellow-100 text-yellow-700' :
                                                      'bg-gray-100 text-gray-600'
                      }`}>
                        {listing.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" asChild className="h-8 px-2 text-indigo-600 hover:text-indigo-800">
                          <Link to={`/sales-channels/listings/${listing._id}`}>
                            Edit
                          </Link>
                        </Button>
                        <span className="text-gray-300">|</span>
                        <Button
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleOpenSync(listing)}
                          className="h-8 px-2 text-gray-600"
                        >
                          <Zap size={14} className="mr-1" /> Sync
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-4 py-3">
              <p className="text-sm text-gray-600">
                Showing <span className="font-medium">{filteredListings.length === 0 ? 0 : indexOfFirst + 1}</span>–<span className="font-medium">{Math.min(indexOfLast, filteredListings.length)}</span> of <span className="font-medium">{filteredListings.length}</span>
              </p>
              <div className="flex gap-2">
                <Button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} variant="outline" size="sm">Prev</Button>
                <span className="px-3 py-1.5 text-sm text-gray-600">Page {currentPage} / {totalPages}</span>
                <Button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} variant="outline" size="sm">Next</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onSuccess={() => { setShowImportModal(false); fetchListings(); }}
        />
      )}

      <SyncModal
        isOpen={syncModalOpen}
        onClose={() => setSyncModalOpen(false)}
        listing={selectedListing}
        onSyncStarted={fetchListings}
      />
    </div>
  );
}
