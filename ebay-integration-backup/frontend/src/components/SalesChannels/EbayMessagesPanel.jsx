import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, AlertCircle, RefreshCw, User, ShoppingBag, ShieldAlert, CheckCircle2, Clock } from 'lucide-react';
import api from '../../utils/api';

export default function EbayMessagesPanel() {
  const [messages, setMessages] = useState([]);
  const [selectedMsg, setSelectedMsg] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isMock, setIsMock] = useState(false);
  
  // Keep track of sent replies in memory to display them in the active thread
  const [sentReplies, setSentReplies] = useState({}); // messageId -> array of reply strings

  const chatEndRef = useRef(null);

  const fetchMessages = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.get('/ebay/messages');
      if (res.data.success) {
        setMessages(res.data.data || []);
        setIsMock(!!res.data.mock);
        
        // Select the first message by default if available
        if (res.data.data && res.data.data.length > 0) {
          setSelectedMsg(res.data.data[0]);
        }
      } else {
        setErrorMsg('Failed to retrieve messages.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Could not fetch messages. Server error.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    // Scroll to the bottom of the chat when a message is selected or reply added
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedMsg, sentReplies]);

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedMsg) return;

    setSending(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload = {
        messageId: selectedMsg.id,
        replyBody: replyText,
        recipientId: selectedMsg.sender,
        itemId: selectedMsg.itemId,
        subject: selectedMsg.subject.startsWith('Re:') ? selectedMsg.subject : `Re: ${selectedMsg.subject}`
      };

      const res = await api.post('/ebay/messages/reply', payload);
      if (res.data.success) {
        setSuccessMsg('Reply sent successfully!');
        
        // Store sent reply locally to show in chat bubble
        setSentReplies(prev => ({
          ...prev,
          [selectedMsg.id]: [...(prev[selectedMsg.id] || []), {
            body: replyText,
            date: new Date().toISOString()
          }]
        }));
        
        setReplyText('');
        
        // Remove success message after 3 seconds
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setErrorMsg(res.data.message || 'Failed to send reply.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Error occurred while sending the reply.');
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[600px] animate-in fade-in duration-200">
      
      {/* Top Banner (if mock data) */}
      {isMock && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-800 text-xs font-semibold">
            <ShieldAlert size={14} className="text-amber-600 shrink-0" />
            <span>Sandbox Mode: Displaying mock messages. Connect your eBay store to receive live customer messages.</span>
          </div>
          <button 
            onClick={fetchMessages} 
            className="text-[10px] bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded font-black text-amber-800 flex items-center gap-1 transition-colors uppercase tracking-wider"
          >
            <RefreshCw size={10} /> Refresh
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Sidebar: Messages List */}
        <div className="w-80 border-r border-gray-150 flex flex-col bg-gray-50/50">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
            <h3 className="text-sm font-black text-gray-800 flex items-center gap-1.5">
              <MessageSquare size={16} className="text-blue-500" /> Buyer Inquiries
            </h3>
            {!isMock && (
              <button 
                onClick={fetchMessages}
                disabled={loading}
                className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                title="Refresh Messages"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400 space-y-2">
                <RefreshCw size={24} className="animate-spin text-blue-500" />
                <span className="text-xs font-bold">Loading inbox...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="p-6 text-center text-gray-400 space-y-2">
                <MessageSquare size={32} className="mx-auto text-gray-300" />
                <p className="text-xs font-bold">No unreplied messages found.</p>
              </div>
            ) : (
              messages.map(msg => {
                const isSelected = selectedMsg?.id === msg.id;
                const activeReplies = sentReplies[msg.id] || [];
                const isReplied = activeReplies.length > 0;

                return (
                  <div
                    key={msg.id}
                    onClick={() => setSelectedMsg(msg)}
                    className={`p-4 cursor-pointer transition-all text-left relative ${
                      isSelected 
                        ? 'bg-blue-50/70 border-l-4 border-blue-600' 
                        : 'hover:bg-gray-50 border-l-4 border-transparent'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <span className="font-black text-xs text-gray-800 truncate max-w-[140px] flex items-center gap-1">
                        <User size={12} className="text-gray-400" /> {msg.sender}
                      </span>
                      <span className="text-[10px] text-gray-400 font-bold shrink-0">
                        {formatDate(msg.date)}
                      </span>
                    </div>
                    <div className="text-[12px] font-bold text-gray-900 truncate mb-1">
                      {msg.subject}
                    </div>
                    <div className="text-[11px] font-medium text-gray-500 line-clamp-2 leading-relaxed">
                      {msg.body}
                    </div>
                    {msg.itemId && (
                      <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-gray-400">
                        <ShoppingBag size={10} /> Item: {msg.itemId}
                      </div>
                    )}

                    {/* Replied status indicator */}
                    {isReplied && (
                      <span className="absolute top-4 right-4 h-2 w-2 rounded-full bg-green-500 shadow-xs" title="Replied" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chat / Message View Pane */}
        {selectedMsg ? (
          <div className="flex-1 flex flex-col bg-white">
            
            {/* Thread Header */}
            <div className="p-4 border-b border-gray-150 flex items-center justify-between bg-gray-50/30">
              <div>
                <h4 className="text-sm font-black text-gray-900">{selectedMsg.subject}</h4>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 font-semibold">
                  <span className="text-gray-800 font-bold">From: {selectedMsg.sender}</span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1 text-gray-400"><Clock size={12} /> {formatDate(selectedMsg.date)}</span>
                </div>
              </div>
              {selectedMsg.itemId && (
                <div className="px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-lg text-xs font-bold text-blue-700 flex items-center gap-1.5">
                  <ShoppingBag size={14} /> Item Reference: {selectedMsg.itemId}
                </div>
              )}
            </div>

            {/* Bubble Thread Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Buyer Original Message Bubble */}
              <div className="flex items-start gap-3 text-left max-w-[85%]">
                <div className="h-8 w-8 rounded-full bg-gray-100 border border-gray-250 flex items-center justify-center shrink-0">
                  <User size={16} className="text-gray-500" />
                </div>
                <div className="space-y-1">
                  <div className="bg-gray-100 text-gray-900 px-4 py-3 rounded-2xl rounded-tl-xs text-sm font-medium leading-relaxed border border-gray-200">
                    {selectedMsg.body}
                  </div>
                  <span className="text-[10px] text-gray-400 font-bold px-1">{formatDate(selectedMsg.date)}</span>
                </div>
              </div>

              {/* Local Sent Replies List */}
              {(sentReplies[selectedMsg.id] || []).map((reply, index) => (
                <div key={index} className="flex items-start justify-end gap-3 text-right max-w-[85%] ml-auto">
                  <div className="space-y-1">
                    <div className="bg-blue-600 text-white px-4 py-3 rounded-2xl rounded-tr-xs text-sm font-medium leading-relaxed text-left shadow-sm shadow-blue-500/10">
                      {reply.body}
                    </div>
                    <span className="text-[10px] text-gray-400 font-bold px-1 flex items-center justify-end gap-1">
                      <CheckCircle2 size={10} className="text-green-500" /> Sent &bull; {formatDate(reply.date)}
                    </span>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/10 font-bold text-xs">
                    US
                  </div>
                </div>
              ))}

              <div ref={chatEndRef} />
            </div>

            {/* Response Composer Form */}
            <div className="p-4 border-t border-gray-150 bg-gray-50/50">
              {errorMsg && (
                <div className="mb-3 bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5">
                  <AlertCircle size={14} className="text-red-500" /> {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="mb-3 bg-green-50 border border-green-200 text-green-800 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
                  <CheckCircle2 size={14} className="text-green-500" /> {successMsg}
                </div>
              )}

              <form onSubmit={handleSendReply} className="flex gap-3">
                <textarea
                  required
                  rows={2}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Write your reply to ${selectedMsg.sender}...`}
                  className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none transition-all"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendReply(e);
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={sending || !replyText.trim()}
                  className="px-5 bg-blue-600 text-white rounded-xl shadow-md hover:bg-blue-700 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none hover:scale-105 active:scale-95 shrink-0"
                >
                  {sending ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <>
                      <Send size={16} />
                      <span className="font-bold text-sm">Send</span>
                    </>
                  )}
                </button>
              </form>
              <div className="flex justify-between items-center mt-2 text-[10px] text-gray-400 font-bold px-1">
                <span>Press Enter to send, Shift+Enter for new line</span>
                <span>Recipient: {selectedMsg.sender}</span>
              </div>
            </div>

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-white">
            <MessageSquare size={48} className="text-gray-200 mb-4 animate-bounce" />
            <h4 className="text-sm font-black text-gray-700">Inbox Select</h4>
            <p className="text-xs text-gray-400 max-w-xs text-center mt-1">
              Select an inquiry thread from the sidebar to read customer queries and write replies.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
