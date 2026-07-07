import re

with open('frontend/src/components/Inventory/InventoryList.jsx', 'r') as f:
    target_code = f.read()

# 1. Add states
state_code = """  const [showDeviceHistory, setShowDeviceHistory] = useState(false);
  const [selectedDeviceHistory, setSelectedDeviceHistory] = useState(null);"""

target_code = target_code.replace('const [showLabelModal, setShowLabelModal] = useState(false);', 
                                  'const [showLabelModal, setShowLabelModal] = useState(false);\n' + state_code)

# 2. Add handleViewDeviceHistory
handle_code = """  const handleViewDeviceHistory = async (inventoryId, device) => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/inventory/${inventoryId}`);
      if (res.data.success) {
        const foundDevice = res.data.data.devices.find(d => d.imei === device.imei);
        setSelectedDeviceHistory({ 
          ...foundDevice, 
          inventoryId, 
          brand: res.data.data.brand, 
          model: res.data.data.model 
        });
        setShowDeviceHistory(true);
      }
    } catch (err) { 
      console.error(err); 
    }
  };"""

target_code = target_code.replace('const handleEditDevice =', handle_code + '\n\n  const handleEditDevice =')

# 3. Add button in expanded row
btn_code = """<button onClick={() => handleViewDeviceHistory(item._id, device)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", padding: "6px 10px", background: "#fef3c7", border: "1px solid #fcd34d", color: "#92400e", borderRadius: "6px", cursor: "pointer", fontSize: "0.75rem", fontWeight: "500" }}>📜 History</button>"""

target_code = target_code.replace('<button onClick={() => handlePrintLabel(device, item)} style={{ flex: 1, display: \'flex\', alignItems: \'center\', justifyContent: \'center\', gap: \'4px\', padding: \'6px 10px\', background: \'#f0fdf4\', border: \'1px solid #bbf7d0\', color: \'#16a34a\', borderRadius: \'6px\', cursor: \'pointer\', fontSize: \'0.75rem\', fontWeight: \'500\' }}><Printer size={14} /> Print Label</button>',
                                  '<button onClick={() => handlePrintLabel(device, item)} style={{ flex: 1, display: \'flex\', alignItems: \'center\', justifyContent: \'center\', gap: \'4px\', padding: \'6px 10px\', background: \'#f0fdf4\', border: \'1px solid #bbf7d0\', color: \'#16a34a\', borderRadius: \'6px\', cursor: \'pointer\', fontSize: \'0.75rem\', fontWeight: \'500\' }}><Printer size={14} /> Print Label</button>\n                                        ' + btn_code)

# 4. Add modal
modal_code = """
        {/* Device History Modal */}
        {showDeviceHistory && selectedDeviceHistory && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '1rem' }}>
            <div style={{ background: 'white', borderRadius: '1rem', padding: '2rem', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>Device History Trace</h2>
                  <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '4px 0 0' }}>{selectedDeviceHistory.brand} {selectedDeviceHistory.model} - IMEI: {selectedDeviceHistory.imei}</p>
                </div>
                <button onClick={() => setShowDeviceHistory(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} color="#6b7280" /></button>
              </div>

              {selectedDeviceHistory.timeline && selectedDeviceHistory.timeline.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {selectedDeviceHistory.timeline.map((entry, idx) => (
                    <div key={idx} style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', background: '#f9fafb' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <strong style={{ color: '#1f2937', textTransform: 'capitalize' }}>{entry.action.replace('_', ' ')}</strong>
                        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{new Date(entry.timestamp).toLocaleString()}</span>
                      </div>
                      {entry.details && <p style={{ fontSize: '0.85rem', color: '#4b5563', margin: '0 0 0.5rem' }}>{entry.details}</p>}
                      {entry.user && <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0 }}>By: {entry.user}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ textAlign: 'center', color: '#6b7280', fontStyle: 'italic', padding: '2rem 0' }}>No timeline trace logs found for this device.</p>
              )}
            </div>
          </div>
        )}
"""

target_code = target_code.replace('      </div>\n    </div>\n  );\n}', modal_code + '      </div>\n    </div>\n  );\n}')

with open('frontend/src/components/Inventory/InventoryList.jsx', 'w') as f:
    f.write(target_code)

