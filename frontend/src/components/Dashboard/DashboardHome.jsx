import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Package, TrendingUp, Users, LogOut } from 'lucide-react';

export default function DashboardHome() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6' }}>
      <header style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '1rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Wholesale Platform</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>{user?.email}</span>
            <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}>
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem' }}>
          Welcome back, {user?.email}!
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          {[
            { title: 'Manage Inventory', icon: Package, color: '#3b82f6', onClick: () => navigate('/inventory') },
            { title: 'View Sales', icon: TrendingUp, color: '#10b981', onClick: () => alert('Coming soon!') },
            { title: 'Suppliers', icon: Users, color: '#8b5cf6', onClick: () => alert('Coming soon!') }
          ].map((item, i) => (
            <div 
              key={i} 
              onClick={item.onClick}
              style={{ background: 'white', borderRadius: '0.5rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', cursor: 'pointer', transition: 'transform 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ padding: '0.75rem', background: `${item.color}15`, borderRadius: '0.5rem' }}>
                  <item.icon size={24} color={item.color} />
                </div>
              </div>
              <p style={{ fontSize: '1.125rem', fontWeight: '600' }}>{item.title}</p>
            </div>
          ))}
        </div>

        <div style={{ background: 'white', borderRadius: '0.5rem', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>🎉 System is Live!</h3>
          <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
            Your wholesale platform is successfully deployed. Start managing your inventory!
          </p>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb' }}>✅ Authentication System</li>
            <li style={{ padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb' }}>✅ Inventory Management</li>
            <li style={{ padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb' }}>✅ Database Connected</li>
            <li style={{ padding: '0.5rem 0' }}>✅ Frontend & Backend Live</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
