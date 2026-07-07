import React, { useState, useEffect } from 'react';
import { Search, Mail, MessageSquare } from 'lucide-react';
import InternalChat from './InternalChat';
import EbayMessages from './EbayMessages';
import SharedInbox from './SharedInbox';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

export default function Messages() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('internal');
  const [searchQuery, setSearchQuery] = useState('');
  const [ebayUnread, setEbayUnread] = useState(0);

  const [emailUnread, setEmailUnread] = useState(0);

  useEffect(() => {
    const fetchUnreadCounts = async () => {
      try {
        const ebayRes = await api.get('/ebay/messages/unread');
        if (ebayRes.data && ebayRes.data.success) {
          setEbayUnread(ebayRes.data.count || 0);
        }

        const emailRes = await api.get('/messages/unread-emails');
        if (emailRes.data && emailRes.data.success) {
          setEmailUnread(emailRes.data.count || 0);
        }
      } catch (err) {
        console.error('Failed to fetch unread counts:', err);
      }
    };
    
    fetchUnreadCounts();
    const interval = setInterval(fetchUnreadCounts, 60000);
    
    const handleEbayRead = () => {
      setEbayUnread(prev => Math.max(0, prev - 1));
    };
    
    const handleEmailRead = () => {
      // Need a way to reduce email unread when an email is read, we can just fetch it again
      fetchUnreadCounts();
    };

    window.addEventListener('ebayMessageRead', handleEbayRead);
    window.addEventListener('emailMessageRead', handleEmailRead);

    return () => {
      clearInterval(interval);
      window.removeEventListener('ebayMessageRead', handleEbayRead);
      window.removeEventListener('emailMessageRead', handleEmailRead);
    };
  }, []);

  const tabs = [
    { id: 'internal', label: 'Internal Messaging' },
    { id: 'emails', label: 'Emails', badge: emailUnread > 0 ? emailUnread : null },
    { id: 'ebay', label: 'eBay', badge: ebayUnread > 0 ? ebayUnread : null },
    { id: 'amazon', label: 'Amazon' },
    { id: 'walmart', label: 'Walmart' },
    { id: 'groupon', label: 'Groupon' },
    { id: 'tiktok', label: 'TikTok Shop' },
    { id: 'whatnot', label: 'Whatnot' },
    { id: 'poshmark', label: 'Poshmark' },
    { id: 'mercari', label: 'Mercari' }
  ];

  const visibleTabs = tabs.filter(t => 
    t.id === 'internal' || 
    user?.role === 'admin' || 
    user?.permissions?.[`msg_${t.id}`] === true
  );

  return (
    <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px' }}>Messages</h1>
        <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Manage customer communications across all channels</p>
      </div>

      {/* Channel Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none' }}>
        {visibleTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: activeTab === tab.id ? '1px solid #1e293b' : '1px solid #e2e8f0',
              background: activeTab === tab.id ? '#1e293b' : 'white',
              color: activeTab === tab.id ? 'white' : '#64748b',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
              boxShadow: activeTab === tab.id ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {tab.label}
            {tab.badge && (
              <span style={{
                background: '#ef4444',
                color: 'white',
                fontSize: '11px',
                fontWeight: 'bold',
                padding: '2px 6px',
                borderRadius: '10px',
                marginLeft: '4px'
              }}>
                {tab.badge > 99 ? '99+' : tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'internal' ? (
        <InternalChat />
      ) : activeTab === 'emails' ? (
        <SharedInbox />
      ) : activeTab === 'ebay' ? (
        <EbayMessages />
      ) : (
        <>
          {/* Search Bar */}
          <div style={{ marginBottom: '24px', position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={18} />
            <input 
              type="text" 
              placeholder={`Search ${tabs.find(t => t.id === activeTab)?.label} messages...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '12px 12px 12px 40px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }}
            />
          </div>

          {/* Placeholder Content */}
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '64px 24px', textAlign: 'center' }}>
            <div style={{ background: '#f1f5f9', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              {activeTab === 'emails' ? (
                <Mail size={32} color="#94a3b8" />
              ) : (
                <MessageSquare size={32} color="#94a3b8" />
              )}
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '600', color: '#0f172a' }}>No messages found</h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
              Your {tabs.find(t => t.id === activeTab)?.label} inbox is currently empty.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
