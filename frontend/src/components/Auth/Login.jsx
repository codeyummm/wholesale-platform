import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Smartphone, Mail, Lock } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const result = await login(formData.email, formData.password);
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom right, #2563eb, #1e40af)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ maxWidth: '28rem', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '4rem', height: '4rem', background: 'white', borderRadius: '50%', marginBottom: '1rem' }}>
            <Smartphone color="#2563eb" size={32} />
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white', marginBottom: '0.5rem' }}>
            Wholesale Platform
          </h1>
          <p style={{ color: '#dbeafe' }}>Manage your mobile phone inventory</p>
        </div>

        <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Sign In</h2>
          
          {error && (
            <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '0.375rem', color: '#dc2626', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>Email</label>
              <div style={{ position: 'relative' }}>
                <Mail style={{ position: 'absolute', left: '0.75rem', top: '0.75rem', color: '#9ca3af' }} size={20} />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={{ width: '100%', paddingLeft: '2.5rem', paddingRight: '1rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}
                  placeholder="admin@wholesale.com"
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock style={{ position: 'absolute', left: '0.75rem', top: '0.75rem', color: '#9ca3af' }} size={20} />
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  style={{ width: '100%', paddingLeft: '2.5rem', paddingRight: '1rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', background: '#2563eb', color: 'white', padding: '0.5rem', borderRadius: '0.5rem', fontWeight: '500', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: '#6b7280' }}>
            Demo: admin@wholesale.com / admin123
          </p>
        </div>
      </div>
    </div>
  );
}
