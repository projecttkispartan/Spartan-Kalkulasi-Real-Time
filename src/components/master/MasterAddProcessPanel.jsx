import { ListOrdered, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { MASTER_GLOBAL_ADD_STEPS, MASTER_TAB_ADD_STEPS } from './masterAddProcess.js';

/**
 * Panel langkah penambahan data untuk tab master aktif.
 */
export default function MasterAddProcessPanel({ tabId, tabLabel, onAddRow, canAdd }) {
  const [expanded, setExpanded] = useState(true);
  const tabSteps = MASTER_TAB_ADD_STEPS[tabId] || [];

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/90 overflow-hidden shrink-0">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left hover:bg-slate-100/80 transition-colors"
      >
        <span className="flex items-center gap-2 text-xs font-black text-slate-800 uppercase tracking-wide">
          <ListOrdered className="w-4 h-4 text-emerald-600 shrink-0" />
          Proses penambahan data
          {tabLabel && (
            <span className="font-bold text-emerald-700 normal-case tracking-normal">— {tabLabel}</span>
          )}
        </span>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-slate-100 space-y-4">
          <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5 text-[11px]">
            {MASTER_GLOBAL_ADD_STEPS.map((s, i) => (
              <li
                key={s.id}
                className="rounded-lg bg-white border border-slate-100 px-2.5 py-2 flex gap-2"
              >
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-bold text-slate-800">{s.title}</p>
                  <p className="text-slate-600 mt-0.5 leading-snug">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>

          {tabSteps.length > 0 && (
            <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 mb-2">
                Khusus tab ini
              </p>
              <ul className="space-y-1.5">
                {tabSteps.map((s) => (
                  <li key={s.title} className="text-[11px] text-slate-700 leading-snug">
                    <span className="font-bold text-emerald-900">{s.title}:</span> {s.body}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {canAdd && onAddRow && (
            <button
              type="button"
              onClick={onAddRow}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah baris di tab ini
            </button>
          )}
        </div>
      )}
    </div>
  );
}
