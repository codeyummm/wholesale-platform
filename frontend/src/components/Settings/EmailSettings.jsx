import React, { useState } from 'react';
import { Mail, Save, Globe, ArrowRight, ShieldCheck, Server, Sparkles, CheckCircle, Plus } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

export default function EmailSettings() {
  const { user } = useAuth();
  // SMTP Settings State
  const [settings, setSettings] = useState({
    smtpHost: '',
    smtpPort: '',
    smtpUser: '',
    smtpPass: '',
    fromEmail: '',
    fromName: ''
  });

  const [toast, setToast] = useState(null);

  // DNS Wizard State
  const [step, setStep] = useState(1);
  const [domain, setDomain] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [provider, setProvider] = useState(null);
  const [registrar, setRegistrar] = useState(null);
  const [injecting, setInjecting] = useState(false);
  const [emailPrefix, setEmailPrefix] = useState('sales');
  const [password, setPassword] = useState('');
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisionData, setProvisionData] = useState(null);
  
  const [showManualInstructions, setShowManualInstructions] = useState(false);

  // Existing IMAP Connect State
  const [imapEmail, setImapEmail] = useState('');
  const [imapPassword, setImapPassword] = useState('');
  const [connectingImap, setConnectingImap] = useState(false);
  const [zohoStatus, setZohoStatus] = useState({ loading: true, accounts: [] });
  const [gmailStatus, setGmailStatus] = useState({ loading: true, accounts: [] });
  // Zoho Alias Selection Modal State
  const [showZohoModal, setShowZohoModal] = useState(false);
  const [zohoAliases, setZohoAliases] = useState([]);
  const [selectedZohoAliases, setSelectedZohoAliases] = useState([]);
  const [zohoAccountId, setZohoAccountId] = useState(null);
  const [zohoFinalizing, setZohoFinalizing] = useState(false);


  React.useEffect(() => {
    if (user?.id) {
      checkZohoStatus();
      checkGmailStatus();
    }
  }, [user]);


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
      const res = await api.get(`/zoho/aliases?accountId=${accId}`);
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

  const checkZohoStatus = async () => {
    try {
      const response = await api.get(`/zoho/status?userId=${(user.id || user._id)}`);
      if (response.data.success) {
        setZohoStatus({ loading: false, accounts: response.data.accounts || [] });
      } else {
        setZohoStatus({ loading: false, accounts: [] });
      }
    } catch (error) {
      console.error('Failed to fetch Zoho status', error);
      setZohoStatus({ loading: false, accounts: [] });
    }
  };

  const checkGmailStatus = async () => {
    if (!user?.id) return;
    try {
      const res = await api.get(`/google/status?userId=${(user.id || user._id)}`);
      if (res.data.success) {
        setGmailStatus({ loading: false, accounts: res.data.accounts || [] });
      } else {
        setGmailStatus({ loading: false, accounts: [] });
      }
    } catch (err) {
      console.error('Failed to fetch Gmail status', err);
      setGmailStatus({ loading: false, accounts: [] });
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = () => {
    // Mock save
    showToast('Email settings saved successfully');
  };

  const handleConnectGmail = () => {
    // Redirect to the backend OAuth URL
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/google/login?userId=${(user.id || user._id)}`;
  };

  const handleConnect = async (e) => {
    e.preventDefault();
    if (!domain) return;
    
    setIsDetecting(true);
    setProvider(null);
    setRegistrar(null);
    
    try {
      const response = await api.post('/email/detect-provider', { domain });
      setProvider(response.data.provider);
      setRegistrar(response.data.registrar);
    } catch (error) {
      console.error('Failed to detect provider', error);
      showToast('Failed to detect provider', 'error');
    } finally {
      setIsDetecting(false);
    }
  };

  const handleOAuthLogin = () => {
    // Simulate an OAuth popup flow for supported providers
    const popup = window.open('', 'OAuth', 'width=500,height=600');
    if (popup) {
      popup.document.write(`<h2>Sign in to ${provider.name}</h2><p>Connecting your domain...</p>`);
      setTimeout(() => {
        popup.close();
        handleInjectRecords();
      }, 1500);
    } else {
      handleInjectRecords(); // Fallback if popup blocked
    }
  };

  const handleInjectRecords = async () => {
    setInjecting(true);
    try {
      const response = await api.post('/email/inject-records', {
        domain,
        providerId: provider.id
      });

      if (response.data.success) {
        showToast('DNS Records configured successfully!');
        setStep(2);
      } else {
        showToast(response.data.error || 'Failed to configure records', 'error');
      }
    } catch (error) {
      console.error('Configuration error:', error);
      showToast(error.response?.data?.error || 'Failed to configure records', 'error');
    } finally {
      setInjecting(false);
    }
  };

  const handleProvision = async (e) => {
    e.preventDefault();
    setIsProvisioning(true);
    try {
      const response = await api.post('/email/provision-mailbox', {
        domain,
        emailPrefix,
        password
      });

      if (response.data.success) {
        setProvisionData(response.data.details);
        setStep(3);
        showToast('Mailbox provisioned successfully!');
      } else {
        showToast(response.data.error || 'Failed to provision mailbox', 'error');
      }
    } catch (error) {
      console.error('Provision Error:', error);
      showToast(error.response?.data?.error || 'Failed to provision mailbox', 'error');
    } finally {
      setIsProvisioning(false);
    }
  };

  const autofillSettings = () => {
    if (!provisionData) return;
    setSettings({
      ...settings,
      smtpHost: provisionData.smtpServer,
      smtpPort: provisionData.smtpPort,
      smtpUser: provisionData.address,
      fromEmail: provisionData.address
    });
    showToast('Settings auto-filled from provisioned mailbox');
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {toast && (
        <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 9999, background: toast.type === 'success' ? '#10b981' : '#dc2626', color: 'white', padding: '12px 24px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          {toast.message}
        </div>
      )}

      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px' }}>Email Integration</h1>
        <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Configure outgoing SMTP credentials or provision new custom domain emails.</p>
      </div>

              {/* Third Card: Connect Existing Mailbox */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '32px', marginBottom: '24px' }}>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', margin: '0 0 8px' }}>Connect Existing Mailbox</h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: '1.5' }}>
              Already have Zoho Mail set up? Connect it here to automatically import emails into your CRM. You MUST use a <strong style={{ color: '#0f172a' }}>Zoho App Password</strong> (not your main password).
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '15px', margin: 0, color: '#1e293b' }}>Zoho Mail</h3>
            {zohoStatus.loading ? (
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
                          if (!window.confirm(`Disconnect ${acc.email}?`)) return;
                          try {
                            await api.delete(`/zoho/disconnect?userId=${(user.id || user._id)}&accountId=${acc.id}`);
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
                  href={`http://localhost:5000/api/zoho/login?userId=${user?.id}`}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#0f172a', color: 'white', padding: '12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '500', textDecoration: 'none', marginTop: '8px' }}
                >
                  {zohoStatus.accounts.length > 0 ? 'Connect Another Zoho Account' : 'Sign in with Zoho'}
                </a>
              </div>
            )}

            <div style={{ height: '1px', background: '#e2e8f0', margin: '8px 0' }} />
            
            <h3 style={{ fontSize: '15px', margin: 0, color: '#1e293b' }}>Gmail (IMAP)</h3>
            <p className="text-sm text-gray-500 mt-2 mb-4">
              Connect your Google account to automatically sync your Inbox, Sent, Drafts, and Trash. 
              All outgoing replies will also be sent from this Gmail address natively.
            </p>

            {gmailStatus.loading ? (
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
                          if (!window.confirm(`Disconnect ${acc.email}?`)) return;
                          try {
                            await api.delete(`/google/disconnect?userId=${(user.id || user._id)}&accountId=${acc.id}`);
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
          </div>
        </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '24px', alignItems: 'start' }}>
        
        {/* First Column: Domain Connect Wizard */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '32px' }}>
          
          {step === 1 && (
            <>
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 8px', color: '#0f172a' }}>Connect Your Domain</h2>
                <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
                  Enter your custom domain name below. We will automatically detect your hosting provider and configure your DNS records securely.
                </p>
              </div>

              <form onSubmit={handleConnect} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#0f172a', marginBottom: '8px' }}>
                    Domain Name
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Globe style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={20} />
                    <input 
                      type="text" 
                      style={{ width: '100%', padding: '10px 12px 10px 40px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '14px' }}
                      placeholder="e.g. mywholesale.com"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={!domain || isDetecting}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#3b82f6', color: 'white', padding: '10px', borderRadius: '6px', border: 'none', cursor: (!domain || isDetecting) ? 'not-allowed' : 'pointer', opacity: (!domain || isDetecting) ? 0.7 : 1, fontWeight: '500' }}
                >
                  {isDetecting ? (
                    <><Sparkles size={16} /> Detecting Provider...</>
                  ) : (
                    <>Detect & Connect <ArrowRight size={16} /></>
                  )}
                </button>
              </form>

              {provider && (
                <div style={{ marginTop: '24px', padding: '20px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', border: '1px solid #e2e8f0' }}>
                      {provider.icon}
                    </div>
                    <div>
                      <h3 style={{ margin: '0 0 4px', fontWeight: '600', fontSize: '16px', color: '#0f172a' }}>{provider.name} Detected</h3>
                      <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
                        {provider.id === 'generic' ? 'Please configure Zoho DNS records manually at your registrar.' : `Sign in to ${provider.name} to authorize automatic DNS configuration.`}
                      </p>
                    </div>
                  </div>

                  {registrar && registrar.toLowerCase().includes('porkbun') && provider.id !== 'porkbun' && (
                    <div style={{ marginBottom: '16px', padding: '12px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '6px', fontSize: '13px', color: '#b45309' }}>
                      <strong>Note:</strong> We see you registered this domain at Porkbun, but your nameservers are currently pointed to {provider.name}. The DNS automation must be performed at {provider.name}.
                    </div>
                  )}

                  {(() => {
                    const supportsOAuth = ['namesilo', 'cloudflare'].includes(provider.id);
                    
                    if (supportsOAuth) {
                      return (
                        <button 
                          onClick={handleOAuthLogin}
                          disabled={injecting}
                          style={{ width: '100%', padding: '10px', borderRadius: '6px', fontWeight: '500', color: 'white', background: provider.buttonColor, border: 'none', cursor: injecting ? 'not-allowed' : 'pointer', opacity: injecting ? 0.7 : 1 }}
                        >
                          {injecting ? 'Configuring...' : `Sign in to ${provider.name}`}
                        </button>
                      );
                    } else {
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <button 
                            onClick={() => setShowManualInstructions(!showManualInstructions)}
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', fontWeight: '500', color: '#1e293b', background: 'white', border: '1px solid #cbd5e1', cursor: 'pointer' }}
                          >
                            {showManualInstructions ? 'Hide Instructions' : 'View Manual DNS Instructions'}
                          </button>
                          
                          {showManualInstructions && (
                            <div style={{ padding: '16px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px' }}>
                              <p style={{ margin: '0 0 12px', color: '#475569' }}>Please add the following records to your {provider.name} DNS dashboard:</p>
                              
                              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginBottom: '16px' }}>
                                <thead>
                                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <th style={{ padding: '8px 0', color: '#1e293b' }}>Type</th>
                                    <th style={{ padding: '8px 0', color: '#1e293b' }}>Host / Name</th>
                                    <th style={{ padding: '8px 0', color: '#1e293b' }}>Value / Content</th>
                                    <th style={{ padding: '8px 0', color: '#1e293b' }}>Priority</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '8px 0', color: '#475569', fontWeight: '500' }}>MX</td>
                                    <td style={{ padding: '8px 0', color: '#475569' }}>@</td>
                                    <td style={{ padding: '8px 0', color: '#475569', fontFamily: 'monospace' }}>mx.zoho.com</td>
                                    <td style={{ padding: '8px 0', color: '#475569' }}>10</td>
                                  </tr>
                                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '8px 0', color: '#475569', fontWeight: '500' }}>MX</td>
                                    <td style={{ padding: '8px 0', color: '#475569' }}>@</td>
                                    <td style={{ padding: '8px 0', color: '#475569', fontFamily: 'monospace' }}>mx2.zoho.com</td>
                                    <td style={{ padding: '8px 0', color: '#475569' }}>20</td>
                                  </tr>
                                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '8px 0', color: '#475569', fontWeight: '500' }}>TXT</td>
                                    <td style={{ padding: '8px 0', color: '#475569' }}>@</td>
                                    <td style={{ padding: '8px 0', color: '#475569', fontFamily: 'monospace' }}>v=spf1 include:zoho.com ~all</td>
                                    <td style={{ padding: '8px 0', color: '#475569' }}>-</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          )}

                          <button 
                            onClick={() => setStep(2)}
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', fontWeight: '500', color: 'white', background: '#3b82f6', border: 'none', cursor: 'pointer' }}
                          >
                            I have added the records manually
                          </button>
                        </div>
                      );
                    }
                  })()}
                </div>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', marginBottom: '16px' }}>
                  <CheckCircle size={20} />
                  <span style={{ fontWeight: '500' }}>Domain Connected Successfully</span>
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 8px', color: '#0f172a' }}>Create your first email</h2>
                <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
                  Your domain <strong style={{ color: '#0f172a' }}>{domain}</strong> is active. Let's create an email address for it.
                </p>
              </div>

              <form onSubmit={handleProvision} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#0f172a', marginBottom: '8px' }}>Email Prefix</label>
                    <input 
                      type="text" 
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '14px' }}
                      value={emailPrefix}
                      onChange={(e) => setEmailPrefix(e.target.value)}
                    />
                  </div>
                  <div style={{ fontSize: '20px', color: '#94a3b8', marginTop: '28px' }}>@</div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#0f172a', marginBottom: '8px' }}>Domain</label>
                    <input 
                      type="text" 
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '14px', background: '#f8fafc', color: '#64748b', cursor: 'not-allowed' }}
                      value={domain}
                      disabled
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#0f172a', marginBottom: '8px' }}>Password</label>
                  <input 
                    type="password" 
                    placeholder="Enter a strong password"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '14px' }}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={!password || isProvisioning}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#3b82f6', color: 'white', padding: '10px', borderRadius: '6px', border: 'none', cursor: (!password || isProvisioning) ? 'not-allowed' : 'pointer', opacity: (!password || isProvisioning) ? 0.7 : 1, fontWeight: '500' }}
                >
                  {isProvisioning ? (
                    <><Server size={16} /> Provisioning Mailbox...</>
                  ) : (
                    <><Plus size={16} /> Create Mailbox</>
                  )}
                </button>
              </form>
            </>
          )}

          {step === 3 && provisionData && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', background: '#d1fae5', color: '#059669', marginBottom: '24px' }}>
                  <Mail size={32} />
                </div>
                <h2 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 12px', color: '#0f172a' }}>Mailbox Ready!</h2>
                <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
                  <strong style={{ color: '#0f172a' }}>{provisionData.address}</strong> has been successfully provisioned.
                </p>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '24px', marginBottom: '32px' }}>
                <h3 style={{ fontWeight: '600', fontSize: '16px', margin: '0 0 16px', color: '#0f172a' }}>IMAP Connection Details</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                    <span style={{ color: '#64748b' }}>Email Address:</span>
                    <strong style={{ color: '#0f172a' }}>{provisionData.address}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                    <span style={{ color: '#64748b' }}>Incoming (IMAP):</span>
                    <strong style={{ color: '#0f172a' }}>{provisionData.imapServer} : {provisionData.imapPort}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Outgoing (SMTP):</span>
                    <strong style={{ color: '#0f172a' }}>{provisionData.smtpServer} : {provisionData.smtpPort}</strong>
                  </div>
                </div>
              </div>

              <button 
                onClick={autofillSettings}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', fontWeight: '500', color: '#3b82f6', background: '#eff6ff', border: '1px solid #bfdbfe', cursor: 'pointer', marginBottom: '12px' }}
              >
                Auto-fill SMTP Settings below
              </button>
              
              <button 
                onClick={() => { setStep(1); setDomain(''); setPassword(''); }}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', fontWeight: '500', color: '#64748b', background: 'white', border: '1px solid #e2e8f0', cursor: 'pointer' }}
              >
                Create another mailbox
              </button>
            </>
          )}

        </div>

        {/* Second Column: SMTP Form */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', margin: 0 }}>SMTP Configuration</h2>
            <button 
              onClick={handleSave}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#1d4ed8', color: 'white', padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '500', fontSize: '13px' }}
            >
              <Save size={16} /> Save
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px' }}>SMTP Host</label>
              <input 
                type="text" 
                placeholder="smtp.example.com"
                value={settings.smtpHost}
                onChange={(e) => setSettings({...settings, smtpHost: e.target.value})}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px' }}>SMTP Port</label>
              <input 
                type="text" 
                placeholder="587"
                value={settings.smtpPort}
                onChange={(e) => setSettings({...settings, smtpPort: e.target.value})}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px' }}>SMTP Username</label>
              <input 
                type="text" 
                placeholder="user@example.com"
                value={settings.smtpUser}
                onChange={(e) => setSettings({...settings, smtpUser: e.target.value})}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px' }}>SMTP Password</label>
              <input 
                type="password" 
                placeholder="••••••••"
                value={settings.smtpPass}
                onChange={(e) => setSettings({...settings, smtpPass: e.target.value})}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}
              />
            </div>
            <div style={{ height: '1px', background: '#e2e8f0', margin: '8px 0' }} />
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px' }}>From Name</label>
              <input 
                type="text" 
                placeholder="Wholesale Platform"
                value={settings.fromName}
                onChange={(e) => setSettings({...settings, fromName: e.target.value})}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px' }}>From Email</label>
              <input 
                type="text" 
                placeholder="noreply@example.com"
                value={settings.fromEmail}
                onChange={(e) => setSettings({...settings, fromEmail: e.target.value})}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}
              />
            </div>
          </div>
        </div>



      </div>

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

    </div>
  );
}
