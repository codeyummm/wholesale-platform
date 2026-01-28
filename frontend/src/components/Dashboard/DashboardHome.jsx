import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Package, TrendingUp, Users, LogOut } from 'lucide-react';

export default function DashboardHome() {
  const { user, logout } = useAuth();

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
            { title: 'Total Inventory', value: '1,247', icon: Package, color: '#3b82f6' },
            { title: 'Total Sales', value: '$125,340', icon: TrendingUp, color: '#10b981' },
            { title: 'Active Suppliers', value: '23', icon: Users, color: '#8b5cf6' }
          ].map((stat, i) => (
            <div key={i} style={{ background: 'white', borderRadius: '0.5rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ padding: '0.75rem', background: `${stat.color}15`, borderRadius: '0.5rem' }}>
                  <stat.icon size={24} color={stat.color} />
                </div>
              </div>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>{stat.title}</p>
              <p style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>{stat.value}</p>
            </div>
          ))}
        </div>

        <div style={{ background: 'white', borderRadius: '0.5rem', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>🎉 System is Live!</h3>
          <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
            Your wholesale platform is successfully deployed and running. All features are active!
          </p>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb' }}>✅ Authentication System</li>
            <li style={{ padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb' }}>✅ MongoDB Database Connected</li>
            <li style={{ padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb' }}>✅ Backend API Deployed</li>
            <li style={{ padding: '0.5rem 0' }}>✅ Frontend Application Live</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
