import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Globe, ShoppingBag, Store, Search, HelpCircle, ShieldAlert, ArrowRight, X, CheckCircle2, MessageSquare } from 'lucide-react';
import api from '../../utils/api';
import EbayMessagesPanel from './EbayMessagesPanel';

const INITIAL_CHANNELS = [
  {
    id: 'shopify',
    name: 'Shopify',
    logo: '/logos/shopify.png',
    colorCode: '#95bf47',
    description: 'Sync orders automatically via Shopify Admin API.',
    authType: 'Admin API Access Token',
    status: 'disconnected',
    guideUrl: 'https://help.shopify.com/en/manual/apps/custom-apps'
  },
  {
    id: 'ebay',
    name: 'eBay',
    logo: '/logos/ebay.png',
    colorCode: '#e53238',
    description: 'Fetch fulfillment orders securely via eBay REST API.',
    authType: 'OAuth 2.0 Authorization',
    status: 'disconnected',
    guideUrl: 'https://developer.ebay.com/api-docs/static/creating-edp-account.html'
  },
  {
    id: 'amazon',
    name: 'Amazon',
    logo: '/logos/amazon.svg',
    colorCode: '#FF9900',
    description: 'Integrate using Amazon Selling Partner API (SP-API).',
    authType: 'Login with Amazon (OAuth)',
    status: 'disconnected',
    guideUrl: 'https://developer-docs.amazon.com/sp-api/docs/registering-your-application'
  },
  {
    id: 'walmart',
    name: 'Walmart',
    logo: '/logos/walmart.png',
    colorCode: '#0071ce',
    description: 'Connect via Walmart Marketplace Developer Portal.',
    authType: 'Client ID & Secret Key',
    status: 'disconnected',
    guideUrl: 'https://developer.walmart.com/doc/us/mp/us-mp-auth/'
  },
  {
    id: 'etsy',
    name: 'Etsy',
    logo: '/logos/etsy.png',
    colorCode: '#F1641E',
    description: 'Import shop receipts and active orders via OpenAPI v3.',
    authType: 'OAuth 2.0 PKCE',
    status: 'disconnected',
    guideUrl: 'https://developers.etsy.com/documentation/tutorials/quickstart/'
  }
];

