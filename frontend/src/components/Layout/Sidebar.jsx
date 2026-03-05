import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, ShoppingCart, Package, Users, Building2, 
  FileText, Search, UserCog, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { theme } = useTheme();

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/sales', icon: ShoppingCart, label: 'Sales' },
    { path: '/inventory', icon: Package, label: 'Inventory' },
    { path: '/customers', icon: Users, label: 'Customers' },
    { path: '/suppliers', icon: Building2, label: 'Suppliers' },
    { path: '/invoices', icon: FileText, label: 'Invoices' },
    { path: '/imei-history', icon: Search, label: 'IMEI Lookup' },
    { path: '/user-management', icon: UserCog, label: 'User Management' },
  ];

  return (
    <div className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`}>
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <img 
          src={theme === 'dark' ? '/logos/udeal-light.png' : '/logos/udeal-dark.png'} 
          alt="Udeal" 
          className={collapsed ? "h-8 w-auto object-contain mx-auto" : "h-12 w-auto object-contain"} 
        />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <ChevronRight className="w-5 h-5 text-gray-600" /> : <ChevronLeft className="w-5 h-5 text-gray-600" />}
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              title={collapsed ? item.label : ''}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="text-sm">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}