import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, ShieldCheck, Battery, Cpu, Smartphone, QrCode, Printer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../../utils/api';

export default function DeviceReport() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchReport();
  }, [id]);

  const fetchReport = async () => {
    try {
      // First try to fetch by ID, if it looks like an ObjectId
      let res;
      if (id.length === 24) {
        res = await api.get(`/device-tests/${id}`);
      } else {
        // Otherwise treat it as IMEI and get the latest
        res = await api.get(`/device-tests/imei/${id}`);
      }

      if (res.data.success) {
        // If it was an IMEI lookup, it returns an array
        const data = Array.isArray(res.data.data) ? res.data.data[0] : res.data.data;
        if (!data) {
          setError("No diagnostic report found for this device.");
        } else {
          setReport(data);
        }
      }
    } catch (err) {
      setError("Failed to load device report.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md w-full border border-gray-100">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Report Not Found</h1>
          <p className="text-gray-500 mb-6">{error}</p>
          <Link to="/" className="bg-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-primary/90">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  const { testResults, summary, deviceInfo, createdAt, imei, testedBy } = report;
  const isPassed = summary.failedTests === 0;

  return (
    <div className="min-h-screen bg-[#f8f9fa] py-12 px-4 sm:px-6 font-sans print:min-h-0 print:py-0 print:px-0 print:bg-white">
      <div className="max-w-4xl mx-auto">
        
        {/* Certificate Wrapper */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden relative print:shadow-none print:border-none print:rounded-none">
          
          {/* Header */}
          <div className="border-b border-gray-100 px-8 py-6 print:px-0 print:py-4 flex flex-col sm:flex-row justify-between items-center bg-white relative z-10">
            <div className="flex items-center gap-3 mb-4 sm:mb-0">
              <div className="w-10 h-10 print:w-8 print:h-8 bg-primary rounded-lg flex items-center justify-center shadow-inner print:shadow-none">
                <ShieldCheck className="text-white w-6 h-6 print:w-5 print:h-5" />
              </div>
              <div>
                <h1 className="text-2xl print:text-xl font-bold text-gray-900 tracking-tight">Certified Device Report</h1>
                <p className="text-xs text-gray-500 font-medium tracking-wide uppercase mt-0.5">Verified Diagnostic Results</p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex flex-col items-end gap-2">
                <button 
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 text-xs font-bold text-white bg-gray-900 hover:bg-gray-800 px-3 py-1.5 rounded-lg uppercase tracking-wide print:hidden transition-colors shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Report
                </button>
                <div className="text-right mt-2 print:mt-0">
                  <div className="text-[10px] text-gray-400 font-bold uppercase mb-1 tracking-wider print:mb-0">Certificate ID</div>
                  <div className="text-xs font-mono text-gray-900 bg-gray-50 print:bg-transparent px-3 py-1 print:px-0 print:py-0 rounded border border-gray-200 print:border-none">
                    {report._id}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 print:p-0 print:pt-4">
            {/* Top Section: Overall Status Badge */}
            <div className="mb-8 print:mb-4">
              <div className={`p-6 print:p-3 border rounded-xl flex items-center justify-between ${isPassed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} print:border-gray-200 print:bg-gray-50`}>
                <div className="flex items-center gap-4 print:gap-3">
                  {isPassed ? (
                    <CheckCircle className="w-12 h-12 print:w-8 print:h-8 text-green-500 print:text-gray-900" />
                  ) : (
                    <XCircle className="w-12 h-12 print:w-8 print:h-8 text-red-500 print:text-gray-900" />
                  )}
                  <div>
                    <div className={`text-2xl print:text-lg font-black uppercase tracking-tight ${isPassed ? 'text-green-700' : 'text-red-700'} print:text-gray-900`}>
                      {isPassed ? 'Fully Functional' : 'Attention Needed'}
                    </div>
                    <div className="text-sm print:text-xs font-medium text-gray-500 mt-1 print:mt-0">
                      {summary.passedTests} passed, {summary.failedTests} failed out of {summary.totalTests} components
                    </div>
                  </div>
                </div>
                <div className="text-right hidden sm:block">
                  <div className="text-xs text-gray-500 mb-1 print:mb-0">Test Date</div>
                  <div className="text-gray-900 print:text-sm font-medium">{new Date(createdAt).toLocaleString()}</div>
                </div>
              </div>
            </div>

            {/* Device Info Cards */}
            <div className="mb-8 print:mb-4">
              <div className="flex items-center gap-3 mb-4 print:mb-2">
                <div className="w-10 h-10 print:hidden bg-[#eef2ff] rounded-lg flex items-center justify-center">
                  <Smartphone className="text-primary w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl print:text-base font-bold text-gray-900 leading-tight">Device Info</h2>
                  <p className="text-sm print:text-xs text-gray-500">{imei || report.deviceId || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 print:grid-cols-3 gap-4 print:gap-2">
                <div className="bg-gray-50 rounded-xl print:rounded-md p-4 print:p-2 border border-gray-100 print:border-gray-200">
                  <div className="text-xs text-gray-400 font-medium mb-1 print:mb-0">Model</div>
                  <div className="font-semibold text-gray-900 print:text-sm truncate">
                    {report.inventoryInfo?.model || 'Unknown Model'} {report.inventoryInfo?.brand ? `(${report.inventoryInfo.brand})` : ''}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl print:rounded-md p-4 print:p-2 border border-gray-100 print:border-gray-200">
                  <div className="text-xs text-gray-400 font-medium mb-1 print:mb-0">Storage</div>
                  <div className="font-semibold text-gray-900 print:text-sm">
                    {report.inventoryInfo?.storage || 'N/A'}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl print:rounded-md p-4 print:p-2 border border-gray-100 print:border-gray-200">
                  <div className="text-xs text-gray-400 font-medium mb-1 print:mb-0">Color</div>
                  <div className="font-semibold text-gray-900 print:text-sm">
                    {report.inventoryInfo?.color || 'N/A'}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl print:rounded-md p-4 print:p-2 border border-gray-100 print:border-gray-200">
                  <div className="text-xs text-gray-400 font-medium mb-1 print:mb-0">Condition</div>
                  <div className="font-semibold text-gray-900 print:text-sm capitalize">
                    {report.inventoryInfo?.condition || 'N/A'}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl print:rounded-md p-4 print:p-2 border border-gray-100 print:border-gray-200">
                  <div className="text-xs text-gray-400 font-medium mb-1 print:mb-0">Grade</div>
                  <div className="font-semibold text-gray-900 print:text-sm">
                    {report.inventoryInfo?.grade || 'N/A'}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl print:rounded-md p-4 print:p-2 border border-gray-100 print:border-gray-200">
                  <div className="text-xs text-gray-400 font-medium mb-1 print:mb-0">Lock Status</div>
                  <div className="font-semibold text-gray-900 print:text-sm capitalize">
                    {report.inventoryInfo?.unlockStatus || 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* IMEI Lab Verification Data */}
            {(() => {
              const labData = report.inventoryInfo?.labData;
              if (!labData) return null;

              // Parse the CODE string which contains the real data as HTML
              let parsedLabData = {};
              if (labData.CODE && typeof labData.CODE === 'string') {
                const lines = labData.CODE.split(/<br\s*\/?>|\n/i);
                lines.forEach(line => {
                  if (!line.trim()) return;
                  // Strip HTML tags (like <span style="color: green">)
                  const cleanLine = line.replace(/<[^>]*>?/gm, '').trim();
                  const separatorIdx = cleanLine.indexOf(':');
                  if (separatorIdx !== -1) {
                    const key = cleanLine.substring(0, separatorIdx).trim();
                    const val = cleanLine.substring(separatorIdx + 1).trim();
                    if (key && val) parsedLabData[key] = val;
                  }
                });
              } else {
                // Fallback for different API formats (strip internal keys)
                const ignoreKeys = ['MESSAGE', 'REFERENCEID', 'ORDERID', 'STATUS', 'COMMENTS', 'CODE'];
                Object.entries(labData).forEach(([k, v]) => {
                  if (!ignoreKeys.includes(k) && v) {
                    parsedLabData[k] = v;
                  }
                });
              }

              if (Object.keys(parsedLabData).length === 0) return null;

              return (
                <div className="mb-10 print:mb-4 bg-gray-50 print:bg-transparent rounded-xl print:rounded-md border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 print:px-3 print:py-2 border-b border-gray-200 bg-gray-50 print:bg-transparent flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 print:w-4 print:h-4 text-green-500 print:text-gray-900" />
                    <h3 className="font-bold text-gray-900 print:text-sm">IMEI Lab Verification Data</h3>
                  </div>
                  <div className="p-6 print:p-3 grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-4 print:gap-2">
                    {Object.entries(parsedLabData).map(([key, value]) => (
                      <div key={key} className="bg-white rounded-lg print:rounded-md p-4 print:p-2 border border-gray-200 shadow-sm print:shadow-none">
                        <div className="text-[10px] uppercase tracking-wider text-gray-400 print:text-gray-500 font-bold mb-1 print:mb-0">
                          {key.replace(/_/g, ' ')}
                        </div>
                        <div className="font-medium text-gray-900 text-sm print:text-xs truncate">
                          {value.toString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Hardware Diagnostics Grid */}
            <h2 className="text-xl print:text-base font-bold text-gray-900 mb-6 print:mb-2 flex items-center gap-2">
              <Cpu className="w-6 h-6 print:hidden text-primary" />
              Hardware Diagnostics
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 print:grid-cols-4 gap-4 print:gap-2 mb-10 print:mb-4">
              {Object.entries(testResults || {}).map(([key, result]) => {
                const isPass = result.status === 'passed';
                const isFail = result.status === 'failed';
                
                return (
                  <div key={key} className={`flex items-center justify-between p-4 print:p-2 rounded-xl print:rounded-md border ${isPass ? 'bg-green-50/30 border-green-100' : isFail ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-200'} print:bg-transparent print:border-gray-200`}>
                    <span className="text-sm print:text-xs font-medium text-gray-700 capitalize truncate pr-2">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <div className="shrink-0">
                      {isPass ? (
                        <CheckCircle className="w-5 h-5 print:w-4 print:h-4 text-green-500 print:text-gray-900" />
                      ) : isFail ? (
                        <XCircle className="w-5 h-5 print:w-4 print:h-4 text-red-500 print:text-gray-900" />
                      ) : (
                        <div className="w-5 h-5 print:w-4 print:h-4 flex items-center justify-center text-xs font-bold text-gray-400 bg-gray-200 print:bg-transparent rounded-full">-</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer / Verification */}
            <div className="border-t border-gray-200 pt-8 print:pt-4 mt-8 print:mt-4 flex flex-col sm:flex-row items-center justify-between gap-6 print:gap-2">
              <div className="flex-1">
                <h3 className="text-sm font-bold text-gray-900 mb-2">Verification Notice</h3>
                <p className="text-xs text-gray-500 leading-relaxed max-w-xl">
                  This report certifies that the device with the specified IMEI has undergone comprehensive hardware diagnostics. The results displayed above reflect the exact condition of the device components at the time of testing.
                </p>
              </div>
              <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="bg-white p-1 rounded shadow-sm">
                  <QRCodeSVG 
                    value={window.location.href}
                    size={80}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900 mb-1">Scan to Verify</div>
                  <div className="text-xs text-gray-500 max-w-[120px]">
                    Verify the authenticity of this report online.
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
        
        {/* Subtle Branding Footer */}
        <div className="mt-8 text-center text-sm text-gray-400 font-medium">
          Generated by Wholesale Platform
        </div>
      </div>
    </div>
  );
}
