import React, { useState } from 'react';
import { X, Globe, AlertCircle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';

export default function SyncModal({ isOpen, onClose, listing, onSyncStarted }) {
  const [platform, setPlatform] = useState('ebay');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Specific override for eBay sandbox testing
  const [useSandboxTest, setUseSandboxTest] = useState(true);

  if (!isOpen || !listing) return null;

  const handleSync = async () => {
    try {
      setLoading(true);
      setError(null);

      // The backend will read the platformSettings directly from the database Listing model.
      // We just pass the platform, and any runtime-only flags like useSandboxTest.
      const payload = {
        platform,
        syncOptions: {
          useSandboxTest
        }
      };

      const res = await api.post(`/listings/${listing._id}/sync`, payload);
      if (res.data.success) {
        onSyncStarted();
        onClose();
      }
    } catch (err) {
      console.error('Failed to start sync', err);
      setError(err.response?.data?.message || 'Failed to sync listing to platform.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Globe className="text-indigo-600" size={20} />
            Sync Listing
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-gray-50 p-3 rounded-lg text-sm border border-gray-200">
            <p className="font-medium text-gray-900">{listing.title}</p>
            <p className="text-gray-500">SKU: {listing.sku}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ebay">eBay</option>
              <option value="shopify">Shopify</option>
              <option value="etsy">Etsy</option>
            </select>
          </div>

          <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm">
            <p>
              Syncing will use the {platform} settings you defined on the Master Listing. 
              <Link to={`/sales-channels/listings/${listing._id}`} onClick={onClose} className="ml-2 font-medium underline inline-flex items-center gap-1">
                Edit Settings <ExternalLink size={14} />
              </Link>
            </p>
          </div>

          {platform === 'ebay' && (
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="useSandbox"
                checked={useSandboxTest}
                onChange={(e) => setUseSandboxTest(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="useSandbox" className="text-sm text-gray-700 cursor-pointer">
                Test mode (VerifyAddItem only, no actual listing created)
              </label>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSync}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 flex items-center gap-2 capitalize"
          >
            {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Sync to {platform}
          </button>
        </div>
      </div>
    </div>
  );
}
