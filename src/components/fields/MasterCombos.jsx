import { listActiveWoodMaterials, listActiveCoatings } from '../../utils/masterLookup.js';
import { formatIDR } from '../../utils/formatters';

export function WoodGradeField({ value, onChange, className = '', mastersTick = 0 }) {
  const materials = listActiveWoodMaterials();
  void mastersTick;
  const known = materials.some((m) => m.id === value || m.specification === value);
  const selectValue = materials.find((m) => m.id === value)?.id
    || materials.find((m) => m.specification === value)?.id
    || (value ? '__custom__' : '');

  return (
    <div className={`flex flex-col gap-1 min-w-[200px] ${className}`}>
      <select
        value={selectValue}
        onChange={(e) => {
          const v = e.target.value;
          if (v === '__custom__') return;
          if (!v) {
            onChange('', null);
            return;
          }
          const mat = materials.find((m) => m.id === v);
          if (mat) onChange(mat.id, mat);
        }}
        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-medium bg-white focus:border-brand-400 outline-none"
      >
        <option value="">— Grade kayu (DATA BASE) —</option>
        {materials.map((m) => (
          <option key={m.id} value={m.id}>
            {m.specification} — Rp {formatIDR(m.pricePerM3Supplier)}/m³
          </option>
        ))}
        <option value="__custom__">Manual / lainnya</option>
      </select>
      {selectValue && selectValue !== '__custom__' && (() => {
        const mat = materials.find((m) => m.id === selectValue);
        if (!mat) return null;
        return (
          <span className="text-[9px] text-slate-500 font-medium">
            {mat.woodName} · supplier Rp {formatIDR(mat.pricePerM3Supplier)}/m³
          </span>
        );
      })()}
      {(!known && value) || selectValue === '__custom__' ? (
        <input
          type="text"
          value={typeof value === 'string' && !materials.find((m) => m.id === value) ? value : ''}
          onChange={(e) => onChange(e.target.value, null)}
          placeholder="Spec kayu manual..."
          className="w-full border border-slate-200 rounded-lg px-2 py-1 text-xs"
        />
      ) : null}
    </div>
  );
}

export function CoatingField({ value, coatingId, onChange, className = '', mastersTick = 0 }) {
  const coatings = listActiveCoatings();
  void mastersTick;
  const byId = coatings.find((c) => c.id === coatingId);
  const byName = coatings.find((c) => c.name === value || c.name?.includes(value));
  const selectValue = byId?.id || byName?.id || (value ? '__custom__' : '');

  return (
    <div className={`flex flex-col gap-1 min-w-[220px] ${className}`}>
      <select
        value={selectValue}
        onChange={(e) => {
          const v = e.target.value;
          if (v === '__custom__') return;
          if (!v) {
            onChange({ coatingId: '', coating: '' });
            return;
          }
          const coat = coatings.find((c) => c.id === v);
          if (coat) onChange({ coatingId: coat.id, coating: coat.name, coatingData: coat });
        }}
        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-medium bg-white focus:border-brand-400 outline-none"
      >
        <option value="">— Coating (COATING RATIO) —</option>
        {coatings.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} — Rp {formatIDR(c.roundedCostM2)}/m²
          </option>
        ))}
        <option value="__custom__">Manual / lainnya</option>
      </select>
      {selectValue && selectValue !== '__custom__' && (() => {
        const c = coatings.find((x) => x.id === selectValue);
        if (!c) return null;
        return (
          <span className="text-[9px] text-slate-500">
            Total prod. Rp {formatIDR(c.totalProductionM2)}/m² · rounded Rp {formatIDR(c.roundedCostM2)}
          </span>
        );
      })()}
      {(selectValue === '__custom__' || (value && !byId && !byName)) && (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange({ coatingId: '', coating: e.target.value })}
          placeholder="Nama coating manual..."
          className="w-full border border-slate-200 rounded-lg px-2 py-1 text-xs"
        />
      )}
    </div>
  );
}
