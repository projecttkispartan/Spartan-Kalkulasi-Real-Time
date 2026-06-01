import { useState } from 'react';
import { Search } from 'lucide-react';
import { formatIDR } from '../../utils/formatters.js';

const TYPE_STYLES = {
  kayu: 'bg-amber-50 text-amber-800 border-amber-200',
  coating: 'bg-violet-50 text-violet-800 border-violet-200',
  plywood: 'bg-orange-50 text-orange-800 border-orange-200',
  hardware: 'bg-slate-100 text-slate-700 border-slate-200',
  veneer: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  steel: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  komponen: 'bg-blue-50 text-blue-800 border-blue-200',
};

export function TypeChip({ type }) {
  const key = String(type || '').toLowerCase();
  const cls = TYPE_STYLES[key] || 'bg-slate-50 text-slate-600 border-slate-200';
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border ${cls}`}>
      {type || '—'}
    </span>
  );
}

export function CellInput({ value, onChange, type = 'text', className = '', mono = false }) {
  return (
    <input
      type={type}
      value={value ?? ''}
      onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
      className={`w-full min-w-[4rem] bg-white border border-slate-200/80 rounded-lg px-2.5 py-1.5 text-sm text-slate-800 shadow-sm
        focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-shadow
        hover:border-slate-300 ${mono ? 'font-mono text-xs' : ''} ${className}`}
    />
  );
}

/** Input persen dengan suffix % */
export function PctInput({ value, onChange, className = '' }) {
  return (
    <div className={`relative flex items-stretch min-w-[5rem] ${className}`}>
      <input
        type="number"
        step={0.01}
        value={value ?? ''}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="flex-1 w-full border border-slate-200 rounded-l-lg px-2.5 py-1.5 text-sm text-center tabular-nums shadow-sm
          focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none"
      />
      <span className="inline-flex items-center px-2 rounded-r-lg border border-l-0 bg-slate-50 text-slate-500 text-xs font-bold border-slate-200">
        %
      </span>
    </div>
  );
}

/** Input nominal IDR dengan prefix Rp; saat blur tampil format ribuan */
export function RpInput({ value, onChange, className = '', emphasize = false, suffix = null }) {
  const [focused, setFocused] = useState(false);
  const num = Number(value) || 0;

  const borderEm = emphasize
    ? 'border-emerald-200 bg-emerald-50/40 text-emerald-900 font-semibold focus:border-emerald-500 focus:ring-emerald-100'
    : 'border-slate-200 bg-white text-slate-800 focus:border-emerald-400 focus:ring-emerald-100';

  const prefixEm = emphasize
    ? 'bg-emerald-600 text-white border-emerald-600'
    : 'bg-slate-700 text-white border-slate-700';

  return (
    <div className={`relative flex items-stretch min-w-[8.5rem] max-w-[11rem] ml-auto ${className}`}>
      <span
        className={`inline-flex items-center px-2 rounded-l-lg border border-r-0 text-[11px] font-bold shrink-0 tracking-tight ${prefixEm}`}
      >
        Rp
      </span>
      <input
        type={focused ? 'number' : 'text'}
        inputMode="numeric"
        min={0}
        step={1}
        title={num ? `Rp ${formatIDR(num)}` : ''}
        value={focused ? (num || '') : num ? formatIDR(num) : ''}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          const v = e.target.value;
          if (e.target.type === 'number') {
            onChange(v === '' ? 0 : Number(v));
          } else {
            const raw = String(v).replace(/\D/g, '');
            onChange(raw === '' ? 0 : Number(raw));
          }
        }}
        className={`flex-1 w-full min-w-0 border rounded-r-lg rounded-l-none px-2 py-1.5 text-sm tabular-nums text-right shadow-sm
          focus:ring-2 outline-none transition-shadow ${borderEm}`}
      />
      {suffix && (
        <span className="absolute -bottom-4 right-0 text-[9px] text-slate-400 font-medium whitespace-nowrap">
          /{suffix}
        </span>
      )}
    </div>
  );
}

/** Tampilan read-only nominal */
export function RpDisplay({ value, className = '', bold = false, suffix = null }) {
  const n = Number(value) || 0;
  return (
    <span
      className={`tabular-nums whitespace-nowrap ${bold ? 'font-semibold text-emerald-800' : 'text-slate-700'} ${className}`}
    >
      <span className="text-slate-500 font-bold text-[11px] mr-1">Rp</span>
      {formatIDR(n)}
      {suffix && <span className="text-slate-400 text-xs ml-0.5">/{suffix}</span>}
    </span>
  );
}

export function MasterSearch({ value, onChange, placeholder = 'Cari kode, nama, vendor…' }) {
  return (
    <div className="relative max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl bg-white shadow-sm
          focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none placeholder:text-slate-400"
      />
    </div>
  );
}

export function MasterTabBar({ tabs, active, onChange }) {
  return (
    <div className="flex flex-wrap gap-1 p-1.5 bg-slate-200/50 rounded-2xl border border-slate-200/80 shadow-inner">
      {tabs.map((t) => {
        const on = active === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap
              ${on
                ? 'bg-white text-emerald-800 shadow-md ring-1 ring-emerald-200/90'
                : 'text-slate-600 hover:text-slate-800 hover:bg-white/70'}`}
          >
            {t.label}
            {t.count != null && (
              <span
                className={`ml-1.5 px-1.5 py-0.5 rounded-md text-[9px] tabular-nums ${
                  on ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-300/50 text-slate-600'
                }`}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function MasterPanel({ children, className = '' }) {
  return (
    <div
      className={`bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200/90 shadow-lg shadow-slate-200/50
        flex flex-col min-h-[calc(100vh-13rem)] overflow-hidden ring-1 ring-white ${className}`}
    >
      {children}
    </div>
  );
}

export function MasterSectionTitle({ children }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
      <span className="w-1 h-4 rounded-full bg-emerald-500" />
      {children}
    </h3>
  );
}

export function MasterTableWrap({ children, minWidth = '800px' }) {
  return (
    <div className="overflow-auto rounded-xl border border-slate-200/60 bg-slate-50/30">
      <table className="w-full text-left text-sm border-collapse" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function MasterThead({ children }) {
  return (
    <thead className="text-[10px] uppercase tracking-wider text-slate-600 font-bold bg-gradient-to-b from-slate-100 to-slate-50 border-b-2 border-slate-200 sticky top-0 z-10">
      {children}
    </thead>
  );
}

export function MasterTh({ children, className = '', align = 'left', money = false }) {
  const alignCls =
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  return (
    <th
      className={`py-3 px-4 first:pl-5 last:pr-5 ${alignCls}
        ${money ? 'bg-emerald-50/80 text-emerald-900' : ''} ${className}`}
    >
      {money ? (
        <span className="inline-flex items-center justify-end gap-1 w-full">
          <span className="text-[9px] font-black text-emerald-600 bg-emerald-100 px-1 rounded">Rp</span>
          <span>{children}</span>
        </span>
      ) : (
        children
      )}
    </th>
  );
}

export function MasterTr({ children, className = '', index }) {
  const zebra = typeof index === 'number' && index % 2 === 1 ? 'bg-slate-50/60' : 'bg-white';
  return (
    <tr
      className={`border-b border-slate-100 last:border-0 hover:bg-emerald-50/50 transition-colors ${zebra} ${className}`}
    >
      {children}
    </tr>
  );
}

export function MasterTd({ children, className = '', align = 'left', mono = false }) {
  const alignCls =
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  return (
    <td
      className={`py-2.5 px-4 first:pl-5 last:pr-5 align-middle ${alignCls} ${mono ? 'font-mono text-xs' : ''} ${className}`}
    >
      {children}
    </td>
  );
}

export function MasterLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <div className="w-10 h-10 rounded-full border-2 border-emerald-200 border-t-emerald-600 animate-spin" />
      <p className="text-sm text-slate-500 font-medium">Memuat master data…</p>
    </div>
  );
}

export function MasterEmpty({ message = 'Tidak ada data' }) {
  return <p className="text-center text-slate-400 text-sm py-16">{message}</p>;
}

/** Filter baris master berdasarkan teks (kode, nama, vendor, dll.) */
export function filterMasterRows(rows, query, fields) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) =>
    fields.some((f) => String(row[f] ?? '').toLowerCase().includes(q)),
  );
}
