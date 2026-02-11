import React from 'react';
import Sidebar from './Sidebar';

export default function DashboardLayout({ children }) {
  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#f8fafc',
    }}>
      <Sidebar />
      <main style={{
        flex: 1,
        overflow: 'auto',
        position: 'relative',
      }}>
        <div style={{
          padding: '24px',
          maxWidth: '1400px',
          margin: '0 auto',
        }}
          className="main-content"
        >
          {children}
        </div>

        <style>{`
          @media (max-width: 768px) {
            .main-content {
              padding: 16px !important;
              padding-top: 64px !important;
            }
          }
        `}</style>
      </main>
    </div>
  );
}
