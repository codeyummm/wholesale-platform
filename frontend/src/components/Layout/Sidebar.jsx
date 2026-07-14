import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, ShoppingCart, Package, Users, Building2, 
  FileText, Search, UserCog, ChevronLeft, ChevronRight, ChevronDown, Globe, Truck, Smartphone, MessageSquare, Settings, Sparkles
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

export default function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState({ 'Device Test': true });
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const { data } = await api.get('/ebay/messages/unread');
        if (data && data.success) {
          setUnreadCount(data.count || 0);
        }
      } catch (err) {
        console.error('Failed to fetch unread messages count:', err);
      }
    };
    
    // Fetch immediately and then poll every 60 seconds
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000);
    
    const handleRead = () => {
      setUnreadCount(prev => Math.max(0, prev - 1));
    };
    window.addEventListener('ebayMessageRead', handleRead);

    return () => {
      clearInterval(interval);
      window.removeEventListener('ebayMessageRead', handleRead);
    };
  }, []);

  const toggleExpand = (label) => {
    if (collapsed) setCollapsed(false);
    setExpanded(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const navItems = [
    { path: '/nova', icon: Sparkles, label: 'Nova AI' },
    { path: '/', icon: LayoutDashboard, label: 'Dashboard', perm: 'dashboard' },
    { path: '/sales', icon: ShoppingCart, label: 'Sales', perm: 'sales' },
    { path: '/inventory', icon: Package, label: 'Inventory', perm: 'inventory' },
    { path: '/sales-channels/listings', icon: Globe, label: 'Listings', perm: 'inventory' },
    { path: '/customers', icon: Users, label: 'Customers', perm: 'customers' },
    { path: '/suppliers', icon: Building2, label: 'Suppliers', perm: 'suppliers' },
    { path: '/invoices', icon: FileText, label: 'Invoices', perm: 'invoices' },
    { path: '/shipping', icon: Truck, label: 'Shipping', perm: 'shipping' },
    { path: '/messages', icon: MessageSquare, label: 'Messages', badge: unreadCount > 0 ? unreadCount : null },
    { path: '/imei-history', icon: Search, label: 'IMEI Lookup', perm: 'imeiLookup' },
    { path: '/imei-lab', icon: ShoppingCart, label: 'IMEI Lab', perm: 'imeiLab' },
    { 
      label: 'Device Test', 
      icon: Smartphone, 
      perm: 'deviceTest',
      subItems: [
        { path: '/device-test', label: 'Run Test' },
        { path: '/device-test/history', label: 'Test History' },
      ]
    },
    { 
      label: 'Settings', 
      icon: Settings, 
      perm: 'settings',
      subItems: [
        { path: '/settings/email', label: 'Email Settings' },
        { path: '/sales-channels', label: 'Sales Channels' }
      ]
    },
    { path: '/user-management', icon: UserCog, label: 'User Management', perm: 'userManagement' },
  ];

  const visibleNavItems = navItems.filter(item => {
    if (user?.role === 'admin') return true;
    if (item.reqAdmin) return false;
    if (!item.perm) return true;
    return user?.permissions?.[item.perm] === true;
  });

  return (
    <div className={`bg-white border-r border-gray-200 flex flex-col h-full min-h-0 max-h-screen transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`}>
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <img 
          src="/logos/udeal-dark.png"
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
      <nav className="flex-1 p-3 pb-24 space-y-1 overflow-y-auto min-h-0">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          
          if (item.subItems) {
            const isExpanded = expanded[item.label];
            return (
              <div key={item.label} className="space-y-1">
                <button
                  onClick={() => toggleExpand(item.label)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors text-gray-700 hover:bg-gray-100`}
                  title={collapsed ? item.label : ''}
                >
                  <div className="flex items-center gap-3 relative">
                    <Icon className="w-5 h-5 shrink-0" />
                    {!collapsed && <span className="text-sm">{item.label}</span>}
                  </div>
                  {!collapsed && (
                    isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                {isExpanded && !collapsed && (
                  <div className="pl-11 space-y-1">
                    {item.subItems.map(subItem => {
                      const isSubActive = location.pathname === subItem.path;
                      return (
                        <Link
                          key={subItem.path}
                          to={subItem.path}
                          className={`block px-3 py-2 rounded-lg transition-colors text-sm ${
                            isSubActive ? 'bg-primary/10 text-primary font-medium' : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {subItem.label}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            );
          }

          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              title={collapsed ? item.label : ''}
            >
              <div className="flex items-center gap-3 relative">
                <Icon className="w-5 h-5 shrink-0" />
                {collapsed && item.badge && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
                {!collapsed && <span className="text-sm">{item.label}</span>}
              </div>
              {!collapsed && item.badge && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
