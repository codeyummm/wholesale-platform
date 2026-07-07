import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Smartphone, CheckCircle, XCircle, Search, Clock, QrCode } from 'lucide-react';
import api from '../../utils/api';

export default function TestHistory() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedTest, setSelectedTest] = useState(null);

  useEffect(() => {
    fetchTests();
  }, [search]);

  const fetchTests = async () => {
    setLoading(true);
    try {
      const response = await api.get('/device-tests', {
        params: { search, limit: 50 }
      });
      if (response.data.success) {
        setTests(response.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Device Test History</h1>
          <p className="text-gray-500 text-sm mt-1">Review diagnostic results for all tested devices</p>
        </div>
        <Link to="/device-test" className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 flex items-center gap-2">
          <Smartphone className="w-4 h-4" />
          Run New Test
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search IMEI or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-700">
              <tr>
                <th className="px-6 py-3 font-medium">Date & Time</th>
                <th className="px-6 py-3 font-medium">IMEI / Device ID</th>
                <th className="px-6 py-3 font-medium">Tested By</th>
                <th className="px-6 py-3 font-medium">Pass Rate</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    <div className="flex justify-center mb-2">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    Loading test history...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-red-500">
                    Error loading data: {error}
                  </td>
                </tr>
              ) : tests.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    No tests found matching your criteria.
                  </td>
                </tr>
              ) : (
                tests.map((test) => (
                  <tr key={test._id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelectedTest(test)}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        {formatDate(test.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{test.imei || 'N/A'}</div>
                      {test.deviceId && <div className="text-xs text-gray-500 mt-1">ID: {test.deviceId}</div>}
                    </td>
                    <td className="px-6 py-4">{test.testedBy || 'Unknown User'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${test.summary?.passRate >= 80 ? 'bg-green-500' : test.summary?.passRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${test.summary?.passRate || 0}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium">{test.summary?.passRate || 0}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap flex items-center justify-between">
                      {test.overallStatus === 'passed' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Passed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                          <XCircle className="w-3.5 h-3.5" />
                          Failed
                        </span>
                      )}
                      <span className="text-primary text-xs font-medium hover:underline">View Details</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Test Details Modal */}
      {selectedTest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4" onClick={() => setSelectedTest(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Diagnostic Details</h2>
                <p className="text-sm text-gray-500">IMEI: {selectedTest.imei}</p>
              </div>
              <button 
                className="text-gray-400 hover:text-gray-600 p-1"
                onClick={() => setSelectedTest(null)}
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Tested By</div>
                  <div className="font-medium">{selectedTest.testedBy || 'Unknown User'}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Date & Time</div>
                  <div className="font-medium">{formatDate(selectedTest.createdAt)}</div>
                </div>
              </div>

              <h3 className="font-semibold text-gray-900 mb-3 border-b pb-2">Component Results</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(selectedTest.testResults || {}).map(([key, result]) => (
                  <div key={key} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg bg-gray-50">
                    <span className="text-sm font-medium text-gray-700 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    {result.status === 'passed' ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded">
                        <CheckCircle className="w-3 h-3" /> PASS
                      </span>
                    ) : result.status === 'failed' ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded">
                        <XCircle className="w-3 h-3" /> FAIL
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-bold text-gray-500 bg-gray-200 px-2 py-1 rounded">
                        SKIP
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
              <a 
                href={`/report/${selectedTest._id}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary font-medium hover:underline flex items-center gap-2"
              >
                <QrCode className="w-4 h-4" />
                View Public Report
              </a>
              <button 
                className="bg-gray-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors"
                onClick={() => setSelectedTest(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
