import { useState, useEffect } from 'react';
import { FileText, Search, Calendar, Trash2, Download, Plus, ChevronDown, Loader2, Eye, Package } from 'lucide-react';
import api from '../utils/api';
import InvoiceScanner from '../components/InvoiceScanner';

const InvoicesPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [expandedInvoice, setExpandedInvoice] = useState(null);
  const [filters, setFilters] = useState({ search: '', startDate: '', endDate: '' });

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      const response = await api.get(`/invoices?${params}`);
      if (response.data.success) {
        setInvoices(response.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInvoices(); }, [filters.startDate, filters.endDate]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this invoice?')) return;
    try {
      await api.delete(`/invoices/${id}`);
      fetchInvoices();
    } catch (err) {
      alert('Failed to delete');
    }
  };

  const exportToCSV = () => {
    const headers = ['Invoice #', 'Supplier', 'Date', 'Total', 'Currency', 'Status'];
    const rows = invoices.map(inv => [
      inv.invoiceNumber || '',
      inv.supplierName,
      inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString() : '',
      inv.totalAmount,
      inv.currency,
      inv.status
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'invoices.csv';
    a.click();
  };

  const filteredInvoices = invoices.filter(inv => {
    if (!filters.search) return true;
    const s = filters.search.toLowerCase();
    return inv.invoiceNumber?.toLowerCase().includes(s) || inv.supplierName?.toLowerCase().includes(s);
  });

  const toggleExpand = (id) => {
    setExpandedInvoice(expandedInvoice === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Invoices</h1>
            <p className="text-gray-500">Manage scanned invoices</p>
          </div>
          <div className="flex gap-3">
            <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4" /> Export
            </button>
            <button onClick={() => setShowScanner(!showScanner)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
              <Plus className="w-4 h-4" /> Scan Invoice
            </button>
          </div>
        </div>

        {showScanner && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] overflow-auto relative">
              <button onClick={() => setShowScanner(false)} className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200 z-10">×</button>
              <InvoiceScanner onScanComplete={() => { setShowScanner(false); fetchInvoices(); }} />
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-m border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200">
            <button className="px-6 py-3 text-sm font-medium text-indigo-600 border-b-2 border-indigo-600">
              <FileText className="w-4 h-4 inline mr-2" />Invoices
            </button>
            <button className="px-6 py-3 text-sm font-medium text-gray-500 hover:text-gray-700">
              <Package className="w-4 h-4 inline mr-2" />Products
            </button>
            <button onClick={() => setShowScanner(true)} className="px-6 py-3 text-sm font-medium text-gray-500 hover:text-gray-700">
              <Plus className="w-4 h-4 inline mr-2" />Scan Invoice
            </button>
          </div>
          <div className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" placeholder="Search invoices..." value={filters.search} onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))} className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-400" />
                <input type="date" value={filters.startDate} onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <span className="text-gray-500">to</span>
                <input type="date" value={filters.endDate} onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
        ) : filteredInvoices.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 text-center py-12">
            <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">No invoices found</p>
            <button onClick={() => setShowScanner(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Scan Your First Invoice</button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredInvoices.map((inv) => (
              <div key={inv._id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center p-4 gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-14 h-14 bg-red-50 rounded-lg flex items-center justify-center">
                      <FileText className="w-6 h-6 text-red-500" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900">#{inv.invoiceNumber || 'N/A'}</h3>
                      <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">{inv.status}</span>
                      {inv.pdfUrl && <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">PDF</span>}
                    </div>
                    <p className="text-sm text-gray-500">{inv.items?.length || 0} products · {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString() : 'No date'}</p>
                    {inv.supplierName && <p className="text-sm text-gray-600 mt-1">Supplier: {inv.supplierName}</p>}
                  </div>
                  <div className="flex-shrink-0 text-right">                    <div className="text-2xl font-bold text-gray-900">${inv.totalAmount?.toFixed(2) || '0.00'}</div>
                    <div className="text-xs text-gray-500">{inv.currency || 'USD'}</div>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-2">
                    {inv.pdfUrl && (
                      <a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="View PDF">
                        <Eye className="w-5 h-5" />
                      </a>
                    )}
                    <a href={inv.pdfUrl} download className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Download">
                      <Download className="w-5 h-5" />
                    </a>
                    <button onClick={() => toggleExpand(inv._id)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                      <ChevronDown className={`w-5 h-5 transition-transform ${expandedInvoice === inv._id ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>
                {expandedInvoice === inv._id && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Invoice Items ({inv.items?.length || 0})</h4>
                    {inv.items && inv.items.length > 0 ? (
                      <div className="space-y-2">
                        {inv.items.map((item, idx) => (
                          <div key={idx} className="bg-white p-3 rounded-lg border border-gray-200">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{item.description || 'No description'}</p>
                                <p className="text-sm text-gray-500 mt-1">{item.imei && <span className="font-mono">IMEI: {item.imei}</span>}</p>
                              </div>
                              <div className="text-right ml-4">
                                <p className="font-semibold text-gray-900">${item.unitPrice?.toFixed(2) || '0.00'}</p>
                                <p className="text-xs text-gray-500">Qty: {item.quantity || 1}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No items available</p>
                    )}
                    <div className="mt-4 flex justify-end">
                      <button onClick={() => handleDelete(inv._id)} className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />Delete Invoice
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoicesPage;
