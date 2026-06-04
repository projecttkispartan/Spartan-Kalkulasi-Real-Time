import { FileSpreadsheet, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';

export const EXCEL_IMPORT_STEPS = [
  { id: 'validate', label: 'Validasi file' },
  { id: 'read', label: 'Membaca workbook' },
  { id: 'parse', label: 'Parser BOM & COGS' },
  { id: 'images', label: 'Ekstrak gambar' },
  { id: 'save', label: 'Menyimpan project' },
];

const STEP_ORDER = Object.fromEntries(EXCEL_IMPORT_STEPS.map((s, i) => [s.id, i]));

function stepStatus(stepId, currentStage, done, error) {
  if (error && STEP_ORDER[stepId] >= STEP_ORDER[currentStage]) return 'error';
  if (done) return 'done';
  if (stepId === currentStage) return 'active';
  if (STEP_ORDER[stepId] < STEP_ORDER[currentStage]) return 'done';
  return 'pending';
}

export default function ExcelImportOverlay({
  open,
  fileName = '',
  stage = 'validate',
  detail = '',
  done = false,
  error = null,
  onDismiss,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="excel-import-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 bg-gradient-to-br from-brand-50/80 to-white">
          <div className="flex items-start gap-3">
            <div
              className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${
                error ? 'bg-red-100 text-red-600' : done ? 'bg-emerald-100 text-emerald-600' : 'bg-brand-100 text-brand-600'
              }`}
            >
              {error ? (
                <AlertCircle className="w-6 h-6" />
              ) : done ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : (
                <Loader2 className="w-6 h-6 animate-spin" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 id="excel-import-title" className="text-base font-bold text-slate-800">
                {error ? 'Import Excel gagal' : done ? 'Import berhasil' : 'Mengimpor Excel BOM'}
              </h2>
              {fileName && (
                <p className="text-xs text-slate-500 mt-1 truncate flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                  {fileName}
                </p>
              )}
            </div>
            {(error || done) && onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-900 leading-relaxed whitespace-pre-wrap">{error}</p>
              <p className="text-[11px] text-red-700/90 mt-2">
                Pastikan file adalah template BOM Spartan (.xlsx) dengan sheet &quot;BOM TEMPLATE&quot; dan baris part terisi.
              </p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {EXCEL_IMPORT_STEPS.map((step) => {
                const status = stepStatus(step.id, stage, done, error);
                return (
                  <li key={step.id} className="flex items-center gap-3 text-sm">
                    <span
                      className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                        status === 'done'
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : status === 'active'
                            ? 'bg-brand-500 border-brand-500 text-white'
                            : status === 'error'
                              ? 'bg-red-500 border-red-500 text-white'
                              : 'bg-white border-slate-200 text-slate-400'
                      }`}
                    >
                      {status === 'done' ? '✓' : status === 'active' ? '…' : ''}
                    </span>
                    <span
                      className={
                        status === 'active'
                          ? 'font-semibold text-brand-800'
                          : status === 'done'
                            ? 'text-slate-600'
                            : 'text-slate-400'
                      }
                    >
                      {step.label}
                    </span>
                    {status === 'active' && !done && (
                      <Loader2 className="w-3.5 h-3.5 text-brand-500 animate-spin ml-auto shrink-0" />
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {detail && !error && (
            <p className="text-xs text-slate-500 border-t border-slate-100 pt-3 leading-relaxed">{detail}</p>
          )}

          {done && !error && (
            <p className="text-xs text-emerald-700 font-medium">Membuka editor BOM…</p>
          )}

          {error && onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="w-full mt-2 py-2.5 rounded-lg text-sm font-bold text-white bg-slate-700 hover:bg-slate-800 transition-colors"
            >
              Tutup
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
