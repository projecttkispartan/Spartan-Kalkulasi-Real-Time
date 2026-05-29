import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Settings, Plus, Trash2, ChevronDown, PieChart, CheckCircle2,
  Layout, Activity, Server, Network, Package, Ruler,
} from 'lucide-react';
import ClickZoomImage from '../ui/ClickZoomImage';
import { posisiGambarMap } from '../../data/mockData';
import {
  WORK_CENTERS,
  ROUTING_TEMPLATES,
  getWorkCenterById,
  enrichRoutingSteps,
  calcOperationFromWorkCenter,
  calcOperationFromRouting,
} from '../../data/routingCatalog';
import { calcProsesCosts, LABOR_RATE_PER_MIN } from '../../utils/operationCosts';
import { tipeStyles } from '../../design/tipeStyles';
import { formatIDR } from '../../utils/formatters';

const POSISI_OPTIONS = Object.keys(posisiGambarMap);
const PAGE = 'w-full max-w-[1600px] mx-auto';

const defaultOperation = (id = 1) => ({
  id,
  inputMode: 'work_center',
  workCenterId: WORK_CENTERS[0]?.id ?? '',
  routingId: '',
  routingSteps: [],
  mfgProcess: WORK_CENTERS[0]?.mfgProcess ?? 'Woodworking',
  nama: 'Veneer',
  position: id,
  posisiOperasi: 'Depan',
  gambar: posisiGambarMap.Depan,
  waktuOperasi: 0,
  totalPerson: 2,
  wcRate: WORK_CENTERS[0]?.ratePerMin ?? 1000,
  rateMesin: WORK_CENTERS[0]?.ratePerMin ?? 1000,
  ratePekerja: WORK_CENTERS[0]?.laborRatePerMin ?? LABOR_RATE_PER_MIN,
  wcCapacity: WORK_CENTERS[0]?.capacity ?? '14 m³',
});

function mapSavedOp(p, i) {
  const base = {
    id: i + 1,
    inputMode: p.inputMode || 'work_center',
    workCenterId: p.workCenterId || '',
    routingId: p.routingId || '',
    routingSteps: p.routingSteps?.length ? enrichRoutingSteps(p.routingSteps) : [],
    mfgProcess: p.mfgProcess || 'Woodworking',
    nama: p.nama || `Operasi ${i + 1}`,
    position: p.position ?? i + 1,
    posisiOperasi: p.posisiOperasi || 'Depan',
    gambar: p.gambar || posisiGambarMap[p.posisiOperasi] || posisiGambarMap.Depan,
    waktuOperasi: Number(p.waktuOperasi) || 0,
    totalPerson: p.totalPerson ?? 2,
    wcRate: p.wcRate ?? p.rateMesin ?? 1000,
    rateMesin: p.rateMesin ?? p.wcRate ?? 1000,
    ratePekerja: p.ratePekerja ?? LABOR_RATE_PER_MIN,
    wcCapacity: p.wcCapacity ?? '14 m³',
    biayaMesin: p.biayaMesin,
    biayaPekerja: p.biayaPekerja,
  };
  if (base.inputMode === 'routing' && base.routingId && !base.routingSteps.length) {
    const fromRt = calcOperationFromRouting(base.routingId);
    if (fromRt) {
      return { ...base, ...fromRt, id: base.id, position: base.position, posisiOperasi: base.posisiOperasi, gambar: base.gambar };
    }
  }
  if (base.inputMode === 'work_center' && base.workCenterId) {
    const wc = getWorkCenterById(base.workCenterId);
    if (wc) {
      base.wcRate = wc.ratePerMin;
      base.rateMesin = p.rateMesin ?? wc.ratePerMin;
      base.ratePekerja = p.ratePekerja ?? wc.laborRatePerMin ?? LABOR_RATE_PER_MIN;
      base.wcCapacity = wc.capacity;
      base.mfgProcess = wc.mfgProcess;
    }
  }
  return base;
}

