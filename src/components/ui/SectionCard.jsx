export default function SectionCard({ title, children, className = '' }) {
  return (
    <div className={`surface-card p-6 ${className}`}>
      {title && <h3 className="text-sm font-black text-slate-800 mb-4">{title}</h3>}
      {children}
    </div>
  );
}
