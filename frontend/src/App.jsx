import React, { useState, useEffect } from 'react';
import { Check, Loader, Smartphone } from 'lucide-react';

function App() {
  const [apiStatus, setApiStatus] = useState('checking');
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetch(`${apiUrl}/api/health`)
      .then(res => res.json())
      .then(() => setApiStatus('connected'))
      .catch(() => setApiStatus('error'));
  }, []);

  return (
    <div style={{minHeight: '100vh', background: 'linear-gradient(to bottom right, #dbeafe, #e0e7ff)', padding: '4rem 1rem'}}>
      <div style={{maxWidth: '48rem', margin: '0 auto', textAlign: 'center'}}>
        <div style={{display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '5rem', height: '5rem', background: '#2563eb', borderRadius: '9999px', marginBottom: '1.5rem'}}>
          <Smartphone color="white" size={40} />
        </div>
        
        <h1 style={{fontSize: '3rem', fontWeight: 'bold', marginBottom: '1rem'}}>
          Wholesale Platform
        </h1>
        
        <p style={{fontSize: '1.25rem', color: '#4b5563', marginBottom: '2rem'}}>
          Mobile Phone Management System
        </p>

        <div style={{background: 'white', borderRadius: '0.5rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '2rem', marginBottom: '2rem'}}>
          <h2 style={{fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem'}}>
            🎉 Deployment Status
          </h2>
          
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#f9fafb', borderRadius: '0.5rem', marginBottom: '1rem'}}>
            <span style={{fontWeight: '500'}}>Frontend</span>
            <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#059669'}}>
              <Check size={20} />
              <span>Deployed</span>
            </div>
          </div>

          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#f9fafb', borderRadius: '0.5rem'}}>
            <span style={{fontWeight: '500'}}>Backend API</span>
            {apiStatus === 'checking' && (
              <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#2563eb'}}>
                <Loader size={20} style={{animation: 'spin 1s linear infinite'}} />
                <span>Checking...</span>
              </div>
            )}
            {apiStatus === 'connected' && (
              <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#059669'}}>
                <Check size={20} />
                <span>Connected</span>
              </div>
            )}
            {apiStatus === 'error' && (
              <span style={{color: '#ea580c'}}>Pending Setup</span>
            )}
          </div>
        </div>

        <div style={{background: 'white', borderRadius: '0.5rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '2rem'}}>
          <h3 style={{fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem'}}>
            ✅ Successfully Deployed!
          </h3>
          <p style={{color: '#6b7280'}}>
            Your platform is live. Configure MongoDB to activate all features.
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
