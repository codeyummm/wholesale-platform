import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, Target, Activity } from 'lucide-react';

export default function IMEIStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/imeilab/stats');
        if (res.data.success) {
          setStats(res.data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-gray-500 font-medium animate-pulse">Loading Analytics...</div>;
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
             <DollarSign size={24} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Total Spent</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">{stats.totalSpent.toFixed(2)} CR</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
             <Target size={24} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Total Orders</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">{stats.totalOrders}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
             <Activity size={24} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Successful Orders</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">{stats.successOrders}</h3>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp size={20} className="text-[#009EF7]" />
          <h3 className="text-lg font-black text-gray-900">Monthly Expenditure</h3>
        </div>
        
        {stats.monthlyStats && stats.monthlyStats.length > 0 ? (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.monthlyStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value) => [`${value.toFixed(2)} CR`, 'Spent']}
                />
                <Bar dataKey="spent" fill="#009EF7" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-60 flex items-center justify-center text-gray-400 font-medium bg-gray-50 rounded-xl border border-dashed border-gray-200">
            No spending data available yet.
          </div>
        )}
      </div>
    </div>
  );
}
