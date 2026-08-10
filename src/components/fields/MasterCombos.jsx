import { useMemo } from 'react';
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

/**
 * Grade kayu: satu combobox — pilih master ATAU ketik nama baru (manual).
 * onChange(gradeId, mat, manualSpec, modeHint)
 */
export function WoodGradeField({
  value = '',
  manualSpec = '',
  sourceMode,
  onSourceModeChange,
  onChange,
  className = '',
  mastersTick = 0,
  compact = false,
}) {
  const materials = useMemo(() => listActiveWoodMaterials(), [mastersTick]);
  const linkedMat = materials.find((m) => m.id === value);
  const isManual = sourceMode === 'manual' || (!value && Boolean(manualSpec));
  const woodOptions = useMemo(
    () =>
      mapMaterialOptions(
        materials,
        (m) => `Rp ${formatIDR(m.pricePerM3Supplier)}/m³`,
      ),
    [materials],
  );

  const handleClear = () => {
    onChange('', null, '', { sourceMode: 'database' });
  };

  return (
    <div className={`flex flex-col gap-1.5 min-w-[200px] ${className}`}>
      <div className="flex items-center gap-1.5 min-w-0">
        <SearchableSelect
          className="flex-1 min-w-0"
          value={isManual ? '' : value || ''}
          displayLabel={isManual ? manualSpec || '' : ''}
          allowCreate
          createHint="Buat grade"
          onCreate={(text) => onChange('', null, text, { sourceMode: 'manual' })}
          onChange={(v, mat) => {
            if (!v || !mat) {
              onChange('', null, '', { sourceMode: 'database' });
              return;
            }
            onChange(mat.id, mat, '', { sourceMode: 'database' });
          }}
          options={woodOptions}
          placeholder="Cari grade atau buat baru…"
          emptyMessage="Grade tidak ditemukan — ketik lalu Enter untuk buat baru"
        />
        {(value || manualSpec) && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 rounded border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 shrink-0"
            title="Putuskan / kosongkan grade"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {linkedMat && !compact && !isManual && (
        <span className="text-[9px] text-slate-500 font-medium leading-tight">
          {linkedMat.woodName} ·{' '}
          <MoneyText variant="price" className="text-[9px]">
            Rp {formatIDR(linkedMat.pricePerM3Supplier)}/m³
          </MoneyText>
        </span>
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
 * Picker SKU lengkap DATA BASE — satu combobox creatable (cari master atau buat baru).
 * onChange(masterId, mat, manualSpec, modeHint)
 */
export function DatabaseMaterialField({
  materialType = '',
  section = '',
  value = '',
  manualSpec = '',
  sourceMode,
  onSourceModeChange,
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
  const isManual = sourceMode === 'manual' || (!value && Boolean(manualSpec));
  const dbOptions = useMemo(
    () => mapMaterialOptions(materials, (m) => formatPriceHint(m), true),
    [materials],
  );

  return (
    <div className={`flex flex-col gap-1.5 min-w-[220px] ${className}`}>
      <div className="flex items-center gap-1.5 min-w-0">
        <SearchableSelect
          className="flex-1 min-w-0"
          value={isManual ? '' : value || ''}
          displayLabel={isManual ? manualSpec || '' : ''}
          allowCreate
          createHint="Buat material"
          onCreate={(text) => onChange('', null, text, { sourceMode: 'manual' })}
          onChange={(v, mat) => {
            if (!v || !mat) {
              onChange('', null, '', { sourceMode: 'database' });
              return;
            }
            onChange(mat.id, mat, '', { sourceMode: 'database' });
          }}
          options={dbOptions}
          placeholder="Cari material atau buat baru…"
          emptyMessage="SKU tidak ditemukan — ketik lalu Enter untuk buat baru"
        />
        {(value || manualSpec) && (
          <button
            type="button"
            onClick={() => onChange('', null, '', { sourceMode: 'database' })}
            className="p-1 rounded border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 shrink-0"
            title="Kosongkan material"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {linkedMat && !compact && !isManual && (
        <span className="text-[9px] text-slate-500 font-medium leading-tight">
          {linkedMat.section} · {linkedMat.materialType} ·{' '}
          <MoneyText variant="price" className="text-[9px]">
            {formatPriceHint(linkedMat)}
          </MoneyText>
        </span>
      )}
    </div>
  );
}

/**
 * Material DATA BASE (plywood, mdf, hpl, veneer, …) — satu combobox creatable.
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
  const isManual = !value && Boolean(manualSpec);

  const label =
    section ||
    (materialType === 'plywood' ? 'PLYWOOD' : materialType === 'veneer' ? 'VENEER' : 'MATERIAL');

  return (
    <div className={`flex flex-col gap-1.5 min-w-[200px] ${className}`}>
      <div className="flex items-center gap-1.5 min-w-0">
        <SearchableSelect
          className="flex-1 min-w-0"
          value={isManual ? '' : value || ''}
          displayLabel={isManual ? manualSpec || '' : ''}
          allowCreate
          createHint={`Buat ${label}`}
          onCreate={(text) => onChange('', null, text)}
          onChange={(v, mat) => {
            if (!v || !mat) {
              onChange('', null, '');
              return;
            }
            onChange(mat.id, mat, '');
          }}
          options={mapMaterialOptions(materials, (m) => formatPriceHint(m))}
          placeholder={`Cari ${label} atau buat baru…`}
          emptyMessage="SKU tidak ditemukan — ketik lalu Enter untuk buat baru"
        />
        {(value || manualSpec) && (
          <button
            type="button"
            onClick={() => onChange('', null, '')}
            className="p-1 rounded border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 shrink-0"
            title="Kosongkan material"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {linkedMat && !compact && !isManual && (
        <span className="text-[9px] text-slate-500 font-medium leading-tight">
          {linkedMat.section || label} ·{' '}
          <MoneyText variant="price" className="text-[9px]">
            {formatPriceHint(linkedMat)}
          </MoneyText>
        </span>
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
  const isManual = Boolean(value) && !byId && !byName;
  const selectValue = byId?.id || byName?.id || '';

  return (
    <div className={`flex flex-col gap-1.5 min-w-[220px] ${className}`}>
      <div className="flex items-center gap-1.5 min-w-0">
        <SearchableSelect
          className="flex-1 min-w-0"
          value={isManual ? '' : selectValue}
          displayLabel={isManual ? value || '' : ''}
          allowCreate
          createHint="Buat coating"
          onCreate={(text) => onChange({ coatingId: '', coating: text })}
          onChange={(v, coat) => {
            if (!v || !coat) {
              onChange({ coatingId: '', coating: '' });
              return;
            }
            onChange({ coatingId: coat.id, coating: coat.name, coatingData: coat });
          }}
          options={coatingOptions}
          placeholder="Cari coating atau buat baru…"
          emptyMessage="Coating tidak ditemukan — ketik lalu Enter untuk buat baru"
        />
        {(coatingId || value) && (
          <button
            type="button"
            onClick={() => onChange({ coatingId: '', coating: '' })}
            className="p-1 rounded border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 shrink-0"
            title="Kosongkan coating"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {byId && !isManual && (
        <span className="text-[9px] text-slate-500">
          <MoneyText variant="unitIdr" className="text-[9px]">
            Rp {formatIDR(byId.roundedCostM2)}/m²
          </MoneyText>{' '}
          rounded
        </span>
      )}
    </div>
  );
}
