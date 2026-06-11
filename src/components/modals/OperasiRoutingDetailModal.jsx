import { createPortal } from 'react-dom';
import { X, Network, Server } from 'lucide-react';
import { enrichRoutingSteps, getRoutingById, getProsesById } from '../../data/routingCatalog';
import { calcProsesCosts } from '../../utils/operationCosts';
import { formatIDR } from '../../utils/formatters';

/** Popup read-only: detail operasi routing (langkah WC) untuk Summary / Kalkulasi */
export default function OperasiRoutingDetailModal({ operasi, operasiIndex = 0, onClose }) {
  if (!operasi) return null;

  const isRouting = operasi.inputMode === 'routing';
  const routingMeta = operasi.routingId ? getRoutingById(operasi.routingId) : null;
  const steps = enrichRoutingSteps(operasi.routingSteps || []);
  const costs = calcProsesCosts(operasi);
  const prosesLabel = operasi.proses ? getProsesById(operasi.proses).label : operasi.mfgProcess || '—';

  const modal = (
    <div
      className="fixed inset-0 z-[350] flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Detail operasi routing"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[min(88vh,720px)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="shrink-0 px-5 py-4 border-b border-indigo-100 bg-gradient-to-r from-indigo-50 to-slate-50 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Detail operasi · Tahap {operasiIndex + 1}
            </p>
            <h2 className="text-lg font-black text-slate-800 truncate">{operasi.nama || `Operasi ${operasiIndex + 1}`}</h2>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 border border-indigo-200">
                {isRouting ? 'Routing' : 'Work Center'}
              </span>
              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-100">
                Proses: {prosesLabel}
              </span>
              {routingMeta && (
                <span className="text-[9px] font-bold text-slate-600 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                  {routingMeta.kode} — {routingMeta.nama}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-200 text-slate-500 shrink-0"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto scroll-thin p-5 space-y-4">
          {operasi.note?.trim() && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[9px] font-bold uppercase text-slate-400 mb-0.5">Catatan operasi</p>
              <p className="text-sm text-slate-700 leading-snug">{operasi.note}</p>
            </div>
          )}

          {operasi.materialsUsed?.length > 0 && (
            <div className="rounded-lg border border-amber-100 bg-amber-50/50 px-3 py-2">
              <p className="text-[9px] font-bold uppercase text-amber-700 mb-1">Bahan operasi</p>
              <ul className="text-xs text-slate-700 space-y-0.5">
                {operasi.materialsUsed.map((m, i) => {
                  const mode =
                    m.materialSourceMode ||
                    (m.materialMasterId ? 'database' : m.manualSpec || (m.nama && !m.materialMasterId) ? 'manual' : null);
                  const name = m.nama || m.manualSpec || m.kode || '—';
                  return (
                    <li key={m.id || i}>
                      {name}
                      {Number(m.qty) ? ` · ${m.qty} ${m.unit || 'pcs'}` : ''}
                      {mode === 'database' ? (
                        <span className="ml-1 text-[9px] font-bold text-emerald-600">[DB]</span>
                      ) : mode === 'manual' ? (
                        <span className="ml-1 text-[9px] font-bold text-slate-500">[Manual]</span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {operasi.dimensiOperasi && operasi.dimensiOperasi.useParentDimensi === false && (
            <div className="rounded-lg border border-violet-100 bg-violet-50/50 px-3 py-2 text-xs text-slate-700">
              <span className="text-[9px] font-bold uppercase text-violet-700 block mb-0.5">Dimensi operasi</span>
              {operasi.dimensiOperasi.p || 0} × {operasi.dimensiOperasi.l || 0} × {operasi.dimensiOperasi.t || 0} mm
            </div>
          )}

          {isRouting && steps.length > 0 ? (
            <div className="rounded-xl border border-indigo-100 overflow-hidden">
              <div className="px-3 py-2 bg-indigo-50 border-b border-indigo-100 flex items-center gap-2">
                <Network className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-indigo-800 uppercase">Langkah routing ({steps.length})</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white text-slate-500 font-semibold uppercase text-[10px] border-b border-slate-100">
                    <tr>
                      <th className="px-3 py-2 w-8">#</th>
                      <th className="px-3 py-2">Work center</th>
                      <th className="px-3 py-2 text-center">Mnt</th>
                      <th className="px-3 py-2 text-center">Org</th>
                      <th className="px-3 py-2 text-right">Biaya mesin</th>
                      <th className="px-3 py-2 text-right">Biaya pekerja</th>
                      <th className="px-3 py-2">Detail / catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {steps.map((st, si) => (
                      <tr key={si} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2 text-slate-400 font-bold">{st.urutan}</td>
                        <td className="px-3 py-2 font-medium text-slate-800">{st.wcNama || st.namaProses || '—'}</td>
                        <td className="px-3 py-2 text-center font-bold text-blue-600 tabular-nums">{st.waktuMenit ?? 0}</td>
                        <td className="px-3 py-2 text-center font-bold text-amber-600 tabular-nums">{st.totalPerson ?? '—'}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-700">Rp {formatIDR(st.biayaMesin)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-emerald-700">Rp {formatIDR(st.biayaPekerja)}</td>
                        <td className="px-3 py-2 text-slate-600 max-w-[12rem] whitespace-normal leading-snug">
                          {st.note?.trim() || <span className="text-slate-400 italic">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : isRouting ? (
            <p className="text-sm text-slate-500 italic text-center py-6">Belum ada langkah routing terdaftar.</p>
          ) : (
            <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-blue-700">
                <Server className="w-4 h-4" /> Work Center
              </div>
              <p className="text-sm font-semibold text-slate-800">{operasi.workCenterId || '—'}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mt-2">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Waktu</span>
                  <span className="font-black text-blue-600">{costs.waktu} mnt</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Pekerja</span>
                  <span className="font-black text-amber-600">{costs.person} org</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Mesin</span>
                  <span className="font-bold text-slate-700">Rp {formatIDR(costs.mesin)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Tenaga kerja</span>
                  <span className="font-bold text-emerald-700">Rp {formatIDR(costs.pekerja)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <footer className="shrink-0 px-5 py-3 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 text-xs font-bold">
          <span className="text-slate-500 uppercase tracking-widest text-[10px]">Total operasi</span>
          <div className="flex flex-wrap gap-4">
            <span className="text-blue-600">{costs.waktu} mnt</span>
            <span className="text-slate-700">Mesin: Rp {formatIDR(costs.mesin)}</span>
            <span className="text-emerald-700">Pekerja: Rp {formatIDR(costs.pekerja)}</span>
            <span className="text-indigo-800 bg-white px-2 py-1 rounded border border-indigo-100">
              Rp {formatIDR(costs.total)}
            </span>
          </div>
        </footer>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
