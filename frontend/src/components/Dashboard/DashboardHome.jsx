import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ShoppingCart, TrendingUp, TrendingDown, X, Package, DollarSign, User, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function DashboardHome() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activePeriod, setActivePeriod] = useState('14D');
  const [selectedSale, setSelectedSale] = useState(null);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [stats, setStats] = useState({ 
    totalRevenue: 0, 
    totalProfit: 0,
    lowStockItems: [], 
    recentSales: [], 
    salesData: [],
    todayRevenue: 0,
    yesterdayRevenue: 0,
    todayProfit: 0,
    yesterdayProfit: 0
  });

  useEffect(() => { fetchDashboardData(); }, [activePeriod]);

  const fetchDashboardData = async () => {
    try {
      const [salesRes, inventoryRes] = await Promise.all([api.get('/sales'), api.get('/inventory')]);
      const sales = salesRes.data.data || salesRes.data || [];
      const inventory = inventoryRes.data.data || inventoryRes.data || [];
      
      const totalRevenue = sales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);
      const totalProfit = sales.reduce((sum, sale) => sum + (sale.totalProfit || 0), 0);
      const lowStockItems = inventory.filter(item => item.quantity < (item.minStockLevel || 10));
      
      const today = new Date().setHours(0, 0, 0, 0);
      const yesterday = new Date(today - 86400000);
      const todaySales = sales.filter(s => new Date(s.createdAt).setHours(0,0,0,0) === today);
      const yesterdaySales = sales.filter(s => new Date(s.createdAt).setHours(0,0,0,0) === yesterday.getTime());
      const todayRevenue = todaySales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
      const yesterdayRevenue = yesterdaySales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
      const todayProfit = todaySales.reduce((sum, s) => sum + (s.totalProfit || 0), 0);
      const yesterdayProfit = yesterdaySales.reduce((sum, s) => sum + (s.totalProfit || 0), 0);

      const chartData = getChartData(sales, activePeriod);
      
      setStats({ 
        totalRevenue, 
        totalProfit,
        lowStockItems, 
        recentSales: sales.slice(0, 10), 
        salesData: chartData,
        todayRevenue,
        yesterdayRevenue,
        todayProfit,
        yesterdayProfit
      });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getChartData = (sales, period) => {
    const data = [];
    let days = 14;
    if (period === '1D') days = 1;
    else if (period === '7D') days = 7;
    else if (period === '14D') days = 14;
    else if (period === '1M') days = 30;
    else if (period === '3M') days = 90;
    else if (period === '1Y') days = 365;
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const daySales = sales.filter(s => new Date(s.createdAt).toDateString() === date.toDateString());
      const dayRevenue = daySales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
      data.push({ name: dateStr, value: dayRevenue });
    }
    return data;
  };

  const handleViewSale = (sale) => {
    setSelectedSale(sale);
    setShowSaleModal(true);
  };

  const revenueChange = stats.yesterdayRevenue > 0 
    ? (((stats.todayRevenue - stats.yesterdayRevenue) / stats.yesterdayRevenue) * 100).toFixed(1)
    : 0;
  const profitChange = stats.yesterdayProfit > 0
    ? (((stats.todayProfit - stats.yesterdayProfit) / stats.yesterdayProfit) * 100).toFixed(1)
    : 0;

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;

  return (
    <div className="space-y-6">
      <div className="grid xl:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Orders</CardTitle>
            <Button variant="link" size="sm" onClick={() => navigate('/sales')}>See All</Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 p-0 pt-5">
            <ToggleGroup type="single" value={activePeriod} onValueChange={(v) => v && setActivePeriod(v)} className="grid grid-cols-6 mb-4 mx-7">
              {['1D', '7D', '14D', '1M', '3M', '1Y'].map((period) => (
                <ToggleGroupItem key={period} value={period} className="h-7 text-xs">
                  {period}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <div className="flex items-center gap-2.5 px-7 mb-1.5">
              <span className="text-3xl font-semibold">${stats.totalRevenue.toLocaleString()}</span>
              <Badge className="bg-green-50 text-green-700">+4.7%</Badge>
            </div>
            <div className="h-48 w-full mb-5">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.salesData} margin={{ top: 10, right: 30, left: 30, bottom: 0 }}>
                  <defs>
                    <linearGradient id="orderGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="rgb(59, 130, 246)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="rgb(59, 130, 246)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="5 5" stroke="#e5e7eb" horizontal vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <YAxis hide domain={[0, 'auto']} />
                  <Tooltip content={({ active, payload, label }) => active && payload?.[0] && (
                    <div className="flex flex-col gap-2 p-3.5 bg-white border border-gray-200 rounded-lg shadow-lg">
                      <div className="font-medium text-sm text-gray-600">{label}</div>
                      <div className="font-semibold">${payload[0].value.toFixed(2)}</div>
                    </div>
                  )} />
                  <Area type="monotone" dataKey="value" stroke="rgb(59, 130, 246)" fill="url(#orderGradient)" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: 'rgb(59, 130, 246)', stroke: 'white', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Inventory</CardTitle>
            <Button variant="link" size="sm" onClick={() => navigate('/inventory')}>See All</Button>
          </CardHeader>
          <CardContent className="p-5">
            <div className="flex flex-col gap-0.5 mb-2">
              <span className="text-sm text-gray-500">Total Asset Value</span>
              <span className="text-3xl font-semibold">${stats.totalRevenue.toLocaleString()}</span>
            </div>
            <div className="flex gap-1 mb-2.5">
              <div className="bg-green-500 h-2 w-[60%] rounded" />
              <div className="bg-yellow-500 h-2 w-[25%] rounded" />
              <div className="bg-red-500 h-2 w-[15%] rounded" />
            </div>
            <div className="flex gap-4 mb-3.5 text-sm text-gray-600">
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-green-500 rounded-full" />Available</div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-yellow-500 rounded-full" />Low stock</div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-red-500 rounded-full" />Out</div>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Low stock</span>
              <Button variant="link" size="sm" onClick={() => navigate('/inventory')}>See All</Button>
            </div>
            <div className="flex flex-col gap-2">
              {stats.lowStockItems.slice(0, 3).map((item, i) => (
                <div key={i} className="flex justify-between bg-gray-50 rounded px-4 py-2 text-sm">
                  <span>{item.model}</span>
                  <div className="flex items-center gap-3">
                    <span>Qty: {item.quantity}</span>
                    <Separator className="bg-gray-300 h-3" orientation="vertical" />
                    <Link to="/inventory" className="hover:text-primary hover:underline">Order</Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Sales Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Sales</p>
                  <p className="text-2xl font-bold">${stats.todayRevenue.toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-1">
                  {revenueChange >= 0 ? <TrendingUp className="w-4 h-4 text-green-600" /> : <TrendingDown className="w-4 h-4 text-red-600" />}
                  <span className={`text-sm font-medium ${revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(revenueChange)}%
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Profit</p>
                  <p className="text-2xl font-bold">${stats.todayProfit.toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-1">
                  {profitChange >= 0 ? <TrendingUp className="w-4 h-4 text-green-600" /> : <TrendingDown className="w-4 h-4 text-red-600" />}
                  <span className={`text-sm font-medium ${profitChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(profitChange)}%
                  </span>
                </div>
              </div>
              <div className="text-xs text-gray-500 text-center">
                Compared to yesterday
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Sale #</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Items</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Channel</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Total</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Profit</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tracking</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {stats.recentSales.map((sale, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-semibold">{sale.saleNumber}</td>
                    <td className="px-6 py-4 text-sm">{sale.customerName}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{sale.items?.length || 0}</td>
                    <td className="px-6 py-4">
                      <Badge variant="secondary" className="text-xs">
                        {sale.salesChannel || 'N/A'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-right">
                      ${sale.totalAmount?.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-green-600 text-right">
                      ${sale.totalProfit?.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant={sale.status === 'completed' ? 'success' : sale.status === 'pending' ? 'secondary' : 'destructive'}>
                        {sale.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600 font-mono">
                      {sale.shipping?.trackingNumber ? sale.shipping.trackingNumber.slice(-8) : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(sale.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="link" size="sm" onClick={() => handleViewSale(sale)}>
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showSaleModal} onOpenChange={setShowSaleModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sale Details - {selectedSale?.saleNumber}</DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <User className="w-10 h-10 text-primary" />
                  <div>
                    <p className="text-sm text-gray-600">Customer</p>
                    <p className="font-semibold">{selectedSale.customerName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <Calendar className="w-10 h-10 text-primary" />
                  <div>
                    <p className="text-sm text-gray-600">Date</p>
                    <p className="font-semibold">{new Date(selectedSale.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                  <DollarSign className="w-10 h-10 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Total Amount</p>
                    <p className="text-xl font-bold text-blue-600">${selectedSale.totalAmount?.toFixed(2)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                  <TrendingUp className="w-10 h-10 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Profit</p>
                    <p className="text-xl font-bold text-green-600">${selectedSale.totalProfit?.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Items</h3>
                <div className="space-y-2">
                  {selectedSale.items?.map((item, i) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                        </div>
                      </div>
                      <p className="font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {selectedSale.shipping?.trackingNumber && (
                <div>
                  <h3 className="font-semibold mb-3">Shipping</h3>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-gray-600">Tracking Number</p>
                        <p className="font-mono font-semibold">{selectedSale.shipping.trackingNumber}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Carrier</p>
                        <p className="font-semibold capitalize">{selectedSale.shipping.carrier}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowSaleModal(false)}>Close</Button>
                <Button onClick={() => { setShowSaleModal(false); navigate('/sales'); }}>
                  Go to Sales Page
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}