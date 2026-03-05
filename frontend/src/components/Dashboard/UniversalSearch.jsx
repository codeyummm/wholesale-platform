import { useState, useEffect, useRef } from 'react';
import { Search, X, FileText, Package, User, Clock, Building2, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';

const getIconForType = (type) => {
  const icons = {
    sale: FileText,
    inventory: Package,
    customer: User,
    supplier: Building2,
    invoice: Truck
  };
  return icons[type] || FileText;
};

export default function UniversalSearch() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const recent = JSON.parse(localStorage.getItem('recentSearches') || '[]');
    setRecentSearches(recent);
  }, []);

  useEffect(() => {
    const searchAll = async () => {
      if (query.length < 1) { setResults([]); return; }
      setLoading(true);
      try {
        const [salesRes, inventoryRes, customersRes] = await Promise.all([
          api.get('/sales').catch(() => ({ data: [] })),
          api.get('/inventory').catch(() => ({ data: [] })),
          api.get('/customers').catch(() => ({ data: [] }))
        ]);
        const sales = salesRes.data.data || salesRes.data || [];
        const inventory = inventoryRes.data.data || inventoryRes.data || [];
        const customers = customersRes.data.data || customersRes.data || [];
        const searchResults = [];
        const q = query.toLowerCase();

        sales.forEach(sale => {
          let matchScore = 0;
          let matchReason = '';
          if (sale.saleNumber?.toLowerCase().includes(q)) { matchScore += 20; matchReason = `Sale #${sale.saleNumber}`; }
          if (sale.customerName?.toLowerCase().includes(q)) { matchScore += 15; matchReason = sale.customerName; }
          if (sale.shipping?.trackingNumber?.toLowerCase().includes(q)) { matchScore += 18; matchReason = `Tracking: ${sale.shipping.trackingNumber}`; }
          if (sale.salesChannel?.toLowerCase().includes(q)) { matchScore += 10; matchReason = `Channel: ${sale.salesChannel}`; }
          if (sale.totalAmount?.toString().includes(q)) { matchScore += 12; }
          sale.items?.forEach(item => {
            if (item.imei?.toLowerCase().includes(q)) { matchScore += 25; matchReason = `IMEI: ${item.imei}`; }
            if (item.brand?.toLowerCase().includes(q)) { matchScore += 12; }
            if (item.model?.toLowerCase().includes(q)) { matchScore += 12; }
          });
          if (matchScore > 0) {
            searchResults.push({
              type: 'sale',
              title: `Sale #${sale.saleNumber}`,
              subtitle: matchReason || `${sale.customerName} • $${sale.totalAmount?.toFixed(2)}`,
              meta: new Date(sale.createdAt).toLocaleDateString(),
              score: matchScore
            });
          }
        });

        inventory.forEach(item => {
          let matchScore = 0;
          if (item.model?.toLowerCase().includes(q)) { matchScore += 15; }
          if (item.brand?.toLowerCase().includes(q)) { matchScore += 15; }
          item.devices?.forEach(device => {
            if (device.imei?.toLowerCase().includes(q)) {
              searchResults.push({
                type: 'inventory',
                title: `${item.brand} ${item.model}`,
                subtitle: `IMEI: ${device.imei} • ${device.isSold ? 'SOLD' : 'Available'}`,
                meta: device.condition || '',
                score: 30
              });
        }
          });
          if (matchScore > 0) {
            searchResults.push({
              type: 'inventory',
              title: `${item.brand} ${item.model}`,
              subtitle: `${item.quantity} in stock`,
              meta: `$${item.price?.retail}`,
              score: matchScore
            });
          }
        });

        customers.forEach(customer => {
          let matchScore = 0;
          if (customer.name?.toLowerCase().includes(q)) { matchScore += 20; }
          if (customer.company?.toLowerCase().includes(q)) { matchScore += 15; }
          if (customer.email?.toLowerCase().includes(q)) { matchScore += 18; }
          if (customer.phone?.includes(q)) { matchScore += 18; }
          if (matchScore > 0) {
            searchResults.push({
              type: 'customer',
              title: customer.name,
              subtitle: customer.company || customer.email,
              meta: customer.phone,
              score: matchScore
            });
          }
        });

        searchResults.sort((a, b) => b.score - a.score);
        setResults(searchResults.slice(0, 10));
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    const debounce = setTimeout(searchAll, 150);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleResultClick = (result) => {
    const recent = JSON.parse(localStorage.getItem('recentSearches') || '[]');
    const newRecent = [result, ...recent.filter(r => r.title !== result.title)].slice(0, 5);
    localStorage.setItem('recentSearches', JSON.stringify(newRecent));
    setRecentSearches(newRecent);
    setIsOpen(false);
    setQuery('');
    if (result.type === 'sale') navigate('/sales');
    else if (result.type === 'inventory') navigate('/inventory');
    else if (result.type === 'customer') navigate('/customers');
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-2xl">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input type="text" placeholder="Search: orders, IMEI, tracking, customers, channels..." value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }} onFocus={() => setIsOpen(true)}
          className="w-full pl-12 pr-12 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
        {query && <button onClick={() => { setQuery(''); setResults([]); }} className="absolute right-4 top-1/2 transform -translate-y-1/2"><X className="w-4 h-4 text-gray-400 hover:text-gray-600" /></button>}
      </div>
      {isOpen && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-lg border max-h-96 overflow-y-auto z-50">
          {query.length === 0 && recentSearches.length > 0 ? (
            <div className="py-2">
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 flex items-center gap-2"><Clock className="w-3 h-3" /> Recent</div>
              {recentSearches.map((r, i) => {
                const Icon = getIconForType(r.type);
                return <button key={i} onClick={() => handleResultClick(r)} className="w-full px-4 py-3 hover:bg-gray-50 flex items-center gap-3 text-left">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center"><Icon className="w-5 h-5 text-gray-600" /></div>
                  <div className="flex-1"><div className="font-medium text-sm">{r.title}</div><div className="text-xs text-gray-500 truncate">{r.subtitle}</div></div>
                </button>;
              })}
            </div>
          ) : loading ? (
            <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div></div>
          ) : results.length === 0 && query ? (
            <div className="p-8 text-center"><Search className="w-12 h-12 text-gray-300 mx-auto mb-2" /><p className="text-sm text-gray-500">No results</p></div>
          ) : (
            <div className="py-2">
              {results.length > 0 && <div className="px-4 py-2 text-xs font-semibold text-gray-500">Found {results.length}</div>}
              {results.map((r, i) => {
                const Icon = getIconForType(r.type);
                const colors = { sale: { bg: 'bg-blue-50', text: 'text-blue-600' }, inventory: { bg: 'bg-purple-50', text: 'text-purple-600' }, customer: { bg: 'bg-green-50', text: 'text-green-600' } };
                const color = colors[r.type] || colors.sale;
                return <button key={i} onClick={() => handleResultClick(r)} className="w-full px-4 py-3 hover:bg-gray-50 flex items-center gap-3 text-left">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color.bg}`}><Icon className={`w-5 h-5 ${color.text}`} /></div>
                  <div className="flex-1 min-w-0"><div className="font-medium text-sm truncate">{r.title}</div><div className="text-xs text-gray-500 truncate">{r.subtitle}</div></div>
                  <div className="text-xs text-gray-400 shrink-0">{r.meta}</div>
                </button>;
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}