function RateKapasitasInfo({ rateMesin, ratePekerja, capacity, compact = false }) {
  const box = compact ? 'px-2 py-1.5' : 'px-3 py-2';
  return (
    <div className="grid grid-cols-3 gap-2 text-[10px]">
      <div className={`rounded-lg border border-slate-200 bg-white ${box}`}>
        <span className="text-slate-400 font-semibold uppercase block">Rate mesin</span>
        <span className="font-bold text-slate-800">Rp {formatIDR(rateMesin)}/mnt</span>
      </div>
      <div className={`rounded-lg border border-amber-100 bg-amber-50/50 ${box}`}>
        <span className="text-amber-700 font-semibold uppercase block">Rate pekerja</span>
        <span className="font-bold text-amber-800">Rp {formatIDR(ratePekerja)}/mnt</span>
      </div>
      <div className={`rounded-lg border border-blue-100 bg-blue-50/50 ${box}`}>
        <span className="text-blue-600 font-semibold uppercase block">Kapasitas</span>
        <span className="font-bold text-blue-800">{capacity || '-'}</span>
      </div>
    </div>
  );
}

function buildOperationsFromNode(node) {
  const d = node?.data ?? node;
  if (!d) return [defaultOperation()];
  if (d.proses?.length) return d.proses.map((p, i) => mapSavedOp(p, i));
  const count = Number(d.proses_count) || 0;
  if (count > 0) return Array.from({ length: count }, (_, i) => defaultOperation(i + 1));
  return [defaultOperation()];
}

