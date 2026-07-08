import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Send, Sparkles, User, Loader2, Volume2, VolumeX, Square, History, X, Trash2, Clock, Copy, Check } from 'lucide-react';
import api from '../../utils/api';

import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ─── Animated speaking bars ───────────────────────────────────────
const SpeakingBars = () => (
  <div className="flex items-center gap-[3px] h-5">
    {[0.4, 0.7, 1, 0.6, 0.9, 0.5, 0.8].map((h, i) => (
      <div key={i} className="w-[3px] rounded-full bg-white"
        style={{ height: `${h * 18}px`, animation: `novaBounce 0.8s ease-in-out ${i * 0.1}s infinite alternate` }} />
    ))}
  </div>
);

// ─── Inject CSS once ──────────────────────────────────────────────
const injectStyles = () => {
  if (document.getElementById('nova-styles')) return;
  const s = document.createElement('style');
  s.id = 'nova-styles';
  s.textContent = `
    @keyframes novaBounce { from { transform:scaleY(0.3); opacity:0.5; } to { transform:scaleY(1); opacity:1; } }
    .nova-ring { animation: novaRing 2s ease-in-out infinite; }
    @keyframes novaRing { 0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,.4);} 50%{box-shadow:0 0 0 8px rgba(99,102,241,0);} }
    .nova-history-enter { animation: slideIn 0.25s ease; }
    @keyframes slideIn { from { transform:translateX(100%); opacity:0; } to { transform:translateX(0); opacity:1; } }
  `;
  document.head.appendChild(s);
};

// ─── localStorage helpers ─────────────────────────────────────────
const LS_SETTINGS = 'nova_settings_v2';
const LS_HISTORY  = 'nova_chat_history_v2';
const LS_CURRENT  = 'nova_current_chat_v2';

const loadSettings = () => {
  try { return JSON.parse(localStorage.getItem(LS_SETTINGS)) || {}; } catch { return {}; }
};
const saveSettings = (s) => localStorage.setItem(LS_SETTINGS, JSON.stringify(s));

const loadHistory = () => {
  try { return JSON.parse(localStorage.getItem(LS_HISTORY)) || []; } catch { return []; }
};
const saveHistory = (h) => localStorage.setItem(LS_HISTORY, JSON.stringify(h.slice(0, 50)));

const loadCurrentChat = () => {
  try { return JSON.parse(localStorage.getItem(LS_CURRENT)) || null; } catch { return null; }
};
const saveCurrentChat = (msgs) => localStorage.setItem(LS_CURRENT, JSON.stringify(msgs));

const GREETING = { role: 'assistant', content: 'Hello! I am Nova, your platform command engine. Ask me anything about your business.' };

