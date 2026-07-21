import React, { useState, useEffect } from 'react';
import {
  X, Loader2, CheckCircle2, XCircle, AlertTriangle, Zap, Globe,
  ArrowRight, Download, UploadCloud, RefreshCw, Clock, ExternalLink
} from 'lucide-react';
import api from '../../utils/api';
import { PlatformLogo } from './PlatformLogo';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const ALL_PLATFORMS = [
  { key: 'ebay',     label: 'eBay',     supported: true,  color: '#e53238' },
  { key: 'etsy',     label: 'Etsy',     supported: true,  color: '#f56400' },
  { key: 'shopify',  label: 'Shopify',  supported: true,  color: '#96bf48' },
  { key: 'amazon',   label: 'Amazon',   supported: false, color: '#ff9900' },
  { key: 'tiktok',   label: 'TikTok',   supported: false, color: '#010101' },
  { key: 'walmart',  label: 'Walmart',  supported: false, color: '#0071dc' },
  { key: 'facebook', label: 'Facebook', supported: false, color: '#1877f2' },
  { key: 'poshmark', label: 'Poshmark', supported: false, color: '#bf0072' },
  { key: 'mercari',  label: 'Mercari',  supported: false, color: '#09b0d3' },
];

function StatusBadge({ status }) {
  const map = {
    active:   { label: 'Live',        color: 'bg-green-100 text-green-700',  icon: <CheckCircle2 size={12} /> },
    pending:  { label: 'Pending',     color: 'bg-yellow-100 text-yellow-700', icon: <Clock size={12} /> },
    error:    { label: 'Error',       color: 'bg-red-100 text-red-700',      icon: <XCircle size={12} /> },
    inactive: { label: 'Inactive',    color: 'bg-gray-100 text-gray-500',    icon: <AlertTriangle size={12} /> },
    syncing:  { label: 'Syncing...',  color: 'bg-blue-100 text-blue-700',    icon: <Loader2 size={12} className="animate-spin" /> },
  };
  const s = map[status] || { label: 'Not Listed', color: 'bg-gray-100 text-gray-400', icon: null };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>
      {s.icon} {s.label}
    </span>
  );
}

