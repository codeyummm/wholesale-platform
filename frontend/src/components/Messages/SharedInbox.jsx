import React, { useState, useEffect, useRef } from 'react';
import { Mail, Search, MessageSquare, Send, User, Paperclip, MoreVertical, Plus, X, Wand2, Link, Smile, Triangle, Image as ImageIcon, Lock, PenTool, Trash2, ChevronDown, Maximize2, Type, Printer, SpellCheck, Sparkles, Check, Edit2 } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import EmojiPicker from 'emoji-picker-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

export default function SharedInbox() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [activeFolder, setActiveFolder] = useState('inbox');
  const [providerFilter, setProviderFilter] = useState('all');

  const [suggestedReplies, setSuggestedReplies] = useState([]);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [previewDraft, setPreviewDraft] = useState(null);
  const messagesEndRef = useRef(null);

  // Compose State
  const [showCompose, setShowCompose] = useState(false);
  const [showComposeOptions, setShowComposeOptions] = useState(false);
  const [emailAccounts, setEmailAccounts] = useState([]);
  const [composeData, setComposeData] = useState({ to: '', subject: '', content: '', accountId: '' });
  const [draftId, setDraftId] = useState(null);
  const [isSendingCompose, setIsSendingCompose] = useState(false);
  
  // Compose UI Tools State
  const [showToolbar, setShowToolbar] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isPlainText, setIsPlainText] = useState(false);
  const fileInputRef = useRef(null);
  const [isGeneratingComposeAI, setIsGeneratingComposeAI] = useState(false);
  
  const [rewritePreview, setRewritePreview] = useState(null);
  const [isRewriting, setIsRewriting] = useState(false);
  
  // Signature State
  const [showSignatureMenu, setShowSignatureMenu] = useState(false);
  const [showManageSignatures, setShowManageSignatures] = useState(false);
  const [signatures, setSignatures] = useState(user?.signatures || []);
  const [defaultSignatureId, setDefaultSignatureId] = useState(user?.defaultSignatureId || null);
  const [editingSignature, setEditingSignature] = useState(null);

  useEffect(() => {
    if (user?.signatures) setSignatures(user.signatures);
    if (user?.defaultSignatureId) setDefaultSignatureId(user.defaultSignatureId);
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages, selectedConv]);

  useEffect(() => {
    fetchConversations();
    fetchStaff();
    fetchEmailAccounts();
  }, [activeFolder, providerFilter]);

  const fetchEmailAccounts = async () => {
    try {
      const { data } = await api.get('/messages/email-accounts');
      if (data.success) {
        setEmailAccounts(data.data);
        if (data.data.length > 0) {
          setComposeData(prev => ({ ...prev, accountId: data.data[0]._id }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch email accounts', error);
    }
  };

  const fetchStaff = async () => {
    try {
      const { data } = await api.get('/users/directory');
      if (data.success) {
        setStaffList(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch staff list', error);
    }
  };

  const fetchConversations = async () => {
    try {
      const { data } = await api.get(`/messages/conversations?channel=email&folder=${activeFolder}&provider=${providerFilter}`);
      if (data.success) {
        setConversations(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch email conversations', error);
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const { data } = await api.get(`/messages/${conversationId}`);
      if (data.success) {
        setMessages(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch messages', error);
    }
  };

  const fetchSuggestedReplies = async (conversationId) => {
    setSuggestedReplies([]);
    try {
      const { data } = await api.post('/ai/suggest-reply', { conversationId });
      if (data.success) {
        setSuggestedReplies(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch suggested replies', error);
    }
  };

  const handleMagicFinish = async () => {
    if (!newMessage.trim() || !selectedConv) return;
    setIsGeneratingAI(true);
    setPreviewDraft(null);
    try {
      const { data } = await api.post('/ai/autocomplete', { 
        conversationId: selectedConv._id, 
        currentDraft: newMessage 
      });
      if (data.success) {
        setPreviewDraft(data.data);
      }
    } catch (error) {
      console.error('Failed to autocomplete draft', error);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const acceptPreview = () => {
    if (previewDraft) {
      setNewMessage(prev => prev + (prev.endsWith(' ') ? '' : ' ') + previewDraft);
      setPreviewDraft(null);
    }
  };

  const rejectPreview = () => {
    setPreviewDraft(null);
  };

  const retryPreview = () => {
    handleMagicFinish();
  };

  const saveDraftAsync = async (dataToSave, currentDraftId) => {
    try {
      if (!dataToSave.to && !dataToSave.subject && !dataToSave.content) return null;
      const { data } = await api.post('/messages/draft', {
        ...dataToSave,
        draftId: currentDraftId
      });
      if (data.success && data.draftId) {
        return data.draftId;
      }
    } catch (err) {
      console.error('Failed to save draft:', err);
    }
    return null;
  };

  const handleDiscardCompose = async () => {
    setShowCompose(false);
    setComposeData({ to: '', subject: '', content: '', accountId: emailAccounts.length > 0 ? emailAccounts[0]._id : '' });
    if (draftId) {
      try {
        await api.delete(`/messages/draft/${draftId}`);
        fetchConversations(); // refresh list to remove the draft if active
      } catch (err) {
        console.error('Failed to delete draft', err);
      }
      setDraftId(null);
    }
  };

  const handleSelectConv = async (conv) => {
    if (activeFolder === 'drafts') {
      const { data } = await api.get(`/messages/${conv._id}`);
      if (data.success && data.data.length > 0) {
        const draftMsg = data.data[0];
        setComposeData({
          to: conv.externalContact?.email || '',
          subject: conv.name === '(No Subject)' ? '' : (conv.name || ''),
          content: draftMsg.content || '',
          accountId: ''
        });
        setDraftId(conv._id);
        setShowCompose(true);
      }
      return;
    }

    if (showCompose) {
      if (composeData.to || composeData.subject || composeData.content) {
        saveDraftAsync(composeData, draftId).then(newDraftId => {
          if (newDraftId) setDraftId(newDraftId);
        });
        alert("Email saved in draft");
      }
      setShowCompose(false);
    }
    
    setSelectedConv(conv);
    fetchMessages(conv._id);
    fetchSuggestedReplies(conv._id);
    
    // Optimistically mark as read in the list
    if (conv.unreadCount > 0) {
      setConversations(prev => prev.map(c => 
        c._id === conv._id ? { ...c, unreadCount: 0 } : c
      ));
      // Tell the parent component to refresh the unread count badge
      window.dispatchEvent(new Event('emailMessageRead'));
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConv) return;

    try {
      // In a real implementation, we would send this to our /api/email/send route
      // But for now, we use the standard message route which we updated to support isInternalNote
      const { data } = await api.post('/messages', {
        conversationId: selectedConv._id,
        content: newMessage,
        isInternalNote
      });

      if (data.success) {
        setMessages([...messages, data.data]);
        setNewMessage('');
        setIsInternalNote(false);
      }
    } catch (error) {
      console.error('Failed to send message', error);
    }
  };

  const handleComposeSubmit = async (e) => {
    e.preventDefault();
    if (!composeData.to || !composeData.subject || !composeData.content) return;
    
    setIsSendingCompose(true);
    try {
      const { data } = await api.post('/messages/compose', { ...composeData, draftId });
      if (data.success) {
        setShowCompose(false);
        setDraftId(null);
        setComposeData({ to: '', subject: '', content: '', accountId: emailAccounts.length > 0 ? emailAccounts[0]._id : '' });
        
        // Refresh conversations and select the new one
        await fetchConversations();
        
        // Find the new conversation in the updated list by ID or just fetch it
        // We can just rely on fetchConversations to pull it to the top
        // But let's select it:
        const updatedList = await api.get(`/messages/conversations?folder=${activeFolder}&provider=${providerFilter}`);
        if (updatedList.data.success) {
          setConversations(updatedList.data.data);
          const newConv = updatedList.data.data.find(c => c._id === data.conversationId);
          if (newConv) {
            setSelectedConv(newConv);
            fetchMessages(newConv._id);
          }
        }
      }
    } catch (error) {
      console.error('Failed to compose message', error);
      alert('Failed to send email. Check console.');
    } finally {
      setIsSendingCompose(false);
    }
  };

  const handleAssign = async (staffId) => {
    if (!selectedConv) return;
    try {
      await api.put(`/messages/conversations/${selectedConv._id}/assign`, { assignedTo: staffId });
      fetchConversations();
      if (staffList.find(s => s._id === staffId)) {
        setSelectedConv(prev => ({ ...prev, assignedTo: staffList.find(s => s._id === staffId) }));
      }
    } catch (error) {
      console.error('Failed to assign conversation', error);
    }
  };

  const handleComposeMagicFinish = async () => {
    if (!composeData.content.trim()) return;
    setIsGeneratingComposeAI(true);
    try {
      const { data } = await api.post('/ai/autocomplete', { 
        conversationId: 'new', 
        currentDraft: stripHtml(composeData.content) 
      });
      if (data.success) {
        setComposeData(prev => ({ ...prev, content: prev.content + ' ' + data.data }));
      }
    } catch (error) {
      console.error('Failed to autocomplete compose draft', error);
    } finally {
      setIsGeneratingComposeAI(false);
    }
  };

  const handleRewrite = async () => {
    const rawContent = stripHtml(composeData.content);
    if (!rawContent.trim()) return;
    setIsRewriting(true);
    try {
      const { data } = await api.post('/ai/rewrite', { currentDraft: rawContent });
      if (data.success) {
        setRewritePreview(data.data);
      }
    } catch (error) {
      console.error('Failed to rewrite draft', error);
    } finally {
      setIsRewriting(false);
    }
  };

  const acceptRewrite = () => {
    if (rewritePreview) {
      setComposeData(prev => ({ ...prev, content: `<p>${rewritePreview.replace(/\\n/g, '<br>')}</p>` }));
      setRewritePreview(null);
    }
  };

  const rejectRewrite = () => {
    setRewritePreview(null);
  };

  const handleFileSelect = (e) => {
    if (e.target.files) {
      setAttachments(prev => [...prev, ...Array.from(e.target.files)]);
    }
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const insertSignature = (sig) => {
    if (!sig) return;
    setComposeData(prev => ({ ...prev, content: prev.content + '<br><br>' + sig.content }));
  };

  const saveSignatures = async (newSignatures, newDefaultId) => {
    try {
      const { data } = await api.put('/users/me/signatures', { signatures: newSignatures, defaultSignatureId: newDefaultId });
      if (data.success) {
        setSignatures(data.data.signatures);
        setDefaultSignatureId(data.data.defaultSignatureId);
      }
    } catch (error) {
      console.error('Failed to save signatures', error);
      alert('Failed to save signatures');
    }
  };

  const printCompose = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html><head><title>Print Email</title><style>body{font-family:sans-serif;}</style></head><body>
      <p><strong>To:</strong> ${composeData.to}</p>
      <p><strong>Subject:</strong> ${composeData.subject}</p>
      <hr/>
      <div>${composeData.content}</div>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
    setShowComposeOptions(false);
  };

  const stripHtml = (html) => {
    if (!html) return '';
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    
    // Remove scripts and styles to prevent CSS/JS from leaking into plain text
    const scripts = tmp.getElementsByTagName('script');
    let i = scripts.length;
    while (i--) { scripts[i].parentNode.removeChild(scripts[i]); }
    
    const styles = tmp.getElementsByTagName('style');
    i = styles.length;
    while (i--) { styles[i].parentNode.removeChild(styles[i]); }
    
    return (tmp.textContent || tmp.innerText || "").replace(/\s+/g, ' ').trim();
  };

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0, border: '1px solid #e2e8f0', borderRadius: '12px', background: 'white', overflow: 'hidden' }}>
      
      {/* Left Sidebar: Inbox List */}
      <div style={{ width: '340px', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', background: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Email Tickets</h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => setShowCompose(true)}
                style={{ padding: '4px 10px', borderRadius: '4px', background: '#3b82f6', color: 'white', fontSize: '12px', fontWeight: '500', border: 'none', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
              >
                <Plus size={14} /> Compose
              </button>
              <select
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
                style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '12px', background: '#f8fafc' }}
              >
                <option value="all">All Emails</option>
                <option value="gmail">Gmail</option>
                <option value="zoho">Zoho</option>
              </select>
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={16} />
            <input 
              type="text" 
              placeholder="Search emails..." 
              style={{ width: '100%', padding: '8px 8px 8px 32px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', padding: '8px 16px', gap: '8px', borderBottom: '1px solid #e2e8f0', overflowX: 'auto', background: 'white' }}>
          {['inbox', 'sent', 'drafts', 'spam', 'trash'].map(folder => (
            <button
              key={folder}
              onClick={() => { setActiveFolder(folder); setSelectedConv(null); }}
              style={{
                padding: '4px 12px',
                borderRadius: '16px',
                border: 'none',
                background: activeFolder === folder ? '#eff6ff' : 'transparent',
                color: activeFolder === folder ? '#2563eb' : '#64748b',
                fontWeight: activeFolder === folder ? '600' : '400',
                fontSize: '13px',
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {folder}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {conversations.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
              No email tickets found
            </div>
          ) : (
            conversations.map(conv => (
              <div 
                key={conv._id}
                onClick={() => handleSelectConv(conv)}
                style={{ 
                  padding: '16px', 
                  borderBottom: '1px solid #e2e8f0', 
                  cursor: 'pointer',
                  background: selectedConv?._id === conv._id ? '#eff6ff' : 'white',
                  transition: 'background 0.2s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    {conv.unreadCount > 0 && (
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} title={`${conv.unreadCount} unread`} />
                    )}
                    <span style={{ fontWeight: conv.unreadCount > 0 ? '700' : '500', fontSize: '14px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {conv.externalContact?.name || 'Customer'}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: conv.unreadCount > 0 ? '#3b82f6' : '#64748b', fontWeight: conv.unreadCount > 0 ? '700' : '400', flexShrink: 0, marginLeft: '8px' }}>
                    {conv.lastMessage?.createdAt ? new Date(conv.lastMessage.createdAt).toLocaleDateString() : ''}
                  </span>
                </div>
                {conv.assignedTo && (
                  <div style={{ fontSize: '11px', color: conv.assignedBy ? '#ef4444' : '#3b82f6', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <User size={10} /> Assigned to: {conv.assignedTo.name}
                  </div>
                )}
                <div style={{ fontSize: '13px', fontWeight: conv.unreadCount > 0 ? '700' : '500', color: conv.unreadCount > 0 ? '#0f172a' : '#334155', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {conv.name}
                </div>
                <div style={{ fontSize: '13px', color: conv.unreadCount > 0 ? '#1e293b' : '#64748b', fontWeight: conv.unreadCount > 0 ? '500' : '400', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {conv.lastMessage?.content ? stripHtml(conv.lastMessage.content) : 'No messages yet'}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Column: Ticket Thread */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'white', minWidth: 0 }}>
        
        {showCompose ? (
          <div style={isFullScreen ? { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'white', zIndex: 100000, display: 'flex', flexDirection: 'column' } : { display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <h2 style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: '#1e293b' }}>New Message</h2>
              <div style={{ display: 'flex', gap: '12px', color: '#64748b' }}>
                {isFullScreen ? (
                  <button onClick={() => setIsFullScreen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }} title="Exit Full Screen"><Maximize2 size={16} /></button>
                ) : null}
                <button onClick={() => setShowCompose(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }}><X size={16} /></button>
              </div>
            </div>

            <form onSubmit={handleComposeSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '0 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #e2e8f0', padding: '12px 0' }}>
                  <label style={{ width: '50px', color: '#64748b', fontSize: '14px' }}>From</label>
                  <select 
                    value={composeData.accountId}
                    onChange={(e) => setComposeData({...composeData, accountId: e.target.value})}
                    style={{ flex: 1, border: 'none', outline: 'none', fontSize: '14px', background: 'transparent', color: '#0f172a' }}
                    required
                  >
                    {emailAccounts.length === 0 && <option value="">No connected accounts found</option>}
                    {emailAccounts.map(acc => (
                      <option key={acc._id} value={acc._id}>
                        {acc.emailAddress}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #e2e8f0', padding: '12px 0' }}>
                  <label style={{ width: '50px', color: '#64748b', fontSize: '14px' }}>To</label>
                  <input 
                    type="email" 
                    value={composeData.to}
                    onChange={(e) => setComposeData({...composeData, to: e.target.value})}
                    style={{ flex: 1, border: 'none', outline: 'none', fontSize: '14px', color: '#0f172a' }}
                    required
                  />
                  <div style={{ color: '#64748b', fontSize: '13px', cursor: 'pointer', display: 'flex', gap: '8px' }}>
                    <span>Cc</span>
                    <span>Bcc</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #e2e8f0', padding: '12px 0' }}>
                  <input 
                    type="text" 
                    placeholder="Subject"
                    value={composeData.subject}
                    onChange={(e) => setComposeData({...composeData, subject: e.target.value})}
                    style={{ flex: 1, border: 'none', outline: 'none', fontSize: '14px', color: '#0f172a' }}
                    required
                  />
                </div>
              </div>

              <input type="file" multiple hidden ref={fileInputRef} onChange={handleFileSelect} />
              
              {attachments.length > 0 && (
                <div style={{ padding: '8px 24px', display: 'flex', gap: '8px', flexWrap: 'wrap', borderBottom: '1px solid #e2e8f0' }}>
                  {attachments.map((file, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px', background: '#f1f5f9', borderRadius: '4px', fontSize: '12px', color: '#334155' }}>
                      <Paperclip size={12} /> {file.name}
                      <X size={14} style={{ cursor: 'pointer' }} onClick={() => removeAttachment(i)} />
                    </div>
                  ))}
                </div>
              )}

              {isPlainText ? (
                <textarea 
                  value={stripHtml(composeData.content)}
                  onChange={(e) => setComposeData({...composeData, content: e.target.value})}
                  style={{ flex: 1, padding: '24px', border: 'none', outline: 'none', fontSize: '14px', resize: 'none', color: '#0f172a', fontFamily: 'monospace' }}
                  required
                />
              ) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <ReactQuill 
                    theme="snow"
                    value={composeData.content}
                    onChange={(val) => setComposeData({...composeData, content: val})}
                    modules={{ toolbar: [
                      [{ 'font': [] }, { 'size': ['small', false, 'large', 'huge'] }],
                      ['bold', 'italic', 'underline', 'strike'],
                      [{ 'color': [] }, { 'background': [] }],
                      [{ 'align': [] }],
                      [{'list': 'ordered'}, {'list': 'bullet'}],
                      [{ 'indent': '-1'}, { 'indent': '+1' }],
                      ['blockquote'],
                      ['link', 'image'],
                      ['clean']
                    ] }}
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}
                  />
                  <style>
                    {`
                      .quill { display: flex; flex-direction: column; height: 100%; min-height: 200px; }
                      .ql-container { flex: 1; border: none !important; font-family: inherit !important; font-size: 14px !important; overflow-y: auto; }
                      .ql-editor { min-height: 100%; padding: 24px !important; }
                      .ql-toolbar { display: ${showToolbar ? 'block' : 'none'} !important; border: none !important; border-bottom: 1px solid #e2e8f0 !important; flex-shrink: 0; }
                    `}
                  </style>
                </div>
              )}

              {rewritePreview && (
                <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0b57d0', fontWeight: '500', fontSize: '14px' }}>
                      <Sparkles size={16} /> AI Suggestion
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="button" onClick={rejectRewrite} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', color: '#475569' }}>Reject</button>
                      <button type="button" onClick={handleRewrite} disabled={isRewriting} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: isRewriting ? 'wait' : 'pointer', fontSize: '13px', color: '#475569' }}>{isRewriting ? '...' : 'Redo'}</button>
                      <button type="button" onClick={acceptRewrite} style={{ padding: '6px 12px', background: '#0b57d0', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>Accept & Replace</button>
                    </div>
                  </div>
                  <div style={{ fontSize: '14px', color: '#334155', whiteSpace: 'pre-wrap', padding: '12px', background: 'white', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                    {rewritePreview}
                  </div>
                </div>
              )}

              <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', background: '#0b57d0', borderRadius: '24px', overflow: 'hidden' }}>
                    <button 
                      type="submit"
                      disabled={isSendingCompose}
                      style={{ padding: '10px 16px 10px 24px', background: 'transparent', color: 'white', border: 'none', cursor: isSendingCompose ? 'wait' : 'pointer', fontWeight: '500', opacity: isSendingCompose ? 0.7 : 1, fontSize: '14px', borderRight: '1px solid rgba(255,255,255,0.2)' }}
                    >
                      {isSendingCompose ? 'Sending...' : 'Send'}
                    </button>
                    <button type="button" style={{ padding: '10px 12px', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <ChevronDown size={16} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '14px', color: '#444746', alignItems: 'center', marginLeft: '12px' }}>
                    <span onClick={() => setShowToolbar(!showToolbar)} style={{ fontSize: '16px', fontWeight: '600', cursor: 'pointer', padding: '4px', background: showToolbar ? '#e2e8f0' : 'transparent', borderRadius: '4px' }}>Aa</span>
                    <Wand2 size={20} onClick={handleComposeMagicFinish} style={{ cursor: isGeneratingComposeAI ? 'wait' : 'pointer', padding: '2px', color: isGeneratingComposeAI ? '#3b82f6' : 'inherit' }} title="AI Autocomplete" />
                    <Sparkles size={20} onClick={handleRewrite} style={{ cursor: isRewriting ? 'wait' : 'pointer', padding: '2px', color: isRewriting ? '#3b82f6' : 'inherit' }} title="AI Rewrite & Fix" />
                    <Paperclip size={20} onClick={() => fileInputRef.current?.click()} style={{ cursor: 'pointer', padding: '2px' }} />
                    <Link size={20} onClick={() => { setShowToolbar(true); setTimeout(() => document.querySelector('.ql-link')?.click(), 100); }} style={{ cursor: 'pointer', padding: '2px' }} />
                    <div style={{ position: 'relative' }}>
                      <Smile size={20} onClick={() => setShowEmojiPicker(!showEmojiPicker)} style={{ cursor: 'pointer', padding: '2px' }} />
                      {showEmojiPicker && (
                        <div style={{ position: 'absolute', bottom: '100%', left: '0', marginBottom: '8px', zIndex: 50 }}>
                          <EmojiPicker onEmojiClick={(emoji) => {
                            setComposeData(prev => ({ ...prev, content: prev.content + emoji.emoji }));
                            setShowEmojiPicker(false);
                          }} />
                        </div>
                      )}
                    </div>
                    <Triangle size={20} onClick={() => alert("Google Drive integration requires OAuth setup. This feature is coming soon.")} style={{ cursor: 'pointer', padding: '2px' }} />
                    <ImageIcon size={20} onClick={() => { setShowToolbar(true); setTimeout(() => document.querySelector('.ql-image')?.click(), 100); }} style={{ cursor: 'pointer', padding: '2px' }} />
                    <Lock size={20} style={{ cursor: 'not-allowed', padding: '2px', opacity: 0.5 }} title="Confidential mode (coming soon)" />
                    <div style={{ position: 'relative' }}>
                      <PenTool size={20} onClick={() => setShowSignatureMenu(!showSignatureMenu)} style={{ cursor: 'pointer', padding: '2px' }} title="Insert Signature" />
                      {showSignatureMenu && (
                        <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '12px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', width: '200px', zIndex: 50, fontSize: '14px', color: '#1e293b' }}>
                          <div onClick={() => { setShowManageSignatures(true); setShowSignatureMenu(false); }} style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #e2e8f0' }}>
                            Manage signatures
                          </div>
                          <div onClick={() => setShowSignatureMenu(false)} style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {!defaultSignatureId && <Check size={16} />}
                            <span style={{ marginLeft: !defaultSignatureId ? '0' : '24px' }}>No signature</span>
                          </div>
                          {signatures.map(sig => (
                            <div key={sig._id} onClick={() => { insertSignature(sig); setShowSignatureMenu(false); }} style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {defaultSignatureId === sig._id && <Check size={16} />}
                              <span style={{ marginLeft: defaultSignatureId === sig._id ? '0' : '24px' }}>{sig.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ position: 'relative' }}>
                      <MoreVertical 
                        size={20} 
                        style={{ cursor: 'pointer', padding: '2px' }} 
                        onClick={() => setShowComposeOptions(!showComposeOptions)} 
                      />
                      {showComposeOptions && (
                        <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '12px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', padding: '8px 0', zIndex: 10, width: '240px', fontSize: '14px' }}>
                          <div onClick={() => { setIsFullScreen(!isFullScreen); setShowComposeOptions(false); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer', color: '#1f2937' }}>
                            <Maximize2 size={18} color="#475569" /> {isFullScreen ? 'Exit full screen' : 'Default to full screen'}
                          </div>
                          <div onClick={() => { setIsPlainText(!isPlainText); setShowComposeOptions(false); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer', color: '#1f2937', borderBottom: '1px solid #e2e8f0', marginBottom: '8px', paddingBottom: '16px' }}>
                            <Type size={18} color="#475569" /> {isPlainText ? 'Rich text mode' : 'Plain text mode'}
                          </div>
                          <div onClick={printCompose} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer', color: '#1f2937' }}>
                            <Printer size={18} color="#475569" /> Print
                          </div>
                          <div onClick={() => setShowComposeOptions(false)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer', color: '#1f2937' }}>
                            <SpellCheck size={18} color="#475569" /> Spell check (Native)
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div style={{ color: '#444746', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center' }}>
                  <Trash2 size={20} onClick={handleDiscardCompose} title="Discard Draft" />
                </div>
              </div>
            </form>
          </div>
        ) : selectedConv ? (
          <>
            {/* Header */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 4px', color: '#0f172a' }}>{selectedConv.name}</h2>
                <div style={{ fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={14} /> {selectedConv.externalContact?.email || 'customer@example.com'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select 
                  value={selectedConv.assignedTo?._id || ''} 
                  onChange={(e) => handleAssign(e.target.value)}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', background: 'white' }}
                >
                  <option value="">Unassigned</option>
                  {staffList.map(staff => (
                    <option key={staff._id} value={staff._id}>{staff.name}</option>
                  ))}
                </select>
                <select style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', background: 'white' }}>
                  <option>Status: Open</option>
                  <option>Status: Resolved</option>
                </select>
                <button style={{ padding: '6px', border: '1px solid #e2e8f0', borderRadius: '6px', background: 'white', color: '#64748b' }}>
                  <MoreVertical size={16} />
                </button>
              </div>
            </div>

            {/* Message Thread */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', background: '#f8fafc' }}>
              {messages.map(msg => {
                const isMyMessage = msg.sender && msg.sender._id === user?._id;
                const isCustomer = !msg.sender;

                if (msg.isInternalNote) {
                  return (
                    <div key={msg._id} style={{ alignSelf: 'center', width: '80%', background: '#fef3c7', padding: '12px 16px', borderRadius: '8px', border: '1px solid #fde68a' }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#d97706', marginBottom: '4px' }}>
                        Internal Note by {msg.sender?.name}
                      </div>
                      <div style={{ fontSize: '14px', color: '#92400e' }}>{msg.content}</div>
                    </div>
                  );
                }

                const isEmail = selectedConv?.channel === 'email';

                if (isEmail && !msg.isInternalNote) {
                  // Render full HTML email in an iframe, or plain text stacked like a card
                  return (
                    <div key={msg._id} style={{ alignSelf: 'stretch', background: 'white', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                        <span>
                          <strong>{isCustomer ? 'From:' : 'Sent By:'}</strong> {isCustomer ? (msg.externalSender?.name || 'Customer') : (msg.sender?.name || 'Staff')}
                          {isCustomer && ` <${msg.externalSender?.email}>`}
                        </span>
                        <span>{new Date(msg.createdAt).toLocaleString()}</span>
                      </div>
                      <iframe 
                        srcDoc={msg.content} 
                        style={{ width: '100%', minHeight: '300px', border: 'none', background: 'white', resize: 'vertical' }}
                        sandbox="allow-same-origin allow-popups"
                        title="Email Content"
                        onLoad={(e) => {
                          try { e.target.style.height = e.target.contentWindow.document.body.scrollHeight + 'px'; } catch(err){}
                        }}
                      />
                    </div>
                  );
                }

                return (
                  <div key={msg._id} style={{ alignSelf: isCustomer ? 'flex-start' : 'flex-end', maxWidth: '70%' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px', textAlign: isCustomer ? 'left' : 'right' }}>
                      {isCustomer ? (msg.externalSender?.name || 'Customer') : msg.sender?.name}
                    </div>
                    <div style={{ 
                      background: isCustomer ? 'white' : '#3b82f6', 
                      color: isCustomer ? '#0f172a' : 'white',
                      padding: '12px 16px', 
                      borderRadius: '12px', 
                      border: isCustomer ? '1px solid #e2e8f0' : 'none',
                      fontSize: '14px',
                      lineHeight: '1.5',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {msg.content}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Box */}
            <div style={{ padding: '16px', borderTop: '1px solid #e2e8f0', background: isInternalNote ? '#fef3c7' : 'white', transition: 'background 0.2s' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <button 
                  onClick={() => setIsInternalNote(false)}
                  style={{ fontSize: '13px', fontWeight: '500', color: !isInternalNote ? '#3b82f6' : '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
                >
                  Reply to Customer
                </button>
                <button 
                  onClick={() => setIsInternalNote(true)}
                  style={{ fontSize: '13px', fontWeight: '500', color: isInternalNote ? '#d97706' : '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
                >
                  Add Internal Note
                </button>
              </div>

              {/* AI Suggested Replies */}
              {!isInternalNote && !newMessage && suggestedReplies.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px', paddingBottom: '4px' }}>
                  {suggestedReplies.map((reply, i) => (
                    <button
                      key={i}
                      onClick={() => setNewMessage(reply)}
                      style={{ 
                        padding: '8px 14px', 
                        background: '#f8fafc', 
                        border: '1px solid #cbd5e1', 
                        borderRadius: '8px', 
                        fontSize: '13px', 
                        color: '#334155',
                        cursor: 'pointer',
                        whiteSpace: 'normal',
                        textAlign: 'left',
                        lineHeight: '1.4',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                    >
                      ✨ {reply}
                    </button>
                  ))}
                </div>
              )}

              {/* AI Draft Preview */}
              {previewDraft && (
                <div style={{ marginBottom: '12px', padding: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#166534', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    ✨ AI Draft Preview
                  </div>
                  <div style={{ fontSize: '14px', color: '#15803d', marginBottom: '12px', whiteSpace: 'pre-wrap' }}>
                    {newMessage} <span style={{ fontWeight: '600', background: '#dcfce7' }}>{previewDraft}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" onClick={acceptPreview} style={{ padding: '6px 12px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: '500' }}>✅ Accept</button>
                    <button type="button" onClick={retryPreview} disabled={isGeneratingAI} style={{ padding: '6px 12px', background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', cursor: isGeneratingAI ? 'wait' : 'pointer', fontWeight: '500' }}>{isGeneratingAI ? '🔄...' : '🔄 Retry'}</button>
                    <button type="button" onClick={rejectPreview} style={{ padding: '6px 12px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: '500' }}>❌ Reject</button>
                  </div>
                </div>
              )}

              <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                <textarea 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={isInternalNote ? "Type an internal note (only visible to staff)... Use @ to mention someone" : "Type your reply to the customer..."}
                  style={{ 
                    flex: 1, 
                    border: '1px solid',
                    borderColor: isInternalNote ? '#fcd34d' : '#e2e8f0', 
                    borderRadius: '8px', 
                    padding: '12px', 
                    fontSize: '14px', 
                    resize: 'none',
                    minHeight: '80px',
                    background: 'white'
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button type="button" style={{ padding: '8px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', color: '#64748b' }}>
                    <Paperclip size={18} />
                  </button>
                  {newMessage.trim() && !isInternalNote && (
                    <button 
                      type="button" 
                      onClick={handleMagicFinish}
                      disabled={isGeneratingAI}
                      style={{ 
                        padding: '8px 12px', 
                        background: 'linear-gradient(to right, #8b5cf6, #3b82f6)', 
                        border: 'none', 
                        borderRadius: '8px', 
                        cursor: isGeneratingAI ? 'wait' : 'pointer', 
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: '600',
                        opacity: isGeneratingAI ? 0.7 : 1
                      }}
                      title="AI Magic Finish"
                    >
                      {isGeneratingAI ? '✨...' : '✨ Finish'}
                    </button>
                  )}
                  <button 
                    type="submit" 
                    disabled={!newMessage.trim()}
                    style={{ 
                      padding: '12px', 
                      background: isInternalNote ? '#d97706' : '#3b82f6', 
                      border: 'none', 
                      borderRadius: '8px', 
                      cursor: newMessage.trim() ? 'pointer' : 'not-allowed', 
                      color: 'white',
                      opacity: newMessage.trim() ? 1 : 0.5
                    }}
                  >
                    <Send size={18} />
                  </button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            <Mail size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <h3 style={{ fontSize: '18px', fontWeight: '500', color: '#64748b', margin: 0 }}>Select a ticket to view</h3>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>View and reply to customer emails</p>
          </div>
        )}
      </div>

      {showManageSignatures && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '800px', maxWidth: '90vw', height: '600px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#0f172a' }}>Manage Signatures</h2>
              <button onClick={() => setShowManageSignatures(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
            </div>
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              <div style={{ width: '250px', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>
                  <button onClick={() => setEditingSignature({ _id: 'new', name: 'New Signature', content: '' })} style={{ width: '100%', padding: '8px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#334155', fontWeight: '500' }}>
                    <Plus size={16} /> Create new
                  </button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {signatures.map(sig => (
                    <div key={sig._id} onClick={() => setEditingSignature(sig)} style={{ padding: '12px 16px', cursor: 'pointer', background: editingSignature?._id === sig._id ? '#eff6ff' : 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ fontSize: '14px', color: '#1e293b', fontWeight: editingSignature?._id === sig._id ? '600' : '400' }}>{sig.name}</span>
                      {defaultSignatureId === sig._id && <span style={{ fontSize: '10px', background: '#dbeafe', color: '#1d4ed8', padding: '2px 6px', borderRadius: '10px', fontWeight: '600' }}>DEFAULT</span>}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
                {editingSignature ? (
                  <>
                    <input 
                      type="text" 
                      value={editingSignature.name} 
                      onChange={(e) => setEditingSignature({ ...editingSignature, name: e.target.value })} 
                      placeholder="Signature Name" 
                      style={{ padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', marginBottom: '16px', fontSize: '14px', outline: 'none' }}
                    />
                    <div style={{ flex: 1, background: 'white', borderRadius: '6px', border: '1px solid #cbd5e1', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                      <ReactQuill 
                        theme="snow"
                        value={editingSignature.content}
                        onChange={(content) => setEditingSignature({ ...editingSignature, content })}
                        modules={{ toolbar: [['bold', 'italic', 'underline', 'strike'], [{'list': 'ordered'}, {'list': 'bullet'}], ['link', 'image'], ['clean']] }}
                        style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}
                      />
                    </div>
                    <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button 
                        onClick={() => {
                          const newDefault = defaultSignatureId === editingSignature._id ? null : editingSignature._id;
                          saveSignatures(signatures, newDefault);
                        }} 
                        style={{ padding: '8px 12px', background: 'transparent', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px' }}
                      >
                         <Check size={16} color={defaultSignatureId === editingSignature._id ? '#10b981' : '#cbd5e1'} /> Default Signature
                      </button>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        {editingSignature._id !== 'new' && (
                          <button 
                            onClick={() => {
                              const newSigs = signatures.filter(s => s._id !== editingSignature._id);
                              saveSignatures(newSigs, defaultSignatureId === editingSignature._id ? null : defaultSignatureId);
                              setEditingSignature(null);
                            }}
                            style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}
                          >
                            Delete
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            let newSigs = [...signatures];
                            if (editingSignature._id === 'new') {
                              // Delete _id so Mongoose generates a valid ObjectId
                              const { _id, ...newSigData } = editingSignature;
                              newSigs.push(newSigData);
                            } else {
                              newSigs = newSigs.map(s => s._id === editingSignature._id ? editingSignature : s);
                            }
                            saveSignatures(newSigs, defaultSignatureId);
                            setEditingSignature(null);
                          }} 
                          style={{ padding: '8px 24px', background: '#0b57d0', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                    <PenTool size={48} style={{ marginBottom: '16px', opacity: 0.2 }} />
                    <p style={{ margin: 0, fontSize: '15px' }}>Select a signature to edit, or create a new one.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
