import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  MinusCircle,
  X,
} from 'lucide-react';
import {
  CHECKLIST_GROUP_LABELS,
  CHECKLIST_GROUP_ORDER,
  EXCEL_PARITY_TOLERANCE_IDR,
  EXCEL_PARITY_TOLERANCE_PCT,
} from '../../data/excelParityChecklist.js';
import { auditExcelParity } from '../../utils/excelParityAudit.js';

const STATUS_ICON = {
  pass: CheckCircle2,
  fail: XCircle,
  warn: AlertTriangle,
  skip: MinusCircle,
};

const STATUS_STYLE = {
  pass: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  fail: 'text-red-600 bg-red-50 border-red-200',
  warn: 'text-amber-600 bg-amber-50 border-amber-200',
  skip: 'text-slate-400 bg-slate-50 border-slate-200',
};

function StatusIcon({ status }) {
  const Icon = STATUS_ICON[status] || MinusCircle;
  return <Icon className={`w-4 h-4 shrink-0 ${status === 'skip' ? 'opacity-60' : ''}`} />;
}

export default function ExcelParityChecklistPanel({
  bomData,
  productMeta,
  productInfo,
  dimensi,
  packingSpec,
  packingDimensions,
  cogsConfig,
  cogsData,
  excelMirror,
  importedFromExcel,
  kursUsd,
  kursEur,
  mastersReady,
  listMaxHeight = 'max-h-[min(360px,38vh)]',
  className = '',
  onClose = null,
}) {
  const [collapsed, setCollapsed] = useState(() =>
    Object.fromEntries(CHECKLIST_GROUP_ORDER.map((g) => [g, true])),
  );
  const [showOptional, setShowOptional] = useState(false);

  const audit = useMemo(
    () =>
      auditExcelParity({
        bomData,
        productMeta,
        productInfo,
        dimensi,
        packingSpec,
        packingDimensions,
        cogsConfig,
        cogsData,
        excelMirror,
        importedFromExcel,
        kursUsd,
        kursEur,
        mastersReady,
      }),
    [
      bomData,
      productMeta,
      productInfo,
      dimensi,
      packingSpec,
      packingDimensions,
      cogsConfig,
      cogsData,
      excelMirror,
      importedFromExcel,
      kursUsd,
      kursEur,
      mastersReady,
    ],
  );

  const grouped = useMemo(() => {
    const map = {};
    CHECKLIST_GROUP_ORDER.forEach((g) => {
      map[g] = audit.items.filter((it) => it.group === g);
    });
    return map;
  }, [audit.items]);

  const toggleGroup = (g) => setCollapsed((p) => ({ ...p, [g]: !p[g] }));

  const visibleGroups = CHECKLIST_GROUP_ORDER.filter((g) => {
    const items = grouped[g] || [];
    if (g === 'opsional' && !showOptional) return false;
    return items.length > 0;
  });

  const { pass, fail, warn, score } = audit.summary;
  const releaseReady = fail === 0 && score >= 85;

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0 ${className}`}>
      <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-50/80 to-white flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h3
              id="excel-checklist-modal-title"
              className="text-sm font-black text-slate-800 uppercase tracking-wider"
            >
              Checklist Pengganti Excel
            </h3>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">
              Toleransi COGS: ≤ {(EXCEL_PARITY_TOLERANCE_PCT * 100).toFixed(1)}% atau ≤ Rp{' '}
              {EXCEL_PARITY_TOLERANCE_IDR.toLocaleString('id-ID')}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div
            className={`px-3 py-1.5 rounded-lg border text-xs font-black uppercase tracking-wide ${
              releaseReady
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            Skor {score}%
          </div>
          <span className="text-[10px] font-bold text-emerald-600">{pass} OK</span>
          <span className="text-[10px] font-bold text-red-600">{fail} wajib</span>
          <span className="text-[10px] font-bold text-amber-600">{warn} peringatan</span>
          <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 cursor-pointer">
            <input
              type="checkbox"
              checked={showOptional}
              onChange={(e) => setShowOptional(e.target.checked)}
              className="rounded border-slate-300"
            />
            Tampilkan opsional
          </label>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 ml-1"
              aria-label="Tutup checklist"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {audit.blockers.length > 0 && (
        <div className="mx-6 mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
          <p className="font-black uppercase text-[10px] tracking-wider mb-1">Blocker utama</p>
          <ul className="list-disc list-inside space-y-0.5 font-medium">
            {audit.blockers.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      )}

      <div className={`p-4 space-y-3 overflow-y-auto scrollbar-hide flex-1 min-h-0 ${listMaxHeight}`}>
        {visibleGroups.map((groupKey) => {
          const items = grouped[groupKey].filter(
            (it) => showOptional || it.severity !== 'opsional',
          );
          if (!items.length) return null;
          const isCollapsed = collapsed[groupKey];
          const groupFails = items.filter((i) => i.status === 'fail').length;
          return (
            <div key={groupKey} className="border border-slate-100 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleGroup(groupKey)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
              >
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-700 flex items-center gap-2">
                  {isCollapsed ? (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                  {CHECKLIST_GROUP_LABELS[groupKey]}
                </span>
                {groupFails > 0 && (
                  <span className="text-[9px] font-black text-red-600 bg-red-100 px-2 py-0.5 rounded">
                    {groupFails} belum
                  </span>
                )}
              </button>
              {!isCollapsed && (
                <ul className="divide-y divide-slate-50">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className={`px-4 py-2.5 flex gap-3 items-start border-l-4 ${
                        item.status === 'pass'
                          ? 'border-l-emerald-400'
                          : item.status === 'fail'
                            ? 'border-l-red-400'
                            : item.status === 'warn'
                              ? 'border-l-amber-400'
                              : 'border-l-slate-200'
                      }`}
                    >
                      <span
                        className={`mt-0.5 p-1 rounded border ${STATUS_STYLE[item.status] || STATUS_STYLE.skip}`}
                      >
                        <StatusIcon status={item.status} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 leading-snug">{item.label}</p>
                        {item.detail && (
                          <p className="text-[10px] text-slate-500 mt-0.5 font-medium">{item.detail}</p>
                        )}
                        {item.hint && item.status !== 'pass' && (
                          <p className="text-[10px] text-indigo-600/80 mt-1 italic">{item.hint}</p>
                        )}
                        {item.excelRef && (
                          <p className="text-[9px] text-slate-400 mt-1 font-mono">{item.excelRef}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
