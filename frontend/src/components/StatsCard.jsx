export default function StatsCard({ icon, label, value, color = 'primary' }) {
  const colorMap = {
    primary: 'from-primary-500 to-primary-700',
    accent: 'from-accent-500 to-accent-700',
    blue: 'from-blue-500 to-blue-700',
    amber: 'from-amber-500 to-amber-700',
    rose: 'from-rose-500 to-rose-700',
    indigo: 'from-indigo-500 to-indigo-700',
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-surface-200 p-6 hover:shadow-md transition-all duration-300 animate-fade-in">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorMap[color] || colorMap.primary} flex items-center justify-center text-white text-xl shadow-lg`}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-surface-700/60">{label}</p>
          <p className="text-2xl font-bold text-surface-900">{value}</p>
        </div>
      </div>
    </div>
  );
}
