import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  XCircle,
} from 'lucide-react';
import { formatIDR } from '../../utils/formatters';
import { COGS_PART_GROUPS } from '../../utils/cogsBreakdown.js';

const STATUS_BADGE = {
  pass: {
    Icon: CheckCircle2,
    label: 'PASS',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  warn: {
    Icon: AlertTriangle,
    label: 'WARN',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  fail: {
    Icon: XCircle,
    label: 'FAIL',
    className: 'bg-red-50 text-red-700 border-red-200',
  },
  skip: {
    Icon: AlertTriangle,
    label: '—',
    className: 'bg-slate-50 text-slate-400 border-slate-200',
  },
};

function DeviationBadge({ status }) {
  const cfg = STATUS_BADGE[status] || STATUS_BADGE.skip;
  const { Icon, label, className } = cfg;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-black uppercase tracking-wide ${className}`}
    >
      <Icon className="w-3.5 h-3.5" aria-hidden />
      {label}
    </span>
  );
}

function signedPct(diffPct, diffIdr) {
  const sign = diffIdr >= 0 ? '+' : '';
  return `${sign}${(diffPct * 100).toFixed(2)}%`;
}

function signedIdr(diffIdr) {
  const sign = diffIdr > 0 ? '+' : '';
  return `${sign}Rp ${formatIDR(Math.abs(diffIdr))}`;
}

function CompareRow({ label, row }) {
  if (!row || row.status === 'skip') return null;
  return (
    <tr className="border-b border-slate-100 text-xs">
      <td className="py-3 pr-3 font-bold text-slate-700">{label}</td>
      <td className="py-3 text-right tabular-nums text-slate-600">{formatIDR(row.app)}</td>
      <td className="py-3 text-right tabular-nums text-slate-500">{formatIDR(row.excel)}</td>
      <td className="py-3 text-right tabular-nums font-bold text-slate-800">
        {signedIdr(row.diffIdr)}
      </td>
      <td className="py-3 text-right tabular-nums text-slate-600">
        {signedPct(row.diffPct, row.diffIdr)}
      </td>
      <td className="py-3 text-right">
        <DeviationBadge status={row.status} />
      </td>
    </tr>
  );
}

const GROUP_LABELS = {
  'excel-summary': 'EXCEL / SUMMARY',
  'template-excel': 'Template Excel',
  'template-master': 'Master',
  'template-other': 'Lainnya',
};

export default function ExcelDeviationCard({ insight, compact = false }) {
  const [showGroups, setShowGroups] = useState(false);
  const [showCauseNotes, setShowCauseNotes] = useState(false);
  const excelCompare = insight?.excelCompare;

  if (!excelCompare?.comparable) {
    return (
      <section
        className="bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm p-6"
        aria-labelledby="cogs-deviation-title"
      >
        <header className="flex items-center gap-2 mb-3">
          <FileSpreadsheet className="w-5 h-5 text-slate-400" aria-hidden />
          <h3
            id="cogs-deviation-title"
            className="text-sm font-black text-slate-800 uppercase tracking-wider"
          >
            Deviasi vs Excel SUMMARY COST
          </h3>
        </header>
        <p className="text-sm text-slate-500 leading-relaxed">
          {excelCompare?.emptyReason ||
            'Tidak ada referensi Excel. Upload file BOM Spartan (.xlsx) atau buka sample dengan mirror SUMMARY COST.'}
        </p>
      </section>
    );
  }

  const { production, totalCogs } = excelCompare;
  const notes = insight?.notes ?? [];
  const suggestedAction = insight?.suggestedAction ?? '';

  const hasCauseContent = notes.length > 0 || suggestedAction;

  return (
    <section
      className={`bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3 ${compact ? 'p-4' : 'p-6'}`}
      aria-labelledby="cogs-deviation-title"
    >
      <header className="flex items-center gap-2">
        <FileSpreadsheet className="w-5 h-5 text-blue-600" aria-hidden />
        <h3
          id="cogs-deviation-title"
          className="text-sm font-black text-slate-800 uppercase tracking-wider"
        >
          Deviasi vs Excel SUMMARY COST
        </h3>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full text-left" role="table">
          <thead>
            <tr className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 border-b border-slate-200">
              <th className="pb-2 pr-3">Metrik</th>
              <th className="pb-2 text-right">App</th>
              <th className="pb-2 text-right">Excel</th>
              <th className="pb-2 text-right">Δ Rp</th>
              <th className="pb-2 text-right">%</th>
              <th className="pb-2 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            <CompareRow label="Production cost" row={production} />
            <CompareRow label="Total COGS" row={totalCogs} />
          </tbody>
        </table>
      </div>

      {hasCauseContent && (
        <div className="border-t border-slate-100 pt-2">
          <button
            type="button"
            onClick={() => setShowCauseNotes((v) => !v)}
            className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-slate-500 hover:text-blue-700"
          >
            {showCauseNotes ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            Catatan & tindakan ({notes.length})
          </button>
          {showCauseNotes && (
            <div className="mt-2 space-y-2 max-h-40 overflow-y-auto scrollbar-hide">
              {notes.length > 0 && (
                <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
                  {notes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              )}
              {suggestedAction && (
                <p className="text-xs text-blue-800 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                  <span className="font-black uppercase text-[10px] tracking-wide block mb-1">
                    Tindakan disarankan
                  </span>
                  {suggestedAction}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowGroups((v) => !v)}
        className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-slate-500 hover:text-blue-700 self-start"
      >
        {showGroups ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        Lihat part EXCEL / template
      </button>

      {showGroups && (
        <div className="space-y-3 border border-slate-100 rounded-lg p-3 bg-slate-50/50">
          {COGS_PART_GROUPS.map((g) => {
            const grp = insight.groups?.[g];
            if (!grp?.partCount) return null;
            return (
              <div key={g}>
                <p className="text-[10px] font-black text-slate-600 uppercase mb-1">
                  {GROUP_LABELS[g] || g} ({grp.partCount} part)
                </p>
                <table className="w-full text-[10px]" role="table">
                  <thead>
                    <tr className="text-slate-400">
                      <th className="text-left pb-1">Kode</th>
                      <th className="text-right pb-1">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(grp.top10 || []).map((p) => (
                      <tr key={p.kode} className="border-t border-slate-100">
                        <td className="py-0.5 font-mono text-slate-600">{p.kode}</td>
                        <td className="py-0.5 text-right tabular-nums">
                          {formatIDR(p.partTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