export default function SyncModal({ isOpen, onClose, listing, onSyncStarted }) {
  const [channelStatuses, setChannelStatuses] = useState({});
  const [loadingStatuses, setLoadingStatuses] = useState(false);
  const [syncingPlatforms, setSyncingPlatforms] = useState({});
  const [syncErrors, setSyncErrors] = useState({});
  const [syncSuccess, setSyncSuccess] = useState({});
  const [activeDirection, setActiveDirection] = useState('push'); // 'push' | 'pull'
  const [selectedSource, setSelectedSource] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState(null);

  // Fetch existing channel statuses for this listing
  useEffect(() => {
    if (isOpen && listing?._id) {
      fetchStatuses();
    }
  }, [isOpen, listing]);

  const fetchStatuses = async () => {
    setLoadingStatuses(true);
    try {
      const res = await api.get(`/listings/${listing._id}`);
      if (res.data.success && res.data.listing.channelData) {
        const map = {};
        res.data.listing.channelData.forEach(ch => { map[ch.platform] = ch; });
        setChannelStatuses(map);
      }
    } catch (err) {
      console.error('Failed to fetch channel statuses', err);
    } finally {
      setLoadingStatuses(false);
    }
  };

  const handlePush = async (platform) => {
    setSyncingPlatforms(prev => ({ ...prev, [platform]: true }));
    setSyncErrors(prev => ({ ...prev, [platform]: null }));
    setSyncSuccess(prev => ({ ...prev, [platform]: false }));
    try {
      const res = await api.post(`/listings/${listing._id}/sync`, {
        platform,
        syncOptions: { useSandboxTest: false }
      });
      if (res.data.success) {
        setSyncSuccess(prev => ({ ...prev, [platform]: true }));
        onSyncStarted?.();
        setTimeout(() => fetchStatuses(), 2000);
      } else {
        throw new Error(res.data.message);
      }
    } catch (err) {
      setSyncErrors(prev => ({ ...prev, [platform]: err.response?.data?.message || err.message }));
    } finally {
      setSyncingPlatforms(prev => ({ ...prev, [platform]: false }));
    }
  };

  const handlePlatformSync = async (source, target) => {
    if (!source || !target || source === target) return;
    setSyncingPlatforms(prev => ({ ...prev, [`${source}_${target}`]: true }));
    setSyncErrors(prev => ({ ...prev, [`${source}_${target}`]: null }));
    try {
      // Cross-platform sync: first export from source, then push to target
      // For now, we just push the master listing to the target — the platform titles/descriptions will be used
      const res = await api.post(`/listings/${listing._id}/sync`, {
        platform: target,
        syncOptions: { sourceplatform: source }
      });
      if (res.data.success) {
        setSyncSuccess(prev => ({ ...prev, [`${source}_${target}`]: true }));
        onSyncStarted?.();
        setTimeout(() => fetchStatuses(), 2000);
      } else {
        throw new Error(res.data.message);
      }
    } catch (err) {
      setSyncErrors(prev => ({ ...prev, [`${source}_${target}`]: err.response?.data?.message || err.message }));
    } finally {
      setSyncingPlatforms(prev => ({ ...prev, [`${source}_${target}`]: false }));
    }
  };

  if (!isOpen || !listing) return null;

  const supportedPlatforms = ALL_PLATFORMS.filter(p => p.supported);
  const comingSoonPlatforms = ALL_PLATFORMS.filter(p => !p.supported);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 border-b border-gray-100 flex-shrink-0">
          <DialogTitle className="text-lg font-bold text-gray-900">Sync Listing</DialogTitle>
          <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{listing.title}</p>
        </DialogHeader>

        {/* Direction Selector */}
        <div className="px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => setActiveDirection('push')}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${activeDirection === 'push' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <UploadCloud size={15} /> Push to Platforms
            </button>
            <button
              onClick={() => setActiveDirection('cross')}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${activeDirection === 'cross' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <RefreshCw size={15} /> Cross-Platform Sync
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loadingStatuses ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-indigo-500" />
            </div>
          ) : activeDirection === 'push' ? (
            <>
              <p className="text-sm text-gray-500 mb-4">Push this master listing to any connected platform. Platform-specific titles and descriptions from the AI SEO tab will be used when available.</p>
              <div className="space-y-3">
                {supportedPlatforms.map(platform => {
                  const ch = channelStatuses[platform.key];
                  const isSync = syncingPlatforms[platform.key];
                  const isSuccess = syncSuccess[platform.key];
                  const error = syncErrors[platform.key];
                  
                  return (
                    <div key={platform.key} className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors">
                      <div className="p-2 bg-gray-50 rounded-xl flex-shrink-0">
                        <PlatformLogo platform={platform.key} size={28} grey={false} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{platform.label}</span>
                          <StatusBadge status={ch ? ch.status : null} />
                          {isSuccess && !isSync && <span className="text-xs text-green-600 font-medium">✅ Sync started!</span>}
                        </div>
                        {ch?.lastSyncedAt && (
                          <p className="text-xs text-gray-400 mt-0.5">Last synced: {new Date(ch.lastSyncedAt).toLocaleString()}</p>
                        )}
                        {ch?.lastError && !error && (
                          <p className="text-xs text-red-500 mt-0.5 truncate">{ch.lastError}</p>
                        )}
                        {error && (
                          <p className="text-xs text-red-500 mt-0.5">{error}</p>
                        )}
                        {listing.platformTitles?.[platform.key] && (
                          <p className="text-xs text-indigo-500 mt-0.5 truncate">Custom title: "{listing.platformTitles[platform.key]}"</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {ch?.remoteUrl && (
                          <a href={ch.remoteUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
                            <ExternalLink size={14} />
                          </a>
                        )}
                        <Button
                          onClick={() => handlePush(platform.key)}
                          disabled={isSync}
                          variant={ch?.status === 'active' ? 'outline' : 'default'}
                          className={ch?.status === 'active' ? '' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}
                        >
                          {isSync ? <Loader2 size={13} className="animate-spin mr-1.5" /> : <Zap size={13} className="mr-1.5" />}
                          {ch?.status === 'active' ? 'Re-sync' : 'Push'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Coming Soon */}
              {comingSoonPlatforms.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Coming Soon</p>
                  <div className="grid grid-cols-2 gap-2">
                    {comingSoonPlatforms.map(p => (
                      <div key={p.key} className="flex items-center gap-2 p-3 rounded-xl border border-dashed border-gray-200">
                        <div className="p-1 rounded-lg bg-gray-50">
                          <PlatformLogo platform={p.key} size={20} grey={true} />
                        </div>
                        <span className="text-sm text-gray-400">{p.label}</span>
                        <span className="ml-auto text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">Soon</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            // Cross-platform sync
            <>
              <p className="text-sm text-gray-500 mb-4">Sync this listing from one platform to another. Select source and destination platforms below.</p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Source Platform</label>
                  <div className="space-y-2">
                    {supportedPlatforms.map(p => (
                      <button
                        key={p.key}
                        onClick={() => setSelectedSource(p.key)}
                        className={`w-full flex items-center gap-2.5 p-3 rounded-xl border-2 text-sm text-left transition-all ${selectedSource === p.key ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}
                      >
                        <div className="p-1.5 rounded-lg bg-gray-50">
                          <PlatformLogo platform={p.key} size={20} grey={selectedSource !== p.key} />
                        </div>
                        <span className="font-medium text-gray-800">{p.label}</span>
                        {channelStatuses[p.key]?.status === 'active' && <CheckCircle2 size={14} className="ml-auto text-green-500" />}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Target Platform</label>
                  <div className="space-y-2">
                    {supportedPlatforms.map(p => (
                      <button
                        key={p.key}
                        onClick={() => setSelectedTarget(p.key)}
                        disabled={p.key === selectedSource}
                        className={`w-full flex items-center gap-2.5 p-3 rounded-xl border-2 text-sm text-left transition-all ${
                          selectedTarget === p.key ? 'border-green-500 bg-green-50' :
                          p.key === selectedSource ? 'border-gray-100 opacity-40 cursor-not-allowed' :
                          'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="p-1.5 rounded-lg bg-gray-50">
                          <PlatformLogo platform={p.key} size={20} grey={selectedTarget !== p.key} />
                        </div>
                        <span className="font-medium text-gray-800">{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {selectedSource && selectedTarget && selectedSource !== selectedTarget && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3 justify-center">
                    <div className="p-2 bg-white rounded-xl shadow-sm border border-indigo-100">
                      <PlatformLogo platform={selectedSource} size={28} grey={false} />
                    </div>
                    <div className="flex items-center gap-1 text-indigo-600">
                      <ArrowRight size={18} />
                    </div>
                    <div className="p-2 bg-white rounded-xl shadow-sm border border-indigo-100">
                      <PlatformLogo platform={selectedTarget} size={28} grey={false} />
                    </div>
                    <span className="text-sm font-medium text-indigo-700">
                      {ALL_PLATFORMS.find(p => p.key === selectedSource)?.label} → {ALL_PLATFORMS.find(p => p.key === selectedTarget)?.label}
                    </span>
                  </div>
                  <p className="text-xs text-indigo-600 mb-3 text-center">
                    This will push the master listing to {ALL_PLATFORMS.find(p => p.key === selectedTarget)?.label} using your {ALL_PLATFORMS.find(p => p.key === selectedTarget)?.label}-specific title and description if set.
                  </p>
                  {syncSuccess[`${selectedSource}_${selectedTarget}`] && (
                    <p className="text-sm text-green-600 font-medium text-center mb-2">✅ Sync started successfully!</p>
                  )}
                  {syncErrors[`${selectedSource}_${selectedTarget}`] && (
                    <p className="text-sm text-red-600 text-center mb-2">{syncErrors[`${selectedSource}_${selectedTarget}`]}</p>
                  )}
                  <Button
                    onClick={() => handlePlatformSync(selectedSource, selectedTarget)}
                    disabled={syncingPlatforms[`${selectedSource}_${selectedTarget}`]}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    {syncingPlatforms[`${selectedSource}_${selectedTarget}`]
                      ? <Loader2 size={16} className="animate-spin mr-2" />
                      : <Zap size={16} className="mr-2" />}
                    {syncingPlatforms[`${selectedSource}_${selectedTarget}`] ? 'Syncing...' : 'Start Cross-Platform Sync'}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 flex-shrink-0">
          <Button onClick={onClose} variant="ghost" className="w-full">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
