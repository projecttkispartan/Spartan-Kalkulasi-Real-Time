import { useState } from 'react';
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
import { getActiveWorkCenters, ROUTING_TEMPLATES, PROSES_OPTIONS, getWorkCenterById } from '../../data/routingCatalog';
import { POSISI_COMBO_GROUPS, getPosisiComboItem } from '../../data/posisiComboCatalog';
import { formatIDR } from '../../utils/formatters';
import { computePartCostRow } from '../../services/bomCalculations';
import {
  computeMaterialBiayaFromMaster,
  displayNameFromMaster,
  kodeFromMaster,
} from '../../utils/masterLookup.js';
import { DatabaseMaterialField } from '../fields/MasterCombos.jsx';
import { formatMaterialsUsedLabel } from '../../utils/prosesLineItems.js';

let materialRowSeq = 0;

function newMaterialRowId() {
  materialRowSeq += 1;
  return `mat-row-${Date.now()}-${materialRowSeq}`;
}

function computeVolMm(p, l, t) {
  const pv = (Number(p) || 0) / 1000;
  const lv = (Number(l) || 0) / 1000;
  const tv = (Number(t) || 0) / 1000;
  if (!pv || !lv || !tv) return 0;
  return Math.round(pv * lv * tv * 1000) / 1000;
}

const PAGE = 'page-inner-full w-full max-w-[1600px] mx-auto';

const UNIT_OPTIONS = ['pcs', 'm', 'm²', 'kg', 'l', 'set'];

function resolveMaterialSourceMode(m) {
  if (m.materialSourceMode === 'manual' || m.materialSourceMode === 'database') {
    return m.materialSourceMode;
  }
  if (m.materialMasterId) return 'database';
  if (m.manualSpec || ((m.nama || m.kode) && !m.materialMasterId)) return 'manual';
  return 'database';
}

function normalizeMaterialRow(m) {
  const mode = resolveMaterialSourceMode(m);
  const p = Number(m.p) || 0;
  const l = Number(m.l) || 0;
  const t = Number(m.t) || 0;
  const qty = Number(m.qty) || 1;
  const biaya = Number(m.biaya) || 0;
  const vol = Number(m.vol) || computeVolMm(p, l, t);
  const biayaProduksi = Math.round(biaya * qty);
  return {
    id: m.id || newMaterialRowId(),
    materialMasterId: m.materialMasterId || '',
    materialSourceMode: mode,
    manualSpec: m.manualSpec ?? (mode === 'manual' ? (m.nama || m.kode || '') : ''),
    kode: m.kode || '',
    nama: m.nama || m.manualSpec || '',
    qty,
    unit: m.unit || 'pcs',
    p,
    l,
    t,
    vol,
    biaya,
    biayaProduksi,
    materialType: m.materialType || '',
  };
}

function masterUnitPrice(mat) {
  const unit = String(mat?.unit || 'm3').toLowerCase();
  if (unit === 'm2' || unit === 'm²') {
    return (
      Number(mat.hargaMaterialSupplier) ||
      Number(mat.pricePerM2Supplier) ||
      Number(mat.pricePerUnitSupplier) ||
      0
    );
  }
  const pieceOrFlat = ['pcs', 'lbr', 'roll', 'unit', 'btl', 'kg', 'm', 'ltr', 'ml'];
  if (pieceOrFlat.includes(unit)) {
    return (
      Number(mat.hargaMaterialSupplier) ||
      Number(mat.pricePerUnitSupplier) ||
      0
    );
  }
  return (
    Number(mat.hargaMaterialSupplier) ||
    Number(mat.pricePerM3Supplier) ||
    0
  );
}

function dimsFromMaster(mat) {
  const d = mat?.dimensi || {};
  return {
    p: Number(d.p ?? mat.p ?? 0) || 0,
    l: Number(d.l ?? mat.l ?? 0) || 0,
    t: Number(d.t ?? mat.t ?? 0) || 0,
  };
}

