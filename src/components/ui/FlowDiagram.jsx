/** Diagram alur sederhana — kotak + panah horizontal/vertikal */
export function FlowStep({ label, sub, tone = 'brand' }) {
  const tones = {
    brand: 'bg-brand-50 border-brand-200 text-brand-900',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    amber: 'bg-amber-50 border-amber-200 text-amber-900',
    slate: 'bg-slate-50 border-slate-200 text-slate-800',
    violet: 'bg-violet-50 border-violet-200 text-violet-900',
  };
  return (
    <div
      className={`rounded-xl border px-3 py-2.5 text-center min-w-[7rem] max-w-[11rem] shadow-sm ${tones[tone] || tones.brand}`}
    >
      <p className="text-[11px] font-black leading-tight">{label}</p>
      {sub && <p className="text-[9px] font-medium opacity-75 mt-0.5 leading-snug">{sub}</p>}
    </div>
  );
}

export function FlowArrow({ dir = 'right' }) {
  if (dir === 'down') {
    return (
      <div className="flex flex-col items-center text-slate-400 py-1" aria-hidden>
        <div className="w-0.5 h-3 bg-slate-300" />
        <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[7px] border-l-transparent border-r-transparent border-t-slate-400" />
      </div>
    );
  }
  return (
    <div className="flex items-center text-slate-400 px-1 shrink-0" aria-hidden>
      <div className="h-0.5 w-4 bg-slate-300" />
      <div className="w-0 h-0 border-t-[5px] border-b-[5px] border-l-[7px] border-t-transparent border-b-transparent border-l-slate-400" />
    </div>
  );
}

export function FlowRow({ children, wrap = true }) {
  return (
    <div
      className={`flex items-center gap-1 ${wrap ? 'flex-wrap justify-center' : 'flex-nowrap overflow-x-auto pb-1'}`}
    >
      {children}
    </div>
  );
}

export function FlowColumn({ children }) {
  return <div className="flex flex-col items-center gap-0">{children}</div>;
}

export function ManualFigure({ src, alt, caption }) {
  return (
    <figure className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm my-3">
      <img src={src} alt={alt} className="w-full h-auto max-h-80 object-contain bg-slate-50" loading="lazy" />
      {caption && (
        <figcaption className="text-[10px] text-slate-500 px-3 py-2 border-t border-slate-100 font-medium">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
