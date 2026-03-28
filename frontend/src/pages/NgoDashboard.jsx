import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import API from '../api/axios';
import Navbar from '../components/Navbar';
import FoodCard from '../components/FoodCard';
import MapView from '../components/MapView';
import StatsCard from '../components/StatsCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ChatBot from '../components/ChatBot';
import toast from 'react-hot-toast';

export default function NgoDashboard() {
  const [foods, setFoods] = useState([]);
  const [recs, setRecs] = useState([]);
  const [myReqs, setMyReqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loc, setLoc] = useState(null);
  const [view, setView] = useState('smart');

  const fetchAll = useCallback(async (lat, lng) => {
    try {
      const [nearbyRes, recsRes, reqsRes] = await Promise.all([
        lat != null
          ? API.get(`/food/nearby?lat=${lat}&lng=${lng}&radius=100`)
          : API.get('/food'),
        lat != null
          ? API.get(`/recommendations?lat=${lat}&lng=${lng}&limit=20`).catch(() => ({ data: [] }))
          : Promise.resolve({ data: [] }),
        API.get('/requests/my').catch(() => ({ data: [] })),
      ]);
      setFoods(nearbyRes.data || []);
      setRecs(recsRes.data || []);
      setMyReqs(reqsRes.data || []);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      p => { const l = { lat: p.coords.latitude, lng: p.coords.longitude }; setLoc(l); fetchAll(l.lat, l.lng); },
      () => fetchAll()
    ) || fetchAll();
    const t = setInterval(() => { if (loc) fetchAll(loc.lat, loc.lng); else fetchAll(); }, 15000);
    return () => clearInterval(t);
  }, [fetchAll]);

  const handleRequest = async (id) => {
    try {
      await API.post('/requests', { food_id: id });
      toast.success('Pickup requested! 🤝');
      setMyReqs(p => [...p, { food_id: id, status: 'pending' }]);
      if (loc) fetchAll(loc.lat, loc.lng);
    } catch (err) { toast.error(err.response?.data?.detail || 'Request failed'); }
  };

  const chatAction = (action) => {
    if (action === 'show_recommendations') setView('smart');
    if (action === 'show_food') setView('all');
  };

  const reqIds = new Set(myReqs.map(r => r.food_id));
  const list = view === 'smart' && recs.length > 0 ? recs : foods;
  const best = recs.length > 0 ? recs[0] : null;

  if (loading) return <><Navbar /><LoadingSpinner /></>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50/30">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">NGO Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">AI-powered food donation recommendations</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard icon="📍" label="Nearby Available" value={foods.length} color="primary" />
          <StatsCard icon="🤖" label="AI Picks" value={recs.length} color="blue" />
          <StatsCard icon="📋" label="My Requests" value={myReqs.length} color="amber" />
          <StatsCard icon="✅" label="Completed" value={myReqs.filter(r => r.status === 'completed').length} color="accent" />
        </div>

        {/* Best Pickup */}
        {best && view === 'smart' && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-5 rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">⭐</span>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Best Pickup Option</h3>
                <p className="text-xs text-gray-500">Ranked by urgency, distance &amp; quantity</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { l: 'Food', v: best.food_name, c: 'text-green-700' },
                { l: 'Score', v: `${best.smart_match?.smart_score || '—'}/100`, c: 'text-green-700' },
                { l: 'Urgency', v: best.smart_match?.urgency_label || '—', c: 'text-rose-600' },
                { l: 'Distance', v: best.smart_match?.distance_km != null ? `${best.smart_match.distance_km}km` : '—', c: 'text-blue-600' },
                { l: 'Qty', v: `${best.quantity} srv`, c: 'text-gray-900' },
              ].map((c, i) => (
                <div key={i} className="text-center p-2 rounded-lg bg-white/80 border border-green-100">
                  <div className={`font-bold text-sm ${c.c}`}>{c.v}</div>
                  <div className="text-[9px] text-gray-400">{c.l}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Toggle */}
        {recs.length > 0 && (
          <div className="flex gap-2 mb-6">
            {[['smart', '🤖 Smart Recommendations'], ['all', '📍 By Distance']].map(([k, label]) => (
              <button key={k} onClick={() => setView(k)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  view === k
                    ? 'bg-green-600 text-white shadow-lg shadow-green-500/25'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >{label}</button>
            ))}
          </div>
        )}

        {/* Map */}
        {list.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Donation Map</h2>
            <MapView foods={list} center={loc ? [loc.lat, loc.lng] : undefined} height="320px" />
          </div>
        )}

        {/* Cards */}
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          {view === 'smart' ? '🤖 AI Recommended' : 'Available Donations'}
          <span className="text-sm font-normal text-gray-400 ml-2">
            {view === 'smart' ? '(ranked by smart score)' : loc ? '(sorted by distance)' : ''}
          </span>
        </h2>

        {list.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">🔍</p><p className="font-medium">No donations nearby</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {list.map((f, i) => (
              <FoodCard key={f._id || f.id} food={f} rank={i}
                onRequest={handleRequest}
                showRequest={!reqIds.has(f._id || f.id)}
                showDistance={view === 'all' && !!loc}
              />
            ))}
          </div>
        )}

        {/* My Requests */}
        {myReqs.length > 0 && (
          <div className="bg-white/80 backdrop-blur rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100"><h3 className="font-semibold text-gray-900">My Requests</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-left">
                    <th className="px-5 py-3 font-semibold text-gray-600">Food</th>
                    <th className="px-5 py-3 font-semibold text-gray-600">Status</th>
                    <th className="px-5 py-3 font-semibold text-gray-600">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {myReqs.map((r, i) => (
                    <tr key={r.id || i} className="border-b border-gray-50 last:border-0">
                      <td className="px-5 py-3 font-medium">{r.food_name || '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          r.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                          r.status === 'accepted' ? 'bg-blue-50 text-blue-700' :
                          r.status === 'completed' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}>{r.status}</span>
                      </td>
                      <td className="px-5 py-3 text-gray-400">{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
      <ChatBot onAction={chatAction} onRefresh={() => loc ? fetchAll(loc.lat, loc.lng) : fetchAll()} />
    </div>
  );
}