import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Auth/Login';
import DashboardLayout from './components/Layout/DashboardLayout';
import DashboardHome from './components/Dashboard/DashboardHome';
import InventoryList from './components/Inventory/InventoryList';
import SupplierList from './components/Suppliers/SupplierList';
import InvoicesPage from './pages/InvoicesPage';
import PhoneTestModule from './components/DeviceTest/PhoneTestModule';
import DeviceReport from './components/DeviceTest/DeviceReport';
import TestHistory from './components/DeviceTest/TestHistory';
import CustomerList from './components/Customers/CustomerList';
import CustomerOrders from './components/Customers/CustomerOrders';
import SalesList from './components/Sales/SalesList';
import SaleDetails from './components/Sales/SaleDetails';
import IMEILookup from './components/IMEILookup/IMEILookup';
import IMEILabDashboard from './components/IMEILab/IMEILabDashboard';
import SalesChannels from './components/SalesChannels/SalesChannels';
import ListingsHub from './components/Listings/ListingsHub';
import ListingEditor from './components/Listings/ListingEditor';
import ShippingDashboard from './components/Shipping/ShippingDashboard';
import ReportsPage from './components/Reports/ReportsPage';
import Messages from './components/Messages/Messages';
import EmailSettings from './components/Settings/EmailSettings';
import UserManagement from './components/UserManagement/UserManagement';
import NovaAssistant from './components/Agent/NovaAssistant';
import api from './utils/api';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8fafc' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTop: '4px solid #6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ color: '#64748b', fontSize: '14px' }}>Loading...</span>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }
  return user ? <DashboardLayout>{children}</DashboardLayout> : <Navigate to="/login" replace />;
}

const saveTestResults = async (testData) => {
  try {
    const response = await api.post('/device-tests', testData);
    if (response.data.success) {
      return response.data;
    }
  } catch (error) {
    console.error('Error saving test results:', error);
    throw error;
  }
};

function DeviceTestPage() {
  const { user } = useAuth();
  return <PhoneTestModule user={user} onSaveResults={saveTestResults} />;
}

function DeviceTestWithIMEI() {
  const { user } = useAuth();
  const { imei } = useParams();
  const [searchParams] = useSearchParams();
  const inventoryId = searchParams.get('inventoryId');
  const deviceId = searchParams.get('deviceId');
  return <PhoneTestModule user={user} imei={imei} inventoryId={inventoryId} deviceId={deviceId} onSaveResults={saveTestResults} />;
}

function App() {
  return (
      <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/report/:id" element={<DeviceReport />} />
          <Route path="/dashboard" element={<PrivateRoute><DashboardHome /></PrivateRoute>} />
          <Route path="/nova" element={<PrivateRoute><NovaAssistant /></PrivateRoute>} />
          <Route path="/inventory" element={<PrivateRoute><InventoryList /></PrivateRoute>} />
          <Route path="/suppliers" element={<PrivateRoute><SupplierList /></PrivateRoute>} />
          <Route path="/invoices" element={<PrivateRoute><InvoicesPage /></PrivateRoute>} />
          <Route path="/device-test" element={<PrivateRoute><DeviceTestPage /></PrivateRoute>} />
          <Route path="/device-test/history" element={<PrivateRoute><TestHistory /></PrivateRoute>} />
          <Route path="/customers/:customerId/orders" element={<PrivateRoute><CustomerOrders /></PrivateRoute>} />
          <Route path="/device-test/:imei" element={<PrivateRoute><DeviceTestWithIMEI /></PrivateRoute>} />
          <Route path="/customers" element={<PrivateRoute><CustomerList /></PrivateRoute>} />
          <Route path="/sales" element={<PrivateRoute><SalesList /></PrivateRoute>} />
          <Route path="/sales/:id" element={<PrivateRoute><SaleDetails /></PrivateRoute>} />
          <Route path="/settings/email" element={<PrivateRoute><EmailSettings /></PrivateRoute>} />
          <Route path="/sales-channels" element={<PrivateRoute><SalesChannels /></PrivateRoute>} />
          <Route path="/sales-channels/listings" element={<PrivateRoute><ListingsHub /></PrivateRoute>} />
          <Route path="/sales-channels/listings/new" element={<PrivateRoute><ListingEditor /></PrivateRoute>} />
          <Route path="/sales-channels/listings/:id" element={<PrivateRoute><ListingEditor /></PrivateRoute>} />
          <Route path="/shipping" element={<PrivateRoute><ShippingDashboard /></PrivateRoute>} />
          <Route path="/messages" element={<PrivateRoute><Messages /></PrivateRoute>} />
          <Route path="/imei-history" element={<PrivateRoute><IMEILookup /></PrivateRoute>} />
          <Route path="/imei-lab" element={<PrivateRoute><IMEILabDashboard /></PrivateRoute>} />
          <Route path="/reports" element={<PrivateRoute><ReportsPage /></PrivateRoute>} />
          <Route path="/user-management" element={<PrivateRoute><UserManagement /></PrivateRoute>} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
