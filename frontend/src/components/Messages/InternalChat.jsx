import React, { useState, useEffect, useRef } from 'react';
import { Send, Search, MessageSquare, ArrowLeft, Users as UsersIcon, MoreVertical, Smile, UserPlus, UserMinus, Check, CheckCheck, MessageCircle, Paperclip, File, Download, X, Loader } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import EmojiPicker from 'emoji-picker-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

export default function InternalChat() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');
  
  // Data State
  const [directory, setDirectory] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  
  // UI State
  const [activeChat, setActiveChat] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Group Creation State
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  // Group Management State
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);

  // Emoji State
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const messagesEndRef = useRef(null);
  const pollInterval = useRef(null);
  const emojiPickerRef = useRef(null);
  const fileInputRef = useRef(null);

  // --- Fetch Data ---
  const fetchData = async () => {
    // Fetch directory independently so a conversation error doesn't block it
    try {
      const dirRes = await api.get('/users/directory');
      console.log('Directory response:', dirRes.data);
      if (dirRes.data.success) {
        const myId = user?._id || user?.id;
        const others = dirRes.data.data.filter(u => u._id !== myId);
        console.log('My ID:', myId, 'Others:', others);
        setDirectory(others);
      } else {
        console.error('API returned success:false for directory');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      console.error('Directory fetch error:', err);
    }

    // Fetch conversations separately
    try {
      const convRes = await api.get('/messages/conversations');
      if (convRes.data.success) {
        setConversations(convRes.data.data);
      }
    } catch (err) {
      console.error('Conversations fetch error:', err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchMessages = async (convId) => {
    if (!convId) return;
    try {
      const res = await api.get(`/messages/${convId}`);
      if (res.data.success) {
        setMessages(res.data.data);
        scrollToBottom();
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  useEffect(() => {
    if (activeChat && activeChat._id) {
      fetchMessages(activeChat._id);
      if (pollInterval.current) clearInterval(pollInterval.current);
      pollInterval.current = setInterval(() => fetchMessages(activeChat._id), 3000);
    } else {
      if (pollInterval.current) clearInterval(pollInterval.current);
      setMessages([]);
    }
    return () => clearInterval(pollInterval.current);
  }, [activeChat]);

  // --- Helpers ---
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- Actions ---
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !activeChat || isUploading) return;

    setIsUploading(true);
    try {
      let attachmentData = null;
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        const uploadRes = await api.post('/messages/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (uploadRes.data.success) {
          attachmentData = uploadRes.data.attachment;
        }
      }

      const payload = { content: newMessage };
      if (attachmentData) {
        payload.attachment = attachmentData;
      }
      
      if (activeChat.isNewDirectChat) {
        payload.recipientId = activeChat.recipientId;
      } else {
        payload.conversationId = activeChat._id;
      }

      const res = await api.post('/messages', payload);

      if (res.data.success) {
        setNewMessage('');
        setSelectedFile(null);
        setShowEmojiPicker(false);
        fetchData(); // Refresh conversations list
        
        if (activeChat.isNewDirectChat) {
          // Replace active chat with the real conversation object
          const newConv = res.data.data.conversationId; 
          // fetch data will pull the real conversation list shortly, but we can optimistically set ID
          setActiveChat({ ...activeChat, _id: newConv, isNewDirectChat: false });
        } else {
          setMessages([...messages, res.data.data]);
          scrollToBottom();
        }
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleEmojiClick = (emojiData) => {
    setNewMessage((prev) => prev + emojiData.emoji);
  };

  const toggleUserSelection = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const startDirectChat = (selectedUser) => {
    const existing = conversations.find(c => !c.isGroup && c.participants.some(p => p._id === selectedUser._id));
    if (existing) {
      setActiveChat(existing);
    } else {
      setActiveChat({
        isNewDirectChat: true,
        recipientId: selectedUser._id,
        name: selectedUser.name || 'Unnamed User',
        displayImageText: selectedUser.name ? selectedUser.name.charAt(0).toUpperCase() : 'U'
      });
    }
  };

  // Handle deep link from User Management
  useEffect(() => {
    if (location.state?.startChatWithUser && directory.length > 0 && conversations.length >= 0) {
      const userToChat = location.state.startChatWithUser;
      startDirectChat(userToChat);
      // Clear state so it doesn't trigger again
      navigate('/messages', { replace: true, state: {} });
    }
  }, [location.state, directory, conversations, navigate]);

  const handleCreateGroup = async () => {
    if (selectedUsers.length === 0) return;
    try {
      const res = await api.post('/messages/group', {
        name: groupName,
        participantIds: selectedUsers
      });
      if (res.data.success) {
        setSelectedUsers([]);
        setGroupName('');
        setIsCreatingGroup(false);
        fetchData();
        setActiveChat(res.data.data);
      }
    } catch (err) {
      console.error('Error creating group:', err);
    }
  };

  const handleAddParticipantToGroup = async (userId) => {
    try {
      await api.post('/messages/group/add', {
        conversationId: activeChat._id,
        userId
      });
      setShowAddMember(false);
      fetchData();
    } catch (err) {
      console.error('Error adding participant:', err);
    }
  };

  const handleRemoveParticipantFromGroup = async (userId) => {
    try {
      await api.post('/messages/group/remove', {
        conversationId: activeChat._id,
        userId
      });
      fetchData();
    } catch (err) {
      console.error('Error removing participant:', err);
    }
  };

  // --- Filtering ---
  const filteredDirectory = directory.filter(u => {
    const nMatch = u.name ? u.name.toLowerCase().includes(searchQuery.toLowerCase()) : false;
    const eMatch = u.email ? u.email.toLowerCase().includes(searchQuery.toLowerCase()) : false;
    return nMatch || eMatch;
  });

  const filteredConversations = conversations.filter(c => 
    c.name ? c.name.toLowerCase().includes(searchQuery.toLowerCase()) : false
  );

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0, background: 'white', borderRadius: '24px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
      
      {/* Left Sidebar (Fixed Width) */}
      <div style={{ width: '340px', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', background: '#f8fafc', flexShrink: 0 }}>
        
        <div style={{ padding: '20px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '600', color: '#0f172a', margin: 0, flex: 1 }}>Messages</h2>
          </div>

          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} size={18} />
            <input 
              type="text" 
              placeholder="Search users or chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '12px 16px 12px 44px', border: '1px solid #e2e8f0', borderRadius: '24px', background: 'white', fontSize: '14px', color: '#0f172a', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)', outline: 'none' }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          
          {/* Active Conversations Section */}
          {filteredConversations.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <p style={{ padding: '0 12px', fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Active Chats</p>
              {filteredConversations.map(conv => (
                <div 
                  key={conv._id} 
                  onClick={() => setActiveChat(conv)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px', 
                    padding: '12px', 
                    borderRadius: '16px', 
                    cursor: 'pointer', 
                    background: activeChat?._id === conv._id ? '#e0f2fe' : 'transparent',
                    transition: 'all 0.2s',
                    marginBottom: '4px'
                  }}
                  onMouseEnter={(e) => { if(activeChat?._id !== conv._id) e.currentTarget.style.background = '#f1f5f9' }}
                  onMouseLeave={(e) => { if(activeChat?._id !== conv._id) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ position: 'relative' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: conv.isGroup ? '#f3e8ff' : '#dbeafe', color: conv.isGroup ? '#6b21a8' : '#1e40af', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '18px' }}>
                      {conv.isGroup ? <UsersIcon size={20} /> : conv.displayImageText}
                    </div>
                    {conv.unreadCount > 0 && (
                      <div style={{ position: 'absolute', top: '-2px', right: '-2px', background: '#ef4444', color: 'white', width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold', border: '2px solid #f8fafc' }}>
                        {conv.unreadCount}
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: conv.unreadCount > 0 ? '700' : '600', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {conv.name}
                      </h4>
                      {conv.lastMessage && (
                        <span style={{ fontSize: '11px', color: conv.unreadCount > 0 ? '#2563eb' : '#94a3b8' }}>
                          {new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: conv.unreadCount > 0 ? '#1e293b' : '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: conv.unreadCount > 0 ? '600' : '400' }}>
                      {conv.lastMessage ? `${conv.lastMessage.isMe ? 'You: ' : (conv.isGroup ? conv.lastMessage.senderName + ': ' : '')}${conv.lastMessage.content}` : 'No messages yet'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Directory Section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', marginBottom: '8px' }}>
              <p style={{ margin: 0, fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Staff Directory</p>
              {!isCreatingGroup && (
                <button onClick={() => setIsCreatingGroup(true)} style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <UsersIcon size={14} /> New Group
                </button>
              )}
            </div>

            {isCreatingGroup && (
              <div style={{ padding: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', marginBottom: '16px' }}>
                <input 
                  type="text" 
                  placeholder="Group Name" 
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #86efac', marginBottom: '8px', fontSize: '13px', outline: 'none' }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handleCreateGroup} disabled={!groupName.trim() || selectedUsers.length === 0} style={{ flex: 1, padding: '6px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', opacity: (!groupName.trim() || selectedUsers.length === 0) ? 0.5 : 1 }}>Create</button>
                  <button onClick={() => { setIsCreatingGroup(false); setSelectedUsers([]); }} style={{ padding: '6px 12px', background: 'white', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
                </div>
              </div>
            )}

            {filteredDirectory.map(u => (
              <div 
                key={u._id} 
                onClick={() => isCreatingGroup ? toggleUserSelection(u._id) : startDirectChat(u)}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '16px', cursor: 'pointer', background: selectedUsers.includes(u._id) ? '#dcfce7' : 'transparent', transition: 'background 0.2s', marginBottom: '2px' }}
                onMouseEnter={(e) => { if (!selectedUsers.includes(u._id)) e.currentTarget.style.background = '#f1f5f9' }}
                onMouseLeave={(e) => { if (!selectedUsers.includes(u._id)) e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{ position: 'relative' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#e2e8f0', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '16px' }}>
                    {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  {isCreatingGroup && selectedUsers.includes(u._id) && (
                    <div style={{ position: 'absolute', bottom: -2, right: -2, background: '#22c55e', color: 'white', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={10} />
                    </div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>{u.name || 'Unnamed User'}</h4>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>{u.role || 'Staff'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      {activeChat ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'white', position: 'relative' }}>
          {/* Chat Header */}
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', zIndex: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: activeChat.isGroup ? '#f3e8ff' : '#dbeafe', color: activeChat.isGroup ? '#6b21a8' : '#1e40af', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '18px' }}>
                {activeChat.isGroup ? <UsersIcon size={20} /> : activeChat.displayImageText}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#0f172a' }}>{activeChat.name}</h3>
                {activeChat.isGroup && activeChat.participants && (
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>{activeChat.participants.length} participants</p>
                )}
              </div>
            </div>

            {/* Group Menu */}
            {activeChat.isGroup && (
              <div style={{ position: 'relative' }}>
                <button onClick={() => setShowGroupMenu(!showGroupMenu)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px', color: '#64748b', borderRadius: '50%' }}>
                  <MoreVertical size={20} />
                </button>
                {showGroupMenu && (
                  <div style={{ position: 'absolute', top: '100%', right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: '8px', width: '240px', zIndex: 100 }}>
                    <div style={{ padding: '8px 12px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Participants</div>
                    {activeChat.participants.map(p => (
                      <div key={p._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '8px' }}>
                        <div style={{ fontSize: '14px', color: '#0f172a' }}>
                          {p.name || 'Unnamed'} {p._id === activeChat.admin && <span style={{ fontSize: '10px', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', marginLeft: '4px' }}>Admin</span>}
                        </div>
                        {activeChat.admin === (user.id || user._id) && p._id !== (user.id || user._id) && (
                          <button onClick={() => handleRemoveParticipantFromGroup(p._id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444' }} title="Remove">
                            <UserMinus size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                    {activeChat.admin === (user.id || user._id) && (
                      <div style={{ marginTop: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
                        <button onClick={() => { setShowAddMember(!showAddMember); setShowGroupMenu(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#3b82f6', padding: '8px 12px', fontSize: '14px', fontWeight: '500' }}>
                          <UserPlus size={16} /> Add Member
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Add Member Popover */}
          {showAddMember && (
            <div style={{ position: 'absolute', top: '70px', right: '24px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: '16px', width: '280px', zIndex: 90 }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '14px' }}>Select User to Add</h4>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {directory.filter(u => !activeChat.participants.some(p => p._id === u._id)).map(u => (
                  <div key={u._id} onClick={() => handleAddParticipantToGroup(u._id)} style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: '8px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                    {u.name || 'Unnamed'}
                  </div>
                ))}
              </div>
              <button onClick={() => setShowAddMember(false)} style={{ marginTop: '12px', width: '100%', padding: '8px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#64748b' }}>Cancel</button>
            </div>
          )}

          {/* Messages Area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }} onClick={() => setShowGroupMenu(false)}>
            {messages.length === 0 ? (
              <div style={{ margin: 'auto', textAlign: 'center', color: '#94a3b8' }}>
                <MessageCircle size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
                <p style={{ fontSize: '16px', margin: 0 }}>Start a conversation in {activeChat.name}</p>
              </div>
            ) : (
              messages.map((msg, index) => {
                const myId = (user.id || user._id).toString();
                const senderId = (msg.sender._id || msg.sender).toString();
                const isMe = senderId === myId;
                const showAvatar = !isMe && (index === 0 || (messages[index - 1]?.sender?._id || messages[index - 1]?.sender)?.toString() !== senderId);
                
                // Delivery status
                const isRead = isMe && msg.readBy && msg.readBy.some(id => id.toString() !== myId);
                const timeString = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                
                // Date Separator Logic
                let showDateSeparator = false;
                let dateString = '';
                if (msg.createdAt) {
                  const msgDate = new Date(msg.createdAt);
                  const prevMsgDate = index > 0 && messages[index - 1].createdAt ? new Date(messages[index - 1].createdAt) : null;
                  
                  if (!prevMsgDate || msgDate.toDateString() !== prevMsgDate.toDateString()) {
                    showDateSeparator = true;
                    const today = new Date();
                    const yesterday = new Date(today);
                    yesterday.setDate(yesterday.getDate() - 1);
                    
                    if (msgDate.toDateString() === today.toDateString()) {
                      dateString = 'Today';
                    } else if (msgDate.toDateString() === yesterday.toDateString()) {
                      dateString = 'Yesterday';
                    } else {
                      dateString = msgDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: msgDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
                    }
                  }
                }
                
                return (
                  <React.Fragment key={msg._id}>
                    {showDateSeparator && (
                      <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0 12px 0', width: '100%' }}>
                        <span style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', fontWeight: '600', padding: '4px 12px', borderRadius: '12px', letterSpacing: '0.5px' }}>
                          {dateString}
                        </span>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%', marginTop: showAvatar ? '12px' : '2px' }}>
                    {!isMe && (
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: showAvatar ? '#e2e8f0' : 'transparent', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '600', flexShrink: 0 }}>
                        {showAvatar ? (msg.sender.name ? msg.sender.name.charAt(0).toUpperCase() : 'U') : ''}
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                      {!isMe && showAvatar && activeChat.isGroup && (
                        <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '4px', marginBottom: '4px' }}>{msg.sender.name || 'Unnamed'}</span>
                      )}
                      <div style={{ 
                        background: isMe ? '#3b82f6' : '#f1f5f9', 
                        color: isMe ? 'white' : '#0f172a', 
                        padding: '8px 14px', 
                        borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        fontSize: '15px',
                        lineHeight: '1.4',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        wordBreak: 'break-word',
                        minWidth: '80px'
                      }}>
                        {msg.attachment && (
                          <div style={{ marginBottom: msg.content ? '8px' : '0', marginTop: '2px' }}>
                            {msg.attachment.fileType?.startsWith('image/') ? (
                              <img 
                                src={`${API_BASE}${msg.attachment.url}`} 
                                alt="Attachment" 
                                style={{ maxWidth: '100%', maxHeight: '250px', borderRadius: '8px', cursor: 'pointer', objectFit: 'contain', background: 'rgba(0,0,0,0.05)' }} 
                                onClick={() => window.open(`${API_BASE}${msg.attachment.url}`, '_blank')} 
                              />
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: isMe ? 'rgba(255,255,255,0.2)' : 'white', padding: '10px', borderRadius: '8px', border: isMe ? 'none' : '1px solid #e2e8f0', minWidth: '200px' }}>
                                <File size={24} color={isMe ? 'white' : '#3b82f6'} />
                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                  <p style={{ margin: 0, fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{msg.attachment.filename}</p>
                                  <p style={{ margin: 0, fontSize: '11px', color: isMe ? 'rgba(255,255,255,0.7)' : '#64748b' }}>{(msg.attachment.size / 1024).toFixed(1)} KB</p>
                                </div>
                                <a href={`${API_BASE}${msg.attachment.url}`} download target="_blank" rel="noopener noreferrer" style={{ color: isMe ? 'white' : '#3b82f6', background: isMe ? 'rgba(255,255,255,0.2)' : '#f1f5f9', padding: '6px', borderRadius: '50%', display: 'flex' }}>
                                  <Download size={16} />
                                </a>
                              </div>
                            )}
                          </div>
                        )}
                        {msg.content && <div style={{ marginBottom: '2px' }}>{msg.content}</div>}
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'flex-end', 
                          gap: '4px', 
                          fontSize: '10px', 
                          color: isMe ? 'rgba(255,255,255,0.7)' : '#94a3b8',
                          marginTop: '2px'
                        }}>
                          <span>{timeString}</span>
                          {isMe && (
                            <span title={isRead ? 'Read' : 'Delivered'} style={{ display: 'flex', alignItems: 'center' }}>
                              {isRead ? <CheckCheck size={14} color="#fff" /> : <Check size={14} color="rgba(255,255,255,0.7)" />}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div style={{ padding: '20px 24px', background: 'white', borderTop: '1px solid #e2e8f0', position: 'relative' }}>
            
            {/* File Preview */}
            {selectedFile && (
              <div style={{ position: 'absolute', bottom: '100%', left: '24px', background: 'white', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 -4px 16px rgba(0,0,0,0.05)', marginBottom: '12px', zIndex: 10 }}>
                <div style={{ background: '#f1f5f9', padding: '8px', borderRadius: '8px' }}>
                  {selectedFile.type.startsWith('image/') ? <img src={URL.createObjectURL(selectedFile)} alt="Preview" style={{ width: '24px', height: '24px', objectFit: 'cover', borderRadius: '4px' }} /> : <File size={20} color="#3b82f6" />}
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#0f172a', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedFile.name}</p>
                  <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>{(selectedFile.size / 1024).toFixed(1)} KB</p>
                </div>
                <button onClick={() => setSelectedFile(null)} disabled={isUploading} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px', marginLeft: 'auto' }}>
                  <X size={16} />
                </button>
              </div>
            )}

            {showEmojiPicker && (
              <div ref={emojiPickerRef} style={{ position: 'absolute', bottom: '80px', left: '24px', zIndex: 100, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', borderRadius: '12px', overflow: 'hidden' }}>
                <EmojiPicker onEmojiClick={handleEmojiClick} searchDisabled skinTonesDisabled />
              </div>
            )}
            
            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '12px', alignItems: 'center', background: '#f8fafc', borderRadius: '32px', padding: '8px 16px', border: '1px solid #e2e8f0' }}>
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                onChange={(e) => { if (e.target.files[0]) setSelectedFile(e.target.files[0]); }} 
              />
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px', display: 'flex', alignItems: 'center' }} title="Attach File">
                <Paperclip size={20} />
              </button>
              <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} disabled={isUploading} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px', display: 'flex', alignItems: 'center' }} title="Add Emoji">
                <Smile size={24} />
              </button>
              <input 
                type="text" 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={isUploading}
                placeholder={selectedFile ? "Add a message (optional)..." : "Type a message..."} 
                style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '15px', color: '#0f172a', outline: 'none', padding: '8px 0' }}
              />
              <button 
                type="submit" 
                disabled={(!newMessage.trim() && !selectedFile) || isUploading}
                style={{ 
                  background: (!newMessage.trim() && !selectedFile) ? '#cbd5e1' : '#3b82f6', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '50%', 
                  width: '40px', 
                  height: '40px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: (!newMessage.trim() && !selectedFile) || isUploading ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s',
                  opacity: isUploading ? 0.7 : 1
                }}
              >
                {isUploading ? (
                  <Loader size={18} className="lucide-spin" style={{ animation: 'spin 2s linear infinite' }} />
                ) : (
                  <Send size={18} style={{ marginLeft: '2px' }} />
                )}
              </button>
            </form>
            <style>{`
              @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', borderLeft: '1px solid #e2e8f0' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
            <MessageSquare size={36} color="#94a3b8" />
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a', margin: '0 0 8px 0' }}>Your Messages</h3>
          <p style={{ fontSize: '15px', color: '#64748b', margin: 0, maxWidth: '300px', textAlign: 'center', lineHeight: '1.5' }}>
            Select a staff member or an existing group from the sidebar to start chatting.
          </p>
        </div>
      )}
      
    </div>
  );
}