function SectionHead({ icon: Icon, title, tone = 'slate' }) {
  const tones = {
    slate: 'text-slate-700',
    brand: 'text-brand-700',
    blue: 'text-blue-700',
    indigo: 'text-indigo-700',
  };
  return (
    <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wide ${tones[tone] || tones.slate}`}>
      {Icon && <Icon className="w-4 h-4 shrink-0" />}
      {title}
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

const selectCls =
  'w-full h-10 appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-9 text-sm font-medium text-slate-800 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none';
const inputCls =
  'w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none';

function MaterialCard({ data, style }) {
  const dim = data.p && data.l && data.t ? `${data.p} × ${data.l} × ${data.t} mm` : null;

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
        <Package className="w-4 h-4 text-brand-600" />
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Material yang Dioperasikan</h3>
      </div>
      <div className="p-4 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4">
        <ClickZoomImage src={data.foto} alt={data.nama} size={96} />
        <div className="flex flex-col justify-center gap-3 min-w-0">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${style.pill}`}>{data.tipe}</span>
              <span className="text-[11px] font-mono text-slate-500">{data.kode}</span>
            </div>
            <p className="text-lg font-bold text-slate-900 leading-snug">{data.nama}</p>
          </div>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
            <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
              <dt className="text-[10px] font-semibold text-slate-400 uppercase">Qty</dt>
              <dd className="font-bold text-brand-600">{data.qty} {data.unit || 'Pcs'}</dd>
            </div>
            {dim && (
              <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
                <dt className="text-[10px] font-semibold text-slate-400 uppercase flex items-center gap-1">
                  <Ruler className="w-3 h-3" /> Dimensi
                </dt>
                <dd className="font-bold text-slate-700 text-xs">{dim}</dd>
              </div>
            )}
            {data.vol > 0 && (
              <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
                <dt className="text-[10px] font-semibold text-slate-400 uppercase">Volume</dt>
                <dd className="font-bold text-blue-600">{data.vol} m³</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </section>
  );
}

function KalkulasiStrip({ costs, isRouting }) {
  const items = [
    { label: 'Waktu', value: `${costs.waktu} mnt`, color: 'text-blue-600' },
    { label: 'Biaya mesin', value: `Rp ${formatIDR(costs.mesin)}`, color: 'text-slate-800' },
    { label: 'Biaya pekerja', value: `Rp ${formatIDR(costs.pekerja)}`, color: 'text-emerald-700' },
    { label: 'Subtotal', value: `Rp ${formatIDR(costs.total)}`, color: 'text-indigo-700' },
  ];

  return (
    <div className="space-y-2">
      <RateKapasitasInfo
        rateMesin={costs.rateMesin}
        ratePekerja={costs.ratePekerja}
        capacity={costs.capacity}
        compact
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {items.map((item) => (
          <div key={item.label} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
            <p className="text-[10px] font-semibold text-slate-400 uppercase">{item.label}</p>
            <p className={`text-sm font-bold mt-0.5 ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>
      {isRouting && (
        <p className="text-[10px] text-slate-400">Rate & kapasitas per langkah — lihat tabel routing di atas.</p>
      )}
      {!isRouting && (
        <p className="text-[10px] text-slate-400">
          {costs.person} org × rate pekerja Rp {formatIDR(costs.ratePekerja)}/mnt
        </p>
      )}
    </div>
  );
}

function OperationCard({
  op,
  index,
  onRemove,
  onUpdate,
  onUpdateStep,
  selectCls: sel,
  inputCls: inp,
}) {
  const costs = calcProsesCosts(op);
  const isRouting = op.inputMode === 'routing';
  const selectedWc = getWorkCenterById(op.workCenterId);

  const SelectWrap = ({ children }) => (
    <div className="relative">
      {children}
      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );

  return (
    <article className="relative z-0 bg-white rounded-xl border border-slate-200 shadow-sm">
      {/* Header tahap */}
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/80">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-7 h-7 shrink-0 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center">
            {index + 1}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate">Tahap Operasi {index + 1}</p>
            <span
              className={`inline-block mt-0.5 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                isRouting ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'
              }`}
            >
              {isRouting ? 'Routing' : 'Work Center'}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onRemove(op.id)}
          className="shrink-0 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          title="Hapus tahap"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </header>

      <div className="p-4 space-y-4">
        {/* Baris konfigurasi utama */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Field label="Tipe input">
            <SelectWrap>
              <select value={op.inputMode} onChange={(e) => onUpdate(op.id, 'inputMode', e.target.value)} className={sel}>
                <option value="work_center">Work Center</option>
                <option value="routing">Routing</option>
              </select>
            </SelectWrap>
          </Field>

          {!isRouting ? (
            <Field label="Work center" className="sm:col-span-2">
              <SelectWrap>
                <select value={op.workCenterId} onChange={(e) => onUpdate(op.id, 'workCenterId', e.target.value)} className={sel}>
                  {WORK_CENTERS.map((wc) => (
                    <option key={wc.id} value={wc.id}>{wc.kode} — {wc.nama}</option>
                  ))}
                </select>
              </SelectWrap>
            </Field>
          ) : (
            <Field label="Routing" className="sm:col-span-2">
              <SelectWrap>
                <select value={op.routingId} onChange={(e) => onUpdate(op.id, 'routingId', e.target.value)} className={sel}>
                  {ROUTING_TEMPLATES.map((rt) => (
                    <option key={rt.id} value={rt.id}>{rt.kode} — {rt.nama}</option>
                  ))}
                </select>
              </SelectWrap>
            </Field>
          )}

          <Field label="Urutan">
            <input type="number" value={op.position} onChange={(e) => onUpdate(op.id, 'position', e.target.value)} className={`${inp} text-center`} />
          </Field>
        </div>

        {/* Detail WC */}
        {!isRouting && selectedWc && (
          <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3 space-y-3">
            <SectionHead icon={Server} title="Parameter work center" tone="blue" />
            <div className="grid grid-cols-2 gap-2 text-xs mb-1">
              <div><span className="text-slate-400">Kode</span><p className="font-semibold text-slate-800">{selectedWc.kode}</p></div>
              <div><span className="text-slate-400">Proses</span><p className="font-semibold">{selectedWc.mfgProcess}</p></div>
            </div>
            <RateKapasitasInfo
              rateMesin={op.rateMesin ?? selectedWc.ratePerMin}
              ratePekerja={op.ratePekerja ?? selectedWc.laborRatePerMin ?? LABOR_RATE_PER_MIN}
              capacity={selectedWc.capacity}
              compact
            />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Field label="Rate mesin (/mnt)">
                <input
                  type="number"
                  value={op.rateMesin ?? selectedWc.ratePerMin}
                  onChange={(e) => onUpdate(op.id, 'rateMesin', e.target.value)}
                  className={inp}
                />
              </Field>
              <Field label="Rate pekerja (/mnt)">
                <input
                  type="number"
                  value={op.ratePekerja ?? selectedWc.laborRatePerMin ?? LABOR_RATE_PER_MIN}
                  onChange={(e) => onUpdate(op.id, 'ratePekerja', e.target.value)}
                  className={inp}
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Nama operasi">
                <input type="text" value={op.nama} onChange={(e) => onUpdate(op.id, 'nama', e.target.value)} className={inp} />
              </Field>
              <Field label="Waktu (menit)">
                <input type="number" value={op.waktuOperasi} onChange={(e) => onUpdate(op.id, 'waktuOperasi', e.target.value)} className={`${inp} font-semibold text-brand-700`} />
              </Field>
              <Field label="Total person">
                <input type="number" value={op.totalPerson ?? 2} onChange={(e) => onUpdate(op.id, 'totalPerson', e.target.value)} className={`${inp} text-center`} />
              </Field>
            </div>
          </div>
        )}

        {/* Tabel routing */}
        {isRouting && op.routingSteps?.length > 0 && (
          <div className="rounded-lg border border-indigo-100 overflow-hidden">
            <div className="px-3 py-2 bg-indigo-50 border-b border-indigo-100">
              <SectionHead icon={Network} title="Langkah routing" tone="indigo" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white text-slate-500 font-semibold uppercase text-[10px] border-b border-slate-100">
                  <tr>
                    <th className="px-3 py-2 w-8">#</th>
                    <th className="px-3 py-2">Work center</th>
                    <th className="px-3 py-2 hidden sm:table-cell">Proses</th>
                    <th className="px-3 py-2 text-right hidden md:table-cell">Rate mesin</th>
                    <th className="px-3 py-2 text-right hidden md:table-cell">Rate pekerja</th>
                    <th className="px-3 py-2 hidden lg:table-cell">Kapasitas</th>
                    <th className="px-3 py-2 text-center w-16">Mnt</th>
                    <th className="px-3 py-2 text-center w-12">Org</th>
                    <th className="px-3 py-2 text-right">Biaya mesin</th>
                    <th className="px-3 py-2 text-right">Biaya pekerja</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {op.routingSteps.map((st, si) => (
                    <tr key={si} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2 text-slate-400 font-medium">{st.urutan}</td>
                      <td className="px-3 py-2">
                        <p className="font-medium text-slate-800 truncate max-w-[140px]">{st.wcNama}</p>
                      </td>
                      <td className="px-3 py-2 text-slate-600 hidden sm:table-cell">{st.mfgProcess}</td>
                      <td className="px-3 py-2 text-right text-slate-600 hidden md:table-cell whitespace-nowrap">Rp {formatIDR(st.rateMesin)}</td>
                      <td className="px-3 py-2 text-right text-amber-700 hidden md:table-cell whitespace-nowrap">Rp {formatIDR(st.ratePekerja)}</td>
                      <td className="px-3 py-2 text-slate-500 hidden lg:table-cell">{st.capacity}</td>
                      <td className="px-3 py-2 text-center">
                        <input type="number" value={st.waktuMenit} onChange={(e) => onUpdateStep(op.id, si, 'waktuMenit', e.target.value)} className="w-14 h-8 text-center text-xs border border-slate-200 rounded-md" />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input type="number" value={st.totalPerson} onChange={(e) => onUpdateStep(op.id, si, 'totalPerson', e.target.value)} className="w-12 h-8 text-center text-xs border border-slate-200 rounded-md" />
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-slate-700 whitespace-nowrap">Rp {formatIDR(st.biayaMesin)}</td>
                      <td className="px-3 py-2 text-right font-medium text-emerald-700 whitespace-nowrap">Rp {formatIDR(st.biayaPekerja)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1 border-t border-slate-100">
          <div className="space-y-2">
            <SectionHead icon={Layout} title="Visual posisi" tone="brand" />
            <div className="flex items-start gap-3">
              <ClickZoomImage src={op.gambar} alt={op.posisiOperasi} size={72} />
              <div className="flex-1 min-w-0 space-y-2">
                <p className="text-[10px] text-slate-500">Klik thumbnail untuk zoom in / out</p>
                <Field label="Area kerja">
                  <SelectWrap>
                    <select value={op.posisiOperasi} onChange={(e) => onUpdate(op.id, 'posisiOperasi', e.target.value)} className={sel}>
                      {POSISI_OPTIONS.map((label) => (
                        <option key={label} value={label}>{label}</option>
                      ))}
                    </select>
                  </SelectWrap>
                </Field>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <SectionHead icon={Activity} title="Kalkulasi" tone="slate" />
            <KalkulasiStrip costs={costs} isRouting={isRouting} />
          </div>
        </div>
      </div>
    </article>
  );
}

export default function RoutingModal({ node, onClose, kursUsd, kursEur, onSave }) {
  const nodeData = useMemo(() => node?.data ?? node, [node]);
  const [operations, setOperations] = useState(() => buildOperationsFromNode(node));

  useEffect(() => {
    if (!node) return;
    setOperations(buildOperationsFromNode(node));
  }, [node?.id, node]);

  const handleAddOperation = () => {
    const newId = operations.length > 0 ? Math.max(...operations.map((o) => o.id)) + 1 : 1;
    setOperations([...operations, { ...defaultOperation(newId), position: newId }]);
  };

  const handleRemoveOperation = (id) => {
    setOperations(operations.filter((op) => op.id !== id));
  };

  const updateOperation = (id, field, value) => {
    setOperations(
      operations.map((op) => {
        if (op.id !== id) return op;
        if (field === 'inputMode') {
          if (value === 'routing') {
            const rt = calcOperationFromRouting(ROUTING_TEMPLATES[0]?.id);
            return rt ? { ...op, ...rt, id: op.id, position: op.position, posisiOperasi: op.posisiOperasi, gambar: op.gambar } : { ...op, inputMode: 'routing' };
          }
          const wc = calcOperationFromWorkCenter(op.workCenterId || WORK_CENTERS[0]?.id);
          return wc ? { ...op, ...wc, id: op.id, position: op.position, posisiOperasi: op.posisiOperasi, gambar: op.gambar } : { ...op, inputMode: 'work_center', routingSteps: [] };
        }
        if (field === 'workCenterId') {
          const wc = calcOperationFromWorkCenter(value);
          return wc ? { ...op, ...wc, id: op.id, position: op.position, posisiOperasi: op.posisiOperasi, gambar: op.gambar } : op;
        }
        if (field === 'routingId') {
          const rt = calcOperationFromRouting(value);
          return rt ? { ...op, ...rt, id: op.id, position: op.position, posisiOperasi: op.posisiOperasi, gambar: op.gambar } : op;
        }
        const updated = { ...op, [field]: value };
        if (field === 'posisiOperasi') updated.gambar = posisiGambarMap[value] || posisiGambarMap.Depan;
        if (field === 'waktuOperasi' || field === 'totalPerson' || field === 'rateMesin' || field === 'ratePekerja') {
          delete updated.biayaMesin;
          delete updated.biayaPekerja;
          if (field === 'rateMesin') updated.wcRate = Number(value) || 0;
        }
        return updated;
      })
    );
  };

  const updateRoutingStep = (opId, stepIndex, field, value) => {
    setOperations(
      operations.map((op) => {
        if (op.id !== opId || op.inputMode !== 'routing') return op;
        const steps = [...(op.routingSteps || [])];
        steps[stepIndex] = { ...steps[stepIndex], [field]: Number(value) || 0 };
        const enriched = enrichRoutingSteps(
          steps.map((s) => ({
            urutan: s.urutan,
            workCenterId: s.workCenterId,
            namaProses: s.namaProses,
            waktuMenit: s.waktuMenit,
            totalPerson: s.totalPerson,
          }))
        );
        const waktuOperasi = enriched.reduce((s, st) => s + (Number(st.waktuMenit) || 0), 0);
        return { ...op, routingSteps: enriched, waktuOperasi, biayaMesin: undefined, biayaPekerja: undefined };
      })
    );
  };

  if (!node || !nodeData) return null;
  const d = nodeData;
  const style = tipeStyles[d.tipe] || tipeStyles.PART;

  const handleSave = () => {
    if (onSave) {
      onSave(
        node.id,
        operations.map((op) => {
          const costs = calcProsesCosts(op);
          return {
            inputMode: op.inputMode,
            workCenterId: op.workCenterId,
            routingId: op.routingId,
            routingSteps: (op.routingSteps || []).map((st) => ({
              urutan: st.urutan,
              workCenterId: st.workCenterId,
              namaProses: st.namaProses,
              waktuMenit: st.waktuMenit,
              totalPerson: st.totalPerson,
            })),
            nama: op.nama,
            mfgProcess: op.mfgProcess,
            posisiOperasi: op.posisiOperasi,
            gambar: op.gambar,
            waktuOperasi: costs.waktu,
            totalPerson: Number(op.totalPerson) || 2,
            wcRate: costs.rateMesin,
            rateMesin: costs.rateMesin,
            ratePekerja: costs.ratePekerja,
            wcCapacity: costs.capacity,
            biayaMesin: costs.mesin,
            biayaPekerja: costs.pekerja,
            biaya: costs.total,
          };
        })
      );
    }
    onClose();
  };

  const grandTotal = operations.reduce((s, op) => s + calcProsesCosts(op).total, 0);
  const totalWaktu = operations.reduce((s, op) => s + calcProsesCosts(op).waktu, 0);
  const totalMesin = operations.reduce((s, op) => s + calcProsesCosts(op).mesin, 0);
  const totalPekerja = operations.reduce((s, op) => s + calcProsesCosts(op).pekerja, 0);

  const modalContent = (
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-page isolate"
      style={{ height: '100dvh', maxHeight: '100dvh', width: '100vw' }}
      role="dialog"
      aria-modal="true"
      aria-label="Setup Operasi dan Produksi Terpadu"
    >
      <header className="shrink-0 z-10 bg-gradient-to-r from-brand-700 to-blue-600 text-white shadow-md">
        <div className={`${PAGE} px-6 lg:px-10 py-4 flex items-center justify-between gap-4`}>
          <div className="flex items-center gap-4 min-w-0">
            <div className="p-2.5 bg-white/10 rounded-lg shrink-0">
              <Settings className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold tracking-wide">Setup Operasi & Produksi Terpadu</h1>
              <p className="text-xs text-brand-100 mt-0.5 truncate">
                {d.kode} · {d.nama}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain bg-slate-50/80">
        <div className={`${PAGE} px-6 lg:px-10 py-6 lg:py-8 flex flex-col gap-6`}>
          <MaterialCard data={d} style={style} />

          <div className="flex items-center justify-between gap-3 shrink-0">
            <h2 className="text-sm font-bold text-slate-700">
              Daftar Operasi <span className="text-slate-400 font-normal">({operations.length})</span>
            </h2>
            <button
              type="button"
              onClick={handleAddOperation}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" /> Tambah tahap
            </button>
          </div>

          <div className="flex flex-col gap-4 w-full">
            {operations.map((op, index) => (
              <OperationCard
                key={op.id}
                op={op}
                index={index}
                onRemove={handleRemoveOperation}
                onUpdate={updateOperation}
                onUpdateStep={updateRoutingStep}
                selectCls={selectCls}
                inputCls={inputCls}
              />
            ))}
          </div>

          <section className="relative z-0 mt-4 pt-6 border-t-2 border-slate-300 bg-white rounded-xl p-4 shadow-sm shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <PieChart className="w-4 h-4 text-brand-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Ringkasan total</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { l: 'Waktu', v: `${totalWaktu} mnt` },
                { l: 'Mesin', v: `Rp ${formatIDR(totalMesin)}` },
                { l: 'Pekerja', v: `Rp ${formatIDR(totalPekerja)}` },
                { l: 'Total IDR', v: `Rp ${formatIDR(grandTotal)}`, highlight: true },
              ].map((row) => (
                <div key={row.l} className={`rounded-lg px-3 py-2 border ${row.highlight ? 'border-indigo-200 bg-indigo-50' : 'border-slate-100 bg-slate-50'}`}>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">{row.l}</p>
                  <p className={`text-sm font-bold mt-0.5 ${row.highlight ? 'text-indigo-700' : 'text-slate-800'}`}>{row.v}</p>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-2 text-right">
              ≈ $ {(grandTotal / kursUsd).toFixed(2)} · € {(grandTotal / kursEur).toFixed(2)}
            </p>
          </section>

          <div className="h-4 shrink-0" aria-hidden />
        </div>
      </main>

      <footer className="shrink-0 z-10 border-t border-slate-200 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        <div className={`${PAGE} px-6 lg:px-10 py-4 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3`}>
          <button type="button" onClick={onClose} className="h-10 px-4 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="h-10 px-5 rounded-lg bg-slate-800 text-white text-sm font-semibold hover:bg-slate-900 inline-flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" /> Selesai & Simpan Routing
          </button>
        </div>
      </footer>
    </div>
  );

  return createPortal(modalContent, document.body);
}
