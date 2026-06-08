/**
 * Parse sheet DATA BASE — section headers + SKU rows (mirror layout kayu ZAN-100).
 */
export const DATA_BASE_SECTION_LABELS = [
  'WOOD',
  'PLYWOOD',
  'MDF',
  'CORE',
  'HPL',
  'LINOLEUM',
  'BESI',
  'DAILY WAGES',
  'OPERATOR WAGES',
  'ASSEMBLING HARDWARE',
  'ASSEMBLING BORONG',
  'FITTING HARDWARE',
  'VENEER',
  'EDGING',
  'SANDING MATERIAL',
  'FINISHING MATERIAL',
  'PACKING MATERIAL',
  'FOB COST',
];

/** P0 — material part dengan harga SKU */
export const P0_SECTIONS = ['PLYWOOD', 'MDF', 'CORE', 'HPL', 'VENEER', 'EDGING'];

export const SECTION_TO_MATERIAL_TYPE = {
  WOOD: 'kayu',
  PLYWOOD: 'plywood',
  MDF: 'komponen',
  CORE: 'komponen',
  HPL: 'komponen',
  LINOLEUM: 'komponen',
  BESI: 'steel',
  VENEER: 'veneer',
  EDGING: 'veneer',
  'SANDING MATERIAL': 'komponen',
  'FINISHING MATERIAL': 'finishing',
  'PACKING MATERIAL': 'komponen',
};

export const SECTION_UNIT = {
  WOOD: 'm3',
  PLYWOOD: 'm3',
  MDF: 'm3',
  CORE: 'm3',
  HPL: 'm2',
  LINOLEUM: 'm2',
  BESI: 'pcs',
  VENEER: 'm2',
  EDGING: 'm2',
  'SANDING MATERIAL': 'm2',
  'FINISHING MATERIAL': 'm2',
  'PACKING MATERIAL': 'pcs',
};

const SECTION_FILE = {
  PLYWOOD: 'plywood',
  MDF: 'mdf',
  CORE: 'core',
  HPL: 'hpl',
  VENEER: 'veneer',
  EDGING: 'edging',
};

export function sectionToFileKey(section) {
  return SECTION_FILE[section] || slugSection(section);
}

function norm(s) {
  return String(s ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

function slugSection(s) {
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function slugId(s) {
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 48);
}

/** Temukan baris header section di sheet (dedupe header berurutan) */
export function findSectionBoundaries(rows) {
  const raw = [];
  const labelSet = new Set(DATA_BASE_SECTION_LABELS);

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] || [];
    for (let c = 0; c < 20; c++) {
      const v = norm(r[c]);
      if (labelSet.has(v)) {
        raw.push({ section: v, row: i, col: c });
        break;
      }
    }
  }

  raw.sort((a, b) => a.row - b.row);
  const headers = [];
  for (const h of raw) {
    const prev = headers[headers.length - 1];
    if (prev && prev.section === h.section && h.row - prev.row <= 3) continue;
    headers.push(h);
  }

  const bounds = [];
  for (let i = 0; i < headers.length; i++) {
    let startRow = headers[i].row + 1;
    let endRow = i + 1 < headers.length ? headers[i + 1].row - 1 : rows.length - 1;

    // Potong section jika banyak baris kosong berturut-turut (akhir tabel)
    let emptyStreak = 0;
    for (let r = startRow; r <= endRow; r++) {
      const spec = String(rows[r]?.[1] ?? '').trim();
      if (!spec) {
        emptyStreak += 1;
        if (emptyStreak >= 8) {
          endRow = r - emptyStreak;
          break;
        }
      } else {
        emptyStreak = 0;
      }
    }

    if (endRow >= startRow) {
      bounds.push({
        section: headers[i].section,
        headerRow: headers[i].row + 1,
        startRow,
        endRow,
        headerCol: headers[i].col,
      });
    }
  }
  return bounds;
}

function isSkipRow(spec, r) {
  const u = norm(spec);
  if (!u) return true;
  if (u === 'NO' || u === 'NAME' || u === 'DESCRIPTION' || u === 'TOTAL') return true;
  if (u.includes('FINISHING CODE') || u.includes('WOOD NAME')) return true;
  if (String(r[35] ?? '').trim() === 'NO' && String(r[36] ?? '').includes('FINISHING')) return true;
  return false;
}

function readBuyerSafetyPct(rows) {
  return Number(rows[5]?.[4]) || 0.1;
}

/**
 * Parse SKU rows dalam satu section DATA BASE.
 * Layout ZAN (sama kayu): no=0, spec=1, woodName=2, buyer 3-5, invoice 12, supplier 13-15
 */
