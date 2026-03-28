import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function ChatBot({ onAction, onRefresh }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', text: `Hey ${user?.name || 'there'}! 👋 I'm FoodLink AI.\nHow can I help you today?` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const send = async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setMessages(p => [...p, { role: 'user', text: msg }]);
    setInput('');
    setLoading(true);
    try {
      const res = await API.post('/chat', { message: msg, role: user?.role || 'restaurant' });
      const { reply, action, data, intent } = res.data;
      setMessages(p => [...p, { role: 'bot', text: reply || 'Done!', action, intent }]);

      // Show toast for actions
      if (action && action !== 'general') {
        const labels = {
          prefill_food: '🍽️ Form pre-filled!',
          show_analytics: '📊 Analytics loaded',
          predict_demand: '🤖 Prediction ready',
          show_recommendations: '⭐ Recommendations shown',
          show_food: '📦 Donations displayed',
          view_food: '📋 Listing updated',
        };
        toast.success(labels[action] || '✅ Action completed');
      }

      if (onAction && action) onAction(action, data);
      // Auto-refresh dashboard after action
      if (onRefresh && action && action !== 'general') {
        setTimeout(() => onRefresh(), 500);
      }
    } catch {
      setMessages(p => [...p, { role: 'bot', text: '⚠️ Could not reach AI. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const chips =
    user?.role === 'restaurant'
      ? ['Add food donation', 'Predict demand', 'View my donations']
      : user?.role === 'ngo'
      ? ['Best pickup option', 'Show recommendations', 'View available food']
      : ['Show analytics', 'Platform stats', 'Peak donation hours'];

  return (
    <>
      {/* FAB */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-emerald-700 text-white shadow-lg shadow-green-500/30 flex items-center justify-center"
      >
        {open ? '✕' : '🤖'}
      </motion.button>

      {/* Window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', damping: 22, stiffness: 260 }}
            className="fixed bottom-24 right-6 w-[370px] max-h-[500px] rounded-2xl shadow-2xl border border-white/20 bg-white flex flex-col z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-green-600 to-emerald-700 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg">🤖</div>
              <div className="text-white">
                <p className="font-semibold text-sm leading-tight">FoodLink AI</p>
                <p className="text-[10px] opacity-70">Powered by Groq&nbsp;•&nbsp;Always ready</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[220px] max-h-[310px] bg-gray-50/60">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[82%] px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap rounded-2xl ${
                      m.role === 'user'
                        ? 'bg-green-600 text-white rounded-br-md'
                        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md shadow-sm'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm flex gap-1">
                    {[0, 1, 2].map(d => (
                      <span
                        key={d}
                        className="w-2 h-2 bg-green-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${d * 150}ms` }}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* Quick chips */}
            {messages.length <= 2 && (
              <div className="px-4 py-2 flex flex-wrap gap-1.5 border-t border-gray-100">
                {chips.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(c)}
                    className="px-2.5 py-1 text-[11px] rounded-full border border-green-200 text-green-700 hover:bg-green-50 transition"
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-gray-100 flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
                placeholder="Type a message…"
                disabled={loading}
                className="flex-1 px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none disabled:opacity-50"
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                className="px-3.5 py-2.5 rounded-xl bg-green-600 text-white hover:bg-green-700 disabled:opacity-30 transition"
              >
                ➤
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
