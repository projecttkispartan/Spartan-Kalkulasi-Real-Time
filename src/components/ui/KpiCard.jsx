export default function KpiCard({ icon: Icon, label, value, accent = 'amber' }) {
  const accents = {
    amber: { ring: 'hover:border-amber-200', bg: 'bg-amber-50 text-amber-600' },
    emerald: { ring: 'hover:border-emerald-200', bg: 'bg-emerald-50 text-emerald-600' },
    blue: { ring: 'hover:border-brand-200', bg: 'bg-brand-50 text-brand-600' },
  };
  const a = accents[accent] || accents.amber;

  return (
    <div className={`surface-card p-6 hover:shadow-card-hover transition-all flex items-center gap-5 group ${a.ring}`}>
      <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform ${a.bg}`}>
        <Icon className="w-7 h-7" />
      </div>
      <div>
        <span className="label-field block mb-1">{label}</span>
        <span className="text-3xl font-black text-slate-800">{value}</span>
      </div>
    </div>
  );
}
