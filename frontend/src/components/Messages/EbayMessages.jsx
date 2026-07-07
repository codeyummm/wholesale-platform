import React, { useState, useEffect, useRef } from 'react';
import { Send, Search, MessageSquare, Inbox, Send as SendIcon, Trash2, Archive, User, AlertCircle, Loader, Store, Package, Languages, ShoppingCart, Sparkles, Copy, Check, Users, ShieldAlert, Wand2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

export default function EbayMessages() {
  const { user: currentUser } = useAuth();
  const [allUsers, setAllUsers] = useState([]);
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [conversations, setConversations] = useState([]);
  const [activeFolder, setActiveFolder] = useState('inbox');
  const [activeChat, setActiveChat] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [translations, setTranslations] = useState({});
  const [translatingId, setTranslatingId] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  
  const [isNovaOpen, setIsNovaOpen] = useState(false);
  const [novaMessages, setNovaMessages] = useState([]);
  const [novaInput, setNovaInput] = useState('');
  const [copiedNovaMsg, setCopiedNovaMsg] = useState(null);
  const [novaLoading, setNovaLoading] = useState(false);

  const messagesEndRef = useRef(null);

  const stripHtml = (html) => {
    if (!html) return '';
    return html.replace(/<[^>]*>?/gm, '').trim();
  };

  const needsTranslation = (html) => {
    if (!html) return false;
    const text = html.replace(/<[^>]*>?/gm, '').toLowerCase();
    
    // 1. Check for non-Latin characters (Chinese, Japanese, Arabic, Russian, etc.)
    if (/[^\u0000-\u024F\u1E00-\u1EFF\s\d.,!?()'"\-:;%$&#*@]/i.test(text)) {
      return true;
    }
    
    // 2. Check for Spanish/French/German/etc specific characters
    if (/[áéíóúñü¿¡àâçéèêëîïôûùüÿäöüß]/i.test(text)) {
      return true;
    }
    
    // 3. Simple word analysis
    const words = text.replace(/[^a-z]/g, ' ').split(/\s+/).filter(w => w.length > 1);
    const foreignWords = ['hola', 'gracias', 'como', 'estas', 'por', 'favor', 'que', 'el', 'la', 'los', 'las', 'un', 'una', 'con', 'para', 'pero', 'si', 'bonjour', 'merci', 'oui', 'non', 'ciao', 'grazie', 'danke', 'bitte', 'cuanto', 'minimo', 'precio'];
    const engWords = ['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us', 'is', 'are', 'am', 'was', 'were', 'hi', 'hello', 'thanks', 'thank', 'please', 'yes', 'ok', 'okay'];
    
    let foreignCount = 0;
    let engCount = 0;
    
    words.forEach(w => {
      if (foreignWords.includes(w)) foreignCount++;
      if (engWords.includes(w)) engCount++;
    });
    
    if (foreignCount > 0 && foreignCount >= engCount) {
      return true;
    }
    
    return false;
  };

  const fetchMessages = async (pageNum = 1, append = false) => {
    try {
      setError(null);
      if (append) setLoadingMore(true);
      else setLoading(true);
      
      const res = await api.get(`/ebay/messages?page=${pageNum}`);
      if (res.data.success) {
        setConversations(prev => {
          if (!prev || prev.length === 0) return res.data.data;
          if (!append && pageNum === 1 && prev.length > res.data.data.length * 2) {
            // If it's an interval refresh, we want to merge into existing
            const newConvos = [...prev];
            res.data.data.forEach(incoming => {
              const existingIdx = newConvos.findIndex(c => c.id === incoming.id || (c.sender === incoming.sender && c.itemId === incoming.itemId));
              if (existingIdx >= 0) {
                const existing = newConvos[existingIdx];
                const mergedReplies = [...(existing.replies || [])];
                (incoming.replies || []).forEach(r => {
                  if (!mergedReplies.find(mr => mr.date === r.date && mr.body === r.body)) {
                    mergedReplies.push(r);
                  }
                });
                mergedReplies.sort((a, b) => new Date(a.date) - new Date(b.date));
                newConvos[existingIdx] = { ...existing, ...incoming, replies: mergedReplies };
              } else {
                newConvos.push(incoming);
              }
            });
            return newConvos.sort((a, b) => {
              const aLatest = a.replies?.length ? new Date(a.replies[a.replies.length - 1].date) : new Date(a.date);
              const bLatest = b.replies?.length ? new Date(b.replies[b.replies.length - 1].date) : new Date(b.date);
              return bLatest - aLatest;
            });
          }
          if (append) {
            const newConvos = [...prev];
            res.data.data.forEach(incoming => {
              const existingIdx = newConvos.findIndex(c => c.id === incoming.id || (c.sender === incoming.sender && c.itemId === incoming.itemId));
              if (existingIdx >= 0) {
                // Merge replies
                const existing = newConvos[existingIdx];
                const mergedReplies = [...(existing.replies || [])];
                (incoming.replies || []).forEach(r => {
                  if (!mergedReplies.find(mr => mr.date === r.date && mr.body === r.body)) {
                    mergedReplies.push(r);
                  }
                });
                mergedReplies.sort((a, b) => new Date(a.date) - new Date(b.date));
                newConvos[existingIdx] = { ...existing, ...incoming, replies: mergedReplies };
              } else {
                newConvos.push(incoming);
              }
            });
            // Sort all by date descending (newest first)
            return newConvos.sort((a, b) => {
              const aLatest = a.replies?.length ? new Date(a.replies[a.replies.length - 1].date) : new Date(a.date);
              const bLatest = b.replies?.length ? new Date(b.replies[b.replies.length - 1].date) : new Date(b.date);
              return bLatest - aLatest;
            });
          }
          return res.data.data;
        });
        setHasMore(res.data.hasMore !== false);
        
        // Auto-fetch next page if current page yields 0 messages after backend filtering, up to 20 pages max
        if (res.data.data.length === 0 && res.data.hasMore !== false && pageNum < 20) {
          return fetchMessages(pageNum + 1, append);
        }
      } else {
        setError(res.data.message || 'Failed to load messages');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load messages');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleTranslate = async (text, id, replyIndex = -1) => {
    try {
      setTranslatingId(`${id}_${replyIndex}`);
      const res = await api.post('/ebay/translate', { text });
      if (res.data.success) {
        setTranslations(prev => ({
          ...prev,
          [`${id}_${replyIndex}`]: res.data.translation
        }));
      }
    } catch (err) {
      console.error('Failed to translate:', err);
    } finally {
      setTranslatingId(null);
    }
  };

  // Nova Chat Memory per Conversation (Server-Side)
  useEffect(() => {
    let isMounted = true;
    if (activeChat?.id) {
      api.get(`/agent/memory/${activeChat.id}`)
        .then(res => {
          if (isMounted) setNovaMessages(res.data || []);
        })
        .catch(err => {
          console.error('Failed to load Nova memory:', err);
          if (isMounted) setNovaMessages([]);
        });
    } else {
      setNovaMessages([]);
    }
    return () => { isMounted = false; };
  }, [activeChat?.id]);

  useEffect(() => {
    if (activeChat?.id) {
      const timer = setTimeout(() => {
        api.post(`/agent/memory/${activeChat.id}`, { messages: novaMessages })
          .catch(err => console.error('Failed to save Nova memory:', err));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [novaMessages, activeChat?.id]);

  useEffect(() => {
    let isMounted = true;
    api.get('/users').then(res => {
      if (res.data.success && isMounted) {
        setAllUsers(res.data.data || []);
      }
    }).catch(console.error);
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    fetchMessages(1, false);
    const interval = setInterval(() => fetchMessages(1, false), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeChat) {
      let latestBuyerMessage = activeChat.sender !== 'Me' ? activeChat.body : '';
      if (activeChat.replies && activeChat.replies.length > 0) {
        const reversed = [...activeChat.replies].reverse();
        const latest = reversed.find(r => r.sender !== 'Me');
        if (latest) {
          latestBuyerMessage = latest.body;
        }
      }
      
      if (latestBuyerMessage) {
        const order = activeChat.relatedOrders && activeChat.relatedOrders.length > 0 ? activeChat.relatedOrders[0] : null;
        api.post('/ebay/messages/suggest', { text: stripHtml(latestBuyerMessage), order })
          .then(res => {
            if (res.data.success) {
              setSuggestions(res.data.suggestions);
            }
          })
          .catch(err => console.error(err));
      } else {
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
    }
  }, [activeChat]);

  
  const handleScroll = (e) => {
    const { scrollTop, clientHeight, scrollHeight } = e.target;
    if (scrollHeight - scrollTop <= clientHeight + 50 && !loadingMore && hasMore) {
      setLoadingMore(true);
      setPage(prev => {
        const next = prev + 1;
        fetchMessages(next, true);
        return next;
      });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (activeChat) scrollToBottom();
  }, [activeChat, conversations]);
  const [isRewriting, setIsRewriting] = useState(false);

  const handleRewriteMessage = async () => {
    if (!newMessage.trim() || isRewriting) return;
    setIsRewriting(true);
    try {
      const res = await api.post('/agent/rewrite', { message: newMessage });
      if (res.data.success && res.data.text) {
        setNewMessage(res.data.text);
      }
    } catch (err) {
      console.error('Error rewriting message:', err);
    } finally {
      setIsRewriting(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat || sending) return;

    setSending(true);
    try {
      if (isInternalNote) {
        const res = await api.post('/conversations/meta/note', {
          platform: 'ebay',
          conversationKey: activeChat.conversationKey || `${activeChat.sender}_${activeChat.itemId || 'no-item'}`,
          text: newMessage
        });
        if (res.data.success) {
          const newNote = { sender: currentUser?.id || currentUser?._id, senderName: currentUser?.name || 'Me', text: newMessage, createdAt: new Date().toISOString(), isInternal: true };
          const updatedConversations = conversations.map(c => {
            if (c.id === activeChat.id) {
              return { ...c, internalNotes: [...(c.internalNotes || []), newNote] };
            }
            return c;
          });
          setConversations(updatedConversations);
          setActiveChat(updatedConversations.find(c => c.id === activeChat.id));
          setNewMessage('');
          scrollToBottom();
        }
      } else {
        const res = await api.post(`/ebay/messages/${activeChat.id}/reply`, { 
          body: newMessage,
          itemId: activeChat.itemId,
          recipient: activeChat.sender
        });
        
        if (res.data.success) {
          const newReply = { sender: 'Me', body: newMessage, date: new Date().toISOString() };
          const updatedConversations = conversations.map(c => {
            if (c.id === activeChat.id) {
              return { ...c, replies: [...(c.replies || []), newReply] };
            }
            return c;
          });
          setConversations(updatedConversations);
          setActiveChat(updatedConversations.find(c => c.id === activeChat.id));
          setNewMessage('');
          scrollToBottom();
        }
      }
    } catch (err) {
      console.error('Reply error:', err);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // eBay sender usually contains eBay in name if from eBay
  const isFromEbay = (sender) => sender.toLowerCase().includes('ebay');

  const filteredConversations = conversations.filter(c => {
    // Search query filter
    const matchesSearch = c.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.itemTitle.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    // Folder filter
    switch (activeFolder) {
      case 'inbox':
        return c.folderId === '0';
      case 'assigned_to_me':
        return c.assignedTo?.some(a => (a._id || a).toString() === (currentUser?.id || currentUser?._id)?.toString());
      case 'from_members':
        return c.folderId === '0' && !isFromEbay(c.sender);
      case 'unread_from_members':
        return c.folderId === '0' && !isFromEbay(c.sender) && !c.isRead;
      case 'from_ebay':
        return c.folderId === '0' && isFromEbay(c.sender);
      case 'unread_from_ebay':
        return c.folderId === '0' && isFromEbay(c.sender) && !c.isRead;
      case 'sent':
        return c.folderId === '1' || (c.replies && c.replies.some(r => r.sender === 'Me'));
      case 'deleted':
        return c.folderId === '2';
      case 'archive':
        return c.folderId === '3' || c.folderId === 'archive';
      default:
        return true;
    }
  });

  const getUnreadCount = (folder) => {
    switch(folder) {
      case 'unread_from_ebay':
        return conversations.filter(c => c.folderId === '0' && isFromEbay(c.sender) && !c.isRead).length;
      case 'unread_from_members':
        return conversations.filter(c => c.folderId === '0' && !isFromEbay(c.sender) && !c.isRead).length;
      case 'assigned_to_me':
        return conversations.filter(c => c.assignedTo?.some(a => (a._id || a).toString() === (currentUser?.id || currentUser?._id)?.toString()) && !c.isRead).length;
      default: return 0;
    }
  };

  const folders = [
    { id: 'inbox', label: 'Inbox', icon: Inbox },
    { id: 'assigned_to_me', label: 'Assigned to me', icon: Users, showBadge: true },
    { id: 'from_members', label: 'From members', icon: User },
    { id: 'unread_from_members', label: 'Unread from members', icon: AlertCircle, showBadge: true },
    { id: 'from_ebay', label: 'From eBay', icon: Store },
    { id: 'unread_from_ebay', label: 'Unread from eBay', icon: AlertCircle, showBadge: true },
    { id: 'sent', label: 'Sent', icon: SendIcon },
    { id: 'deleted', label: 'Deleted', icon: Trash2 },
    { id: 'archive', label: 'Archive', icon: Archive },
  ];

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><Loader className="lucide-spin" /></div>;
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>
        <Store size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
        <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Could not load eBay Messages</h3>
        <p style={{ marginTop: '8px' }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0, background: 'white', borderRadius: '24px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
      
      {/* Folder Sidebar */}
      <div style={{ width: '220px', borderRight: '1px solid #e2e8f0', background: '#f8fafc', flexShrink: 0, padding: '20px 12px' }}>
        <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px', paddingLeft: '12px' }}>Folders</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {folders.map(f => {
            const Icon = f.icon;
            const unreadCount = f.showBadge ? getUnreadCount(f.id) : 0;
            return (
              <button
                key={f.id}
                onClick={() => { setActiveFolder(f.id); setActiveChat(null); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  background: activeFolder === f.id ? '#e0f2fe' : 'transparent',
                  color: activeFolder === f.id ? '#0284c7' : '#475569',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: activeFolder === f.id ? '600' : '500',
                  textAlign: 'left',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Icon size={16} />
                  {f.label}
                </div>
                {unreadCount > 0 && (
                  <span style={{ background: '#ef4444', color: 'white', fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '10px' }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Conversation List */}
      <div style={{ width: '320px', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', background: 'white', flexShrink: 0 }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} size={16} />
            <input 
              type="text" 
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '10px 16px 10px 40px', border: '1px solid #e2e8f0', borderRadius: '24px', background: '#f8fafc', fontSize: '13px', color: '#0f172a', outline: 'none' }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>
        </div>

        <div onScroll={handleScroll} style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          {filteredConversations.length > 0 ? filteredConversations.map(conv => (
            <div 
              key={conv.id} 
              onClick={() => {
                setActiveChat(conv);
                if (conv.isRead === false) {
                  // Mark as read locally immediately for UI responsiveness
                  setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, isRead: true } : c));
                  // Decrement counts locally
                  if (isFromEbay(conv.sender)) {
                    setEbayUnread(prev => Math.max(0, prev - 1));
                  } else {
                    setMemberUnread(prev => Math.max(0, prev - 1));
                  }
                  // Dispatch global event to update Sidebar/Layout badges
                  window.dispatchEvent(new Event('ebayMessageRead'));

                  // Mark as read on eBay API so it doesn't come back as unread
                  fetch(`/api/ebay/messages/${conv.originalMessageId || conv.id}/read`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                  }).catch(err => console.error('Failed to mark read on eBay', err));
                }
              }}
              style={{ 
                display: 'flex', 
                gap: '12px', 
                padding: '12px', 
                borderRadius: '16px', 
                cursor: 'pointer', 
                background: activeChat?.id === conv.id ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' : 'transparent',
                border: activeChat?.id === conv.id ? '1px solid #93c5fd' : '1px solid transparent',
                boxShadow: activeChat?.id === conv.id ? '0 4px 20px rgba(59, 130, 246, 0.2)' : 'none',
                transform: activeChat?.id === conv.id ? 'translateY(-2px)' : 'translateY(0)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                marginBottom: '4px',
                position: 'relative',
                zIndex: activeChat?.id === conv.id ? 10 : 1
              }}
              onMouseEnter={(e) => { if(activeChat?.id !== conv.id) e.currentTarget.style.background = '#f8fafc' }}
              onMouseLeave={(e) => { if(activeChat?.id !== conv.id) e.currentTarget.style.background = 'transparent' }}
            >
              {!conv.isRead && (
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563eb', flexShrink: 0, alignSelf: 'center', marginRight: '4px' }} />
              )}
              {conv.mediaUrl ? (
                <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                  <img src={conv.mediaUrl} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} alt="Item" />
                </div>
              ) : (
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#e2e8f0', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '18px', flexShrink: 0 }}>
                  {isFromEbay(conv.sender) ? <Store size={24} /> : conv.sender.charAt(0).toUpperCase()}
                </div>
              )}
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: !conv.isRead ? '700' : '600', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {conv.sender}
                  </h4>
                  <span style={{ fontSize: '12px', color: !conv.isRead ? '#2563eb' : '#64748b' }}>
                    {(() => {
                      const d = new Date(conv.date);
                      const diffDays = Math.floor((new Date() - d) / (1000 * 60 * 60 * 24));
                      if (diffDays === 0) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                      if (diffDays < 7) return `${diffDays}d`;
                      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
                    })()}
                  </span>
                </div>
                <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: '500' }}>
                  {conv.itemTitle}
                </p>
                <p style={{ margin: 0, fontSize: '13px', color: !conv.isRead ? '#475569' : '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: !conv.isRead ? '500' : '400' }}>
                  {conv.replies?.length > 0 && conv.replies[conv.replies.length - 1].sender === 'Me' ? 'You: ' : ''}
                  {stripHtml(conv.replies?.length > 0 ? conv.replies[conv.replies.length - 1].body : conv.body)}
                </p>
              </div>
            </div>
          )) : !loading ? (
            <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', marginTop: '40px' }}>No messages found.</p>
          ) : null}
          {loadingMore && (
            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', padding: '16px' }}>
              Loading older messages...
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      {activeChat ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'white', position: 'relative' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', zIndex: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#e2e8f0', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '16px' }}>
                {activeChat.sender.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#0f172a' }}>{activeChat.sender}</h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>{activeChat.sender} sent a message about {activeChat.itemTitle}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {(currentUser?.role === 'admin' || currentUser?.role === 'staff') && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                  <span style={{ color: '#64748b', fontWeight: '500' }}>Assigned to:</span>
                  {currentUser?.role === 'admin' ? (
                    <select 
                      value={activeChat.assignedTo?.[0]?._id || activeChat.assignedTo?.[0] || ''} 
                      onChange={async (e) => {
                        const val = e.target.value;
                        if (val) {
                          const res = await api.post('/conversations/meta/assign', { platform: 'ebay', conversationKey: activeChat.conversationKey || `${activeChat.sender}_${activeChat.itemId || 'no-item'}`, assignedTo: [val] });
                          if (res.data.success) {
                            setConversations(prev => prev.map(c => c.id === activeChat.id ? { ...c, assignedTo: res.data.data.assignedTo } : c));
                            setActiveChat(prev => ({ ...prev, assignedTo: res.data.data.assignedTo }));
                          }
                        } else if (activeChat.assignedTo?.length > 0) {
                          const res = await api.post('/conversations/meta/revoke', { platform: 'ebay', conversationKey: activeChat.conversationKey || `${activeChat.sender}_${activeChat.itemId || 'no-item'}`, userId: activeChat.assignedTo[0]._id || activeChat.assignedTo[0] });
                          if (res.data.success) {
                            setConversations(prev => prev.map(c => c.id === activeChat.id ? { ...c, assignedTo: [] } : c));
                            setActiveChat(prev => ({ ...prev, assignedTo: [] }));
                          }
                        }
                      }}
                      style={{ padding: '4px 8px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', background: '#f8fafc', color: '#0f172a' }}
                    >
                      <option value="">Unassigned</option>
                      {allUsers.map(u => (
                        <option key={u._id} value={u._id}>{u.name}</option>
                      ))}
                    </select>
                  ) : (
                    <span style={{ fontWeight: '600', color: '#0f172a' }}>
                      {activeChat.assignedTo?.length > 0 ? (
                        allUsers.find(u => u._id === (activeChat.assignedTo[0]._id || activeChat.assignedTo[0]))?.name || 'Assigned'
                      ) : 'Unassigned'}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div style={{ padding: '12px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={16} color="#64748b" />
            <span style={{ fontSize: '13px', color: '#475569', fontWeight: '500' }}>Item:</span>
            <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: '600' }}>{activeChat.itemTitle}</span>
          </div>

          {activeChat.relatedOrders && activeChat.relatedOrders.length > 0 && (
            <div style={{ padding: '12px 24px', background: '#eff6ff', borderBottom: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShoppingCart size={16} color="#3b82f6" />
                <span style={{ fontSize: '13px', color: '#1d4ed8', fontWeight: '600' }}>Order Linked:</span>
                <Link to={`/sales/${activeChat.relatedOrders[0]._id}`} style={{ fontSize: '13px', color: '#2563eb', textDecoration: 'underline', fontWeight: '500' }}>
                  {activeChat.relatedOrders[0].saleNumber}
                </Link>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: '#3b82f6', background: '#dbeafe', padding: '2px 8px', borderRadius: '12px', fontWeight: '500' }}>
                  {activeChat.relatedOrders[0].status.toUpperCase()}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '13px', color: '#475569', fontWeight: '500' }}>Total:</span>
                <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: '600' }}>${activeChat.relatedOrders[0].totalAmount?.toFixed(2)}</span>
              </div>
              {activeChat.relatedOrders[0].shipping?.trackingNumber && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '13px', color: '#475569', fontWeight: '500' }}>Tracking:</span>
                  <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: '600' }}>{activeChat.relatedOrders[0].shipping.trackingNumber}</span>
                </div>
              )}
            </div>
          )}

          <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Initial Message */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', alignSelf: 'flex-start', maxWidth: '85%' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f97316', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '600', flexShrink: 0 }}>
                {activeChat.sender.charAt(0).toUpperCase()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <div style={{ background: 'white', border: '1px solid #e2e8f0', color: '#0f172a', padding: '14px 18px', borderRadius: '18px 18px 18px 4px', fontSize: '15px', lineHeight: '1.5', maxWidth: '100%', overflowX: 'auto' }}>
                  <div dangerouslySetInnerHTML={{ __html: activeChat.body }} style={{ maxWidth: '100%', wordBreak: 'break-word' }} className="ebay-html-content" />
                  
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        {new Date(activeChat.date).toLocaleString([], { hour: 'numeric', minute: '2-digit' })}
                      </div>
                      {activeChat.respondedBy && (
                        <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <User size={10} /> Sent by {activeChat.respondedBy}
                        </div>
                      )}
                    </div>
                    {needsTranslation(activeChat.body) && (
                      <div 
                        onClick={() => handleTranslate(activeChat.body, activeChat.id)}
                        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#3b82f6', fontWeight: '500' }}
                      >
                        {translatingId === `${activeChat.id}_-1` ? <Loader size={12} className="lucide-spin" /> : <Languages size={12} />}
                        Translate
                      </div>
                    )}
                  </div>

                  {translations[`${activeChat.id}_-1`] && (
                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e2e8f0', fontSize: '14px', color: '#334155' }}>
                      <strong>Translation:</strong><br/>
                      {translations[`${activeChat.id}_-1`]}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Replies and Internal Notes */}
            {(() => {
              const combined = [
                ...(activeChat.replies || []).map(r => ({ ...r, type: 'reply', timestamp: new Date(r.date) })),
                ...(activeChat.internalNotes || []).map(n => ({ ...n, type: 'note', timestamp: new Date(n.createdAt) }))
              ].sort((a, b) => a.timestamp - b.timestamp);

              return combined.map((item, index) => {
                if (item.type === 'reply') {
                  const reply = item;
                  const isMe = reply.sender === 'Me';
                  return (
                    <div key={`reply-${index}`} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '85%', marginTop: '4px' }}>
                      {!isMe && (
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f97316', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '600', flexShrink: 0 }}>
                          {reply.sender.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                        <div style={{ background: isMe ? '#f1f5f9' : 'white', border: isMe ? 'none' : '1px solid #e2e8f0', color: '#0f172a', padding: '14px 18px', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px', fontSize: '15px', lineHeight: '1.5', maxWidth: '100%', overflowX: 'auto' }}>
                          <div dangerouslySetInnerHTML={{ __html: reply.body }} style={{ maxWidth: '100%', wordBreak: 'break-word' }} className="ebay-html-content" />
                          
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMe ? 'flex-end' : 'space-between', marginTop: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>
                                {new Date(reply.date).toLocaleString([], { hour: 'numeric', minute: '2-digit' })}
                              </div>
                              {isMe && reply.respondedBy && (
                                <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <User size={10} /> Sent by {reply.respondedBy}
                                </div>
                              )}
                            </div>
                            {!isMe && needsTranslation(reply.body) && (
                              <div 
                                onClick={() => handleTranslate(reply.body, activeChat.id, index)}
                                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#3b82f6', fontWeight: '500' }}
                              >
                                {translatingId === `${activeChat.id}_${index}` ? <Loader size={12} className="lucide-spin" /> : <Languages size={12} />}
                                Translate
                              </div>
                            )}
                          </div>

                          {!isMe && translations[`${activeChat.id}_${index}`] && (
                            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e2e8f0', fontSize: '14px', color: '#334155' }}>
                              <strong>Translation:</strong><br/>
                              {translations[`${activeChat.id}_${index}`]}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  const note = item;
                  return (
                    <div key={`note-${index}`} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', alignSelf: 'flex-end', maxWidth: '85%', marginTop: '4px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <div style={{ background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', padding: '14px 18px', borderRadius: '18px 18px 4px 18px', fontSize: '15px', lineHeight: '1.5', maxWidth: '100%', overflowX: 'auto' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontSize: '12px', fontWeight: '600', color: '#b45309' }}>
                            <ShieldAlert size={14} /> Internal Note
                          </div>
                          <div dangerouslySetInnerHTML={{ __html: note.text }} style={{ maxWidth: '100%', wordBreak: 'break-word' }} className="ebay-html-content" />
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ fontSize: '11px', color: '#b45309' }}>
                                {new Date(note.createdAt).toLocaleString([], { hour: 'numeric', minute: '2-digit' })}
                              </div>
                              <div style={{ fontSize: '11px', color: '#b45309', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <User size={10} /> {note.senderName || 'Staff'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
              });
            })()}
            <div ref={messagesEndRef} />
          </div>

          {/* Floating Nova UI */}
          <div style={{ position: 'absolute', right: '24px', bottom: '100px', zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
            {isNovaOpen && (
              <div style={{ width: '320px', height: '400px', background: 'white', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                 <div style={{ padding: '12px 16px', background: 'linear-gradient(to right, #6366f1, #a855f7)', color: 'white', fontWeight: '600', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Sparkles size={16} /> Nova AI
                    </div>
                    <button onClick={() => setIsNovaOpen(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', outline: 'none' }}>✕</button>
                 </div>
                 <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {novaMessages.map((msg, i) => (
                      <div key={i} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', background: msg.role === 'user' ? '#f1f5f9' : '#4f46e5', color: msg.role === 'user' ? '#0f172a' : 'white', padding: '8px 12px', borderRadius: '12px', fontSize: '13px', maxWidth: '85%', whiteSpace: 'pre-wrap', position: 'relative' }} className="group">
                         {msg.content}
                         {msg.role === 'assistant' && (
                           <button 
                             onClick={(e) => {
                               e.preventDefault();
                               navigator.clipboard.writeText(msg.content);
                               setCopiedNovaMsg(i);
                               setTimeout(() => setCopiedNovaMsg(null), 2000);
                             }}
                             style={{ position: 'absolute', top: '4px', right: '4px', padding: '4px', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                             className="opacity-0 group-hover:opacity-100 transition-opacity"
                             title="Copy text"
                           >
                             {copiedNovaMsg === i ? <Check size={12} color="#4ade80" /> : <Copy size={12} color="white" />}
                           </button>
                         )}
                      </div>
                    ))}
                    {novaLoading && <div style={{ fontSize: '12px', color: '#64748b' }}>Nova is thinking...</div>}
                 </div>
                 <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!novaInput.trim() || novaLoading) return;
                    const q = novaInput;
                    setNovaInput('');
                    setNovaMessages(p => [...p, { role: 'user', content: q }]);
                    setNovaLoading(true);
                    try {
                      const orderNum = activeChat?.relatedOrders?.[0]?.saleNumber;
                      const imeis = activeChat?.relatedOrders?.[0]?.items?.map(i => i.imei).filter(Boolean) || [];
                      const res = await api.post('/agent/chat', { 
                        message: q,
                        context: { orderNumber: orderNum, imeis },
                        history: novaMessages
                      });
                      setNovaMessages(p => [...p, { role: 'assistant', content: res.data.text }]);
                    } catch(err) {
                      console.error(err);
                    } finally {
                      setNovaLoading(false);
                    }
                 }} style={{ padding: '8px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '8px' }}>
                    <input type="text" value={novaInput} onChange={e => setNovaInput(e.target.value)} placeholder="Ask Nova..." style={{ flex: 1, padding: '8px 12px', borderRadius: '16px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '13px' }} />
                 </form>
              </div>
            )}
            <button onClick={() => setIsNovaOpen(!isNovaOpen)} style={{ width: '50px', height: '50px', borderRadius: '25px', background: 'linear-gradient(to top right, #6366f1, #a855f7)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.4)', position: 'relative' }}>
               <span style={{ position: 'absolute', fontWeight: '900', fontStyle: 'italic', opacity: 0.3, background: 'linear-gradient(to bottom, #fff, rgba(255,255,255,0.1))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: '3rem', left: '50%', top: '50%', transform: 'translate(-50%, -50%) rotate(-5deg)', userSelect: 'none', pointerEvents: 'none', overflow: 'hidden', width: '100%', height: '100%', borderRadius: '50%' }}>
                 <span style={{position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)'}}>N</span>
               </span>
               <Sparkles size={24} style={{ zIndex: 10, position: 'relative' }} />
               {novaMessages.length > 0 && !isNovaOpen && (
                 <span style={{ position: 'absolute', bottom: '2px', right: '2px', width: '12px', height: '12px', background: '#ef4444', borderRadius: '50%', border: '2px solid white', zIndex: 20 }}></span>
               )}
            </button>
          </div>

            <div style={{ padding: '16px 20px', background: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {suggestions.length > 0 && !newMessage && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {suggestions.map((sug, idx) => (
                    <div 
                      key={idx}
                      onClick={() => setNewMessage(sug)}
                      style={{ background: '#f1f5f9', color: '#334155', padding: '8px 14px', borderRadius: '16px', fontSize: '13px', cursor: 'pointer', border: '1px solid #e2e8f0', transition: 'all 0.2s', fontWeight: '500' }}
                      onMouseOver={(e) => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                    >
                      {sug}
                    </div>
                  ))}
                </div>
              )}
              {isInternalNote && showMentionMenu && (
                <div style={{ position: 'absolute', bottom: '100%', left: '100px', marginBottom: '8px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', overflow: 'hidden', zIndex: 100, width: '250px', maxHeight: '200px', overflowY: 'auto' }}>
                  {allUsers.filter(u => u.name.toLowerCase().includes(mentionFilter)).length === 0 ? (
                    <div style={{ padding: '8px 12px', fontSize: '13px', color: '#64748b' }}>No users found</div>
                  ) : (
                    allUsers.filter(u => u.name.toLowerCase().includes(mentionFilter)).map(u => (
                      <div 
                        key={u._id}
                        onClick={() => {
                          const newVal = newMessage.replace(/@[a-zA-Z0-9_ ]*$/, `@${u.name} `);
                          setNewMessage(newVal);
                          setShowMentionMenu(false);
                        }}
                        style={{ padding: '8px 12px', fontSize: '13px', color: '#0f172a', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                      >
                        <div style={{ fontWeight: '500' }}>{u.name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{u.email}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
              <form onSubmit={handleSendMessage} style={{ position: 'relative', display: 'flex', gap: '12px', alignItems: 'center', background: isInternalNote ? '#fffbeb' : 'white', borderRadius: '32px', padding: '8px 16px', border: isInternalNote ? '1px solid #fde68a' : '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.05)', transition: 'all 0.2s' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: isInternalNote ? '#b45309' : '#64748b', cursor: 'pointer', fontWeight: '500' }}>
                  <input 
                    type="checkbox" 
                    checked={isInternalNote} 
                    onChange={(e) => setIsInternalNote(e.target.checked)} 
                    style={{ cursor: 'pointer' }}
                  />
                  <ShieldAlert size={14} /> Note
                </label>
                <div style={{ width: '1px', height: '24px', background: isInternalNote ? '#fde68a' : '#e2e8f0' }}></div>
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewMessage(val);
                    if (isInternalNote) {
                      const match = val.match(/@([a-zA-Z0-9_ ]*)$/);
                      if (match) {
                        setShowMentionMenu(true);
                        setMentionFilter(match[1].toLowerCase());
                      } else {
                        setShowMentionMenu(false);
                      }
                    } else {
                      setShowMentionMenu(false);
                    }
                  }}
                  disabled={sending}
                  placeholder={isInternalNote ? "Write an internal note (staff only)... Type @ to mention" : "Send message to buyer..."} 
                  style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '15px', color: '#0f172a', outline: 'none', padding: '8px 0' }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    type="button" 
                    onClick={handleRewriteMessage}
                    disabled={!newMessage.trim() || isRewriting || sending}
                    title="Rewrite with Nova AI"
                    style={{ 
                      background: 'transparent', 
                      color: !newMessage.trim() ? '#cbd5e1' : '#a855f7', 
                      border: 'none', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      cursor: !newMessage.trim() || isRewriting || sending ? 'not-allowed' : 'pointer',
                      transition: 'color 0.2s',
                      opacity: isRewriting ? 0.5 : 1
                    }}
                  >
                    {isRewriting ? <Loader size={20} className="lucide-spin" /> : <Wand2 size={20} />}
                  </button>
                  <button 
                    type="submit" 
                    disabled={!newMessage.trim() || sending}
                    style={{ 
                      background: 'transparent', 
                      color: !newMessage.trim() ? '#cbd5e1' : '#3b82f6', 
                      border: 'none', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      cursor: !newMessage.trim() || sending ? 'not-allowed' : 'pointer',
                      transition: 'color 0.2s',
                      opacity: sending ? 0.7 : 1
                    }}
                  >
                    {sending ? <Loader size={24} className="lucide-spin" /> : <Send size={24} />}
                  </button>
                </div>
              </form>
            </div>
            <style>{`
              @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
          </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
            <MessageSquare size={36} color="#94a3b8" />
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a', margin: '0 0 8px 0' }}>eBay Messages</h3>
          <p style={{ fontSize: '15px', color: '#64748b', margin: 0, maxWidth: '300px', textAlign: 'center', lineHeight: '1.5' }}>
            Select a folder or a conversation to view your eBay messages.
          </p>
        </div>
      )}
    </div>
  );
}
