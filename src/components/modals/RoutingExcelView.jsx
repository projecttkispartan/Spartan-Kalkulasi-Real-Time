import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Settings,
  Plus,
  Minus,
  Trash2,
  ChevronDown,
  PieChart,
  CheckCircle2,
  Layout,
  Activity,
  Server,
  Network,
  Package,
  Ruler,
  Eye,
  ArrowLeft,
  Clock,
  Users,
} from 'lucide-react';
import ClickZoomImage from '../ui/ClickZoomImage';
import { posisiGambarMap } from '../../data/mockData';
import { getActiveWorkCenters, ROUTING_TEMPLATES, PROSES_OPTIONS, getWorkCenterById } from '../../data/routingCatalog';
import { formatIDR } from '../../utils/formatters';

const POSISI_OPTIONS = Object.keys(posisiGambarMap);
const PAGE = 'page-inner-full w-full max-w-[1600px] mx-auto';

const selectCls =
  'w-full h-10 appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-9 text-sm font-medium text-slate-800 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none';
const inputCls =
  'w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none';

function SelectWrap({ children }) {
  return (
    <div className="relative">
      {children}
      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );
}

function Field({ label, children, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function MaterialCard({ data, style }) {
  const dim = data.p && data.l && data.t ? `${data.p} × ${data.l} × ${data.t} mm` : null;

  return (
    <section className="surface-card-lg overflow-hidden border border-brand-100/80 shadow-sm">
      <div className="px-4 py-2.5 bg-gradient-to-r from-brand-50 via-sky-50/80 to-white border-b border-brand-100/60">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-brand-600" />
          <h3 className="text-[10px] font-black uppercase tracking-widest text-brand-800/80">Material yang Dioperasikan</h3>
        </div>
      </div>
      <div className="p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch">
        <div className="shrink-0 flex justify-center sm:justify-start">
          <div className="rounded-xl border-2 border-brand-200/70 bg-white p-1 shadow-md ring-1 ring-brand-50">
            <ClickZoomImage src={data.foto} alt={data.nama} size={148} className="rounded-lg" />
          </div>
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-2.5">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-0.5">
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${style.pill}`}>{data.tipe}</span>
              <span className="text-[11px] font-mono text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded">{data.kode}</span>
            </div>
            <p className="text-base sm:text-lg font-bold text-slate-900 leading-snug">{data.nama}</p>
          </div>
          <dl className="grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-lg bg-sky-50/90 border border-sky-100 px-2.5 py-2">
              <dt className="text-[9px] font-bold text-sky-600/80 uppercase">Qty</dt>
              <dd className="font-bold text-sky-800 text-sm tabular-nums">
                {data.qty} {data.unit || 'Pcs'}
              </dd>
            </div>
            {dim ? (
              <div className="rounded-lg bg-violet-50/90 border border-violet-100 px-2.5 py-2">
                <dt className="text-[9px] font-bold text-violet-600/80 uppercase flex items-center gap-0.5">
                  <Ruler className="w-2.5 h-2.5" /> Dimensi
                </dt>
                <dd className="font-bold text-violet-900 text-[11px] tabular-nums leading-tight">{dim}</dd>
              </div>
            ) : (
              <div className="rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-2 opacity-60">
                <dt className="text-[9px] font-bold text-slate-400 uppercase">Dimensi</dt>
                <dd className="text-xs text-slate-400">—</dd>
              </div>
            )}
            <div className="rounded-lg bg-teal-50/90 border border-teal-100 px-2.5 py-2">
              <dt className="text-[9px] font-bold text-teal-600/80 uppercase">Volume</dt>
              <dd className="font-bold text-teal-800 text-sm tabular-nums">{data.vol > 0 ? `${data.vol} m³` : '—'}</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}

function PersonStepper({ value, onChange, min = 1 }) {
  const n = Number(value) || min;
  return (
    <div className="flex items-center justify-center gap-1 mt-1.5">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, n - 1))}
        disabled={n <= min}
        className="w-7 h-7 flex items-center justify-center rounded-md border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        title="Kurangi pekerja"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <span className="min-w-[3.5rem] text-center text-xs font-bold text-emerald-800 tabular-nums">
        {n} org
      </span>
      <button
        type="button"
        onClick={() => onChange(n + 1)}
        className="w-7 h-7 flex items-center justify-center rounded-md border border-emerald-200 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
        title="Tambah pekerja"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function KalkulasiMini({ costs, isRouting, op, onUpdate, materialVol }) {
  const canEdit = !isRouting && op && onUpdate;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Waktu — editable */}
        <div className="rounded-xl border border-sky-200 bg-gradient-to-b from-sky-50 to-white px-3 py-2.5">
          <p className="text-[10px] font-bold text-sky-600/90 uppercase flex items-center gap-1">
            <Clock className="w-3 h-3" /> Waktu
            {canEdit && !op.waktuManual && materialVol > 0 && (
              <span className="text-[8px] font-normal normal-case text-sky-500 ml-auto">auto</span>
            )}
          </p>
          {canEdit ? (
            <div className="flex items-center gap-1 mt-1">
              <input
                type="number"
                min={0}
                step={0.5}
                value={op.waktuOperasi ?? 0}
                onChange={(e) => onUpdate(op.id, 'waktuOperasi', e.target.value)}
                className="w-full h-8 rounded-lg border border-sky-200 bg-white px-2 text-sm font-bold text-sky-800 text-center tabular-nums focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none"
              />
              <span className="text-[10px] font-semibold text-sky-500 shrink-0">mnt</span>
            </div>
          ) : (
            <p className="text-sm font-bold mt-1 tabular-nums text-sky-800">{costs.waktu} mnt</p>
          )}
        </div>

        {/* Biaya Mesin — read only */}
        <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white px-3 py-2.5">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Biaya Mesin</p>
          <p className="text-sm font-bold mt-1 tabular-nums text-slate-800">Rp {formatIDR(costs.mesin)}</p>
        </div>

        {/* Biaya Pekerja — with person stepper */}
        <div className="rounded-xl border border-emerald-200 bg-gradient-to-b from-emerald-50 to-white px-3 py-2.5">
          <p className="text-[10px] font-bold text-emerald-600/90 uppercase flex items-center gap-1">
            <Users className="w-3 h-3" /> Biaya Pekerja
          </p>
          <p className="text-sm font-bold mt-0.5 tabular-nums text-emerald-800">Rp {formatIDR(costs.pekerja)}</p>
          {canEdit ? (
            <PersonStepper
              value={op.totalPerson ?? 2}
              onChange={(n) => onUpdate(op.id, 'totalPerson', n)}
            />
          ) : (
            <p className="text-[10px] text-emerald-600/70 mt-1">{costs.person} org</p>
          )}
        </div>

        {/* Subtotal */}
        <div className="rounded-xl border border-violet-200 bg-gradient-to-b from-violet-50 to-white px-3 py-2.5 ring-1 ring-violet-100/50">
          <p className="text-[10px] font-bold text-violet-600/90 uppercase">Subtotal</p>
          <p className="text-sm font-black mt-1 tabular-nums text-violet-800">Rp {formatIDR(costs.total)}</p>
        </div>
      </div>
      {canEdit && (
        <p className="text-[10px] text-slate-400">
          {materialVol > 0 && !op.waktuManual
            ? `Auto: vol ${materialVol} m³ × ${costs.person} org → ${costs.waktu} mnt`
            : `Rate pekerja Rp ${formatIDR(costs.ratePekerja)}/mnt × ${costs.person} org × ${costs.waktu} mnt`}
        </p>
      )}
      {isRouting && (
        <p className="text-[10px] text-indigo-500/80">Waktu & pekerja per langkah — atur di popup Detail</p>
      )}
    </div>
  );
}

function RateKapasitasInfo({ rateMesin, ratePekerja, capacity, compact = false }) {
  const box = compact ? 'px-2 py-1.5' : 'px-3 py-2';
  return (
    <div className="grid grid-cols-3 gap-2 text-[10px]">
      <div className={`rounded-lg border border-slate-200 bg-slate-50/80 ${box}`}>
        <span className="text-slate-500 font-bold uppercase block">Rate mesin</span>
        <span className="font-bold text-slate-800">Rp {formatIDR(rateMesin)}/mnt</span>
      </div>
      <div className={`rounded-lg border border-amber-200 bg-amber-50/80 ${box}`}>
        <span className="text-amber-700 font-bold uppercase block">Rate pekerja</span>
        <span className="font-bold text-amber-900">Rp {formatIDR(ratePekerja)}/mnt</span>
      </div>
      <div className={`rounded-lg border border-sky-200 bg-sky-50/80 ${box}`}>
        <span className="text-sky-700 font-bold uppercase block">Kapasitas</span>
        <span className="font-bold text-sky-900">{capacity || '-'}</span>
      </div>
    </div>
  );
}

function OperationDetailModal({ op, index, costs, materialVol, onClose, onUpdate, onUpdateStep, onAddStep, onRemoveStep }) {
  if (!op) return null;

  const isRouting = op.inputMode === 'routing';
  const selectedWc = !isRouting ? getWorkCenterById(op.workCenterId) : null;

  const modal = (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Detail operasi"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[min(90vh,820px)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="shrink-0 px-5 py-4 border-b border-brand-100 bg-gradient-to-r from-brand-50 to-sky-50/50 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Detail Tahap {index + 1}</p>
            <h2 className="text-lg font-black text-slate-800">{op.nama || `Operasi ${index + 1}`}</h2>
            <span
              className={`inline-block mt-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                isRouting ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'
              }`}
            >
              {isRouting ? 'Routing' : 'Work Center'}
            </span>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-200 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto scroll-thin p-5 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Field label="Proses">
              <SelectWrap>
                <select value={op.proses || 'veneer'} onChange={(e) => onUpdate(op.id, 'proses', e.target.value)} className={selectCls}>
                  {PROSES_OPTIONS.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </SelectWrap>
            </Field>
            <Field label="Volume material">
              <div className="h-10 flex items-center px-3 rounded-lg border border-teal-200 bg-teal-50 text-sm font-bold text-teal-800">
                {materialVol > 0 ? `${materialVol} m³` : '—'}
              </div>
            </Field>
            <Field label="Tipe input">
              <div className="h-10 flex items-center px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700">
                {isRouting ? 'Routing' : 'Work Center'}
              </div>
            </Field>
          </div>

          {!isRouting && selectedWc && (
            <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-blue-700">
                <Server className="w-4 h-4" /> Parameter Work Center
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs mb-1">
                <div>
                  <span className="text-slate-400">Kode</span>
                  <p className="font-semibold text-slate-800">{selectedWc.kode}</p>
                </div>
                <div>
                  <span className="text-slate-400">Proses</span>
                  <p className="font-semibold">{selectedWc.mfgProcess}</p>
                </div>
              </div>
              <RateKapasitasInfo
                rateMesin={op.rateMesin ?? selectedWc.ratePerMin}
                ratePekerja={op.ratePekerja ?? selectedWc.laborRatePerMin ?? 500}
                capacity={costs.capacity}
                compact
              />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Field label="Rate mesin (/mnt)">
                  <input
                    type="number"
                    value={op.rateMesin ?? selectedWc.ratePerMin}
                    onChange={(e) => onUpdate(op.id, 'rateMesin', e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Rate pekerja (/mnt)">
                  <input
                    type="number"
                    value={op.ratePekerja ?? selectedWc.laborRatePerMin ?? 500}
                    onChange={(e) => onUpdate(op.id, 'ratePekerja', e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Nama operasi">
                  <input type="text" value={op.nama} onChange={(e) => onUpdate(op.id, 'nama', e.target.value)} className={inputCls} />
                </Field>
                <Field label="Waktu (menit)">
                  <input
                    type="number"
                    min={0}
                    value={op.waktuOperasi}
                    onChange={(e) => onUpdate(op.id, 'waktuOperasi', e.target.value)}
                    className={`${inputCls} font-semibold text-brand-700`}
                  />
                </Field>
                <Field label="Total person">
                  <input
                    type="number"
                    min={1}
                    value={op.totalPerson ?? 2}
                    onChange={(e) => onUpdate(op.id, 'totalPerson', e.target.value)}
                    className={`${inputCls} text-center`}
                  />
                </Field>
                <Field label="Catatan">
                  <input type="text" value={op.note || ''} onChange={(e) => onUpdate(op.id, 'note', e.target.value)} className={inputCls} />
                </Field>
              </div>
            </div>
          )}

          {isRouting && (
            <>
              <Field label="Template routing">
                <SelectWrap>
                  <select value={op.routingId} onChange={(e) => onUpdate(op.id, 'routingId', e.target.value)} className={selectCls}>
                    {ROUTING_TEMPLATES.map((rt) => (
                      <option key={rt.id} value={rt.id}>
                        {rt.kode} — {rt.nama}
                      </option>
                    ))}
                  </select>
                </SelectWrap>
              </Field>
              {op.routingSteps?.length > 0 && (
                <div className="rounded-xl border border-indigo-100 overflow-hidden">
                  <div className="px-3 py-2 bg-indigo-50 border-b border-indigo-100 flex items-center gap-2">
                    <Network className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-indigo-800 uppercase">Langkah Routing</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-white text-slate-500 font-semibold uppercase text-[10px] border-b border-slate-100">
                        <tr>
                          <th className="px-3 py-2 w-8">#</th>
                          <th className="px-3 py-2">Work center</th>
                          <th className="px-3 py-2 text-center w-16">Mnt</th>
                          <th className="px-3 py-2 text-center w-12">Org</th>
                          <th className="px-3 py-2 text-right">Mesin</th>
                          <th className="px-3 py-2 text-right">Pekerja</th>
                          <th className="px-3 py-2">Note</th>
                          <th className="px-3 py-2 w-10" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {op.routingSteps.map((st, si) => (
                          <tr key={si} className="hover:bg-slate-50/50">
                            <td className="px-3 py-2 text-slate-400">{st.urutan}</td>
                            <td className="px-3 py-2 font-medium text-slate-800">{st.wcNama}</td>
                            <td className="px-3 py-2 text-center">
                              <input
                                type="number"
                                min={0}
                                value={st.waktuMenit}
                                onChange={(e) => onUpdateStep(op.id, si, 'waktuMenit', e.target.value)}
                                className="w-14 h-8 text-center text-xs border border-slate-200 rounded-md"
                              />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <input
                                type="number"
                                min={1}
                                value={st.totalPerson}
                                onChange={(e) => onUpdateStep(op.id, si, 'totalPerson', e.target.value)}
                                className="w-12 h-8 text-center text-xs border border-slate-200 rounded-md"
                              />
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">Rp {formatIDR(st.biayaMesin)}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-emerald-700">Rp {formatIDR(st.biayaPekerja)}</td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={st.note || ''}
                                onChange={(e) => onUpdateStep(op.id, si, 'note', e.target.value)}
                                className="w-full min-w-[6rem] h-8 px-2 text-xs border border-slate-200 rounded-md"
                                placeholder="Note"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <button
                                type="button"
                                onClick={() => onRemoveStep(op.id, si)}
                                className="p-1 text-red-400 hover:text-red-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-3 py-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => onAddStep(op.id)}
                      className="text-xs font-bold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah langkah
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="rounded-xl border border-violet-100 bg-violet-50/30 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-violet-700">
              <Activity className="w-4 h-4" /> Kalkulasi Lengkap
            </div>
            <RateKapasitasInfo rateMesin={costs.rateMesin} ratePekerja={costs.ratePekerja} capacity={costs.capacity} />
            <KalkulasiMini costs={costs} isRouting={isRouting} op={op} onUpdate={onUpdate} materialVol={materialVol} />
            {(costs.wc || 0) > 0 && (
              <p className="text-[10px] text-amber-700">Biaya work center: Rp {formatIDR(costs.wc)}</p>
            )}
          </div>
        </div>

        <footer className="shrink-0 px-5 py-3 border-t border-slate-100 flex justify-end">
          <button type="button" onClick={onClose} className="btn-primary h-10 px-5 text-sm">
            Selesai
          </button>
        </footer>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

function OperationCard({ op, index, costs, materialVol, onRemove, onUpdate, onViewDetail }) {
  const isRouting = op.inputMode === 'routing';
  const volLabel = materialVol > 0 ? `${materialVol} m³` : '—';

  return (
    <article className="surface-card-lg overflow-hidden border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-brand-50/40">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-7 h-7 shrink-0 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white text-xs font-bold flex items-center justify-center shadow-sm">
            {index + 1}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate">{op.nama || `Tahap Operasi ${index + 1}`}</p>
            <span
              className={`inline-block mt-0.5 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md ${
                isRouting ? 'bg-indigo-100 text-indigo-700 border border-indigo-200/60' : 'bg-sky-100 text-sky-800 border border-sky-200/60'
              }`}
            >
              {isRouting ? 'Routing' : 'Work Center'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onViewDetail(op.id)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-brand-200 bg-brand-50 text-xs font-bold text-brand-700 hover:bg-brand-100 hover:border-brand-300 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" /> Detail
          </button>
          <button
            type="button"
            onClick={() => onRemove(op.id)}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Hapus tahap"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <Field label="Proses">
            <SelectWrap>
              <select value={op.proses || 'veneer'} onChange={(e) => onUpdate(op.id, 'proses', e.target.value)} className={selectCls}>
                {PROSES_OPTIONS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </SelectWrap>
          </Field>

          <Field label="Volume material">
            <div
              className="h-10 flex items-center px-3 rounded-lg border border-teal-200 bg-teal-50/80 text-sm font-bold text-teal-800 tabular-nums"
              title="Volume komponen — dasar kalkulasi waktu otomatis"
            >
              {volLabel}
            </div>
          </Field>

          <Field label="Tipe input">
            <SelectWrap>
              <select value={op.inputMode} onChange={(e) => onUpdate(op.id, 'inputMode', e.target.value)} className={selectCls}>
                <option value="work_center">Work Center</option>
                <option value="routing">Routing</option>
              </select>
            </SelectWrap>
          </Field>

          {!isRouting ? (
            <Field label="Work center" className="lg:col-span-2">
              <SelectWrap>
                <select value={op.workCenterId} onChange={(e) => onUpdate(op.id, 'workCenterId', e.target.value)} className={selectCls}>
                  {getActiveWorkCenters().map((wc) => (
                    <option key={wc.id} value={wc.id}>
                      {wc.kode} — {wc.nama}
                    </option>
                  ))}
                </select>
              </SelectWrap>
            </Field>
          ) : (
            <Field label="Routing" className="lg:col-span-2">
              <SelectWrap>
                <select value={op.routingId} onChange={(e) => onUpdate(op.id, 'routingId', e.target.value)} className={selectCls}>
                  {ROUTING_TEMPLATES.map((rt) => (
                    <option key={rt.id} value={rt.id}>
                      {rt.kode} — {rt.nama}
                    </option>
                  ))}
                </select>
              </SelectWrap>
            </Field>
          )}

          <Field label="Urutan">
            <input
              type="number"
              value={op.position}
              onChange={(e) => onUpdate(op.id, 'position', e.target.value)}
              className={`${inputCls} text-center`}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1 border-t border-slate-100">
          <div className="space-y-2 rounded-xl bg-brand-50/30 border border-brand-100/60 p-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-brand-700">
              <Layout className="w-4 h-4" /> Visual posisi
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-lg border-2 border-white bg-white p-0.5 shadow-sm shrink-0">
                <ClickZoomImage src={op.gambar} alt={op.posisiOperasi} size={80} />
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <p className="text-[10px] text-brand-600/70">Klik thumbnail untuk zoom</p>
                <Field label="Area kerja">
                  <SelectWrap>
                    <select value={op.posisiOperasi} onChange={(e) => onUpdate(op.id, 'posisiOperasi', e.target.value)} className={selectCls}>
                      {POSISI_OPTIONS.map((label) => (
                        <option key={label} value={label}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </SelectWrap>
                </Field>
              </div>
            </div>
          </div>
          <div className="space-y-2 rounded-xl bg-violet-50/20 border border-violet-100/50 p-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-violet-700">
              <Activity className="w-4 h-4" /> Kalkulasi
            </div>
            <KalkulasiMini costs={costs} isRouting={isRouting} op={op} onUpdate={onUpdate} materialVol={materialVol} />
          </div>
        </div>
      </div>
    </article>
  );
}

export default function RoutingExcelView({
  materialData,
  materialStyle,
  materialVol = 0,
  operations,
  costsById,
  totals,
  onUpdate,
  onUpdateStep,
  onRemove,
  onAddRow,
  onAddStep,
  onRemoveStep,
  onClose,
  onSave,
  kursUsd,
  kursEur,
}) {
  const [detailOpId, setDetailOpId] = useState(null);
  const detailIndex = operations.findIndex((o) => o.id === detailOpId);
  const detailOp = detailIndex >= 0 ? operations[detailIndex] : null;
  const detailCosts = detailOp ? costsById[detailOp.id] : null;

  return (
    <div className="routing-fullpage-root font-sans flex flex-col" role="dialog" aria-modal="true">
      <header className="shrink-0 bg-gradient-to-r from-brand-700 to-brand-600 text-white shadow-md">
        <div className={`${PAGE} px-4 sm:px-6 lg:px-8 py-4`}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="p-2 bg-white/10 rounded-lg shrink-0 hidden sm:block">
                <Settings className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold tracking-wide">Setup Operasi & Produksi Terpadu</h1>
                <p className="text-xs text-brand-100 mt-0.5 truncate">
                  {materialData.kode} · {materialData.nama}
                </p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="sm:hidden p-2 rounded-lg hover:bg-white/20">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto scroll-thin bg-page">
        <div className={`${PAGE} px-4 sm:px-6 lg:px-8 py-6 lg:py-8 flex flex-col gap-6`}>
          <MaterialCard data={materialData} style={materialStyle} />

          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-700">
              Daftar Operasi <span className="text-slate-400 font-normal">({operations.length})</span>
            </h2>
            <button type="button" onClick={() => onAddRow('work_center')} className="btn-primary text-xs h-9 px-3 shrink-0">
              <Plus className="w-4 h-4" /> Tambah tahap
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {operations.map((op, index) => (
              <OperationCard
                key={op.id}
                op={op}
                index={index}
                costs={costsById[op.id]}
                materialVol={materialVol}
                onRemove={onRemove}
                onUpdate={onUpdate}
                onViewDetail={setDetailOpId}
              />
            ))}
          </div>

          {operations.length === 0 && (
            <div className="surface-card-lg p-10 text-center text-slate-500 text-sm">
              Belum ada tahap operasi. Klik <strong>Tambah tahap</strong> untuk memulai.
            </div>
          )}

          <section className="surface-card-lg p-4 sm:p-5 shrink-0 border border-brand-100/60 bg-gradient-to-br from-white to-brand-50/20">
            <div className="flex items-center gap-2 mb-3">
              <PieChart className="w-4 h-4 text-brand-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Ringkasan Total</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { l: 'Waktu', v: `${totals.waktu} mnt`, cls: 'border-sky-200 bg-sky-50/80 text-sky-800' },
                { l: 'Mesin', v: `Rp ${formatIDR(totals.mesin)}`, cls: 'border-slate-200 bg-slate-50/80 text-slate-800' },
                { l: 'Pekerja', v: `Rp ${formatIDR(totals.pekerja)}`, cls: 'border-emerald-200 bg-emerald-50/80 text-emerald-800' },
                { l: 'Total IDR', v: `Rp ${formatIDR(totals.total)}`, cls: 'border-violet-300 bg-violet-50 ring-1 ring-violet-200/50 text-violet-900 font-black' },
              ].map((row) => (
                <div key={row.l} className={`rounded-xl px-3 py-2.5 border ${row.cls}`}>
                  <p className="text-[10px] font-bold uppercase opacity-70">{row.l}</p>
                  <p className="text-sm font-bold mt-0.5 tabular-nums">{row.v}</p>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-2 text-right">
              ≈ $ {(totals.total / kursUsd).toFixed(2)} · € {(totals.total / kursEur).toFixed(2)}
            </p>
          </section>
        </div>
      </main>

      <footer className="shrink-0 border-t border-slate-200 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        <div className={`${PAGE} px-4 sm:px-6 lg:px-8 py-4 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3`}>
          <button type="button" onClick={onClose} className="btn-secondary h-10 px-4 text-sm">
            Batal
          </button>
          <button type="button" onClick={onSave} className="btn-primary h-10 px-5 text-sm font-semibold">
            <CheckCircle2 className="w-4 h-4" /> Selesai & Simpan Routing
          </button>
        </div>
      </footer>

      {detailOp && detailCosts && (
        <OperationDetailModal
          op={detailOp}
          index={detailIndex}
          costs={detailCosts}
          materialVol={materialVol}
          onClose={() => setDetailOpId(null)}
          onUpdate={onUpdate}
          onUpdateStep={onUpdateStep}
          onAddStep={onAddStep}
          onRemoveStep={onRemoveStep}
        />
      )}
    </div>
  );
}
