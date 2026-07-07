const fs = require('fs');
const path = '/Users/deepakmalik/Downloads/wholesale-platform1/frontend/src/components/Settings/EmailSettings.jsx';

let code = fs.readFileSync(path, 'utf8');

// 1. Add Zoho Modal State
const stateInjectionPoint = `const [gmailStatus, setGmailStatus] = useState({ loading: true, accounts: [] });`;
const zohoModalState = `  // Zoho Alias Selection Modal State
  const [showZohoModal, setShowZohoModal] = useState(false);
  const [zohoAliases, setZohoAliases] = useState([]);
  const [selectedZohoAliases, setSelectedZohoAliases] = useState([]);
  const [zohoAccountId, setZohoAccountId] = useState(null);
  const [zohoFinalizing, setZohoFinalizing] = useState(false);
`;

code = code.replace(stateInjectionPoint, `${stateInjectionPoint}\n${zohoModalState}`);

// 2. Add useEffect to check URL parameters for zohoSetup
const checkZohoStatusStr = `  const checkZohoStatus = async () => {`;
const zohoUrlEffect = `
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('zohoSetup') === 'true' && params.get('accountId')) {
      const accId = params.get('accountId');
      setZohoAccountId(accId);
      setShowZohoModal(true);
      fetchZohoAliases(accId);
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const fetchZohoAliases = async (accId) => {
    try {
      const res = await api.get(\`/zoho/aliases?accountId=\${accId}\`);
      if (res.data.success && res.data.aliases) {
        setZohoAliases(res.data.aliases);
        // By default, select all
        setSelectedZohoAliases(res.data.aliases);
      }
    } catch (err) {
      console.error('Failed to fetch Zoho aliases', err);
      showToast('Failed to fetch Zoho aliases', 'error');
      setShowZohoModal(false);
    }
  };

  const handleFinalizeZoho = async () => {
    if (selectedZohoAliases.length === 0) {
      return showToast('Please select at least one email address to sync.', 'error');
    }
    setZohoFinalizing(true);
    try {
      const res = await api.post('/zoho/finalize', {
        accountId: zohoAccountId,
        selectedEmails: selectedZohoAliases
      });
      if (res.data.success) {
        showToast('Zoho accounts connected successfully!');
        setShowZohoModal(false);
        checkZohoStatus();
      } else {
        showToast('Failed to finalize Zoho connection.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to finalize Zoho connection.', 'error');
    } finally {
      setZohoFinalizing(false);
    }
  };
`;
code = code.replace(checkZohoStatusStr, `${zohoUrlEffect}\n${checkZohoStatusStr}`);

// 3. Add Zoho Modal JSX at the end of the return statement
const returnEndStr = `    </div>\n  );\n}`;
const zohoModalJsx = `
      {/* Zoho Alias Selection Modal */}
      {showZohoModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '450px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: '600', color: '#0f172a' }}>Select Zoho Email Addresses</h3>
            <p style={{ margin: '0 0 20px', fontSize: '14px', color: '#64748b' }}>
              We detected the following email addresses on your Zoho account. Select which ones you want to connect to your Shared Inbox.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto', marginBottom: '24px' }}>
              {zohoAliases.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>Loading aliases...</div>
              ) : (
                zohoAliases.map(alias => (
                  <label key={alias} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedZohoAliases.includes(alias)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedZohoAliases([...selectedZohoAliases, alias]);
                        } else {
                          setSelectedZohoAliases(selectedZohoAliases.filter(a => a !== alias));
                        }
                      }}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '15px', color: '#1e293b', fontWeight: '500' }}>{alias}</span>
                  </label>
                ))
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowZohoModal(false)}
                disabled={zohoFinalizing}
                style={{ padding: '8px 16px', borderRadius: '6px', background: 'white', border: '1px solid #cbd5e1', color: '#475569', fontWeight: '500', cursor: zohoFinalizing ? 'not-allowed' : 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleFinalizeZoho}
                disabled={zohoFinalizing || zohoAliases.length === 0}
                style={{ padding: '8px 16px', borderRadius: '6px', background: '#10b981', border: 'none', color: 'white', fontWeight: '500', cursor: (zohoFinalizing || zohoAliases.length === 0) ? 'not-allowed' : 'pointer' }}
              >
                {zohoFinalizing ? 'Connecting...' : 'Connect Selected'}
              </button>
            </div>
          </div>
        </div>
      )}
`;

code = code.replace(returnEndStr, `${zohoModalJsx}\n${returnEndStr}`);

fs.writeFileSync(path, code);
console.log('done');
