import { useState } from 'react';
import { motion } from 'framer-motion';

export default function FoodCard({ food, onRequest, showRequest = false, showDistance = false, rank }) {
  const [busy, setBusy] = useState(false);
  if (!food) return null;

  const expiry = new Date(food.expiry_time);
  const now = new Date();
  const isExpired = expiry < now;
  const hoursLeft = Math.max(0, Math.round((expiry - now) / 3.6e6));
  const isUrgent = !isExpired && hoursLeft <= 6;
  const isBest = food.smart_match?.is_best_pickup;

  const handleReq = async () => {
    if (!onRequest) return;
    setBusy(true);
    try { await onRequest(food._id || food.id); } finally { setBusy(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: rank ? rank * 0.04 : 0 }}
      className={`relative bg-white/80 backdrop-blur-md rounded-2xl border overflow-hidden hover:shadow-xl transition-all duration-300 group ${
        isBest ? 'border-green-400 ring-2 ring-green-200' : 'border-gray-200/70'
      }`}
    >
      {/* Best ribbon */}
      {isBest && (
        <div className="absolute top-3 -right-7 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-[9px] font-bold px-8 py-0.5 rotate-45 shadow z-10">
          ⭐ BEST
        </div>
      )}

      {/* Color strip */}
      <div className={`h-1.5 ${isExpired ? 'bg-red-500' : isUrgent ? 'bg-amber-500' : 'bg-gradient-to-r from-green-500 to-emerald-400'}`} />

      <div className="p-5 space-y-3">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 truncate group-hover:text-green-700 transition-colors">
              {food.food_name}
            </h3>
            {food.donor_name && <p className="text-xs text-gray-400 mt-0.5">by {food.donor_name}</p>}
          </div>
          <div className="flex flex-wrap gap-1 shrink-0">
            {food.is_high_demand && (
              <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-bold animate-pulse">
                🔥 High
              </span>
            )}
            {isUrgent && (
              <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-red-400 to-rose-600 text-white text-[10px] font-bold">
                ⏰ Urgent
              </span>
            )}
          </div>
        </div>

        {/* Demand bar + Explainable AI */}
        {food.demand_score != null && (
          <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-gray-500 font-medium">AI Demand</span>
              <span className={`font-bold ${food.demand_level === 'High' ? 'text-green-600' : food.demand_level === 'Medium' ? 'text-amber-600' : 'text-gray-400'}`}>
                {food.demand_level} · {food.demand_score}
                {food.confidence != null && <span className="text-gray-400 font-normal ml-1">({food.confidence}% conf)</span>}
              </span>
            </div>
            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  food.demand_level === 'High' ? 'bg-green-500' : food.demand_level === 'Medium' ? 'bg-amber-400' : 'bg-gray-300'
                }`}
                style={{ width: `${Math.min(100, food.demand_score)}%` }}
              />
            </div>
            {food.explanation && (
              <p className="text-[10px] text-gray-500 mt-1.5 italic leading-snug">
                💡 {food.explanation}
              </p>
            )}
          </div>
        )}

        {/* Smart score bar */}
        {food.smart_match && (
          <div className="p-2.5 rounded-xl bg-green-50/60 border border-green-100">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-green-700/70 font-medium">Smart Score</span>
              <span className="font-bold text-green-700">{food.smart_match.smart_score}/100</span>
            </div>
            <div className="w-full h-1.5 bg-green-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-green-400 to-emerald-600 transition-all duration-700"
                style={{ width: `${Math.min(100, food.smart_match.smart_score)}%` }} />
            </div>
            <div className="flex gap-3 mt-1.5 text-[10px] text-gray-500">
              <span>{food.smart_match.urgency_label}</span>
              {food.smart_match.distance_km != null && <span>📍 {food.smart_match.distance_km}km</span>}
            </div>
            {isBest && (
              <p className="text-[10px] text-green-600 mt-1 italic">
                Based on urgency, distance & quantity — this is the best option
              </p>
            )}
          </div>
        )}

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
          <span>📦 <strong>{food.quantity}</strong> servings</span>
          <span className={isExpired ? 'text-red-600 font-semibold' : isUrgent ? 'text-amber-600 font-semibold' : ''}>
            ⏰ {isExpired ? 'Expired' : `${hoursLeft}h left`}
          </span>
          {food.address && <span className="col-span-2 truncate">📍 {food.address}</span>}
          {showDistance && food.distance != null && !food.smart_match && (
            <span className="col-span-2 font-semibold text-green-700">🗺️ {food.distance} km away</span>
          )}
        </div>

        {/* Request button */}
        {showRequest && food.status === 'available' && !isExpired && (
          <button
            onClick={handleReq}
            disabled={busy}
            className={`w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all ${
              isBest
                ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-green-500/20 shadow-md'
                : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
            }`}
          >
            {busy ? 'Requesting…' : isBest ? '⭐ Request Best Pickup' : '🤝 Request Pickup'}
          </button>
        )}
      </div>
    </motion.div>
  );
}