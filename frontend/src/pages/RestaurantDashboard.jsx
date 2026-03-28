import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import FoodCard from '../components/FoodCard';
import MapView from '../components/MapView';
import StatsCard from '../components/StatsCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ChatBot from '../components/ChatBot';
import toast from 'react-hot-toast';

export default function RestaurantDashboard() {
  const { user } = useAuth();
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [demandPreview, setDemandPreview] = useState(null);
  const [predicting, setPredicting] = useState(false);
  const [form, setForm] = useState({
    food_name: '', quantity: '', expiry_time: '', lat: '', lng: '', address: '',
  });

  const resetForm = () => {
    setForm({ food_name: '', quantity: '', expiry_time: '', lat: '', lng: '', address: '' });
    setDemandPreview(null);
  };

  const fetch = useCallback(async () => {
    try {
      const res = await API.get('/food/my');
      setFoods(res.data || []);
    } catch { toast.error('Failed to load donations'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); const t = setInterval(fetch, 15000); return () => clearInterval(t); }, [fetch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await API.post('/food', {
        food_name: form.food_name,
        quantity: Number(form.quantity),
        expiry_time: new Date(form.expiry_time).toISOString(),
        location: { lat: Number(form.lat), lng: Number(form.lng) },
        address: form.address,
      });
      toast.success('Donation added 🎉');
      setModal(false);
      resetForm();
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error adding food');
    } finally { setSubmitting(false); }
  };

  const predictDemand = async () => {
    if (!form.quantity || !form.expiry_time || !form.lat || !form.lng) {
      toast.error('Fill quantity, expiry & location first');
      return;
    }
    setPredicting(true);
    try {
      const res = await API.post('/predict-demand', {
        quantity: Number(form.quantity),
        expiry_time: new Date(form.expiry_time).toISOString(),
        lat: Number(form.lat), lng: Number(form.lng),
      });
      setDemandPreview(res.data);
    } catch { toast.error('Prediction failed'); }
    finally { setPredicting(false); }
  };

  const locateMe = () => {
    navigator.geolocation?.getCurrentPosition(
      p => {
        setForm(f => ({ ...f, lat: p.coords.latitude.toFixed(6), lng: p.coords.longitude.toFixed(6) }));
        toast.success('Location detected!');
      },
      () => toast.error('Could not get location')
    );
  };

  // Chatbot action handler
  const chatAction = (action, data) => {
    if (action === 'prefill_food' && data) {
      setForm(f => ({
        ...f,
        food_name: data.food_name || f.food_name,
        quantity: String(data.quantity || f.quantity),
      }));
      setModal(true);
    }
  };

  const available = foods.filter(f => f.status === 'available').length;
  const pickedUp = foods.filter(f => f.status === 'picked_up').length;
  const highDemand = foods.filter(f => f.demand_level === 'High').length;

  if (loading) return <><Navbar /><LoadingSpinner /></>;

  const inp = "w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none text-sm bg-white";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50/30">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name} 👋</h1>
            <p className="text-gray-500 text-sm mt-1">Manage your food donations &amp; AI insights</p>
          </div>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => { setModal(true); resetForm(); }}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold shadow-lg shadow-green-500/25 text-sm"
          >+ Add Donation</motion.button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard icon="📦" label="Total Donations" value={foods.length} color="primary" />
          <StatsCard icon="✅" label="Available" value={available} color="blue" />
          <StatsCard icon="🚚" label="Picked Up" value={pickedUp} color="accent" />
          <StatsCard icon="🔥" label="High Demand" value={highDemand} color="amber" />
        </div>

        {/* Map */}
        {foods.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">📍 Donation Map</h2>
            <MapView foods={foods.filter(f => f.status === 'available')} height="300px" />
          </div>
        )}

        {/* Food Cards */}
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Your Donations</h2>
        {foods.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">🍽️</p>
            <p className="font-medium">No donations yet</p>
            <p className="text-sm">Click &quot;Add Donation&quot; to start sharing food</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {foods.map((f, i) => <FoodCard key={f._id || f.id} food={f} rank={i} />)}
          </div>
        )}
      </main>

      {/* Modal */}
      <AnimatePresence>
        {modal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setModal(false)}
          >
            <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 30 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-gray-900">🍽️ New Donation</h2>
                <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Food Name</label>
                    <input className={inp} required placeholder="e.g. Biryani" value={form.food_name}
                      onChange={e => setForm({ ...form, food_name: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Quantity (servings)</label>
                    <input className={inp} type="number" min="1" required placeholder="50" value={form.quantity}
                      onChange={e => setForm({ ...form, quantity: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Expiry Time</label>
                    <input className={inp} type="datetime-local" required value={form.expiry_time}
                      onChange={e => setForm({ ...form, expiry_time: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Latitude</label>
                    <input className={inp} type="number" step="any" required placeholder="17.385" value={form.lat}
                      onChange={e => setForm({ ...form, lat: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Longitude</label>
                    <input className={inp} type="number" step="any" required placeholder="78.486" value={form.lng}
                      onChange={e => setForm({ ...form, lng: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
                    <input className={inp} placeholder="e.g. Madhapur, Hyderabad" value={form.address}
                      onChange={e => setForm({ ...form, address: e.target.value })} />
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <button type="button" onClick={locateMe}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition">
                    📍 Locate Me
                  </button>
                  <button type="button" onClick={predictDemand} disabled={predicting}
                    className="px-4 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100 transition disabled:opacity-50">
                    {predicting ? '⏳ Predicting…' : '🤖 Predict Demand'}
                  </button>
                  <button type="submit" disabled={submitting}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold disabled:opacity-50 text-sm">
                    {submitting ? 'Adding…' : 'Add Donation'}
                  </button>
                </div>
              </form>

              {/* Demand Preview */}
              {demandPreview && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="mt-5 p-4 rounded-xl border border-indigo-200 bg-indigo-50/50"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">🤖</span>
                    <h4 className="font-semibold text-gray-900 text-sm">AI Demand Prediction</h4>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-white border">
                      <div className={`text-xl font-bold ${demandPreview.level === 'High' ? 'text-green-600' : demandPreview.level === 'Medium' ? 'text-amber-600' : 'text-gray-400'}`}>
                        {demandPreview.score}
                      </div>
                      <div className="text-[9px] text-gray-500">Score</div>
                    </div>
                    <div className="p-2 rounded-lg bg-white border">
                      <div className={`text-sm font-bold ${demandPreview.level === 'High' ? 'text-green-600' : demandPreview.level === 'Medium' ? 'text-amber-600' : 'text-gray-400'}`}>
                        {demandPreview.level === 'High' ? '🔥' : demandPreview.level === 'Medium' ? '📊' : '📉'} {demandPreview.level}
                      </div>
                      <div className="text-[9px] text-gray-500">Level</div>
                    </div>
                    <div className="p-2 rounded-lg bg-white border">
                      <div className="text-lg font-bold text-rose-600">{demandPreview.factors?.urgency_score || 0}</div>
                      <div className="text-[9px] text-gray-500">Urgency</div>
                    </div>
                    <div className="p-2 rounded-lg bg-white border">
                      <div className="text-lg font-bold text-blue-600">{demandPreview.factors?.area_score || 0}</div>
                      <div className="text-[9px] text-gray-500">Area</div>
                    </div>
                  </div>
                  <p className="text-xs text-indigo-700/70 mt-2 text-center">
                    {demandPreview.explanation || (demandPreview.level === 'High' ? '✅ High demand — food will be picked up quickly!'
                     : demandPreview.level === 'Medium' ? '📊 Moderate demand — consider timing adjustments.'
                     : '💡 Try peak hours: 11AM-2PM or 6-9PM.')}
                  </p>
                  {demandPreview.confidence != null && (
                    <p className="text-[10px] text-gray-400 text-center mt-1">Confidence: {demandPreview.confidence}%</p>
                  )}
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ChatBot onAction={chatAction} onRefresh={fetch} />
    </div>
  );
}