export function parseSectionSkuRows(rows, section, bounds, options = {}) {
  const { buyerSafetyPct = readBuyerSafetyPct(rows), prefix = sectionToFileKey(section) } = options;
  const materialType = SECTION_TO_MATERIAL_TYPE[section] || 'komponen';
  const unit = SECTION_UNIT[section] || 'm3';
  const items = [];
  let seq = 0;

  for (let i = bounds.startRow; i <= bounds.endRow; i++) {
    const r = rows[i];
    if (!r) continue;
    const no = Number(r[0]);
    const spec = String(r[1] ?? '').trim();
    if (!no || !spec) continue;
    if (isSkipRow(spec, r)) continue;

    const priceBuyer = Number(r[3]) || 0;
    const priceSupplier = Number(r[13]) || 0;
    if (!priceSupplier && !priceBuyer) continue;

    seq += 1;
    const safetyBuyer = Number(r[4]) || 0;
    const totalBuyer = Number(r[5]) || 0;
    const safetySupplier = Number(r[14]) || 0;
    const totalSupplier = Number(r[15]) || priceSupplier;
    const finishingCode = String(r[36] ?? '').trim();
    const diameterGrade = String(r[39] ?? '').trim();
    const supplierChannel = String(r[23] ?? '').trim() === '1' ? 'IMPORT' : 'LOKAL';
    const priceM3 = totalSupplier || priceSupplier || totalBuyer || priceBuyer;

    const id = `${prefix}-${seq}`;
    const kode = finishingCode ? `${prefix.toUpperCase()}-${finishingCode}-${seq}` : `${prefix.toUpperCase()}-${String(seq).padStart(3, '0')}`;

    items.push({
      id,
      kode,
      no: seq,
      section: section,
      nama: spec,
      specification: spec,
      woodName: String(r[2] ?? '').trim() || spec,
      diameterGrade,
      finishingCode,
      dimensi: { p: 0, l: 0, t: 0, label: diameterGrade || spec },
      hargaLogBuyer: priceBuyer,
      safetyFactorBuyer: safetyBuyer,
      buyerSafetyPct,
      hargaMaterialBuyer: totalBuyer || priceBuyer,
      hargaLogSupplier: priceSupplier,
      safetyFactorSupplier: safetySupplier,
      hargaMaterialSupplier: totalSupplier,
      pricePerM3Buyer: priceBuyer,
      priceSafetyFactorBuyer: safetyBuyer,
      buyerTotalPerM3: totalBuyer,
      pricePerM3Supplier: priceM3,
      pricePerM2Supplier: unit === 'm2' ? priceM3 : 0,
      pricePerM2Buyer: unit === 'm2' ? (totalBuyer || priceBuyer) : 0,
      invoiceCostPerM3: Number(r[12]) || 0,
      vendorSupplier: diameterGrade,
      supplierName: diameterGrade,
      supplierChannel,
      unit,
      materialType,
      source: 'DATA BASE',
      excelRef: `DATA BASE row ${i + 1}`,
      aktif: true,
    });
  }
  return items;
}

/** Parse semua section P0 + WOOD */
export function parseAllDataBaseSections(rows) {
  const bounds = findSectionBoundaries(rows);
  const buyerSafetyPct = readBuyerSafetyPct(rows);
  const bySection = {};
  const counts = {};

  for (const b of bounds) {
    if (b.section === 'WOOD') {
      bySection.WOOD = parseSectionSkuRows(rows, 'WOOD', b, { buyerSafetyPct, prefix: 'wood' });
    } else if (P0_SECTIONS.includes(b.section)) {
      const parsed = parseSectionSkuRows(rows, b.section, b, {
        buyerSafetyPct,
        prefix: sectionToFileKey(b.section),
      });
      bySection[b.section] = [...(bySection[b.section] || []), ...parsed];
    }
    counts[b.section] = bySection[b.section]?.length ?? 0;
  }

  for (const sec of P0_SECTIONS) {
    if (!bySection[sec]) bySection[sec] = [];
    counts[sec] = bySection[sec].length;
  }

  return { bounds, bySection, counts };
}

export function auditReport(rows) {
  const { bounds, bySection, counts } = parseAllDataBaseSections(rows);
  const withPrice = {};
  for (const [sec, list] of Object.entries(bySection)) {
    withPrice[sec] = (list || []).filter(
      (m) => (m.hargaMaterialSupplier || 0) > 0 || (m.hargaMaterialBuyer || 0) > 0,
    ).length;
  }
  return { bounds, counts, withPrice, samples: Object.fromEntries(
    Object.entries(bySection).map(([k, v]) => [k, (v || []).slice(0, 3).map((m) => ({ id: m.id, spec: m.specification, sup: m.hargaMaterialSupplier }))]),
  ) };
}
