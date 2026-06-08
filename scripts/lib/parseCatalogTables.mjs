/**
 * Parse tabel katalog horizontal di sheet DATA BASE (kolom kanan).
 * Layout: NO | DESCRIPTION | CODE | … | UNITS | LOCAL price / SF / total | IMPORT …
 */

export const CATALOG_TABLE_SECTIONS = [
  {
    section: 'ASSEMBLING HARDWARE',
    key: 'assemblingHardware',
    startCol: 54,
    materialType: 'hardware',
    defaultUnit: 'pcs',
    dataStartRow: 7,
    layout: 'catalog',
  },
  {
    section: 'FITTING HARDWARE',
    key: 'fittingHardware',
    startCol: 70,
    materialType: 'hardware',
    defaultUnit: 'pcs',
    dataStartRow: 7,
    layout: 'catalog',
  },
  {
    section: 'TYPE OF VENEER',
    key: 'veneerTypes',
    startCol: 87,
    materialType: 'veneer',
    defaultUnit: 'm2',
    dataStartRow: 7,
    layout: 'veneerPrice',
  },
  {
    section: 'SANDING MATERIAL',
    key: 'sandingMaterial',
    startCol: 95,
    materialType: 'komponen',
    defaultUnit: 'pcs',
    dataStartRow: 7,
    layout: 'catalog',
  },
  {
    section: 'FINISHING MATERIAL',
    key: 'finishingMaterial',
    startCol: 111,
    materialType: 'finishing',
    defaultUnit: 'ltr',
    dataStartRow: 7,
    layout: 'catalog',
  },
  {
    section: 'PACKING MATERIAL',
    key: 'packingMaterial',
    startCol: 127,
    materialType: 'komponen',
    defaultUnit: 'pcs',
    dataStartRow: 7,
    layout: 'catalog',
  },
];

