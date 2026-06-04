import { useMemo } from 'react';
import { PieChart } from 'lucide-react';
import { formatIDR } from '../../utils/formatters';

function buildConicGradient(slices) {
  const total = slices.reduce((s, x) => s + x.amount, 0);
  if (total <= 0) return 'conic-gradient(#e2e8f0 0deg 360deg)';
  let deg = 0;
  const stops = [];
  for (const sl of slices) {
    if (sl.amount <= 0) continue;
    const span = (sl.amount / total) * 360;
    const end = deg + span;
    stops.push(`${sl.color} ${deg}deg ${end}deg`);
    deg = end;
  }
  return `conic-gradient(${stops.join(', ')})`;
}

export default function CogsProductionPieCard({ insight, onSliceClick, compact = false }) {
  const pad = compact ? 'p-4' : 'p-6';
  const production = insight?.production ?? { total: 0, coatingDetail: 0, coatingInCogs: 0 };
  const slices = insight?.pieSlices ?? [];
  const includeCoatingInCogs = production.coatingInCogs > 0;
  const coatingDetailOnly =
    !includeCoatingInCogs && (production.coatingDetail || 0) > 0;

  const gradient = useMemo(() => buildConicGradient(slices), [slices]);
  const total = production.total;

  if (total <= 0) {
    return (
      <section
        className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${pad}`}
        aria-labelledby="cogs-pie-title"
      >
        <header className="flex items-center gap-2 mb-4">
          <PieChart className="w-5 h-5 text-indigo-500" aria-hidden />
          <h3
            id="cogs-pie-title"
            className="text-sm font-black text-slate-800 uppercase tracking-wider"
          >
            Komposisi biaya produksi
          </h3>
        </header>
        <p className="text-sm text-slate-500">
          Belum ada biaya produksi. Lengkapi BOM, packing, dan konfigurasi COGS.
        </p>
      </section>
    );
  }

  return (
    <section
      className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${pad}`}
      aria-labelledby="cogs-pie-title"
    >
      <header className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <PieChart className="w-5 h-5 text-indigo-500" aria-hidden />
          <h3
            id="cogs-pie-title"
            className="text-sm font-black text-slate-800 uppercase tracking-wider"
          >
            Komposisi biaya produksi
          </h3>
        </div>
        <span className="text-xs font-bold text-slate-500">
          Total Rp {formatIDR(total)}
        </span>
      </header>

      <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
        <div
          className="w-36 h-36 rounded-full shrink-0 border-4 border-white shadow-md"
          style={{ background: gradient }}
          role="img"
          aria-label="Diagram komposisi biaya produksi"
        />

        <table className="w-full text-left text-xs flex-1" role="table">
          <caption className="sr-only">Rincian komposisi biaya produksi</caption>
          <thead>
            <tr className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 border-b border-slate-100">
              <th className="pb-2 pr-2">Komponen</th>
              <th className="pb-2 text-right">Nilai (Rp)</th>
              <th className="pb-2 text-right w-16">%</th>
            </tr>
          </thead>
          <tbody>
            {slices.map((sl) => (
              <tr
                key={sl.id}
                className={`border-b border-slate-50 ${onSliceClick ? 'cursor-pointer hover:bg-slate-50' : ''}`}
                onClick={onSliceClick ? () => onSliceClick(sl.id) : undefined}
              >
                <td className="py-2 pr-2 font-bold text-slate-700">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full mr-2 align-middle"
                    style={{ backgroundColor: sl.color }}
                    aria-hidden
                  />
                  {sl.label}
                </td>
                <td className="py-2 text-right font-black text-slate-800 tabular-nums">
                  {formatIDR(sl.amount)}
                </td>
                <td className="py-2 text-right text-slate-500 tabular-nums">
                  {(sl.pct * 100).toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {coatingDetailOnly && (
        <p className="mt-4 text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
          Coating (tidak masuk production): Rp {formatIDR(production.coatingDetail)}
        </p>
      )}
    </section>
  );
}
