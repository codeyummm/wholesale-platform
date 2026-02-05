import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Auth/Login';
import DashboardHome from './components/Dashboard/DashboardHome';
import InventoryList from './components/Inventory/InventoryList';
import SupplierList from './components/Suppliers/SupplierList';
import InvoicesPage from './pages/InvoicesPage';
import PhoneTestModule from './components/DeviceTest/PhoneTestModule';
import axios from 'axios';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a0f', color: '#fff' }}>
        <div>Loading...</div>
      </div>
    );
  }
  return user ? children : <Navigate to="/login" replace />;
}

const saveTestResults = async (testData) => {
  try {
    const response = await axios.post(`${import.meta.env.VITE_API_URL}/device-tests`, testData);
    if (response.data.success) {
      alert('Test results saved successfully!');
      return response.data;
    }
  } catch (error) {
    console.error('Error saving test results:', error);
    alert('Failed to save test results: ' + (error.response?.data?.error || error.message));
  }
};

function DeviceTestPage() {
  return <PhoneTestModule onSaveResults={saveTestResults} />;
}

function DeviceTestWithIMEI() {
  const { imei } = useParams();
  const [searchParams] = useSearchParams();
  const inventoryId = searchParams.get('inventoryId');
  
  return (
    <PhoneTestModule 
      imei={imei} 
      inventoryId={inventoryId}
      onSaveResults={saveTestResults} 
    />
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<PrivateRoute><DashboardHome /></PrivateRoute>} />
          <Route path="/inventory" element={<PrivateRoute><InventoryList /></PrivateRoute>} />
          <Route path="/suppliers" element={<PrivateRoute><SupplierList /></PrivateRoute>} />
          <Route path="/invoices" element={<PrivateRoute><InvoicesPage /></PrivateRoute>} />
          <Route path="/device-test" element={<PrivateRoute><DeviceTestPage /></PrivateRoute>} />
          <Route path="/device-test/:imei" element={<PrivateRoute><DeviceTestWithIMEI /></PrivateRoute>} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