function norm(s) {
  return String(s ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

function slugId(s) {
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 48);
}

function normalizeUnit(raw, fallback) {
  const u = norm(raw);
  const map = {
    PCS: 'pcs',
    PC: 'pcs',
    LBR: 'lbr',
    KG: 'kg',
    M: 'm',
    M2: 'm2',
    'M²': 'm2',
    LTR: 'ltr',
    LT: 'ltr',
    ML: 'ml',
    ROLL: 'roll',
    UNIT: 'unit',
    BTL: 'btl',
  };
  return map[u] || (u ? u.toLowerCase() : fallback);
}

function parseSafetyFactor(val) {
  const n = Number(val);
  if (!n) return 0;
  if (n > 1) return n / 100;
  return n;
}

function isHeaderOrNoise(desc, no) {
  const u = norm(desc);
  if (!u && !no) return true;
  if (u === 'NO' || u === 'DESCRIPTION' || u === 'TOTAL') return true;
  if (/^\d+$/.test(u) && u.length <= 2 && !no) return true;
  return false;
}

function buildCatalogItem({
  section,
  key,
  materialType,
  seq,
  no,
  description,
  itemCode,
  units,
  supplierName,
  priceLocal,
  safetyLocal,
  totalLocal,
  priceImport,
  safetyImport,
  totalImport,
  excelRow,
}) {
  const sf = parseSafetyFactor(safetyLocal);
  const sfPct = Math.round(sf * 1000) / 10;
  const price = Number(priceLocal) || 0;
  const total =
    Number(totalLocal) || (price ? Math.round(price * (1 + sf)) : 0);
  const unit = normalizeUnit(units, 'pcs');
  const id = `${key}-${seq}`;
  const kode =
    String(itemCode || '').trim() ||
    `${key.toUpperCase().replace(/-/g, '_')}-${String(seq).padStart(3, '0')}`;

  return {
    id,
    kode,
    no: no || seq,
    section,
    nama: description,
    specification: description,
    itemCode: String(itemCode || '').trim(),
    units: String(units || '').trim().toUpperCase() || units,
    unit,
    supplierName: String(supplierName || '').trim(),
    vendorSupplier: String(supplierName || '').trim(),
    dimensi: { p: 0, l: 0, t: 0, label: description },
    hargaLogBuyer: price,
    safetyFactorBuyer: sf,
    safetyFactorBuyerPct: sfPct,
    hargaMaterialBuyer: total,
    hargaLogSupplier: price,
    safetyFactorSupplier: sf,
    hargaMaterialSupplier: total,
    pricePerUnitSupplier: total,
    pricePerUnitBuyer: total,
    pricePerM2Supplier: unit === 'm2' ? total : 0,
    pricePerM2Buyer: unit === 'm2' ? total : 0,
    priceImport: Number(priceImport) || 0,
    safetyFactorImport: parseSafetyFactor(safetyImport),
    totalPriceImport: Number(totalImport) || 0,
    materialType,
    supplierChannel: 'LOKAL',
    source: 'DATA BASE',
    excelRef: `DATA BASE row ${excelRow}`,
    aktif: true,
  };
}

/** Tabel katalog berdampingan horizontal — tidak memotong di section tetangga */
function findSectionEndRow(_rows, _cfg, _dataStartRow) {
  return _rows.length - 1;
}

function parseCatalogLayout(rows, cfg) {
  const { section, key, materialType, startCol, dataStartRow, defaultUnit } = cfg;
  const endRow = findSectionEndRow(rows, cfg, dataStartRow);
  const items = [];
  let seq = 0;
  let emptyStreak = 0;

  for (let i = dataStartRow; i <= endRow; i++) {
    const r = rows[i] || [];
    const no = Number(r[startCol]);
    const description = String(r[startCol + 1] ?? '').trim();
    if (isHeaderOrNoise(description, no)) continue;

    if (!description) {
      emptyStreak += 1;
      if (emptyStreak >= 6 && seq > 0) break;
      continue;
    }
    emptyStreak = 0;

    const priceLocal = Number(r[startCol + 9]) || 0;
    const totalLocal = Number(r[startCol + 11]) || 0;
    if (!priceLocal && !totalLocal) {
      emptyStreak += 1;
      if (emptyStreak >= 6 && seq > 0) break;
      continue;
    }

    seq += 1;
    items.push(
      buildCatalogItem({
        section,
        key,
        materialType,
        seq,
        no: no || seq,
        description,
        itemCode: r[startCol + 2],
        units: r[startCol + 7] || defaultUnit,
        supplierName: r[startCol + 8],
        priceLocal,
        safetyLocal: r[startCol + 10],
        totalLocal,
        priceImport: r[startCol + 12],
        safetyImport: r[startCol + 13],
        totalImport: r[startCol + 14],
        excelRow: i + 1,
      }),
    );
  }
  return items;
}

function parseVeneerPriceLayout(rows, cfg) {
  const { section, key, materialType, startCol, dataStartRow } = cfg;
  const endRow = findSectionEndRow(rows, cfg, dataStartRow);
  const items = [];
  let seq = 0;
  let emptyStreak = 0;

  for (let i = dataStartRow; i <= endRow; i++) {
    const r = rows[i] || [];
    const description = String(r[startCol] ?? '').trim();
    if (!description || norm(description) === 'TYPE OF VENEER') continue;
    if (isHeaderOrNoise(description, 0)) continue;
    if (norm(description).includes('SANDING MATERIAL')) break;

    const priceLocal = Number(r[startCol + 1]) || 0;
    const totalLocal = Number(r[startCol + 3]) || 0;
    if (!priceLocal && !totalLocal) {
      emptyStreak += 1;
      if (emptyStreak >= 4 && seq > 0) break;
      continue;
    }
    emptyStreak = 0;
    seq += 1;

    items.push(
      buildCatalogItem({
        section,
        key,
        materialType,
        seq,
        no: seq,
        description,
        itemCode: '',
        units: 'M2',
        supplierName: '',
        priceLocal,
        safetyLocal: r[startCol + 2],
        totalLocal,
        priceImport: r[startCol + 4],
        safetyImport: r[startCol + 5],
        totalImport: r[startCol + 6],
        excelRow: i + 1,
      }),
    );
  }
  return items;
}

/** Parse semua tabel katalog horizontal DATA BASE */
export function parseAllCatalogTables(rows) {
  const byKey = {};
  const counts = {};

  for (const cfg of CATALOG_TABLE_SECTIONS) {
    const parsed =
      cfg.layout === 'veneerPrice'
        ? parseVeneerPriceLayout(rows, cfg)
        : parseCatalogLayout(rows, cfg);
    byKey[cfg.key] = parsed;
    counts[cfg.section] = parsed.length;
  }

  return { byKey, counts };
}

export function auditCatalogReport(rows) {
  const { byKey, counts } = parseAllCatalogTables(rows);
  const withPrice = {};
  for (const [key, list] of Object.entries(byKey)) {
    withPrice[key] = (list || []).filter((m) => (m.hargaMaterialSupplier || 0) > 0).length;
  }
  return {
    counts,
    withPrice,
    samples: Object.fromEntries(
      Object.entries(byKey).map(([k, v]) => [
        k,
        (v || []).slice(0, 2).map((m) => ({
          id: m.id,
          spec: m.specification,
          unit: m.unit,
          price: m.hargaMaterialSupplier,
        })),
      ]),
    ),
  };
}