// ─── Format relative timestamp ────────────────────────────────────
const timeAgo = (isoDate) => {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

// ─────────────────────────────────────────────────────────────────
export default function NovaAssistant() {
  const saved      = loadSettings();
  const savedChat  = loadCurrentChat();

  const [messages, setMessages]         = useState(savedChat && savedChat.length > 1 ? savedChat : [GREETING]);
  const [input, setInput]               = useState('');
  const [isListening, setIsListening]   = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [isSpeaking, setIsSpeaking]     = useState(false);
  const [isMuted, setIsMuted]           = useState(saved.isMuted ?? false);
  const [voiceGender, setVoiceGender]   = useState(saved.voiceGender ?? 'female');
  const [showHistory, setShowHistory]   = useState(false);
  const [history, setHistory]           = useState(loadHistory());
  const [copiedIndex, setCopiedIndex]   = useState(null);

  const messagesEndRef  = useRef(null);
  const utteranceRef    = useRef(null);
  const recognitionRef  = useRef(null);

  useEffect(() => {
    injectStyles();
    // Init speech recognition
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      const rec = new SR();
      rec.continuous = false; rec.interimResults = false; rec.lang = 'en-US';
      rec.onresult = (e) => { const t = e.results[0][0].transcript; setInput(t); setIsListening(false); handleSend(t); };
      rec.onerror  = () => setIsListening(false);
      rec.onend    = () => setIsListening(false);
      recognitionRef.current = rec;
    }
    // Pre-load voices
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  }, []);

  // ── Persist settings whenever they change ──────────────────────
  useEffect(() => { saveSettings({ isMuted, voiceGender }); }, [isMuted, voiceGender]);

  // ── Persist current chat whenever messages change ──────────────
  useEffect(() => {
    saveCurrentChat(messages);
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Stop speaking ──────────────────────────────────────────────
  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  // ── Mute toggle — kills current speech ────────────────────────
  const handleMuteToggle = useCallback(() => {
    if (!isMuted) stopSpeaking();
    setIsMuted(prev => !prev);
  }, [isMuted, stopSpeaking]);

  // ── Speak ──────────────────────────────────────────────────────
  const speak = useCallback((text, gender) => {
    const g = gender ?? voiceGender;
    if (!('speechSynthesis' in window) || isMuted) return;
    window.speechSynthesis.cancel();

    const cleaned = text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/[\u{1F300}-\u{1FFFF}]/gu, '')
      .replace(/[•●◆▶►→↑↓]/g, '')
      .replace(/#{1,6}\s/g, '')
      .replace(/\n{2,}/g, '. ')
      .replace(/\n/g, ', ')
      .trim();

    const utt = new SpeechSynthesisUtterance(cleaned);
    utteranceRef.current = utt;

    const doSpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      const femaleVoices = ['Google US English', 'Google UK English Female', 'Microsoft Zira', 'Samantha (Enhanced)', 'Samantha', 'Karen'];
      const maleVoices   = ['Alex', 'Google UK English Male', 'Microsoft David', 'Daniel', 'Fred'];
      const list = g === 'male' ? maleVoices : femaleVoices;
      let chosen = null;
      for (const name of list) { chosen = voices.find(v => v.name === name); if (chosen) break; }
      if (!chosen) chosen = voices.find(v => (v.lang === 'en-US' || v.lang === 'en-GB') && v.name.includes(g === 'male' ? 'Male' : 'Female'));
      if (!chosen) chosen = voices.find(v => v.lang === 'en-US' || v.lang === 'en-GB');
      if (!chosen) chosen = voices.find(v => v.lang.startsWith('en'));
      if (chosen) utt.voice = chosen;
      utt.rate   = g === 'male' ? 0.9  : 0.88;
      utt.pitch  = g === 'male' ? 0.9  : 1.1;
      utt.volume = 1.0;
      utt.onstart = () => setIsSpeaking(true);
      utt.onend   = () => setIsSpeaking(false);
      utt.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utt);
    };
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) doSpeak();
    else window.speechSynthesis.onvoiceschanged = () => { doSpeak(); window.speechSynthesis.onvoiceschanged = null; };
  }, [isMuted, voiceGender]);

  // ── Save session to history ────────────────────────────────────
  const archiveSession = useCallback((msgs) => {
    if (msgs.length <= 1) return; // only greeting, skip
    const userMsgs = msgs.filter(m => m.role === 'user');
    if (!userMsgs.length) return;
    const session = {
      id:        Date.now(),
      timestamp: new Date().toISOString(),
      preview:   userMsgs[0].content.slice(0, 60) + (userMsgs[0].content.length > 60 ? '...' : ''),
      messages:  msgs,
    };
    setHistory(prev => {
      const updated = [session, ...prev].slice(0, 50);
      saveHistory(updated);
      return updated;
    });
  }, []);

  // ── Send message ───────────────────────────────────────────────
  const handleSend = async (textOverride) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim()) return;
    stopSpeaking();

    const newMessages = [...messages, { role: 'user', content: textToSend }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await api.post('/agent/chat', { message: textToSend });
      if (response.data.success) {
        const reply = response.data.text;
        const finalMessages = [...newMessages, { role: 'assistant', content: reply }];
        setMessages(finalMessages);
        speak(reply);
      } else {
        setMessages([...newMessages, { role: 'assistant', content: '❌ Error: ' + response.data.message }]);
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Could not connect to the server.';
      setMessages([...newMessages, { role: 'assistant', content: '❌ ' + msg }]);
    } finally {
      setIsLoading(false);
    }
  };

  // ── New chat ───────────────────────────────────────────────────
  const handleNewChat = () => {
    archiveSession(messages);
    setMessages([GREETING]);
    setShowHistory(false);
  };

  // ── Load a past session ────────────────────────────────────────
  const loadSession = (session) => {
    archiveSession(messages); // save current first
    setMessages(session.messages);
    setShowHistory(false);
  };

  // ── Delete a history entry ─────────────────────────────────────
  const deleteSession = (id, e) => {
    e.stopPropagation();
    setHistory(prev => {
      const updated = prev.filter(s => s.id !== id);
      saveHistory(updated);
      return updated;
    });
  };

  // ── Clear all history ──────────────────────────────────────────
  const clearAllHistory = () => {
    setHistory([]);
    saveHistory([]);
  };

  // ── Toggle listen ──────────────────────────────────────────────
  const toggleListen = () => {
    const rec = recognitionRef.current;
    if (!rec) { alert('Voice input not supported in this browser.'); return; }
    if (isListening) { rec.stop(); setIsListening(false); }
    else             { rec.start(); setIsListening(true); }
  };

  // renderText has been replaced by ReactMarkdown

  const shortcuts = [
    { icon: '📦', label: 'Orders past 7 days',   cmd: 'How many orders in the past 7 days?' },
    { icon: '💰', label: 'Revenue today',          cmd: 'What is my revenue today?' },
    { icon: '🔔', label: 'Pending orders',         cmd: 'Show me pending orders' },
    { icon: '⚠️', label: 'Low stock items',        cmd: 'Show low stock inventory' },
    { icon: '🏆', label: 'Top selling items',      cmd: 'What are my top selling items?' },
    { icon: '📊', label: 'Sales by channel',       cmd: 'Sales breakdown by channel' },
    { icon: '📅', label: 'Revenue this month',     cmd: 'Show profit this month' },
    { icon: '📈', label: 'Platform overview',      cmd: 'Dashboard' },
  ];

  return (
    <div className="flex h-[calc(100vh-6rem)] max-w-5xl mx-auto w-full relative">

      {/* ── Main chat panel ─────────────────────────────────────── */}
      <div className="flex flex-col flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-3">
            <div className={`relative w-10 h-10 overflow-hidden rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-md ${isSpeaking ? 'nova-ring' : ''}`}>
              <span className="absolute font-black italic opacity-40 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/10 select-none pointer-events-none" style={{ fontSize: '3rem', left: '50%', top: '50%', transform: 'translate(-50%, -50%) rotate(-5deg)' }}>N</span>
              <div className="z-10 flex items-center justify-center">
                {isSpeaking ? <SpeakingBars /> : <Sparkles className="w-5 h-5 text-white" />}
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">Nova</h1>
              <p className="text-xs font-medium text-gray-400">
                {isSpeaking ? '🔊 Speaking...' : isLoading ? '⏳ Thinking...' : 'Local Command Engine'}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Stop speaking */}
            {isSpeaking && (
              <button onClick={stopSpeaking}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 rounded-full text-xs font-semibold hover:bg-red-100 transition-all animate-pulse">
                <Square className="w-3 h-3 fill-red-500" /> Stop
              </button>
            )}

            {/* Mute toggle */}
            <button onClick={handleMuteToggle}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                isMuted ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}>
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              {isMuted ? 'Muted' : 'Sound On'}
            </button>

            {/* Voice gender */}
            <div className="flex bg-gray-100 rounded-full p-0.5">
              {['female', 'male'].map(g => (
                <button key={g} onClick={() => setVoiceGender(g)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                    voiceGender === g ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  {g === 'female' ? '♀' : '♂'} {g.charAt(0).toUpperCase() + g.slice(1)}
                </button>
              ))}
            </div>

            {/* New chat */}
            <button onClick={handleNewChat}
              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 border border-indigo-200 text-indigo-600 hover:bg-indigo-100 transition-all">
              + New
            </button>

            {/* History */}
            <button onClick={() => setShowHistory(prev => !prev)}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all border ${
                showHistory ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
              title="Chat history">
              <History className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-gray-50/50">
          {messages.length === 1 && (
            <div className="grid grid-cols-2 gap-3 mt-4 max-w-3xl mx-auto">
              {shortcuts.map((s, i) => (
                <button key={i} onClick={() => handleSend(s.cmd)}
                  className="p-3 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-indigo-300 transition-all text-left group flex items-center gap-3">
                  <span className="text-xl">{s.icon}</span>
                  <p className="text-sm font-medium text-gray-700 group-hover:text-indigo-600">{s.label}</p>
                </button>
              ))}
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''} max-w-3xl mx-auto w-full`}>
              <div className={`relative w-8 h-8 rounded-full overflow-hidden flex items-center justify-center shrink-0 ${
                msg.role === 'user' ? 'bg-gray-200' : 'bg-gradient-to-tr from-indigo-500 to-purple-500'
              }`}>
                {msg.role !== 'user' && (
                  <span className="absolute font-black italic opacity-40 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/10 select-none pointer-events-none" style={{ fontSize: '2.5rem', left: '50%', top: '50%', transform: 'translate(-50%, -50%) rotate(-5deg)' }}>N</span>
                )}
                <div className="z-10 flex items-center justify-center">
                  {msg.role === 'user' ? <User className="w-4 h-4 text-gray-600" /> : <Sparkles className="w-4 h-4 text-white" />}
                </div>
              </div>
              <div className={`px-5 py-3.5 rounded-2xl max-w-[80%] shadow-sm text-[15px] leading-relaxed relative group ${
                msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'
              }`}>
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm prose-indigo max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                )}
                
                {msg.role === 'assistant' && (
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(msg.content);
                      setCopiedIndex(idx);
                      setTimeout(() => setCopiedIndex(null), 2000);
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-gray-50 border border-gray-100 rounded-md text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100 hover:text-gray-600 shadow-sm"
                    title="Copy text"
                  >
                    {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 max-w-3xl mx-auto w-full">
              <div className="relative w-8 h-8 overflow-hidden rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shrink-0">
                <span className="absolute font-black italic opacity-40 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/10 select-none pointer-events-none" style={{ fontSize: '2.5rem', left: '50%', top: '50%', transform: 'translate(-50%, -50%) rotate(-5deg)' }}>N</span>
                <div className="z-10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="px-5 py-3.5 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                <span className="text-sm text-gray-500 font-medium">Nova is thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <div className="p-4 bg-white border-t border-gray-100">
          <div className="max-w-3xl mx-auto relative flex items-center">
            <button onClick={toggleListen}
              className={`absolute left-3 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'hover:bg-gray-100 text-gray-500'
              }`}>
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <input type="text" value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={isListening ? '🎤 Listening...' : isSpeaking ? '🔊 Nova is speaking — click Stop to interrupt...' : 'Ask Nova anything...'}
              className="w-full py-4 pl-14 pr-14 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-[15px]" />
            <button onClick={() => handleSend()} disabled={!input.trim() || isLoading}
              className="absolute right-3 w-10 h-10 rounded-full flex items-center justify-center bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-all">
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </div>
          <p className="text-center text-xs text-gray-400 mt-2">
            {isMuted ? '🔇 Voice muted' : `🔊 ${voiceGender === 'female' ? '♀ Female' : '♂ Male'} voice`}
            {' · Settings saved automatically'}
          </p>
        </div>
      </div>

      {/* ── History Side Panel ───────────────────────────────────── */}
      {showHistory && (
        <div className="nova-history-enter absolute right-0 top-0 h-full w-80 bg-white border border-gray-200 rounded-2xl shadow-xl z-20 flex flex-col overflow-hidden ml-4">
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 bg-white">
            <div>
              <h2 className="text-sm font-bold text-gray-800">Chat History</h2>
              <p className="text-xs text-gray-400">{history.length} saved sessions</p>
            </div>
            <div className="flex items-center gap-2">
              {history.length > 0 && (
                <button onClick={clearAllHistory}
                  className="text-xs text-red-400 hover:text-red-600 transition-colors flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> Clear all
                </button>
              )}
              <button onClick={() => setShowHistory(false)}
                className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* History list */}
          <div className="flex-1 overflow-y-auto">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <Clock className="w-10 h-10 text-gray-200 mb-3" />
                <p className="text-sm font-medium text-gray-400">No history yet</p>
                <p className="text-xs text-gray-300 mt-1">Start a conversation and click "+ New" to archive it</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {history.map((session) => {
                  const userMsgs = session.messages.filter(m => m.role === 'user');
                  const assistantMsgs = session.messages.filter(m => m.role === 'assistant');
                  return (
                    <button key={session.id} onClick={() => loadSession(session)}
                      className="w-full text-left px-4 py-3.5 hover:bg-indigo-50/60 transition-colors group relative">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700 group-hover:text-indigo-600 truncate leading-snug">
                            {session.preview}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-400">{timeAgo(session.timestamp)}</span>
                            <span className="text-xs text-gray-300">·</span>
                            <span className="text-xs text-gray-400">{userMsgs.length} {userMsgs.length === 1 ? 'msg' : 'msgs'}</span>
                          </div>
                        </div>
                        <button onClick={(e) => deleteSession(session.id, e)}
                          className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-full hover:bg-red-100 flex items-center justify-center text-red-400 transition-all shrink-0 mt-0.5">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Panel footer */}
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
            <button onClick={handleNewChat}
              className="w-full py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors">
              + Start New Chat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
