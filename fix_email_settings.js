const fs = require('fs');
const path = '/Users/deepakmalik/Downloads/wholesale-platform1/frontend/src/components/Settings/EmailSettings.jsx';

let code = fs.readFileSync(path, 'utf8');

// Update State
code = code.replace(
  /const \[zohoStatus, setZohoStatus\] = useState\(\{ loading: true, connected: false \}\);/,
  `const [zohoStatus, setZohoStatus] = useState({ loading: true, accounts: [] });`
);
code = code.replace(
  /const \[gmailStatus, setGmailStatus\] = useState\(\{ loading: true, connected: false \}\);/,
  `const [gmailStatus, setGmailStatus] = useState({ loading: true, accounts: [] });`
);

// Update checkZohoStatus
code = code.replace(
  /setZohoStatus\(\{ loading: false, connected: response\.data\.connected \}\);/g,
  `setZohoStatus({ loading: false, accounts: response.data.accounts || [] });`
);
code = code.replace(
  /setZohoStatus\(\{ loading: false, connected: false \}\);/g,
  `setZohoStatus({ loading: false, accounts: [] });`
);

// Update checkGmailStatus
code = code.replace(
  /setGmailStatus\(\{ loading: false, connected: true, email: res\.data\.email \}\);/g,
  `setGmailStatus({ loading: false, accounts: res.data.accounts || [] });`
);
code = code.replace(
  /setGmailStatus\(\{ loading: false, connected: false \}\);/g,
  `setGmailStatus({ loading: false, accounts: [] });`
);

// Update Zoho JSX block
const zohoJsxStart = code.indexOf(`{zohoStatus.loading ? (`);
const zohoJsxEnd = code.indexOf(`<div style={{ height: '1px', background: '#e2e8f0', margin: '8px 0' }} />`);

const newZohoJsx = `{zohoStatus.loading ? (
              <div style={{ color: '#64748b', fontSize: '14px' }}>Checking connection...</div>
            ) : (
              <div>
                {zohoStatus.accounts.map(acc => (
                  <div key={acc.id} style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', background: '#ecfdf5', padding: '12px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                      <CheckCircle size={20} />
                      <div style={{ flex: 1 }}>
                        <strong style={{ display: 'block', color: '#065f46', fontSize: '14px' }}>{acc.email}</strong>
                        <span style={{ fontSize: '12px' }}>Syncing via Zoho</span>
                      </div>
                      <button
                        onClick={async () => {
                          if (!window.confirm(\`Disconnect \${acc.email}?\`)) return;
                          try {
                            await api.delete(\`/zoho/disconnect?userId=\${user.id}&accountId=\${acc.id}\`);
                            checkZohoStatus();
                            showToast('Zoho disconnected successfully');
                          } catch (err) {
                            showToast('Failed to disconnect Zoho', 'error');
                          }
                        }}
                        style={{ padding: '6px 12px', borderRadius: '6px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', cursor: 'pointer', fontWeight: '500', fontSize: '12px' }}
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                ))}
                
                <a 
                  href={\`http://localhost:5000/api/zoho/login?userId=\${user?.id}\`}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#0f172a', color: 'white', padding: '12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '500', textDecoration: 'none', marginTop: '8px' }}
                >
                  {zohoStatus.accounts.length > 0 ? 'Connect Another Zoho Account' : 'Sign in with Zoho'}
                </a>
              </div>
            )}

            `;

code = code.substring(0, zohoJsxStart) + newZohoJsx + code.substring(zohoJsxEnd);


// Update Gmail JSX block
const gmailJsxStart = code.indexOf(`{gmailStatus.loading ? (`);
const gmailJsxEnd = code.indexOf(`</div>\n        </div>\n\n      </div>\n    </div>\n  );\n}`);

const newGmailJsx = `{gmailStatus.loading ? (
              <div className="flex items-center text-gray-500 text-sm">
                <span className="mr-2">⏳</span> Checking status...
              </div>
            ) : (
              <div>
                {gmailStatus.accounts.map(acc => (
                  <div key={acc.id} style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', background: '#ecfdf5', padding: '12px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                      <CheckCircle size={20} />
                      <div style={{ flex: 1 }}>
                        <strong style={{ display: 'block', color: '#065f46', fontSize: '14px' }}>{acc.email}</strong>
                        <span style={{ fontSize: '12px' }}>Syncing via Gmail</span>
                      </div>
                      <button
                        onClick={async () => {
                          if (!window.confirm(\`Disconnect \${acc.email}?\`)) return;
                          try {
                            await api.delete(\`/google/disconnect?userId=\${user.id}&accountId=\${acc.id}\`);
                            checkGmailStatus();
                            showToast('Gmail disconnected successfully');
                          } catch (err) {
                            showToast('Failed to disconnect Gmail', 'error');
                          }
                        }}
                        style={{ padding: '6px 12px', borderRadius: '6px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', cursor: 'pointer', fontWeight: '500', fontSize: '12px' }}
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                ))}
                
                <button
                  onClick={handleConnectGmail}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#ea4335', color: 'white', padding: '12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '500', marginTop: '8px' }}
                >
                  {gmailStatus.accounts.length > 0 ? 'Connect Another Google Account' : 'Sign in with Google'}
                </button>
              </div>
            )}
          `;

code = code.substring(0, gmailJsxStart) + newGmailJsx + code.substring(gmailJsxEnd);

fs.writeFileSync(path, code);
console.log('done');
