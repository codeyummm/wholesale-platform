import React, { useState, useEffect } from 'react';
import { Package, Search, Plus, Filter, Globe, ArrowRight, Loader2, CheckCircle2, XCircle, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import SyncModal from './SyncModal';

export default function ListingsHub() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importState, setImportState] = useState({ show: false, status: 'idle', message: '' });
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterStock, setFilterStock] = useState('all');
  const [filterChannel, setFilterChannel] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const itemsPerPage = 50;

  // Filter listings before pagination
  const filteredListings = listings.filter(listing => {
    // 1. Search Query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const titleMatch = listing.title?.toLowerCase().includes(query);
      const skuMatch = listing.sku?.toLowerCase().includes(query);
      if (!titleMatch && !skuMatch) return false;
    }
    // 2. Status Filter
    if (filterStatus !== 'all') {
      if (listing.status !== filterStatus) return false;
    }
    // 3. Stock Filter
    if (filterStock !== 'all') {
      if (filterStock === 'in_stock' && (!listing.quantity || listing.quantity <= 0)) return false;
      if (filterStock === 'out_of_stock' && (listing.quantity && listing.quantity > 0)) return false;
    }
    // 4. Channel Filter
    if (filterChannel !== 'all') {
      if (!listing.channels || !listing.channels.includes(filterChannel)) return false;
    }
    return true;
  });

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, filterStock, filterChannel]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentListings = filteredListings.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredListings.length / itemsPerPage);

  // Fetch from /api/listings
  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/listings');
      if (res.data.success) {
        setListings(res.data.listings);
      }
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

  const handleImportShopify = async () => {
    try {
      setImportState({ show: true, status: 'loading', message: '' });
      const res = await api.post('/shopify/import-products');
      if (res.data.success) {
        setImportState({ show: true, status: 'success', message: `Successfully synced ${res.data.totalFound} products and added ${res.data.imported} new listings!` });
        fetchListings();
      } else {
        setImportState({ show: true, status: 'error', message: 'Failed to import products.' });
      }
    } catch (err) {
      console.error('Import failed', err);
      setImportState({ show: true, status: 'error', message: 'Error connecting to Shopify.' });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto relative">
      {importState.show && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center gap-4 max-w-sm w-full mx-4 text-center relative">
            {importState.status !== 'loading' && (
              <button 
                onClick={() => setImportState({ ...importState, show: false })}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            )}
            
            {importState.status === 'loading' && (
              <>
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                <h3 className="text-xl font-bold text-gray-900">Syncing Products</h3>
                <p className="text-gray-500 text-sm">
                  We're importing your entire Shopify catalog. This might take a few moments for large stores...
                </p>
              </>
            )}
            {importState.status === 'success' && (
              <>
                <CheckCircle2 className="w-12 h-12 text-green-500" />
                <h3 className="text-xl font-bold text-gray-900">Sync Complete!</h3>
                <p className="text-gray-500 text-sm">{importState.message}</p>
                <button 
                  onClick={() => setImportState({ ...importState, show: false })}
                  className="mt-2 w-full bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                >
                  View Listings
                </button>
              </>
            )}
            {importState.status === 'error' && (
              <>
                <XCircle className="w-12 h-12 text-red-500" />
                <h3 className="text-xl font-bold text-gray-900">Sync Failed</h3>
                <p className="text-gray-500 text-sm">{importState.message}</p>
                <button 
                  onClick={() => setImportState({ ...importState, show: false })}
                  className="mt-2 w-full bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="text-indigo-600" /> Canonical Listings
          </h1>
          <p className="text-gray-500 mt-1">Manage master products and sync them to connected sales channels.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleImportShopify}
            disabled={loading || importState.status === 'loading'}
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50">
            {importState.status === 'loading' ? <Loader2 size={18} className="animate-spin" /> : <Globe size={18} />} 
            Import from Shopify
          </button>
          <Link to="/sales-channels/listings/new" className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2">
            <Plus size={18} /> Create Listing
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-col gap-4 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="relative w-64">
              <input
                type="text"
                placeholder="Search listings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            </div>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded border transition-colors ${showFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-300 text-gray-600 hover:text-gray-900'}`}
            >
              <Filter size={16} /> Filters
            </button>
          </div>
          
          {showFilters && (
            <div className="flex gap-4 pt-4 border-t border-gray-200">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</label>
                <select 
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Level</label>
                <select 
                  value={filterStock}
                  onChange={(e) => setFilterStock(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                >
                  <option value="all">All Stock Levels</option>
                  <option value="in_stock">In Stock</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Channel</label>
                <select 
                  value={filterChannel}
                  onChange={(e) => setFilterChannel(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                >
                  <option value="all">All Channels</option>
                  <option value="shopify">Shopify</option>
                  <option value="ebay">eBay</option>
                  <option value="amazon">Amazon</option>
                  <option value="facebook">Facebook</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
                <th className="p-4 font-medium">Product Title</th>
                <th className="p-4 font-medium">SKU</th>
                <th className="p-4 font-medium">Inventory</th>
                <th className="p-4 font-medium">Base Price</th>
                <th className="p-4 font-medium">Channels</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {listings.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-gray-500">
                    No listings found. Create a canonical listing to get started.
                  </td>
                </tr>
              ) : (
                currentListings.map(listing => (
                  <tr key={listing._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-medium text-gray-900">{listing.title}</td>
                    <td className="p-4 text-gray-600">{listing.sku}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        listing.quantity > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {listing.quantity} in stock
                      </span>
                    </td>
                    <td className="p-4 text-gray-900">${listing.price.toFixed(2)}</td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        {listing.channels && listing.channels.length > 0 ? (
                          listing.channels.map(c => (
                            <span key={c} className="px-2 py-0.5 bg-gray-100 border border-gray-200 text-gray-600 rounded text-xs capitalize">
                              {c}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 text-sm">None</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${
                        listing.status === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {listing.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Link to={`/sales-channels/listings/${listing._id}`} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1">
                          Edit
                        </Link>
                        <button 
                          onClick={() => handleOpenSync(listing)}
                          className="text-gray-600 hover:text-gray-900 text-sm font-medium flex items-center gap-1"
                        >
                          Sync <Globe size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3 sm:px-6 rounded-b-xl">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{filteredListings.length === 0 ? 0 : indexOfFirstItem + 1}</span> to <span className="font-medium">{Math.min(indexOfLastItem, filteredListings.length)}</span> of{' '}
                  <span className="font-medium">{filteredListings.length}</span> results
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                  >
                    <span className="sr-only">Previous</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                  >
                    <span className="sr-only">Next</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <SyncModal 
        isOpen={syncModalOpen} 
        onClose={() => setSyncModalOpen(false)} 
        listing={selectedListing}
        onSyncStarted={() => {
          fetchListings();
          alert('Sync job started!');
        }}
      />
    </div>
  );
}
