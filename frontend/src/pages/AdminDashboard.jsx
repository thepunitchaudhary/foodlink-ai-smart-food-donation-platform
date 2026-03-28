import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import API from '../api/axios';
import Navbar from '../components/Navbar';
import StatsCard from '../components/StatsCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ChatBot from '../components/ChatBot';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [demoLoading, setDemoLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [s, u, a] = await Promise.all([
        API.get('/admin/stats'),
        API.get('/admin/users'),
        API.get('/admin/analytics').catch(() => ({ data: null })),
      ]);
      setStats(s.data);
      setUsers(u.data || []);
      setAnalytics(a.data);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, 15000);
    return () => clearInterval(t);
  }, []);

  const generateDemo = async () => {
    setDemoLoading(true);
    try {
      const res = await API.post('/admin/demo-data');
      toast.success(res.data?.message || 'Demo data created!');
      fetchData();
    } catch { toast.error('Failed to generate demo data'); }
    finally { setDemoLoading(false); }
  };

  if (loading) return <><Navbar /><LoadingSpinner /></>;
  if (!stats) return <><Navbar /><p className="text-center py-20 text-gray-400">No data</p></>;

  const barData = [
    { name: 'Donations', v: stats.total_donations },
    { name: 'Available', v: stats.available_donations },
    { name: 'Picked Up', v: stats.picked_up },
    { name: 'Requests', v: stats.total_requests },
    { name: 'Pending', v: stats.pending_requests },
  ];

  const pieData = [
    { name: 'Restaurants', value: stats.restaurants },
    { name: 'NGOs', value: stats.ngos },
    { name: 'Admins', value: Math.max(0, stats.total_users - stats.restaurants - stats.ngos) },
  ].filter(d => d.value > 0);

  const reqPie = analytics?.request_status_breakdown
    ? Object.entries(analytics.request_status_breakdown).map(([k, v]) => ({ name: k, value: v }))
    : [];

  const peakData = (analytics?.peak_hours || []).map(h => ({ name: h.label, count: h.count }));
  const timeline = analytics?.donations_timeline || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50/30">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header + Demo button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">Platform analytics &amp; AI insights</p>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchData} className="px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 hover:bg-gray-50 transition">🔄 Refresh</button>
            <button onClick={generateDemo} disabled={demoLoading}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700 disabled:opacity-50 transition shadow">
              {demoLoading ? '⏳ Generating…' : '🧪 Generate Demo Data'}
            </button>
          </div>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <StatsCard icon="📦" label="Total Donations" value={stats.total_donations} color="primary" />
          <StatsCard icon="🚚" label="Picked Up" value={stats.picked_up} color="accent" />
          <StatsCard icon="📋" label="Pending Requests" value={stats.pending_requests} color="amber" />
          <StatsCard icon="👥" label="Total Users" value={stats.total_users} color="blue" />
        </div>

        {/* Impact Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <div className="bg-white/80 backdrop-blur rounded-2xl border border-gray-200 p-5">
            <div className="text-3xl font-bold text-green-600">{stats.meals_saved || 0}</div>
            <div className="text-xs text-gray-500 mt-1">🍽️ Meals Saved</div>
          </div>
          <div className="bg-white/80 backdrop-blur rounded-2xl border border-gray-200 p-5">
            <div className="text-3xl font-bold text-emerald-600">{stats.waste_reduced_pct || 0}%</div>
            <div className="text-xs text-gray-500 mt-1">♻️ Waste Reduced</div>
          </div>
          <div className="bg-white/80 backdrop-blur rounded-2xl border border-gray-200 p-5">
            <div className="text-3xl font-bold text-blue-600">{stats.avg_pickup_hours || 0}h</div>
            <div className="text-xs text-gray-500 mt-1">⏱️ Avg Pickup Time</div>
          </div>
        </div>

        {/* AI Insights Panel */}
        {analytics && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-indigo-50 to-violet-50 rounded-2xl border border-indigo-200 p-6 mb-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🧠</span>
              <div>
                <h3 className="text-lg font-bold text-gray-900">AI Insights</h3>
                <p className="text-xs text-gray-500">Data-driven analytics from your platform</p>
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white/80 backdrop-blur rounded-xl p-4 border border-white/50">
                <div className="text-3xl font-bold text-green-600">{analytics.waste_reduced_pct}%</div>
                <div className="text-xs text-gray-500 mt-1">Waste Reduced</div>
                <div className="w-full h-1.5 bg-gray-200 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(100, analytics.waste_reduced_pct)}%` }} />
                </div>
              </div>
              <div className="bg-white/80 backdrop-blur rounded-xl p-4 border border-white/50">
                <div className="text-2xl font-bold text-amber-600">🕐 {analytics.insights?.peak_donation_hour || 'N/A'}</div>
                <div className="text-xs text-gray-500 mt-1">Peak Donation Hour</div>
                <div className="text-[10px] text-amber-600/70 mt-2">⏰ Most donations happen at this time</div>
              </div>
              <div className="bg-white/80 backdrop-blur rounded-xl p-4 border border-white/50">
                <div className="text-3xl font-bold text-rose-600">🔥 {analytics.insights?.high_demand_count || 0}</div>
                <div className="text-xs text-gray-500 mt-1">High Demand Zones</div>
                <div className="text-[10px] text-rose-600/70 mt-2">Areas with &gt;50% pickup rate</div>
              </div>
              <div className="bg-white/80 backdrop-blur rounded-xl p-4 border border-white/50">
                <div className="text-3xl font-bold text-blue-600">{analytics.insights?.avg_pickup_ratio || 0}%</div>
                <div className="text-xs text-gray-500 mt-1">Avg Pickup Rate</div>
                <div className="text-[10px] text-blue-600/70 mt-2">Mean across all locations</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {timeline.length > 0 && (
            <div className="bg-white/80 backdrop-blur rounded-2xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">📈 Donations Over Time</h3>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={timeline}>
                  <defs>
                    <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb' }} />
                  <Area type="monotone" dataKey="count" stroke="#22c55e" strokeWidth={2} fill="url(#ag)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {peakData.length > 0 && (
            <div className="bg-white/80 backdrop-blur rounded-2xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">🕐 Peak Donation Hours</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={peakData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb' }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {peakData.map((_, i) => <Cell key={i} fill={i === 0 ? '#f59e0b' : '#22c55e'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/80 backdrop-blur rounded-2xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Platform Activity</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb' }} />
                <Bar dataKey="v" radius={[6, 6, 0, 0]} fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white/80 backdrop-blur rounded-2xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">User Distribution</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={80} paddingAngle={5} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {reqPie.length > 0 && (
            <div className="bg-white/80 backdrop-blur rounded-2xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Request Status</h3>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={reqPie} cx="50%" cy="50%" innerRadius={48} outerRadius={80} paddingAngle={5} dataKey="value">
                    {reqPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Pickup Locations */}
        {analytics?.pickups_by_location?.length > 0 && (
          <div className="bg-white/80 backdrop-blur rounded-2xl border border-gray-200 overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">📍 Top Pickup Locations</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-left">
                    <th className="px-5 py-3 font-semibold text-gray-600">Location</th>
                    <th className="px-5 py-3 font-semibold text-gray-600">Donations</th>
                    <th className="px-5 py-3 font-semibold text-gray-600">Pickups</th>
                    <th className="px-5 py-3 font-semibold text-gray-600">Rate</th>
                    <th className="px-5 py-3 font-semibold text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.pickups_by_location.map((l, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0">
                      <td className="px-5 py-3 font-mono text-xs">{l.lat?.toFixed(4)}, {l.lng?.toFixed(4)}</td>
                      <td className="px-5 py-3">{l.donations}</td>
                      <td className="px-5 py-3">{l.pickups}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${l.pickup_ratio > 0.5 ? 'bg-green-500' : 'bg-amber-400'}`}
                              style={{ width: `${l.pickup_ratio * 100}%` }} />
                          </div>
                          <span className="text-xs">{(l.pickup_ratio * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        {l.pickup_ratio > 0.5
                          ? <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-semibold">🔥 High Demand</span>
                          : <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px]">Normal</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white/80 backdrop-blur rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">All Users ({users.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-left">
                  <th className="px-5 py-3 font-semibold text-gray-600">Name</th>
                  <th className="px-5 py-3 font-semibold text-gray-600">Email</th>
                  <th className="px-5 py-3 font-semibold text-gray-600">Role</th>
                  <th className="px-5 py-3 font-semibold text-gray-600">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-5 py-3 font-medium">{u.name}</td>
                    <td className="px-5 py-3 text-gray-400">{u.email}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        u.role === 'restaurant' ? 'bg-green-50 text-green-700' :
                        u.role === 'ngo' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                      }`}>{u.role}</span>
                    </td>
                    <td className="px-5 py-3 text-gray-400">{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      <ChatBot onRefresh={fetchData} />
    </div>
  );
}
