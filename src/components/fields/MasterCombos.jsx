import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { listActiveWoodMaterials, listActiveCoatings } from '../../utils/masterLookup.js';
import { formatIDR } from '../../utils/formatters';

const fieldSelectCls =
  'w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-medium bg-white focus:border-brand-400 focus:ring-1 focus:ring-brand-100 outline-none';
const fieldInputCls =
  'w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-medium bg-white focus:border-brand-400 outline-none';

function ModeToggle({ mode, onModeChange }) {
  return (
    <div className="flex rounded-md border border-slate-200 overflow-hidden text-[9px] font-bold shrink-0">
      <button
        type="button"
        onClick={() => onModeChange('master')}
        className={`px-2 py-1 transition-colors ${
          mode === 'master' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
        }`}
      >
        DATA BASE
      </button>
      <button
        type="button"
        onClick={() => onModeChange('manual')}
        className={`px-2 py-1 border-l border-slate-200 transition-colors ${
          mode === 'manual' ? 'bg-slate-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
        }`}
      >
        Manual
      </button>
    </div>
  );
}

/**
 * Grade kayu: satu mode aktif (master ATAU manual).
 * onChange(gradeId, mat, manualSpec) — manualSpec hanya untuk mode manual.
 */
export function WoodGradeField({
  value = '',
  manualSpec = '',
  onChange,
  className = '',
  mastersTick = 0,
  compact = false,
}) {
  const materials = useMemo(() => listActiveWoodMaterials(), [mastersTick]);
  const linkedMat = materials.find((m) => m.id === value);

  const [mode, setMode] = useState('master');

  const activeMode = useMemo(() => {
    if (value && linkedMat) return 'master';
    if (manualSpec && !value) return 'manual';
    return mode;
  }, [value, linkedMat, manualSpec, mode]);

  const handleModeChange = (next) => {
    setMode(next);
    if (next === 'manual') {
      onChange('', null, manualSpec || '');
    } else {
      onChange('', null, '');
    }
  };

  const handleClearMaster = () => {
    setMode('master');
    onChange('', null, '');
  };

  return (
    <div className={`flex flex-col gap-1.5 min-w-[200px] ${className}`}>
      <div className="flex items-center gap-1.5 flex-wrap">
        <ModeToggle mode={activeMode} onModeChange={handleModeChange} />
        {(value || manualSpec) && (
          <button
            type="button"
            onClick={handleClearMaster}
            className="p-1 rounded border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50"
            title="Putuskan / kosongkan grade"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {activeMode === 'master' ? (
        <>
          <select
            value={value || ''}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) {
                onChange('', null, '');
                return;
              }
              const mat = materials.find((m) => m.id === v);
              if (mat) onChange(mat.id, mat, '');
            }}
            className={fieldSelectCls}
          >
            <option value="">— Pilih grade kayu —</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.specification} — Rp {formatIDR(m.pricePerM3Supplier)}/m³
              </option>
            ))}
          </select>
          {linkedMat && !compact && (
            <span className="text-[9px] text-slate-500 font-medium leading-tight">
              {linkedMat.woodName} · Rp {formatIDR(linkedMat.pricePerM3Supplier)}/m³
            </span>
          )}
        </>
      ) : (
        <input
          type="text"
          value={manualSpec}
          onChange={(e) => onChange('', null, e.target.value)}
          placeholder="Spec / grade manual…"
          className={fieldInputCls}
        />
      )}
    </div>
  );
}

export function CoatingField({ value, coatingId, onChange, className = '', mastersTick = 0 }) {
  const coatings = listActiveCoatings();
  void mastersTick;
  const byId = coatings.find((c) => c.id === coatingId);
  const byName = coatings.find((c) => c.name === value || c.name?.includes(value));

  const deriveMode = () => {
    if (coatingId && byId) return 'master';
    if (value && !byId && !byName) return 'manual';
    if (coatingId || value) return 'master';
    return 'master';
  };

  const [mode, setMode] = useState(deriveMode);
  const activeMode =
    coatingId && byId ? 'master' : value && !byId && !byName ? 'manual' : mode;

  const selectValue = byId?.id || byName?.id || '';

  return (
    <div className={`flex flex-col gap-1.5 min-w-[220px] ${className}`}>
      <div className="flex items-center gap-1.5 flex-wrap">
        <ModeToggle
          mode={activeMode}
          onModeChange={(next) => {
            setMode(next);
            onChange({ coatingId: '', coating: '' });
          }}
        />
        {(coatingId || value) && (
          <button
            type="button"
            onClick={() => onChange({ coatingId: '', coating: '' })}
            className="p-1 rounded border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50"
            title="Kosongkan coating"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {activeMode === 'master' ? (
        <>
          <select
            value={selectValue}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) {
                onChange({ coatingId: '', coating: '' });
                return;
              }
              const coat = coatings.find((c) => c.id === v);
              if (coat) onChange({ coatingId: coat.id, coating: coat.name, coatingData: coat });
            }}
            className={fieldSelectCls}
          >
            <option value="">— Pilih coating —</option>
            {coatings.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — Rp {formatIDR(c.roundedCostM2)}/m²
              </option>
            ))}
          </select>
          {byId && (
            <span className="text-[9px] text-slate-500">
              Rp {formatIDR(byId.roundedCostM2)}/m² rounded
            </span>
          )}
        </>
      ) : (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange({ coatingId: '', coating: e.target.value })}
          placeholder="Nama coating manual…"
          className={fieldInputCls}
        />
      )}
    </div>
  );
}
