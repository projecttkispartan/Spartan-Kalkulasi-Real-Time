import { Type } from 'lucide-react';

const OPTIONS = [
  { id: 'compact', label: 'S', title: 'Kompak — field lebih kecil' },
  { id: 'normal', label: 'M', title: 'Normal — ukuran standar' },
  { id: 'comfortable', label: 'L', title: 'Besar — field lebih nyaman dibaca' },
];

export const DISPLAY_DENSITY_STORAGE_KEY = 'manufaktur-bom-display-density';

export function readStoredDisplayDensity() {
  try {
    const v = localStorage.getItem(DISPLAY_DENSITY_STORAGE_KEY);
    if (v === 'compact' || v === 'normal' || v === 'comfortable') return v;
  } catch {
    /* ignore */
  }
  return 'normal';
}

export function densityToScale(id) {
  if (id === 'compact') return 0.9;
  if (id === 'comfortable') return 1.12;
  return 1;
}

/** Toggle ukuran field editor: S / M / L */
export default function DisplayDensityToggle({ value = 'normal', onChange, className = '' }) {
  return (
    <div
      className={`flex items-center gap-1.5 bg-slate-100 rounded-lg p-0.5 border border-slate-200 ${className}`}
      title="Ukuran tampilan field"
    >
      <Type className="w-3.5 h-3.5 text-slate-400 ml-1 shrink-0" aria-hidden />
      {OPTIONS.map(({ id, label, title }) => (
        <button
          key={id}
          type="button"
          title={title}
          onClick={() => onChange(id)}
          className={`min-w-[2rem] px-2 py-1.5 text-[10px] font-black rounded-md transition-all ${
            value === id
              ? 'bg-white text-slate-800 shadow-sm border border-slate-200'
              : 'text-slate-500 hover:text-slate-800 border border-transparent'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
