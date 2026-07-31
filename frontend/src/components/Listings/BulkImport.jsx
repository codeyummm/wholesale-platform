import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, AlertCircle, CheckCircle2, Clock, Loader2, Plus, X } from 'lucide-react';
import api from '../../utils/api';

const BulkImport = () => {
  const navigate = useNavigate();
  const [urlList, setUrlList] = useState(['']);
  const [tasks, setTasks] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleStartImport = async () => {
    // Parse URLs (remove empty lines)
    const validUrls = urlList
      .map(line => line.trim())
      .filter(line => line.length > 0 && line.startsWith('http'));

    if (validUrls.length === 0) {
      alert('Please enter at least one valid URL.');
      return;
    }

    // Initialize tasks
    const initialTasks = validUrls.map((url, index) => ({
      id: index,
      url,
      status: 'pending', // pending, fetching, saving, success, error
      errorMsg: null,
      title: null,
    }));

    setTasks(initialTasks);
    setIsProcessing(true);
    setProgress(0);
    setUrlList(['']); // Clear input

    // Process sequentially
    for (let i = 0; i < initialTasks.length; i++) {
      const task = initialTasks[i];
      
      // Update status to fetching
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'fetching' } : t));

      try {
        // Step 1: Fetch and Extract URL Data
        const fetchRes = await api.post('/listings/fetch-url', { url: task.url });
        
        if (!fetchRes.data.success || !fetchRes.data.data) {
          throw new Error('Failed to extract data from URL');
        }

        const extractedData = fetchRes.data.data;

        // Update status to saving
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'saving', title: extractedData.title } : t));

        // Format payload to match Mongoose schema
        const payload = {
          ...extractedData,
          status: 'draft',
          sourceUrl: task.url,
        };

        // 1. Ensure required fields (Title, SKU)
        if (!payload.title) {
          payload.title = `Imported Product - ${new URL(task.url).hostname}`;
        }
        if (!payload.sku) {
          payload.sku = `BULK-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
        }

        // 2. Transform images array from strings to Mongoose objects
        if (payload.images && Array.isArray(payload.images)) {
          payload.images = payload.images.map((img, idx) => {
            // Handle if it's a string from Gemini
            const url = typeof img === 'string' ? img : img.url;
            return {
              url: url || '',
              alt: payload.title,
              isPrimary: idx === 0
            };
          }).filter(img => img.url);
        }

        // Step 2: Save as Draft Listing
        const saveRes = await api.post('/listings', payload);

        if (!saveRes.data.success) {
          throw new Error('Failed to save draft listing');
        }

        // Success
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'success' } : t));
      } catch (err) {
        console.error(`Error processing URL ${task.url}:`, err);
        setTasks(prev => prev.map(t => t.id === task.id ? { 
          ...t, 
          status: 'error', 
          errorMsg: err.response?.data?.message || err.message || 'Unknown error' 
        } : t));
      }

      // Update progress
      setProgress(Math.round(((i + 1) / initialTasks.length) * 100));
    }

    setIsProcessing(false);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-slate-400" />;
      case 'fetching':
      case 'saving':
        return <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />;
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-rose-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Queued';
      case 'fetching': return 'Extracting Data (AI)...';
      case 'saving': return 'Saving Draft...';
      case 'success': return 'Completed';
      case 'error': return 'Failed';
      default: return status;
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/sales-channels/listings')}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Bulk Import URLs</h1>
            <p className="text-slate-500 text-sm mt-1">Paste multiple product URLs to automatically extract and save them as drafts.</p>
          </div>
        </div>
      </div>

      {/* Main Input Area */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mt-6">
        <label className="block text-sm font-medium text-slate-700 mb-3">
          Product URLs (One per line)
        </label>
        
        <div className="border border-slate-300 rounded-lg overflow-hidden bg-slate-50 flex flex-col mb-6">
          <div className="h-[400px] overflow-y-auto p-2">
            {urlList.map((url, index) => (
              <div key={index} className={`flex items-start gap-3 p-2 border-b border-slate-200 last:border-0 group bg-white rounded-md mb-1 shadow-sm transition-all focus-within:ring-1 focus-within:ring-indigo-500 ${urlList.length === 1 && url === '' ? 'min-h-[370px]' : ''}`}>
                <span className="w-8 text-center text-slate-400 font-mono text-sm mt-2 select-none">
                  {urlList.length > 1 || url !== '' ? index + 1 : ''}
                </span>
                <textarea
                  value={url}
                  onChange={(e) => {
                    const newUrls = [...urlList];
                    newUrls[index] = e.target.value;
                    setUrlList(newUrls);
                    // auto-resize
                    if (urlList.length > 1 || e.target.value !== '') {
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      const newUrls = [...urlList];
                      newUrls.splice(index + 1, 0, '');
                      setUrlList(newUrls);
                    } else if (e.key === 'Backspace' && url === '' && urlList.length > 1) {
                      e.preventDefault();
                      const newUrls = [...urlList];
                      newUrls.splice(index, 1);
                      setUrlList(newUrls);
                    }
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    const pastedText = e.clipboardData.getData('text');
                    const lines = pastedText.split('\n').map(l => l.trim()).filter(l => l);
                    if (lines.length > 0) {
                      const newUrls = [...urlList];
                      newUrls.splice(index, 1, ...lines);
                      if (newUrls[newUrls.length - 1] !== '') {
                        newUrls.push('');
                      }
                      setUrlList(newUrls);
                    }
                  }}
                  disabled={isProcessing}
                  placeholder={index === 0 ? "Paste URLs here... (Hit enter for new line)" : ""}
                  className={`flex-1 p-2 bg-transparent border-0 focus:ring-0 text-sm resize-none overflow-hidden outline-none ${urlList.length === 1 && url === '' ? 'h-[350px]' : ''}`}
                  rows={1}
                />
                {urlList.length > 1 && (
                  <button
                    onClick={() => {
                      const newUrls = [...urlList];
                      newUrls.splice(index, 1);
                      setUrlList(newUrls);
                    }}
                    className="mt-1 p-1 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={() => setUrlList([...urlList, ''])}
            disabled={isProcessing}
            className="w-full p-3 text-sm text-indigo-600 font-medium hover:bg-indigo-50 border-t border-slate-200 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Add another URL
          </button>
        </div>
        
        <button
          onClick={handleStartImport}
          disabled={isProcessing || !urlList.some(u => u.trim())}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-3.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg shadow-sm"
        >
          <Play className="w-6 h-6" />
          Start Bulk Import
        </button>
      </div>

      {/* Progress Modal */}
      {(isProcessing || tasks.length > 0) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Import Progress</h3>
                <p className="text-slate-500 text-sm mt-1">
                  {isProcessing ? `Processing (${progress}%)` : 'Import Complete'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-sm font-medium text-slate-600">
                  {tasks.filter(t => t.status === 'success').length} / {tasks.length} Completed
                </span>
                {!isProcessing && (
                  <button onClick={() => setTasks([])} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors">
                     <span className="sr-only">Close</span>
                     <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-0">
                <ul className="divide-y divide-slate-100">
                  {tasks.map((task) => (
                    <li key={task.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className="mt-1">
                          {getStatusIcon(task.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {task.title || 'Extracting title...'}
                          </p>
                          <p className="text-xs text-slate-500 truncate mt-0.5" title={task.url}>
                            {task.url}
                          </p>
                          
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              task.status === 'success' ? 'bg-emerald-100 text-emerald-700' :
                              task.status === 'error' ? 'bg-rose-100 text-rose-700' :
                              task.status === 'fetching' || task.status === 'saving' ? 'bg-indigo-100 text-indigo-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {getStatusText(task.status)}
                            </span>
                            {task.errorMsg && (
                              <span className="text-xs text-rose-600 line-clamp-1">{task.errorMsg}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
            </div>
            
            {!isProcessing && (
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-4 justify-end">
                <button
                  onClick={() => setTasks([])}
                  className="px-6 py-2.5 rounded-lg font-medium text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  Close & Import More
                </button>
                <button
                  onClick={() => navigate('/sales-channels/listings')}
                  className="px-6 py-2.5 rounded-lg font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2"
                >
                  View Draft Listings
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" /></svg>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkImport;
