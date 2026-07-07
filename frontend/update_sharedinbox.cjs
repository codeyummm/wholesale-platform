const fs = require('fs');
const path = '/Users/deepakmalik/Downloads/wholesale-platform1/frontend/src/components/Messages/SharedInbox.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Remove the modal at the bottom
const modalStart = "      {/* Compose Modal */}";
const modalEndMarker = "      )}";
const modalStartIndex = content.indexOf(modalStart);
if (modalStartIndex !== -1) {
  // Find the closing brace of the modal by looking for the last `      )}` before the final `    </div>`
  const lastDivIndex = content.lastIndexOf("    </div>\n  );\n}");
  const modalEndIndex = content.lastIndexOf("      )}", lastDivIndex) + "      )}".length;
  if (modalEndIndex > modalStartIndex) {
    content = content.substring(0, modalStartIndex) + content.substring(modalEndIndex + 1); // +1 for newline
  }
}

// 2. Insert the new inline Compose UI at the beginning of the Right Column
const rightColStart = "{/* Right Column: Ticket Thread */}\n      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'white', minWidth: 0 }}>";

const newComposeUI = `
        {showCompose ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <h2 style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: '#1e293b' }}>New Message</h2>
              <div style={{ display: 'flex', gap: '12px', color: '#64748b' }}>
                <button onClick={() => setShowCompose(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }}><X size={16} /></button>
              </div>
            </div>

            <form onSubmit={handleComposeSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '0 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #e2e8f0', padding: '12px 0' }}>
                  <label style={{ width: '50px', color: '#64748b', fontSize: '14px' }}>From</label>
                  <select 
                    value={composeData.accountId}
                    onChange={(e) => setComposeData({...composeData, accountId: e.target.value})}
                    style={{ flex: 1, border: 'none', outline: 'none', fontSize: '14px', background: 'transparent', color: '#0f172a' }}
                    required
                  >
                    {emailAccounts.length === 0 && <option value="">No connected accounts found</option>}
                    {emailAccounts.map(acc => (
                      <option key={acc._id} value={acc._id}>
                        {acc.emailAddress}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #e2e8f0', padding: '12px 0' }}>
                  <label style={{ width: '50px', color: '#64748b', fontSize: '14px' }}>To</label>
                  <input 
                    type="email" 
                    value={composeData.to}
                    onChange={(e) => setComposeData({...composeData, to: e.target.value})}
                    style={{ flex: 1, border: 'none', outline: 'none', fontSize: '14px', color: '#0f172a' }}
                    required
                  />
                  <div style={{ color: '#64748b', fontSize: '13px', cursor: 'pointer', display: 'flex', gap: '8px' }}>
                    <span>Cc</span>
                    <span>Bcc</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #e2e8f0', padding: '12px 0' }}>
                  <input 
                    type="text" 
                    placeholder="Subject"
                    value={composeData.subject}
                    onChange={(e) => setComposeData({...composeData, subject: e.target.value})}
                    style={{ flex: 1, border: 'none', outline: 'none', fontSize: '14px', color: '#0f172a' }}
                    required
                  />
                </div>
              </div>

              <textarea 
                value={composeData.content}
                onChange={(e) => setComposeData({...composeData, content: e.target.value})}
                style={{ flex: 1, padding: '24px', border: 'none', outline: 'none', fontSize: '14px', resize: 'none', color: '#0f172a' }}
                required
              />

              <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button 
                  type="submit"
                  disabled={isSendingCompose}
                  style={{ padding: '10px 24px', background: '#0b57d0', color: 'white', border: 'none', borderRadius: '24px', cursor: isSendingCompose ? 'wait' : 'pointer', fontWeight: '500', opacity: isSendingCompose ? 0.7 : 1, fontSize: '14px' }}
                >
                  {isSendingCompose ? 'Sending...' : 'Send'}
                </button>
                <div style={{ display: 'flex', gap: '16px', color: '#475569', alignItems: 'center' }}>
                  <span style={{ fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}>Aa</span>
                  <Paperclip size={18} style={{ cursor: 'pointer' }} />
                </div>
              </div>
            </form>
          </div>
        ) :`;

// We need to replace `{selectedConv ? (` with the new UI which checks showCompose first
const selectedConvIndex = content.indexOf("{selectedConv ? (");
if (selectedConvIndex !== -1 && content.indexOf(rightColStart) !== -1) {
  content = content.replace("{selectedConv ? (", newComposeUI + " selectedConv ? (");
}

fs.writeFileSync(path, content);
console.log("Successfully updated SharedInbox.jsx inline compose UI");