/** Harga = biaya 1 part; Harga Produksi = Harga × Qty */
function splitUnitAndProduksiFromCost(cost, qty) {
  const q = Math.max(1, Number(qty) || 1);
  const u = String(cost.unit || 'm3').toLowerCase();
  const pieceLike = ['pcs', 'lbr', 'roll', 'unit', 'btl', 'kg', 'm', 'ltr', 'ml'].includes(u);

  let unitBiaya;
  if (pieceLike && cost.pricePerUnit != null) {
    unitBiaya = Math.round(Number(cost.pricePerUnit) || 0);
  } else if (pieceLike) {
    unitBiaya = Math.round((Number(cost.biaya) || 0) / q);
  } else {
    unitBiaya = Math.round(Number(cost.biaya) || 0);
  }

  return {
    biaya: unitBiaya,
    biayaProduksi: Math.round(unitBiaya * q),
    sf: cost.sf ?? 0,
    wf: cost.wf ?? 0,
  };
}

/** Isi unit, dimensi, volume, harga dari SKU DATA BASE */
function applyMasterToMaterialRow(row, mat) {
  if (!mat?.id) return normalizeMaterialRow(row);

  const { p, l, t } = dimsFromMaster(mat);
  const qty = Number(row.qty) || 1;
  const unit = mat.unit || row.unit || 'pcs';
  const vol = computeVolMm(p, l, t);
  const mt = mat.materialType || 'komponen';

  const draft = {
    ...row,
    id: row.id || newMaterialRowId(),
    materialMasterId: mat.id,
    materialSourceMode: 'database',
    manualSpec: '',
    kode: kodeFromMaster(mat) || mat.kode || '',
    nama: displayNameFromMaster(mat) || mat.specification || mat.nama || '',
    unit,
    materialType: mt,
    p,
    l,
    t,
    vol,
    qty,
  };

  const cost = computeMaterialBiayaFromMaster(
    { ...draft, materialType: mt },
    mat.id,
    mt,
  );

  if (cost?.biaya != null) {
    const { biaya, biayaProduksi, sf, wf } = splitUnitAndProduksiFromCost(cost, qty);
    return normalizeMaterialRow({ ...draft, biaya, biayaProduksi, sf, wf });
  }

  const price = masterUnitPrice(mat);
  const u = String(unit).toLowerCase();
  let unitBiaya = 0;
  if (u === 'm3' || u === 'm³') {
    unitBiaya = vol > 0 ? Math.round(price * vol) : 0;
  } else if (u === 'm2' || u === 'm²') {
    const m2 = p && l ? (p * l) / 1_000_000 : 0;
    unitBiaya = m2 > 0 ? Math.round(price * m2) : 0;
  } else {
    unitBiaya = Math.round(price);
  }

  return normalizeMaterialRow({
    ...draft,
    biaya: unitBiaya,
    biayaProduksi: Math.round(unitBiaya * qty),
  });
}

function newMaterialRow() {
  return normalizeMaterialRow({
    id: newMaterialRowId(),
    materialMasterId: '',
    materialSourceMode: 'database',
    manualSpec: '',
    kode: '',
    nama: '',
    qty: 1,
    unit: 'pcs',
    p: 0,
    l: 0,
    t: 0,
    vol: 0,
    biaya: 0,
    biayaProduksi: 0,
  });
}

function patchMaterialDims(row, patch) {
  const next = { ...row, ...patch };
  if ('p' in patch || 'l' in patch || 't' in patch) {
    next.vol = computeVolMm(next.p, next.l, next.t);
  }
  return normalizeMaterialRow(next);
}

function recalcMaterialRowCosts(row) {
  const base = normalizeMaterialRow(row);
  if (!base.materialMasterId) return base;
  const cost = computeMaterialBiayaFromMaster(
    base,
    base.materialMasterId,
    base.materialType || 'komponen',
  );
  if (!cost) return base;
  const { biaya, biayaProduksi, sf, wf } = splitUnitAndProduksiFromCost(cost, base.qty);
  return normalizeMaterialRow({ ...base, biaya, biayaProduksi, sf, wf });
}

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

