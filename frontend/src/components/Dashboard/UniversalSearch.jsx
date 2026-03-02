import { useState, useEffect, useRef } from 'react';
import { Search, X, FileText, Package, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';

export default function UniversalSearch() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchAll = async () => {
      if (query.length < 2) { setResults([]); return; }
      setLoading(true);
      try {
        const [salesRes, inventoryRes, customersRes] = await Promise.all([
          api.get('/sales'), api.get('/inventory'), api.get('/customers')
        ]);
        const sales = salesRes.data.data || salesRes.data || [];
        const inventory = inventoryRes.data.data || inventoryRes.data || [];
        const customers = customersRes.data.data || customersRes.data || [];
        const searchResults = [];
        const q = query.toLowerCase();
        sales.forEach(sale => {
          if (sale.saleNumber?.toLowerCase().includes(q) || sale.customerName?.toLowerCase().includes(q) || 
              sale.shipping?.trackingNumber?.toLowerCase().includes(q) || sale.totalAmount?.toString().includes(q)) {
            searchResults.push({
              type: 'sale', icon: FileText, title: `Sale #${sale.saleNumber}`,
              subtitle: `${sale.customerName} • $${sale.totalAmount?.toFixed(2)}`,
              meta: new Date(sale.createdAt).toLocaleDateString(), data: sale
            });
          }
        });
        setResults(searchResults.slice(0, 10));
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    const debounce = setTimeout(searchAll, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleResultClick = (result) => {
    setIsOpen(false); setQuery('');
    if (result.type === 'sale') navigate('/sales');
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-2xl">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input type="text" placeholder="Search orders, IMEI, tracking..." value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }} onFocus={() => setIsOpen(true)}
          className="w-full pl-12 pr-12 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
        {query && <button onClick={() => { setQuery(''); setResults([]); }} className="absolute right-4 top-1/2 transform -translate-y-1/2"><X className="w-4 h-4 text-gray-400" /></button>}
      </div>
      {isOpen && query.length >= 2 && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-lg border max-h-96 overflow-y-auto z-50">
          {loading ? <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div></div> :
           results.length === 0 ? <div className="p-8 text-center text-sm text-gray-500">No results</div> :
           <div className="py-2">{results.map((r, i) => {
             const Icon = r.icon;
             return <button key={i} onClick={() => handleResultClick(r)} className="w-full px-4 py-3 hover:bg-gray-50 flex items-center gap-3 text-left">
               <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center"><Icon className="w-5 h-5 text-blue-600" /></div>
               <div className="flex-1"><div className="font-medium text-sm">{r.title}</div><div className="text-xs text-gray-500">{r.subtitle}</div></div>
             </button>;
           })}</div>}
        </div>
      )}
    </div>
  );
}
