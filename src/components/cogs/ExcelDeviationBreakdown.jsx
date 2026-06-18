import { useState } from 'react';
import { ChevronDown, ChevronRight, MapPin } from 'lucide-react';
import { formatIDR } from '../../utils/formatters';

function StatusDot({ status }) {
  const colors = {
    pass: 'bg-emerald-500',
    warn: 'bg-amber-500',
    fail: 'bg-red-500',
    skip: 'bg-slate-300',
  };
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full shrink-0 ${colors[status] || colors.skip}`}
      title={status?.toUpperCase()}
    />
  );
}

function DeltaCell({ row }) {
  if (!row || row.status === 'skip') return <span className="text-slate-300">—</span>;
  const sign = row.diffIdr > 0 ? '+' : '';
  const pct = `${(row.diffPct * 100).toFixed(2)}%`;
  return (
    <span
      className={`tabular-nums font-bold ${
        row.status === 'pass'
          ? 'text-emerald-700'
          : row.status === 'warn'
            ? 'text-amber-700'
            : 'text-red-700'
      }`}
    >
      {sign}Rp {formatIDR(Math.abs(row.diffIdr))} ({pct})
    </span>
  );
}

function ComponentTable({ rows }) {
  if (!rows?.length) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[11px]" role="table">
        <thead>
          <tr className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 border-b border-slate-200">
            <th className="pb-2 pr-2 w-4" />
            <th className="pb-2 pr-2">Komponen</th>
            <th className="pb-2 pr-2 text-right">App</th>
            <th className="pb-2 pr-2 text-right">Excel</th>
            <th className="pb-2 pr-2 text-right">Δ</th>
            <th className="pb-2 text-left hidden lg:table-cell">Lokasi perbaikan</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-slate-100 align-top">
              <td className="py-2 pr-1">
                <StatusDot status={row.status} />
              </td>
              <td className="py-2 pr-2 font-bold text-slate-700">
                {row.label}
                {row.excelNote && (
                  <span className="block text-[9px] font-normal text-slate-400 mt-0.5">
                    {row.excelNote}
                  </span>
                )}
              </td>
              <td className="py-2 pr-2 text-right tabular-nums text-slate-700">
                {row.status === 'skip' && row.id === 'coating' && row.app === 0
                  ? '—'
                  : formatIDR(row.app)}
              </td>
              <td className="py-2 pr-2 text-right tabular-nums text-slate-500">
                {row.excel > 0 ? formatIDR(row.excel) : '—'}
              </td>
              <td className="py-2 pr-2 text-right">
                <DeltaCell row={row} />
              </td>
              <td className="py-2 text-[10px] text-slate-500 hidden lg:table-cell">
                <span className="inline-flex items-start gap-1">
                  <MapPin className="w-3 h-3 shrink-0 mt-0.5 text-slate-400" />
                  {row.hint}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SummaryLinesTable({ lines }) {
  if (!lines?.length) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[10px]" role="table">
        <thead>
          <tr className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 border-b border-slate-200">
            <th className="pb-2 pr-1 w-4" />
            <th className="pb-2 pr-2">Baris SUMMARY COST</th>
            <th className="pb-2 pr-1 text-center">Part</th>
            <th className="pb-2 pr-1 text-right">Mat App</th>
            <th className="pb-2 pr-1 text-right">Mat Excel</th>
            <th className="pb-2 pr-1 text-right">Δ Mat</th>
            <th className="pb-2 pr-1 text-right">Proses App</th>
            <th className="pb-2 pr-1 text-right">Proses Excel</th>
            <th className="pb-2 pr-1 text-right">Δ Total</th>
            <th className="pb-2 text-left hidden xl:table-cell">Lokasi</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((ln) => (
            <tr
              key={`${ln.key}-${ln.excelRow}`}
              className={`border-b border-slate-100 align-top ${
                ln.total.status === 'fail'
                  ? 'bg-red-50/40'
                  : ln.total.status === 'warn'
                    ? 'bg-amber-50/30'
                    : ''
              }`}
            >
              <td className="py-1.5 pr-1">
                <StatusDot status={ln.total.status} />
              </td>
              <td className="py-1.5 pr-2 font-bold text-slate-700">
                {ln.label}
                <span className="block text-[9px] font-normal text-slate-400">
                  baris ~{ln.excelRow}
                  {ln.isProcessCategory ? ' · kategori proses' : ''}
                </span>
              </td>
              <td className="py-1.5 pr-1 text-center tabular-nums text-slate-500">
                {ln.partCount || '—'}
              </td>
              <td className="py-1.5 pr-1 text-right tabular-nums">{formatIDR(ln.material.app)}</td>
              <td className="py-1.5 pr-1 text-right tabular-nums text-slate-500">
                {formatIDR(ln.material.excel)}
              </td>
              <td className="py-1.5 pr-1 text-right">
                <DeltaCell row={ln.material} />
              </td>
              <td className="py-1.5 pr-1 text-right tabular-nums">{formatIDR(ln.process.app)}</td>
              <td className="py-1.5 pr-1 text-right tabular-nums text-slate-500">
                {formatIDR(ln.process.excel)}
              </td>
              <td className="py-1.5 pr-1 text-right">
                <DeltaCell row={ln.total} />
              </td>
              <td className="py-1.5 text-[9px] text-slate-500 hidden xl:table-cell">{ln.hint}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ExcelDeviationBreakdown({ breakdown }) {
  const [showComponents, setShowComponents] = useState(true);
  const [showSummary, setShowSummary] = useState(true);

  if (!breakdown) return null;

  const { productionComponents, summaryLines, unallocated } = breakdown;
  const hasComponents = productionComponents?.length > 0;
  const hasSummary = summaryLines?.length > 0;

  if (!hasComponents && !hasSummary) return null;

  const topDiffs = summaryLines
    ?.filter((ln) => ln.total.status !== 'pass' && ln.total.excel > 0)
    .slice(0, 3);

  return (
    <div className="border-t border-slate-200 pt-3 space-y-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">
        Detail perbedaan dengan Excel
      </p>

      {topDiffs?.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-[11px] text-amber-900">
          <span className="font-black uppercase text-[9px] tracking-wide block mb-1">
            Sumber deviasi terbesar
          </span>
          {topDiffs.map((ln) => (
            <span key={ln.key} className="block">
              {ln.label}: Δ total {ln.total.diffIdr >= 0 ? '+' : ''}Rp{' '}
              {formatIDR(Math.abs(ln.total.diffIdr))} — {ln.hint}
            </span>
          ))}
        </div>
      )}

      {hasComponents && (
        <div>
          <button
            type="button"
            onClick={() => setShowComponents((v) => !v)}
            className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-slate-600 hover:text-blue-700 mb-2"
          >
            {showComponents ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            Komponen production ({productionComponents.length})
          </button>
          {showComponents && <ComponentTable rows={productionComponents} />}
        </div>
      )}

      {hasSummary && (
        <div>
          <button
            type="button"
            onClick={() => setShowSummary((v) => !v)}
            className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-slate-600 hover:text-blue-700 mb-2"
          >
            {showSummary ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            Per baris SUMMARY COST ({summaryLines.length})
          </button>
          {showSummary && <SummaryLinesTable lines={summaryLines} />}
        </div>
      )}

      {unallocated && (
        <p className="text-[10px] text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
          <span className="font-bold text-slate-600">{unallocated.partCount} part</span> belum
          terpetakan ke baris SUMMARY (total Rp {formatIDR(unallocated.total)}) — cek kode part /
          materialType di tab Material.
        </p>
      )}
    </div>
  );
}
