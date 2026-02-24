import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  Package,
  Users,
  FileText,
  Smartphone,
  ShoppingCart,
  UserCircle,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  History
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/inventory', icon: Package, label: 'Inventory' },
  { path: '/suppliers', icon: Users, label: 'Suppliers' },
  { path: '/invoices', icon: FileText, label: 'Invoices' },
  { path: '/sales', icon: ShoppingCart, label: 'Sales' },
  { path: '/customers', icon: UserCircle, label: 'Customers' },
  { path: '/device-test', icon: Smartphone, label: 'Device Test' },
  { path: '/imei-history', icon: History, label: 'IMEI Lookup' },
  { path: '/reports', icon: BarChart3, label: 'Reports' },
];

const adminItems = [
  { path: '/user-management', icon: Settings, label: 'User Management' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const allItems = user?.role === 'admin' ? [...navItems, ...adminItems] : navItems;

  const sidebarContent = (
    <div className={`flex flex-col h-full bg-white border-r border-gray-200 transition-all duration-300 ${
      collapsed ? 'w-[72px]' : 'w-60'
    }`}>
      <div className={`flex items-center gap-3 border-b border-gray-200 min-h-[72px] ${
        collapsed ? 'justify-center p-5' : 'px-4 py-5'
      }`}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/40">
          <Smartphone size={20} className="text-gray-900" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="text-sm font-bold tracking-tight">WholesaleHub</div>
            <div className="text-[11px] text-gray-900/50 font-medium">Mobile Platform</div>
          </div>
        )}
      </div>

      <nav className="flex-1 p-3 overflow-y-auto overflow-x-hidden custom-scrollbar">
        <div className="space-y-1">
          {allItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                  collapsed ? 'justify-center' : ''
                } ${
                  isActive
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-gray-900/60 hover:bg-gray-100 hover:text-gray-900/90'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon 
                    size={19} 
                    className={`flex-shrink-0 transition-colors ${
                      isActive ? 'text-primary' : 'group-hover:text-primary'
                    }`}
                  />
                  {!collapsed && (
                    <span className="text-[13.5px] whitespace-nowrap">{item.label}</span>
                  )}
                  {!collapsed && isActive && (
                    <div className="ml-auto w-1 h-1 rounded-full bg-primary-400" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      <div className={`border-t border-gray-200 ${collapsed ? 'p-2' : 'p-4'}`}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className={`w-full mb-3 text-gray-900/50 hover:text-gray-900/80 hover:bg-gray-100 ${
            collapsed ? 'justify-center px-0' : 'justify-start'
          }`}
        >
          {collapsed ? (
            <ChevronRight size={18} />
          ) : (
            <>
              <ChevronLeft size={18} className="mr-2" />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </Button>

        <Separator className="bg-gray-100 mb-3" />

        <div className={`flex items-center gap-2.5 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-md">
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold truncate">
                  {user?.email || 'User'}
                </div>
                <Badge 
                  variant="secondary" 
                  className="text-[10px] capitalize bg-gray-100 text-gray-900/60 border-0 hover:bg-white/15"
                >
                  {user?.role || 'staff'}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="h-8 w-8 text-gray-900/40 hover:text-red-400 hover:bg-red-50"
                title="Logout"
              >
                <LogOut size={16} />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Button
        variant="default"
        size="icon"
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/40"
      >
        <Menu size={20} />
      </Button>

      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-[60] animate-in fade-in duration-200"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="w-60 h-full animate-in slide-in-from-left duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-gray-900 hover:bg-gray-100 z-[70]"
            >
              <X size={18} />
            </Button>
            {sidebarContent}
          </div>
        </div>
      )}

      <div className="hidden md:block flex-shrink-0">
        {sidebarContent}
      </div>

    </>
  );
}
