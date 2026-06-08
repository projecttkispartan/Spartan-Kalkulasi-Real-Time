import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import {
  listActiveWoodMaterials,
  listActiveCoatings,
  listMaterialsByType,
  listAllPartMaterials,
} from '../../utils/masterLookup.js';
import { formatIDR } from '../../utils/formatters';
import { MoneyText } from '../ui/MoneyText.jsx';
import { SearchableSelect, buildMaterialSearchText } from './SearchableSelect.jsx';

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
          <SearchableSelect
            value={value || ''}
            onChange={(v, mat) => {
              if (!v || !mat) {
                onChange('', null, '');
                return;
              }
              onChange(mat.id, mat, '');
            }}
            options={mapMaterialOptions(
              materials,
              (m) => `Rp ${formatIDR(m.pricePerM3Supplier)}/m³`,
            )}
            placeholder="— Pilih grade kayu —"
            emptyMessage="Grade tidak ditemukan"
          />
          {linkedMat && !compact && (
            <span className="text-[9px] text-slate-500 font-medium leading-tight">
              {linkedMat.woodName} ·{' '}
              <MoneyText variant="price" className="text-[9px]">
                Rp {formatIDR(linkedMat.pricePerM3Supplier)}/m³
              </MoneyText>
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

function formatPriceHint(m) {
  const unit = String(m.unit || 'm3').toLowerCase();
  const price =
    Number(m.hargaMaterialSupplier) ||
    Number(m.pricePerUnitSupplier) ||
    Number(m.pricePerM3Supplier) ||
    Number(m.pricePerM2Supplier) ||
    0;
  const suffixMap = {
    m2: '/m²',
    'm²': '/m²',
    pcs: '/pcs',
    lbr: '/Lbr',
    kg: '/kg',
    m: '/m',
    ltr: '/Ltr',
    roll: '/roll',
  };
  const suffix = suffixMap[unit] || (unit === 'm3' ? '/m³' : `/${unit}`);
  return `Rp ${formatIDR(price)}${suffix}`;
}

function optionLabelContent(spec, priceText) {
  const title = spec || '—';
  const label = `${title} — ${priceText}`;
  return {
    label,
    content: (
      <span className="flex items-center gap-0.5 min-w-0 w-full">
        <span className="truncate text-slate-700">{title}</span>
        <span className="text-slate-300 shrink-0"> — </span>
        <MoneyText variant="price" className="shrink-0 text-[11px]">
          {priceText}
        </MoneyText>
      </span>
    ),
  };
}

function mapMaterialOptions(materials, priceFn, withGroup = false) {
  return materials.map((m) => {
    const spec = m.specification || m.nama || m.woodName || '—';
    const priceText = priceFn(m);
    const { label, content } = optionLabelContent(spec, priceText);
    return {
      value: m.id,
      label,
      content,
      group: withGroup ? m.section || m.materialType || 'LAINNYA' : undefined,
      searchText: buildMaterialSearchText(m),
      raw: m,
    };
  });
}

/**
 * Picker SKU lengkap DATA BASE — semua section (hardware, finishing, packing, panel, …).
 * onChange(masterId, mat, manualSpec)
 */
export function DatabaseMaterialField({
  materialType = '',
  section = '',
  value = '',
  manualSpec = '',
  onChange,
  className = '',
  mastersTick = 0,
  compact = false,
  showAll = true,
}) {
  const materials = useMemo(
    () =>
      listAllPartMaterials({
        materialType: showAll && !materialType ? '' : materialType,
        section,
        includeAll: showAll,
      }),
    [materialType, section, showAll, mastersTick],
  );
  const linkedMat = materials.find((m) => m.id === value);
  const dbOptions = useMemo(
    () =>
      mapMaterialOptions(materials, (m) => formatPriceHint(m), true),
    [materials],
  );

  const [mode, setMode] = useState('master');
  const activeMode = useMemo(() => {
    if (value && linkedMat) return 'master';
    if (manualSpec && !value) return 'manual';
    return mode;
  }, [value, linkedMat, manualSpec, mode]);

  return (
    <div className={`flex flex-col gap-1.5 min-w-[220px] ${className}`}>
      <div className="flex items-center gap-1.5 flex-wrap">
        <ModeToggle
          mode={activeMode}
          onModeChange={(next) => {
            setMode(next);
            onChange('', null, next === 'manual' ? manualSpec || '' : '');
          }}
        />
        {(value || manualSpec) && (
          <button
            type="button"
            onClick={() => onChange('', null, '')}
            className="p-1 rounded border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50"
            title="Kosongkan material"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {activeMode === 'master' ? (
        materials.length === 0 ? (
          <span className="text-[9px] text-amber-600 font-bold">
            Belum ada SKU — jalankan import master (npm run import:masters:zan)
          </span>
        ) : (
          <>
            <SearchableSelect
              value={value || ''}
              onChange={(v, mat) => {
                if (!v || !mat) {
                  onChange('', null, '');
                  return;
                }
                onChange(mat.id, mat, '');
              }}
              options={dbOptions}
              placeholder="— Pilih material DATA BASE —"
              emptyMessage="SKU tidak ditemukan"
            />
            {linkedMat && !compact && (
              <span className="text-[9px] text-slate-500 font-medium leading-tight">
                {linkedMat.section} · {linkedMat.materialType} ·{' '}
                <MoneyText variant="price" className="text-[9px]">
                  {formatPriceHint(linkedMat)}
                </MoneyText>
              </span>
            )}
          </>
        )
      ) : (
        <input
          type="text"
          value={manualSpec}
          onChange={(e) => onChange('', null, e.target.value)}
          placeholder="Spec material manual…"
          className={fieldInputCls}
        />
      )}
    </div>
  );
}

/**
 * Material DATA BASE (plywood, mdf, hpl, veneer, …) — pola WoodGradeField.
 * onChange(masterId, mat, manualSpec)
 */
export function MaterialMasterField({
  materialType = 'komponen',
  section = '',
  value = '',
  manualSpec = '',
  onChange,
  className = '',
  mastersTick = 0,
  compact = false,
}) {
  const materials = useMemo(
    () => listMaterialsByType(materialType, section),
    [materialType, section, mastersTick],
  );
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

  const label =
    section ||
    (materialType === 'plywood' ? 'PLYWOOD' : materialType === 'veneer' ? 'VENEER' : 'MATERIAL');

  return (
    <div className={`flex flex-col gap-1.5 min-w-[200px] ${className}`}>
      <div className="flex items-center gap-1.5 flex-wrap">
        <ModeToggle mode={activeMode} onModeChange={handleModeChange} />
        {(value || manualSpec) && (
          <button
            type="button"
            onClick={() => onChange('', null, '')}
            className="p-1 rounded border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50"
            title="Kosongkan material"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {activeMode === 'master' ? (
        materials.length === 0 ? (
          <span className="text-[9px] text-amber-600 font-bold">
            Belum ada SKU {label} — import master atau mode Manual
          </span>
        ) : (
          <>
            <SearchableSelect
              value={value || ''}
              onChange={(v, mat) => {
                if (!v || !mat) {
                  onChange('', null, '');
                  return;
                }
                onChange(mat.id, mat, '');
              }}
              options={mapMaterialOptions(materials, (m) => formatPriceHint(m))}
              placeholder={`— Pilih ${label} —`}
              emptyMessage="SKU tidak ditemukan"
            />
            {linkedMat && !compact && (
              <span className="text-[9px] text-slate-500 font-medium leading-tight">
                {linkedMat.section || label} ·{' '}
                <MoneyText variant="price" className="text-[9px]">
                  {formatPriceHint(linkedMat)}
                </MoneyText>
              </span>
            )}
          </>
        )
      ) : (
        <input
          type="text"
          value={manualSpec}
          onChange={(e) => onChange('', null, e.target.value)}
          placeholder={`Spec ${label} manual…`}
          className={fieldInputCls}
        />
      )}
    </div>
  );
}

export function CoatingField({ value, coatingId, onChange, className = '', mastersTick = 0 }) {
  const coatings = useMemo(() => listActiveCoatings(), [mastersTick]);
  const coatingOptions = useMemo(
    () =>
      coatings.map((c) => {
        const priceText = `Rp ${formatIDR(c.roundedCostM2)}/m²`;
        const { label, content } = optionLabelContent(c.name, priceText);
        return {
          value: c.id,
          label,
          content,
          searchText: buildMaterialSearchText(c),
          raw: c,
        };
      }),
    [coatings],
  );
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
          <SearchableSelect
            value={selectValue}
            onChange={(v, coat) => {
              if (!v || !coat) {
                onChange({ coatingId: '', coating: '' });
                return;
              }
              onChange({ coatingId: coat.id, coating: coat.name, coatingData: coat });
            }}
            options={coatingOptions}
            placeholder="— Pilih coating —"
            emptyMessage="Coating tidak ditemukan"
          />
          {byId && (
            <span className="text-[9px] text-slate-500">
              <MoneyText variant="unitIdr" className="text-[9px]">
                Rp {formatIDR(byId.roundedCostM2)}/m²
              </MoneyText>{' '}
              rounded
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
