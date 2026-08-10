import { useMemo } from 'react';
import { listMaterialsByType } from '../../utils/masterLookup.js';
import { formatIDR } from '../../utils/formatters';
import { getActiveWorkCenters } from '../../data/routingCatalog.js';
import { SearchableSelect, buildMaterialSearchText } from './SearchableSelect.jsx';
import { MoneyText } from '../ui/MoneyText.jsx';

function packingUnitPrice(mat) {
  return (
    Number(mat?.hargaMaterialSupplier) ||
    Number(mat?.pricePerUnitSupplier) ||
    Number(mat?.hargaMaterialBuyer) ||
    Number(mat?.pricePerUnitBuyer) ||
    0
  );
}

function packingUnitLabel(mat) {
  return String(mat?.unit || mat?.units || 'pcs').toLowerCase();
}

/** SKU PACKING MATERIAL dari master DATA BASE. */
export function listPackingMasterMaterials(mastersTick = 0) {
  void mastersTick;
  return listMaterialsByType('komponen', 'PACKING MATERIAL');
}

/**
 * Combo material packing — pilih dari master PACKING MATERIAL atau buat nama baru.
 * onSelect(masterId, mat | null, manualName?)
 */
export function PackingMaterialCombo({
  value = '',
  displayName = '',
  mastersTick = 0,
  onSelect,
  className = '',
}) {
  const materials = useMemo(() => listPackingMasterMaterials(mastersTick), [mastersTick]);
  const options = useMemo(
    () =>
      materials.map((m) => {
        const title = m.specification || m.nama || m.kode || '—';
        const price = packingUnitPrice(m);
        const unit = packingUnitLabel(m);
        const priceText = `Rp ${formatIDR(price)}/${unit}`;
        return {
          value: m.id,
          label: `${title} — ${priceText}`,
          content: (
            <span className="flex items-center gap-0.5 min-w-0 w-full">
              <span className="truncate text-slate-700">{title}</span>
              <span className="text-slate-300 shrink-0"> — </span>
              <MoneyText variant="price" className="shrink-0 text-[11px]">
                {priceText}
              </MoneyText>
            </span>
          ),
          searchText: buildMaterialSearchText(m),
          raw: m,
        };
      }),
    [materials],
  );

  const isManual = !value && Boolean(displayName);

  return (
    <SearchableSelect
      className={className}
      value={isManual ? '' : value || ''}
      displayLabel={isManual ? displayName : ''}
      allowCreate
      createHint="Buat material packing"
      onCreate={(text) => onSelect?.('', null, text)}
      onChange={(id, mat) => {
        if (!id || !mat) {
          onSelect?.('', null, '');
          return;
        }
        onSelect?.(mat.id, mat, '');
      }}
      options={options}
      placeholder="Cari packing material master…"
      emptyMessage="SKU packing tidak ditemukan — ketik lalu Enter untuk buat baru"
    />
  );
}

/**
 * Combo proses packing — pilih Work Center master (rate TK terisi otomatis).
 * onSelect(workCenterId, wc | null, manualName?)
 */
export function PackingRoutingCombo({
  value = '',
  displayName = '',
  mastersTick = 0,
  onSelect,
  className = '',
  packingOnly = false,
}) {
  const workCenters = useMemo(() => {
    void mastersTick;
    const list = getActiveWorkCenters().filter((wc) => wc.aktif !== false);
    if (!packingOnly) return list;
    return list.filter((wc) => {
      const blob = `${wc.mfgProcess || ''} ${wc.nama || ''} ${wc.kode || ''}`.toLowerCase();
      return blob.includes('pack');
    });
  }, [mastersTick, packingOnly]);

  const options = useMemo(
    () =>
      workCenters.map((wc) => {
        const title = wc.nama || wc.kode || wc.id;
        const rate = Number(wc.laborRatePerMin) || 0;
        const priceText = `Rp ${formatIDR(rate)}/mnt`;
        return {
          value: wc.id,
          label: `${title} — ${priceText}`,
          content: (
            <span className="flex items-center gap-0.5 min-w-0 w-full">
              <span className="truncate text-slate-700">{title}</span>
              <span className="text-slate-300 shrink-0"> — </span>
              <MoneyText variant="price" className="shrink-0 text-[11px]">
                {priceText}
              </MoneyText>
            </span>
          ),
          searchText: [wc.kode, wc.nama, wc.mfgProcess, wc.lokasi].filter(Boolean).join(' ').toLowerCase(),
          raw: wc,
        };
      }),
    [workCenters],
  );

  const isManual = !value && Boolean(displayName);

  return (
    <SearchableSelect
      className={className}
      value={isManual ? '' : value || ''}
      displayLabel={isManual ? displayName : ''}
      allowCreate
      createHint="Buat proses packing"
      onCreate={(text) => onSelect?.('', null, text)}
      onChange={(id, wc) => {
        if (!id || !wc) {
          onSelect?.('', null, '');
          return;
        }
        onSelect?.(wc.id, wc, '');
      }}
      options={options}
      placeholder="Cari work center / proses…"
      emptyMessage="WC tidak ditemukan — ketik lalu Enter untuk buat baru"
    />
  );
}

export function applyPackingMaterialFromMaster(row, mat) {
  if (!mat) {
    return {
      ...row,
      materialMasterId: '',
      nama: row.nama || '',
    };
  }
  return {
    ...row,
    materialMasterId: mat.id,
    nama: mat.specification || mat.nama || mat.kode || '',
    unit: packingUnitLabel(mat) || row.unit || 'pcs',
    harga: packingUnitPrice(mat),
  };
}

export function applyPackingRoutingFromMaster(row, wc) {
  if (!wc) {
    return {
      ...row,
      workCenterId: '',
      nama: row.nama || '',
    };
  }
  return {
    ...row,
    workCenterId: wc.id,
    nama: wc.nama || wc.kode || '',
    rate: Number(wc.laborRatePerMin) || Number(row.rate) || 500,
    waktu: Number(row.waktu) > 0 ? row.waktu : Number(wc.defaultTime) || 1,
    pekerja: Number(row.pekerja) > 0 ? row.pekerja : Number(wc.defaultPerson) || 1,
  };
}
