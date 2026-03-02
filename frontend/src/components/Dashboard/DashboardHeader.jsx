import { Camera, Package, Plus, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import UniversalSearch from './UniversalSearch';

export default function DashboardHeader() {
  const navigate = useNavigate();
  
  const quickActions = [
    { label: 'New Sale', icon: Plus, path: '/sales', color: 'bg-blue-100 hover:bg-blue-200 text-blue-700' },
    { label: 'Scan Invoice', icon: Camera, path: '/invoices', color: 'bg-purple-100 hover:bg-purple-200 text-purple-700' },
    { label: 'Add Inventory', icon: Package, path: '/inventory', color: 'bg-cyan-100 hover:bg-cyan-200 text-cyan-700' },
    { label: 'New Customer', icon: Users, path: '/customers', color: 'bg-green-100 hover:bg-green-200 text-green-700' },
  ];

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500">Welcome back! Here's your business overview</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <UniversalSearch />
          <div className="flex gap-2 shrink-0">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.path}
                  onClick={() => navigate(action.path)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm ${action.color}`}
                  title={action.label}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden xl:inline">{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}