export default function SalesChannels() {
  const [channels, setChannels] = useState(INITIAL_CHANNELS);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeSubTab, setActiveSubTab] = useState('overview');

  const handleSync = async (channel) => {
    if (channel.id !== 'ebay') return;
    setIsSyncing(channel.id);
    setErrorMsg('');
    setSuccessMsg('');
    
    try {
      const res = await api.get('/ebay/sync-orders');
      if (res.data.success) {
        setSuccessMsg(res.data.message);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to sync orders.');
    } finally {
      setIsSyncing(null);
    }
  };

  useEffect(() => {
    // Check url params for oauth return
    const authStatus = searchParams.get('ebayAuth');
    if (authStatus === 'success') {
      setSuccessMsg('Successfully connected to eBay!');
      searchParams.delete('ebayAuth');
      navigate({ search: searchParams.toString() }, { replace: true });
    } else if (authStatus === 'failed') {
      setErrorMsg('Failed to connect to eBay. Please try again.');
      searchParams.delete('ebayAuth');
      navigate({ search: searchParams.toString() }, { replace: true });
    }

    // Check backend for integration status
    api.get('/ebay/status').then(res => {
      if (res.data && res.data.success && res.data.connected) {
        setChannels(prev => prev.map(c => 
          c.id === 'ebay' ? { ...c, status: 'connected' } : c
        ));
      }
    }).catch(err => console.error(err));
  }, [searchParams, navigate]);

  const openConnectModal = (channel) => {
    setSelectedChannel(channel);
    setErrorMsg('');
  };

  const closeConnectModal = () => {
    setSelectedChannel(null);
    setIsConnecting(false);
  };

  const handleConnect = (e) => {
    e.preventDefault();
    setIsConnecting(true);
    setErrorMsg('');
    setSuccessMsg('');
    
    if (selectedChannel.id === 'ebay') {
      window.location.href = 'http://localhost:5000/api/ebay/auth';
      return;
    }

    // Simulate network delay for other channels
    setTimeout(() => {
      setIsConnecting(false);
      if (selectedChannel.authType.includes('OAuth')) {
        setErrorMsg(`Missing ${selectedChannel.name} Client ID. Please add your Developer Credentials to the backend .env file to enable OAuth redirect.`);
      } else {
        setErrorMsg('Invalid Token. Could not authenticate with the provided credentials.');
      }
    }, 1500);
  };

  return (
    <div className="p-8 bg-[#f6f6f9] min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Globe className="text-blue-600" size={28} /> Sales Channels Integration
          </h1>
          <p className="text-gray-500 text-[13px] font-medium mt-1">
            Connect your marketplace seller accounts to sync and process orders directly from this platform.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors">
            <Search size={16} /> Connection Logs
          </button>
        </div>
      </div>

      {/* Info Alert */}
      {successMsg && (
        <div className="mb-6 bg-green-50 border border-green-200 p-4 rounded-xl flex gap-3 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 size={20} className="text-green-600 shrink-0" />
          <p className="text-sm font-bold text-green-900">{successMsg}</p>
        </div>
      )}

      {/* Tabs if connected */}
      {channels.find(c => c.id === 'ebay' && c.status === 'connected') && (
        <div className="flex border-b border-gray-200 mb-8 gap-6 text-sm font-bold">
          <button 
            onClick={() => setActiveSubTab('overview')}
            className={`pb-4 transition-all relative ${activeSubTab === 'overview' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Connected Channels
          </button>
          <button 
            onClick={() => setActiveSubTab('inbox')}
            className={`pb-4 transition-all relative flex items-center gap-1.5 ${activeSubTab === 'inbox' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            eBay Messages Inbox
            <span className="bg-red-500 text-white font-extrabold text-[9px] h-4 px-1.5 flex items-center justify-center rounded-full">NEW</span>
          </button>
        </div>
      )}

      {activeSubTab === 'overview' ? (
        <>
          <div className="mb-8 bg-amber-50 border border-amber-200 p-5 rounded-2xl flex gap-4">
            <ShieldAlert size={24} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-amber-900">Important Security Notice: API Authentication</h3>
              <p className="text-[13px] font-medium text-amber-800 mt-1 leading-relaxed">
                Marketplaces (Amazon, eBay, Walmart, etc.) <strong className="font-bold">do not</strong> allow third-party applications to log in using your raw username and password due to 2FA and CAPTCHA security measures. Instead, you must authorize this application via secure <strong>OAuth 2.0</strong> or by generating specific <strong>API Developer Keys</strong> in your seller dashboard.
              </p>
            </div>
          </div>

          {/* Channels Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {channels.map(channel => (
              <div key={channel.id} className={`bg-white rounded-2xl border ${channel.status === 'connected' ? 'border-green-300 shadow-green-100' : 'border-gray-200'} shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col`}>
                <div className="p-6 flex-1">
                  <div className="flex items-start justify-between mb-6">
                    <div className="h-10 flex items-center justify-start">
                      <img src={channel.logo} alt={channel.name} className="h-7 w-auto object-contain" />
                    </div>
                    {channel.status === 'connected' ? (
                      <span className="px-2.5 py-1 bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-wider rounded-md flex items-center gap-1">
                        <CheckCircle2 size={12} /> Connected
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-500 text-[10px] font-black uppercase tracking-wider rounded-md">
                        Not Connected
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-black text-gray-900 mb-1">{channel.name}</h3>
                  <p className="text-[13px] font-medium text-gray-500 mb-4 h-10">{channel.description}</p>
                  
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Required Auth Method</p>
                    <p className="text-[12px] font-bold text-gray-700 flex items-center gap-1.5">
                       <ShieldAlert size={12} className="text-gray-400"/> {channel.authType}
                    </p>
                  </div>
                </div>
                <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex gap-2">
                  <button 
                    onClick={() => channel.status === 'connected' ? handleSync(channel) : openConnectModal(channel)}
                    style={{ backgroundColor: channel.status === 'connected' ? '#eff6ff' : channel.colorCode, color: channel.status === 'connected' ? '#1d4ed8' : 'white' }}
                    className={`flex-1 py-2.5 text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${channel.status === 'connected' ? 'hover:bg-blue-100 border border-blue-200' : 'hover:opacity-90 shadow-sm'}`}
                  >
                    {isSyncing === channel.id ? (
                      <span className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                    ) : null}
                    {channel.status === 'connected' ? (isSyncing === channel.id ? 'Syncing...' : 'Sync Orders') : `Connect ${channel.name}`} {channel.status !== 'connected' && <ArrowRight size={16} />}
                  </button>
                  {channel.status === 'connected' && channel.id === 'ebay' && (
                    <button 
                      onClick={() => setActiveSubTab('inbox')}
                      className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <MessageSquare size={16} /> Inbox
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <EbayMessagesPanel />
      )}

      {/* Connect Modal Stub */}
      {selectedChannel && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-opacity-10`} style={{ backgroundColor: `${selectedChannel.colorCode}20` }}>
                   <ShoppingBag style={{ color: selectedChannel.colorCode }} size={24} />
                </div>
                <h2 className="text-xl font-black text-gray-900">Connect {selectedChannel.name}</h2>
              </div>
              <button onClick={closeConnectModal} className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-100 hover:bg-gray-200 p-2 rounded-full">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
                <h4 className="text-[13px] font-bold text-blue-900 mb-2 flex items-center gap-2">
                  <HelpCircle size={16} className="text-blue-600"/> How to connect {selectedChannel.name}
                </h4>
                <p className="text-[12px] font-medium text-blue-800/80 leading-relaxed">
                  To securely sync orders from {selectedChannel.name}, you must establish an authorized connection using <strong className="font-bold">{selectedChannel.authType}</strong>. 
                  Direct username and password logins are blocked by {selectedChannel.name} for third-party tools to protect your account.
                </p>
              </div>

              {selectedChannel.authType.includes('OAuth') ? (
                <div className="text-center py-6">
                  <p className="text-sm font-medium text-gray-600 mb-6">You will be securely redirected to {selectedChannel.name} to approve access.</p>
                  <button 
                    onClick={handleConnect}
                    disabled={isConnecting}
                    style={{ backgroundColor: selectedChannel.colorCode }} 
                    className={`px-8 py-3 text-white text-sm font-bold rounded-xl shadow-md transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 mx-auto`}
                  >
                    {isConnecting ? <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : null}
                    {isConnecting ? 'Connecting...' : `Authorize via ${selectedChannel.name}`}
                  </button>
                  {errorMsg && <p className="mt-4 text-[13px] font-bold text-red-500 bg-red-50 p-2 rounded-lg">{errorMsg}</p>}
                </div>
              ) : (
                <form onSubmit={handleConnect} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider">API Access Token / Client ID</label>
                    <input required type="text" placeholder={`Paste your ${selectedChannel.name} token here...`} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                  </div>
                  {selectedChannel.id === 'walmart' && (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Client Secret Key</label>
                      <input required type="password" placeholder="Paste secret key here..." className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                    </div>
                  )}
                  {errorMsg && <p className="text-[13px] font-bold text-red-500 bg-red-50 p-2 rounded-lg">{errorMsg}</p>}
                  <button 
                    type="submit" 
                    disabled={isConnecting}
                    style={{ backgroundColor: selectedChannel.colorCode }} 
                    className={`w-full py-3 mt-4 text-white text-sm font-bold rounded-xl shadow-md transition-all hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50`}
                  >
                    {isConnecting ? <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : null}
                    {isConnecting ? 'Verifying...' : 'Verify & Save Connection'}
                  </button>
                </form>
              )}
            </div>
            
            <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
              <a href={selectedChannel.guideUrl} target="_blank" rel="noopener noreferrer" className="text-[12px] font-bold text-blue-600 hover:text-blue-700 hover:underline">
                Read our guide on how to get {selectedChannel.name} credentials &rarr;
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
