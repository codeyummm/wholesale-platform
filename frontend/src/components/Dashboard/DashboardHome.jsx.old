import { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  TrendingUp, 
  Package, 
  Users, 
  ShoppingCart,
  AlertCircle 
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalSales: 0,
    totalRevenue: 0,
    totalProfit: 0,
    totalCustomers: 0,
    lowStockItems: 0,
    recentSales: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [salesRes, inventoryRes, customersRes] = await Promise.all([
        axios.get(`${API_URL}/sales`, { headers }),
        axios.get(`${API_URL}/inventory`, { headers }),
        axios.get(`${API_URL}/customers`, { headers })
      ]);

      const sales = salesRes.data;
      const inventory = inventoryRes.data;
      const customers = customersRes.data;

      const totalRevenue = sales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);
      const totalProfit = sales.reduce((sum, sale) => sum + (sale.totalProfit || 0), 0);
      const lowStock = inventory.filter(item => item.quantity < item.minStockLevel).length;

      setStats({
        totalSales: sales.length,
        totalRevenue,
        totalProfit,
        totalCustomers: customers.length,
        lowStockItems: lowStock,
        recentSales: sales.slice(0, 5)
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, trend, subtitle, colorClass }) => (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2 mt-2">
              <h2 className="text-3xl font-bold">{value}</h2>
              {trend && (
                <span className={`text-sm flex items-center ${trend > 0 ? 'text-success' : 'text-danger'}`}>
                  <TrendingUp size={14} className="mr-1" />
                  {Math.abs(trend)}%
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`rounded-full p-3 ${colorClass}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's what's happening today.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={`$${stats.totalRevenue.toLocaleString()}`}
          icon={DollarSign}
          trend={12.5}
          subtitle="vs last month"
          colorClass="bg-primary"
        />
        <StatCard
          title="Total Profit"
          value={`$${stats.totalProfit.toLocaleString()}`}
          icon={TrendingUp}
          trend={8.2}
          subtitle="vs last month"
          colorClass="bg-success"
        />
        <StatCard
          title="Total Sales"
          value={stats.totalSales}
          icon={ShoppingCart}
          subtitle={`${stats.totalCustomers} customers`}
          colorClass="bg-info"
        />
        <StatCard
          title="Low Stock Items"
          value={stats.lowStockItems}
          icon={AlertCircle}
          subtitle="Needs restocking"
          colorClass="bg-warning"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentSales.length > 0 ? (
                stats.recentSales.map((sale, index) => (
                  <div key={sale._id || index} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{sale.customerName || 'Walk-in Customer'}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(sale.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">${sale.totalAmount?.toFixed(2)}</p>
                      <Badge variant={sale.paymentStatus === 'paid' ? 'success' : 'warning'} className="text-xs">
                        {sale.paymentStatus}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No recent sales</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <button className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent transition-colors text-left">
                <ShoppingCart className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">New Sale</p>
                  <p className="text-xs text-muted-foreground">Create a new sale transaction</p>
                </div>
              </button>
              <button className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent transition-colors text-left">
                <Package className="w-5 h-5 text-success" />
                <div>
                  <p className="font-medium">Add Inventory</p>
                  <p className="text-xs text-muted-foreground">Add new items to inventory</p>
                </div>
              </button>
              <button className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent transition-colors text-left">
                <Users className="w-5 h-5 text-info" />
                <div>
                  <p className="font-medium">New Customer</p>
                  <p className="text-xs text-muted-foreground">Register a new customer</p>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