function PartInfoSummary({ data }) {
  const dim = data.p || data.l || data.t ? `${data.p || 0} × ${data.l || 0} × ${data.t || 0} mm` : '—';
  const cells = [
    { label: 'Qty', value: `${data.qty ?? 1} ${data.unit || 'EA'}` },
    { label: 'Unit', value: data.unit || 'EA' },
    { label: 'Dimensi', value: dim },
    { label: 'Volume', value: data.vol > 0 ? `${data.vol} m³` : '—' },
    { label: 'Harga (1 Part)', value: `Rp ${formatIDR(data.biaya || 0)}` },
    { label: 'Harga Produksi', value: `Rp ${formatIDR((Number(data.biaya) || 0) * (Number(data.qty) || 1))}` },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/80">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Informasi Part</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-slate-100">
        {cells.map((cell) => (
          <div key={cell.label} className="bg-white px-3 py-2.5">
            <p className="text-[9px] font-bold text-slate-400 uppercase">{cell.label}</p>
            <p className="text-xs font-bold text-slate-800 mt-0.5 tabular-nums truncate" title={cell.value}>{cell.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MaterialCard({ data, style }) {
  const dim = data.p && data.l && data.t ? `${data.p} × ${data.l} × ${data.t} mm` : null;
  const costRow = data.tipe === 'PART' ? computePartCostRow(data) : null;

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
          <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-sm">
            <div className="rounded-lg bg-sky-50/90 border border-sky-100 px-2.5 py-2">
              <dt className="text-[9px] font-bold text-sky-600/80 uppercase">Qty</dt>
              <dd className="font-bold text-sky-800 text-sm tabular-nums">{data.qty ?? 1}</dd>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-2">
              <dt className="text-[9px] font-bold text-slate-500 uppercase">Unit</dt>
              <dd className="font-bold text-slate-800 text-sm">{data.unit || 'EA'}</dd>
            </div>
            <div className="rounded-lg bg-violet-50/90 border border-violet-100 px-2.5 py-2">
              <dt className="text-[9px] font-bold text-violet-600/80 uppercase flex items-center gap-0.5">
                <Ruler className="w-2.5 h-2.5" /> Dimensi
              </dt>
              <dd className="font-bold text-violet-900 text-[11px] tabular-nums leading-tight">{dim || '—'}</dd>
            </div>
            <div className="rounded-lg bg-teal-50/90 border border-teal-100 px-2.5 py-2">
              <dt className="text-[9px] font-bold text-teal-600/80 uppercase">Volume</dt>
              <dd className="font-bold text-teal-800 text-sm tabular-nums">{data.vol > 0 ? `${data.vol} m³` : '—'}</dd>
            </div>
            <div className="rounded-lg bg-amber-50/90 border border-amber-100 px-2.5 py-2">
              <dt className="text-[9px] font-bold text-amber-600/80 uppercase">Harga</dt>
              <dd className="font-bold text-amber-900 text-[11px] tabular-nums">Rp {formatIDR(data.biaya || 0)}</dd>
            </div>
            <div className="rounded-lg bg-emerald-50/90 border border-emerald-100 px-2.5 py-2">
              <dt className="text-[9px] font-bold text-emerald-600/80 uppercase">Harga Produksi</dt>
              <dd className="font-bold text-emerald-900 text-[11px] tabular-nums">
                Rp {formatIDR(costRow?.biayaProduksi ?? 0)}
              </dd>
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

function OperationMaterialRow({ row, index, mastersTick, onPatch, onRemove }) {
  const m = normalizeMaterialRow(row);
  const sourceMode = resolveMaterialSourceMode(m);

  const patch = (patchFields) => {
    const next = patchMaterialDims(m, patchFields);
    const shouldRecalc =
      m.materialMasterId &&
      ('qty' in patchFields || 'p' in patchFields || 'l' in patchFields || 't' in patchFields);
    onPatch(shouldRecalc ? recalcMaterialRowCosts(next) : next);
  };

  return (
    <div className="rounded-lg border border-amber-200/80 bg-white p-3 space-y-2.5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-black uppercase tracking-wide text-amber-800">
          Part #{index + 1}
          {m.kode ? (
            <span className="ml-2 font-mono font-bold text-slate-500 normal-case">{m.kode}</span>
          ) : null}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
          title="Hapus bahan"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <DatabaseMaterialField
        showAll
        compact
        mastersTick={mastersTick}
        value={m.materialMasterId || ''}
        manualSpec={sourceMode === 'manual' ? (m.manualSpec || m.nama || '') : ''}
        sourceMode={sourceMode === 'manual' ? 'manual' : 'database'}
        className="min-w-0 w-full"
        onChange={(masterId, mat, manualSpec, modeHint) => {
          const mode = modeHint?.sourceMode === 'manual' ? 'manual' : 'database';
          if (mode === 'manual') {
            onPatch(normalizeMaterialRow({
              ...m,
              materialMasterId: '',
              materialSourceMode: 'manual',
              manualSpec: manualSpec || '',
              kode: '',
              nama: manualSpec || '',
            }));
            return;
          }
          if (!masterId || !mat) {
            onPatch(normalizeMaterialRow({
              ...m,
              materialMasterId: '',
              materialSourceMode: 'database',
              manualSpec: '',
              kode: '',
              nama: '',
              biaya: 0,
              biayaProduksi: 0,
            }));
            return;
          }
          onPatch(applyMasterToMaterialRow(m, mat));
        }}
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <Field label="Qty">
          <input
            type="number"
            min={0}
            step="any"
            value={m.qty ?? 1}
            onChange={(e) => patch({ qty: e.target.value })}
            className={inputCls}
          />
        </Field>
        <Field label="Unit">
          <SelectWrap>
            <select
              value={m.unit || 'pcs'}
              onChange={(e) => patch({ unit: e.target.value })}
              className={selectCls}
            >
              {UNIT_OPTIONS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
              {m.unit && !UNIT_OPTIONS.includes(m.unit) ? (
                <option value={m.unit}>{m.unit}</option>
              ) : null}
            </select>
          </SelectWrap>
        </Field>
        <Field label="P (mm)">
          <input
            type="number"
            min={0}
            value={m.p || 0}
            onChange={(e) => patch({ p: e.target.value })}
            className={inputCls}
          />
        </Field>
        <Field label="L (mm)">
          <input
            type="number"
            min={0}
            value={m.l || 0}
            onChange={(e) => patch({ l: e.target.value })}
            className={inputCls}
          />
        </Field>
        <Field label="T (mm)">
          <input
            type="number"
            min={0}
            value={m.t || 0}
            onChange={(e) => patch({ t: e.target.value })}
            className={inputCls}
          />
        </Field>
        <Field label="Volume (m³)">
          <div className="h-10 flex items-center px-3 rounded-lg border border-teal-200 bg-teal-50 text-sm font-bold text-teal-800 tabular-nums">
            {m.vol > 0 ? m.vol : '—'}
          </div>
        </Field>
        <Field label="Harga (1 Part)">
          <input
            type="number"
            min={0}
            value={m.biaya ?? 0}
            onChange={(e) => patch({ biaya: e.target.value })}
            className={inputCls}
            title="Harga satuan untuk 1 part"
          />
        </Field>
        <Field label="Harga Produksi (× Qty)">
          <div
            className="h-10 flex items-center px-3 rounded-lg border border-emerald-200 bg-emerald-50 text-sm font-bold text-emerald-800 tabular-nums"
            title={`${formatIDR(m.biaya || 0)} × ${m.qty ?? 1}`}
          >
            Rp {formatIDR(m.biayaProduksi ?? 0)}
          </div>
        </Field>
        <div className="flex items-end pb-1">
          <span
            className={`text-[9px] font-bold uppercase px-2 py-1 rounded-md border ${
              sourceMode === 'database'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            {sourceMode === 'database' ? 'DATA BASE' : 'Manual'}
          </span>
        </div>
      </div>
    </div>
  );
}

function OperationMaterialsSection({ op, mastersTick = 0, onUpdate }) {
  const materials = (op.materialsUsed || []).map(normalizeMaterialRow);

  const commitMaterials = (next) => {
    onUpdate(op.id, 'materialsUsed', next.map(normalizeMaterialRow));
  };

  const patchRow = (rowId, nextRow) => {
    commitMaterials(materials.map((m) => (m.id === rowId ? normalizeMaterialRow(nextRow) : m)));
  };

  const removeRow = (rowId) => {
    commitMaterials(materials.filter((m) => m.id !== rowId));
  };

  const addRow = () => {
    commitMaterials([...materials, newMaterialRow()]);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-100 bg-amber-50/30 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-amber-800">
            <Package className="w-4 h-4" /> Part dari operasi
          </div>
          <button
            type="button"
            onClick={addRow}
            className="text-[10px] font-bold text-amber-700 hover:text-amber-900 inline-flex items-center gap-1 px-2 py-1 rounded-md border border-amber-200 bg-white hover:bg-amber-50"
          >
            <Plus className="w-3.5 h-3.5" /> Tambah Part
          </button>
        </div>
        <p className="text-[10px] text-amber-700/90 italic leading-snug">
          Pilih SKU DATA BASE → unit, dimensi, volume, dan harga terisi otomatis. Part masuk tab Struktur saat Simpan Routing.
        </p>
        {materials.length === 0 ? (
          <p className="text-xs text-slate-500 italic">Belum ada part — klik Tambah Part.</p>
        ) : (
          <div className="space-y-3">
            {materials.map((m, mi) => (
              <OperationMaterialRow
                key={m.id}
                row={m}
                index={mi}
                mastersTick={mastersTick}
                onPatch={(nextRow) => patchRow(m.id, nextRow)}
                onRemove={() => removeRow(m.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OperationPageShell({ title, subtitle, badge, onClose, children, footer }) {
  return (
    <div className="routing-fullpage-root font-sans flex flex-col" role="dialog" aria-modal="true">
      <header className="shrink-0 bg-gradient-to-r from-brand-700 to-brand-600 text-white shadow-md">
        <div className={`${PAGE} px-4 sm:px-6 lg:px-8 py-4`}>
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20"
              title="Kembali ke daftar operasi"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-100">{title}</p>
              <h1 className="text-lg sm:text-xl font-bold tracking-wide truncate">{subtitle}</h1>
              {badge}
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 min-h-0 overflow-y-auto scroll-thin bg-page">
        <div className={`${PAGE} px-4 sm:px-6 lg:px-8 py-6 lg:py-8`}>{children}</div>
      </main>
      {footer}
    </div>
  );
}

function DetailReadonly({ label, children }) {
  return (
    <div>
      <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</span>
      <div className="text-sm font-semibold text-slate-800">{children}</div>
    </div>
  );
}

function OperationDetailPage({ op, index, costs, materialVol, materialData, onClose }) {
  if (!op) return null;

  const isRouting = op.inputMode === 'routing';
  const selectedWc = !isRouting ? getWorkCenterById(op.workCenterId) : null;
  const prosesLabel = PROSES_OPTIONS.find((p) => p.id === op.proses)?.label || op.proses;
  const materials = (op.materialsUsed || []).map(normalizeMaterialRow);
  const badge = (
    <span
      className={`inline-block mt-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
        isRouting ? 'bg-indigo-200/90 text-indigo-900' : 'bg-sky-200/90 text-sky-900'
      }`}
    >
      Ringkasan Lengkap
    </span>
  );

  return (
    <OperationPageShell
      title={`Detail Lengkap — Tahap ${index + 1}`}
      subtitle={op.nama || `Operasi ${index + 1}`}
      badge={badge}
      onClose={onClose}
      footer={(
        <footer className="shrink-0 border-t border-slate-200 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          <div className={`${PAGE} px-4 sm:px-6 lg:px-8 py-4 flex justify-end`}>
            <button type="button" onClick={onClose} className="btn-primary h-10 px-5 text-sm">
              Kembali ke Daftar
            </button>
          </div>
        </footer>
      )}
    >
      <div className="space-y-5">
        <p className="text-xs text-slate-500 italic border border-slate-200 bg-slate-50 rounded-lg px-3 py-2">
          Input proses dilakukan di kartu daftar operasi. Halaman ini menampilkan ringkasan lengkap tahap ini.
        </p>

        {materialData ? <PartInfoSummary data={materialData} /> : null}

        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-brand-700 flex items-center gap-2">
            <Settings className="w-4 h-4" /> Parameter Proses
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <DetailReadonly label="Proses">{prosesLabel}</DetailReadonly>
            <DetailReadonly label="Volume material">{materialVol > 0 ? `${materialVol} m³` : '—'}</DetailReadonly>
            <DetailReadonly label="Tipe input">{isRouting ? 'Routing' : 'Work Center'}</DetailReadonly>
            <DetailReadonly label="Urutan">{op.position ?? index + 1}</DetailReadonly>
            {!isRouting && selectedWc ? (
              <DetailReadonly label="Work center">{selectedWc.kode} — {selectedWc.nama}</DetailReadonly>
            ) : null}
            {isRouting && op.routingId ? (
              <DetailReadonly label="Template routing">
                {ROUTING_TEMPLATES.find((r) => r.id === op.routingId)?.kode || op.routingId}
              </DetailReadonly>
            ) : null}
            <DetailReadonly label="Nama operasi">{op.nama || '—'}</DetailReadonly>
            <DetailReadonly label="Waktu">{costs.waktu} menit</DetailReadonly>
            <DetailReadonly label="Total person">{op.totalPerson ?? 2} org</DetailReadonly>
            <DetailReadonly label="Catatan">{op.note || '—'}</DetailReadonly>
          </div>
        </div>

        {!isRouting && selectedWc ? (
          <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-blue-700 flex items-center gap-2">
              <Server className="w-4 h-4" /> Work Center
            </h3>
            <RateKapasitasInfo
              rateMesin={op.rateMesin ?? selectedWc.ratePerMin}
              ratePekerja={op.ratePekerja ?? selectedWc.laborRatePerMin ?? 500}
              capacity={costs.capacity}
              compact
            />
          </div>
        ) : null}

        {isRouting && op.routingSteps?.length > 0 ? (
          <div className="rounded-xl border border-indigo-100 overflow-hidden">
            <div className="px-3 py-2 bg-indigo-50 border-b border-indigo-100 flex items-center gap-2">
              <Network className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold text-indigo-800 uppercase">Langkah Routing</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white text-slate-500 font-semibold uppercase text-[10px] border-b border-slate-100">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Work center</th>
                    <th className="px-3 py-2 text-center">Mnt</th>
                    <th className="px-3 py-2 text-center">Org</th>
                    <th className="px-3 py-2 text-right">Mesin</th>
                    <th className="px-3 py-2 text-right">Pekerja</th>
                    <th className="px-3 py-2">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {op.routingSteps.map((st, si) => (
                    <tr key={si}>
                      <td className="px-3 py-2 text-slate-400">{st.urutan}</td>
                      <td className="px-3 py-2 font-medium">{st.wcNama}</td>
                      <td className="px-3 py-2 text-center font-bold text-brand-700">{st.waktuMenit}</td>
                      <td className="px-3 py-2 text-center">{st.totalPerson}</td>
                      <td className="px-3 py-2 text-right tabular-nums">Rp {formatIDR(st.biayaMesin)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-emerald-700">Rp {formatIDR(st.biayaPekerja)}</td>
                      <td className="px-3 py-2 text-slate-600">{st.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <div className="rounded-xl border border-brand-100 bg-brand-50/30 p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wide text-brand-700 flex items-center gap-2">
            <Layout className="w-4 h-4" /> Posisi operasi
          </h3>
          <div className="flex items-start gap-3">
            <ClickZoomImage src={op.gambar} alt={op.posisiOperasi} size={80} />
            <DetailReadonly label="Kode posisi">{op.posisiOperasi || '—'}</DetailReadonly>
          </div>
        </div>

        <div className="rounded-xl border border-violet-100 bg-violet-50/30 p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wide text-violet-700 flex items-center gap-2">
            <Activity className="w-4 h-4" /> Kalkulasi
          </h3>
          <RateKapasitasInfo rateMesin={costs.rateMesin} ratePekerja={costs.ratePekerja} capacity={costs.capacity} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <DetailReadonly label="Waktu">{costs.waktu} mnt</DetailReadonly>
            <DetailReadonly label="Mesin">Rp {formatIDR(costs.mesin)}</DetailReadonly>
            <DetailReadonly label="Pekerja">Rp {formatIDR(costs.pekerja)}</DetailReadonly>
            <DetailReadonly label="Total">Rp {formatIDR(costs.total)}</DetailReadonly>
          </div>
          {(costs.wc || 0) > 0 ? (
            <p className="text-[10px] text-amber-700">Biaya work center: Rp {formatIDR(costs.wc)}</p>
          ) : null}
        </div>

        <div className="rounded-xl border border-amber-100 bg-amber-50/30 p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wide text-amber-800 flex items-center gap-2">
            <Package className="w-4 h-4" /> Part dari operasi ({materials.length})
          </h3>
          {materials.length === 0 ? (
            <p className="text-xs text-slate-500 italic">Belum ada part — gunakan tombol Tambah Part di daftar operasi.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-amber-100 bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-amber-50 text-amber-900 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="px-3 py-2">Nama / Kode</th>
                    <th className="px-3 py-2 text-center">Qty</th>
                    <th className="px-3 py-2">Unit</th>
                    <th className="px-3 py-2">Dimensi</th>
                    <th className="px-3 py-2 text-right">Vol</th>
                    <th className="px-3 py-2 text-right">Harga</th>
                    <th className="px-3 py-2 text-right">Produksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {materials.map((m) => (
                    <tr key={m.id}>
                      <td className="px-3 py-2 font-semibold">{m.nama || m.manualSpec || m.kode || '—'}</td>
                      <td className="px-3 py-2 text-center">{m.qty}</td>
                      <td className="px-3 py-2">{m.unit}</td>
                      <td className="px-3 py-2 tabular-nums">{m.p || 0}×{m.l || 0}×{m.t || 0}</td>
                      <td className="px-3 py-2 text-right">{m.vol > 0 ? `${m.vol} m³` : '—'}</td>
                      <td className="px-3 py-2 text-right">Rp {formatIDR(m.biaya)}</td>
                      <td className="px-3 py-2 text-right font-bold text-emerald-700">Rp {formatIDR(m.biayaProduksi)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </OperationPageShell>
  );
}

function OperationPartPage({ op, index, materialData, mastersTick = 0, onClose, onUpdate }) {
  if (!op) return null;

  return (
    <OperationPageShell
      title={`Tambah Part — Tahap ${index + 1}`}
      subtitle={op.nama || `Operasi ${index + 1}`}
      badge={(
        <span className="inline-block mt-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-200/90 text-emerald-900">
          Part Operasi
        </span>
      )}
      onClose={onClose}
      footer={(
        <footer className="shrink-0 border-t border-slate-200 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          <div className={`${PAGE} px-4 sm:px-6 lg:px-8 py-4 flex justify-end`}>
            <button type="button" onClick={onClose} className="btn-primary h-10 px-5 text-sm">
              Selesai
            </button>
          </div>
        </footer>
      )}
    >
      <div className="space-y-5">
        {materialData ? <PartInfoSummary data={materialData} /> : null}
        <OperationMaterialsSection
          op={op}
          mastersTick={mastersTick}
          onUpdate={onUpdate}
        />
      </div>
    </OperationPageShell>
  );
}

function OperationCard({
  op,
  index,
  costs,
  materialVol,
  onRemove,
  onUpdate,
  onUpdateStep,
  onAddStep,
  onRemoveStep,
  onOpenDetail,
  onOpenPart,
}) {
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
            {op.materialsUsed?.length > 0 ? (
              <div className="flex flex-wrap gap-1 mt-1">
                <span
                  className="text-[8px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded max-w-[200px] truncate"
                  title={formatMaterialsUsedLabel(op.materialsUsed)}
                >
                  {op.materialsUsed.length} part
                  {op.materialsUsed[0]
                    ? ` · ${op.materialsUsed[0].nama || op.materialsUsed[0].manualSpec || op.materialsUsed[0].kode || '—'}`
                    : ''}
                  {op.materialsUsed.length > 1 ? '…' : ''}
                </span>
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
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
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </SelectWrap>
          </Field>
          <Field label="Volume material">
            <div className="h-10 flex items-center px-3 rounded-lg border border-teal-200 bg-teal-50/80 text-sm font-bold text-teal-800 tabular-nums">
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
                    <option key={wc.id} value={wc.id}>{wc.kode} — {wc.nama}</option>
                  ))}
                </select>
              </SelectWrap>
            </Field>
          ) : (
            <Field label="Routing" className="lg:col-span-2">
              <SelectWrap>
                <select value={op.routingId} onChange={(e) => onUpdate(op.id, 'routingId', e.target.value)} className={selectCls}>
                  {ROUTING_TEMPLATES.map((rt) => (
                    <option key={rt.id} value={rt.id}>{rt.kode} — {rt.nama}</option>
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

        {!isRouting ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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
            <Field label="Rate mesin (/mnt)">
              <input
                type="number"
                value={op.rateMesin ?? ''}
                onChange={(e) => onUpdate(op.id, 'rateMesin', e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Rate pekerja (/mnt)">
              <input
                type="number"
                value={op.ratePekerja ?? ''}
                onChange={(e) => onUpdate(op.id, 'ratePekerja', e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Catatan">
              <input type="text" value={op.note || ''} onChange={(e) => onUpdate(op.id, 'note', e.target.value)} className={inputCls} />
            </Field>
          </div>
        ) : null}

        {isRouting && op.routingSteps?.length > 0 ? (
          <div className="rounded-xl border border-indigo-100 overflow-hidden">
            <div className="px-3 py-2 bg-indigo-50 border-b border-indigo-100 flex items-center gap-2">
              <Network className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold text-indigo-800 uppercase">Langkah Routing</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white text-slate-500 font-semibold uppercase text-[10px] border-b border-slate-100">
                  <tr>
                    <th className="px-2 py-2 w-8">#</th>
                    <th className="px-2 py-2">WC</th>
                    <th className="px-2 py-2 text-center w-14">Mnt</th>
                    <th className="px-2 py-2 text-center w-12">Org</th>
                    <th className="px-2 py-2 w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {op.routingSteps.map((st, si) => (
                    <tr key={si}>
                      <td className="px-2 py-1.5 text-slate-400">{st.urutan}</td>
                      <td className="px-2 py-1.5 font-medium truncate max-w-[120px]">{st.wcNama}</td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          min={0}
                          value={st.waktuMenit}
                          onChange={(e) => onUpdateStep(op.id, si, 'waktuMenit', e.target.value)}
                          className="w-12 h-7 text-center text-xs border border-slate-200 rounded"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          min={1}
                          value={st.totalPerson}
                          onChange={(e) => onUpdateStep(op.id, si, 'totalPerson', e.target.value)}
                          className="w-10 h-7 text-center text-xs border border-slate-200 rounded"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <button type="button" onClick={() => onRemoveStep(op.id, si)} className="p-1 text-red-400 hover:text-red-600">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-3 py-1.5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => onAddStep(op.id)}
                className="text-[10px] font-bold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Tambah langkah
              </button>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1 border-t border-slate-100">
          <div className="space-y-2 rounded-xl bg-brand-50/30 border border-brand-100/60 p-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-brand-700">
              <Layout className="w-4 h-4" /> Visual posisi
            </div>
            <div className="flex items-start gap-3">
              <ClickZoomImage src={op.gambar} alt={op.posisiOperasi} size={72} />
              <Field label="Kode posisi / combo" className="flex-1">
                <SelectWrap>
                  <select
                    value={getPosisiComboItem(op.posisiOperasi)?.value ?? op.posisiOperasi}
                    onChange={(e) => {
                      const item = getPosisiComboItem(e.target.value);
                      onUpdate(op.id, 'posisiOperasi', e.target.value);
                      if (item?.src) onUpdate(op.id, 'gambar', item.src);
                    }}
                    className={selectCls}
                  >
                    {POSISI_COMBO_GROUPS.map((group) => (
                      <optgroup key={group.id} label={group.label}>
                        {group.items.map((item) => (
                          <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </SelectWrap>
              </Field>
            </div>
          </div>
          <div className="space-y-2 rounded-xl bg-violet-50/20 border border-violet-100/50 p-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-violet-700">
              <Activity className="w-4 h-4" /> Kalkulasi
            </div>
            <KalkulasiMini costs={costs} isRouting={isRouting} op={op} onUpdate={onUpdate} materialVol={materialVol} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
          <button
            type="button"
            onClick={() => onOpenDetail(op.id)}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-brand-200 bg-brand-50 text-xs font-bold text-brand-700 hover:bg-brand-100 hover:border-brand-300 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" /> Detail Lengkap
          </button>
          <button
            type="button"
            onClick={() => onOpenPart(op.id)}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-emerald-200 bg-emerald-50 text-xs font-bold text-emerald-800 hover:bg-emerald-100 hover:border-emerald-300 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Tambah Part
          </button>
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
  mastersTick = 0,
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
  const [detailOpView, setDetailOpView] = useState(null);
  const detailIndex = operations.findIndex((o) => o.id === detailOpId);
  const detailOp = detailIndex >= 0 ? operations[detailIndex] : null;
  const detailCosts = detailOp ? costsById[detailOp.id] : null;

  const closeDetail = () => {
    setDetailOpId(null);
    setDetailOpView(null);
  };

  const openDetail = (id) => {
    setDetailOpId(id);
    setDetailOpView('proses');
  };

  const openPart = (id) => {
    setDetailOpId(id);
    setDetailOpView('part');
  };

  if (detailOp && detailCosts && detailOpView === 'proses') {
    return (
      <OperationDetailPage
        op={detailOp}
        index={detailIndex}
        costs={detailCosts}
        materialVol={materialVol}
        materialData={materialData}
        onClose={closeDetail}
      />
    );
  }

  if (detailOp && detailOpView === 'part') {
    return (
      <OperationPartPage
        op={detailOp}
        index={detailIndex}
        materialData={materialData}
        mastersTick={mastersTick}
        onClose={closeDetail}
        onUpdate={onUpdate}
      />
    );
  }

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
                onUpdateStep={onUpdateStep}
                onAddStep={onAddStep}
                onRemoveStep={onRemoveStep}
                onOpenDetail={openDetail}
                onOpenPart={openPart}
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
    </div>
  );
}
