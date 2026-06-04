/**
 * Parser sheet Excel BOM Spartan — SUMMARY COST, CALCULATION, KALKULASI, PICK LIST
 */
import * as XLSX from 'xlsx';
import { mfgProcessToSummaryKey } from '../data/excelReference.js';
import { calcPartVolume } from './packingVolume.js';

export function readSheetRows(wb, name) {
  const sh = wb.Sheets[name];
  if (!sh) return [];
  return XLSX.utils.sheet_to_json(sh, { header: 1, defval: '' });
}

const SKIP_SUMMARY_PART_LABELS = new Set([
  'KAYU',
  'PLYWOOD',
  'MDF',
  'VENEER',
  'HPL',
  'EDGING',
  'STEEL',
  'HARDWARE',
  'RAW PRODUCTION COST',
  'BOX PACKING',
  'SINGLE FACE PACKING',
  'FACTORY PROCESSING COST',
  'PRODUCTION COST',
  'COATING',
  'MATERIAL COST',
  'COST OF GOOD SOLD',
]);

/** Baris SUMMARY yang dijadikan part proses di BOM (paritas Excel ZAN) */
export const PROCESS_SUMMARY_WHITELIST = new Set([
  'LAMINATING',
  'ASSEMBLING HARDWARE',
  'FITTING HARDWARE',
  'AMPLAS',
  'FINISHING',
  'GERINDA',
  'UPHOLSTERY',
  'QC',
  'LAIN-LAIN',
]);

function findRowLabel(r) {
  for (const idx of [1, 10, 0, 2]) {
    const s = normLabel(r[idx]);
    if (!s || s.length < 2) continue;
    if (/^[\d.,\s]+$/.test(s)) continue;
    if (s.startsWith('PRICING') || s.startsWith('PROFIT')) continue;
    return s;
  }
  return '';
}

function normLabel(s) {
  return String(s ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

/**
 * Satu baris per label — keep total terbesar (tie: baris Excel lebih awal).
 * Menghindari duplikat blok SUMMARY (mis. Fiona baris 124–127).
 */
export function dedupeSummaryCostLines(lines) {
  if (!lines?.length) return [];
  const byLabel = new Map();
  for (const ln of lines) {
    const label = normLabel(ln.label);
    if (!label) continue;
    const prev = byLabel.get(label);
    const total = Number(ln.total) || 0;
    const prevTotal = Number(prev?.total) || 0;
    if (
      !prev
      || total > prevTotal
      || (total === prevTotal && (ln.excelRow || 9999) < (prev.excelRow || 9999))
    ) {
      byLabel.set(label, ln);
    }
  }
  return [...byLabel.values()].sort((a, b) => (a.excelRow || 0) - (b.excelRow || 0));
}

/** Hanya baris proses whitelist untuk appendSummaryProcessParts */
export function pickSummaryProcessLines(lines) {
  return dedupeSummaryCostLines(lines).filter((ln) =>
    PROCESS_SUMMARY_WHITELIST.has(normLabel(ln.label)),
  );
}

function mapSummaryLabelToMfg(label) {
  const u = normLabel(label);
  if (u.includes('LAMINAT')) return 'Coating';
  if (u.includes('ASSEMBL') || u.includes('FITTING')) return 'Assembly';
  if (u.includes('AMPLAS') || u.includes('FINISH') || u.includes('GERINDA')) return 'Finishing';
  if (u.includes('UPHOLST')) return 'Upholstery';
  if (u.includes('QC')) return 'QC';
  return 'Lainnya';
}

function mapSummaryLabelToMaterialType(label) {
  const u = normLabel(label);
  if (u.includes('LAMINAT') || u.includes('VENEER')) return 'veneer';
  if (u.includes('HARDWARE') || u.includes('FITTING') || u.includes('ASSEMBL')) return 'hardware';
  return 'komponen';
}

/** SUMMARY COST — baris kategori, packing, OH, referensi COGS */
export function parseSummaryCostSheet(rows) {
  const lines = [];
  let packingBox = { material: 0, labor: 0, total: 0 };
  let packingSf = { material: 0, labor: 0, total: 0 };
  let productionCost = 0;
  let totalCogs = 0;
  let factoryOhPct = 5;
  let managementOhPct = 2.5;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] || [];
    const label = findRowLabel(r);
    if (!label) continue;

    const material = Number(r[5]) || 0;
    const labor = Number(r[7]) || 0;
    const machine = Number(r[9]) || 0;
    const total = Number(r[13]) || 0;

    if (label.includes('COST OF GOOD SOLD') || label.includes('COST OF GOODS SOLD')) {
      const candidates = [r[13], r[16], r[15], r[14]].map(Number).filter((n) => n > 0);
      if (candidates.length) totalCogs = Math.max(totalCogs, ...candidates);
      continue;
    }
    if (label.includes('PRODUCTION COST') && !label.includes('RAW')) {
      const candidates = [r[13], r[16], r[15]].map(Number).filter((n) => n > 0);
      if (candidates.length) productionCost = Math.max(productionCost, ...candidates);
      continue;
    }
    if (label === 'BOX PACKING') {
      packingBox = { material, labor, total: total || material + labor };
      continue;
    }
    if (label === 'SINGLE FACE PACKING') {
      packingSf = { material, labor, total: total || material + labor };
      continue;
    }
    if (label.includes('FACTORY OVERHEAD') && Number(r[12])) {
      factoryOhPct = Number(r[12]) * 100;
    }
    if (label.includes('MANAGEMENT OVERHEAD') && Number(r[12])) {
      managementOhPct = Number(r[12]) * 100;
    }

    const isKnownCategory =
      PROCESS_SUMMARY_WHITELIST.has(label) ||
      SKIP_SUMMARY_PART_LABELS.has(label) ||
      ['KAYU', 'PLYWOOD', 'MDF', 'VENEER', 'STEEL', 'HPL', 'EDGING'].includes(label);

    if (!isKnownCategory) continue;

    if (material > 0 || labor > 0 || machine > 0 || total > 0) {
      lines.push({
        label,
        key: label.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
        material,
        labor,
        machine,
        total: total || material + labor + machine,
        excelRow: i + 1,
      });
    }
  }

  const dedupedLines = dedupeSummaryCostLines(lines);

  return {
    lines: dedupedLines,
    packingBox,
    packingSf,
    productionCost,
    totalCogs,
    factoryOhPct,
    managementOhPct,
  };
}

/** Map tipe baris CALCULATION → materialType app */
export const CALCULATION_TYPE_MAP = {
  KAYU: 'kayu',
  PLYWOOD: 'plywood',
  HARDWARE: 'hardware',
  LAMINATING: 'komponen',
  FINISHING: 'finishing',
  AMPLAS: 'komponen',
  GERINDA: 'komponen',
  UPHOLSTERY: 'upholstery',
  'BOX PACKING': 'komponen',
  VENEER: 'veneer',
  MDF: 'komponen',
  STEEL: 'steel',
  HPL: 'komponen',
};

function mapCalculationMaterialType(type, subType, nama) {
  const u = String(type ?? '').trim().toUpperCase();
  const sub = String(subType ?? '').trim().toUpperCase();
  if (u === 'LAMINATING' && (sub === 'LEM' || /LEM\s/i.test(String(nama ?? '')))) return 'komponen';
  if (u === 'LAMINATING') return 'veneer';
  return CALCULATION_TYPE_MAP[u] || 'komponen';
}

function calcRowQtyAndTotal(r, materialType) {
  if (materialType === 'hardware') {
    const qty = Number(r[15]) || Number(r[6]) || 1;
    const total = Number(r[19]) || Number(r[26]) || 0;
    return { qty, total };
  }
  const qty = Number(r[16]) || Number(r[15]) || 1;
  const total = Number(r[26]) || Number(r[19]) || 0;
  return { qty, total };
}

/** Parse satu baris CALCULATION → entri part/katalog (semua tipe material) */
export function parseCalculationRow(r, rowIndex = 0) {
  const type = String(r[3] ?? '').trim().toUpperCase();
  if (!type || type === 'NO' || type === 'NAME') return null;

  const subType = String(r[4] ?? '').trim();
  const kode = String(r[7] ?? '').trim();
  const nama = String(r[11] ?? '').trim();
  const module = String(r[10] ?? '').trim();

  if (!nama && !kode) return null;
  if (/LABOUR COST|LABOR COST|TOTAL/i.test(nama)) return null;

  const materialType = mapCalculationMaterialType(type, subType, nama);
  const { qty, total } = calcRowQtyAndTotal(r, materialType);
  const p = Number(r[12]) || 0;
  const l = Number(r[13]) || 0;
  const t = Number(r[14]) || 0;
  const vol = Number(r[15]) && materialType === 'kayu' ? Number(r[15]) : calcPartVolume(p, l, t);
  const surfaceM2 = Number(r[28]) || Number(r[38]) || 0;
  const biayaUnit = qty && total ? Math.round(total / qty) : Math.round(total) || 0;

  const isPartKey =
    (materialType === 'kayu' && kode.includes('-')) ||
    (materialType === 'hardware' && kode.length > 3) ||
    (materialType === 'plywood' && kode.includes('-'));

  if (!isPartKey && !total && !biayaUnit && materialType !== 'komponen') return null;
  if (materialType === 'komponen' && type === 'LAMINATING' && subType.toUpperCase() === 'LEM' && !total && !nama) {
    return null;
  }

  const partKey =
    kode ||
    (nama ? `CALC-${type}-${String(nama).slice(0, 24).replace(/\s+/g, '-')}` : `CALC-R${rowIndex + 1}`);

  return {
    kode: partKey,
    nama: nama || kode || type,
    module,
    calcType: type,
    calcSubType: subType,
    materialType,
    qty,
    p,
    l,
    t,
    vol: materialType === 'kayu' || materialType === 'plywood' ? vol || calcPartVolume(p, l, t) : 0,
    surfaceM2,
    biayaUnit,
    biayaLine: total,
    wood: String(r[8] ?? '').trim(),
    unit: String(r[16] ?? r[17] ?? 'EA').trim() || 'EA',
    excelRow: rowIndex + 1,
    mergeToBom: isPartKey && (biayaUnit > 0 || total > 0 || vol > 0),
  };
}

/**
 * CALCULATION lengkap — kayu, hardware, plywood, lem, dll.
 * @returns {{ partsMap: Map, catalog: Array }}
 */
export function parseCalculationSheet(rows) {
  const partsMap = new Map();
  const catalog = [];
  const catalogSeen = new Set();

  for (let i = 8; i < rows.length; i++) {
    const parsed = parseCalculationRow(rows[i], i);
    if (!parsed) continue;

    const catKey = `${parsed.materialType}::${parsed.kode}`;
    if (!catalogSeen.has(catKey)) {
      catalogSeen.add(catKey);
      catalog.push({ id: `calc-${slugKey(parsed.kode)}`, ...parsed, source: 'CALCULATION' });
    }

    if (parsed.mergeToBom && parsed.kode) {
      const prev = partsMap.get(parsed.kode);
      if (!prev || parsed.biayaLine >= (prev.biayaLine || 0)) {
        partsMap.set(parsed.kode, parsed);
      }
    }
  }

  return { partsMap, catalog };
}

function slugKey(s) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** CALCULATION — map kode part → biaya (semua tipe yang punya kode BOM) */
export function parseCalculationPartsMap(rows) {
  return parseCalculationSheet(rows).partsMap;
}

/** Agregasi luas coating dari sheet CALCULATION (surfaceM2 × qty) */
export function sumCalculationSurfaceM2(calcMap) {
  if (!calcMap) return 0;
  let total = 0;
  const iter = calcMap instanceof Map ? calcMap.values() : Object.values(calcMap);
  for (const c of iter) {
    const m2 = Number(c?.surfaceM2) || 0;
    if (m2 > 0) total += m2 * (Number(c.qty) || 1);
  }
  return total;
}

/** KALKULASI HPP MENTAH / SUPPLIER — mirror baris material */
export function parseKalkulasiMaterialRows(rows, source) {
  const items = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] || [];
    const no = Number(r[0]);
    const material = String(r[1] ?? '').trim();
    const desc = String(r[3] ?? '').trim();
    if (!no || !material || material === '0') continue;
    if (!desc || desc === 'DESCRIPTION OF COMPONENT') continue;

    items.push({
      no,
      material,
      module: String(r[2] ?? '').trim(),
      description: desc,
      invoiceP: Number(r[4]) || 0,
      invoiceL: Number(r[5]) || 0,
      invoiceT: Number(r[6]) || 0,
      prodP: Number(r[8]) || 0,
      prodL: Number(r[9]) || 0,
      prodT: Number(r[10]) || 0,
      vol: Number(r[11]) || 0,
      qty: Number(r[12]) || 1,
      priceMaterial: Number(r[13]) || 0,
      priceSafety: Number(r[14]) || 0,
      totalPrice: Number(r[15]) || 0,
      source,
      excelRow: i + 1,
    });
  }
  return items;
}

/** PICK LIST — daftar order / item */
export function parsePickListSheet(rows) {
  const items = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] || [];
    const no = Number(r[0]);
    if (!no || no > 500) continue;
    const kode = String(r[1] ?? '').trim();
    if (!kode || kode === 'SPARTAN PRODUCT CODE') continue;

    items.push({
      no,
      spartanCode: kode,
      buyerCode: String(r[3] ?? '').trim(),
      itemType: String(r[7] ?? '').trim(),
      description: String(r[9] ?? '').trim(),
      width: Number(r[11]) || 0,
      depth: Number(r[12]) || 0,
      height: Number(r[13]) || 0,
      excelRow: i + 1,
    });
  }
  return items;
}

export function parseFullWorkbookMirror(wb) {
  const summaryRows = readSheetRows(wb, 'SUMMARY COST');
  const calcRows = readSheetRows(wb, 'CALCULATION');
  const hppRows = readSheetRows(wb, 'KALKULASI HPP MENTAH');

  const mirror = {
    summaryCost: parseSummaryCostSheet(summaryRows),
    calculationParts: Object.fromEntries(parseCalculationPartsMap(calcRows)),
    hppMentah: parseKalkulasiMaterialRows(hppRows, 'KALKULASI HPP MENTAH'),
    supplierKalkulasi: {},
    pickList: [],
  };

  for (const n of [1, 2, 3]) {
    const name = `KALKULASI SUPPLIER ${n}`;
    const rows = readSheetRows(wb, name);
    if (rows.length) mirror.supplierKalkulasi[n] = parseKalkulasiMaterialRows(rows, name);
  }

  for (const name of ['PICK LIST', 'PICK LIST (2)']) {
    const rows = readSheetRows(wb, name);
    if (rows.length) {
      mirror.pickList = parsePickListSheet(rows);
      break;
    }
  }

  return mirror;
}

export function buildPackingSpecFromSummary(summary) {
  const box = summary.packingBox || {};
  const sf = summary.packingSf || {};
  const laborRate = 500;
  const boxWaktu = box.labor ? Math.max(1, Math.round(box.labor / laborRate)) : 0;

  return {
    materialsBox: box.material
      ? [{ id: 1, nama: 'BOX PACKING (Excel)', qty: 1, unit: 'Pcs', harga: Math.round(box.material) }]
      : [],
    materialsSF: sf.material
      ? [{ id: 1, nama: 'SINGLE FACE (Excel)', qty: 1, unit: 'Pcs', harga: Math.round(sf.material) }]
      : [],
    routingBox: box.labor
      ? [
          {
            id: 1,
            nama: 'Tenaga BOX PACKING',
            waktu: boxWaktu,
            pekerja: 1,
            rate: laborRate,
          },
        ]
      : [],
    routingSF: sf.labor
      ? [
          {
            id: 1,
            nama: 'Tenaga SINGLE FACE',
            waktu: Math.max(1, Math.round(sf.labor / laborRate)),
            pekerja: 1,
            rate: laborRate,
          },
        ]
      : [],
  };
}

function walkBom(node, fn) {
  if (!node) return;
  fn(node);
  (node.children || []).forEach((ch) => walkBom(ch, fn));
}

/** Gabungkan biaya/vol/dimensi dari CALCULATION ke pohon BOM */
export function mergeCalculationIntoBom(bomData, calcMap) {
  if (!bomData || !calcMap) return bomData;
  const lookup = calcMap instanceof Map ? (k) => calcMap.get(k) : (k) => calcMap[k];
  walkBom(bomData, (node) => {
    if (node.tipe !== 'PART') return;
    const kode = String(node.kode || '').trim();
    const calc = lookup(kode);
    if (!calc) return;

    node.qty = calc.qty || node.qty || 1;
    node.p = calc.p || node.p;
    node.l = calc.l || node.l;
    node.t = calc.t || node.t;
    node.vol = calc.vol || node.vol;
    node.biaya = calc.biayaUnit;
    node.biayaFromExcel = true;
    if (calc.materialType) node.materialType = calc.materialType;
    if (calc.calcType === 'HARDWARE') node.hardware = true;
    if (calc.surfaceM2 > 0) node.surfaceM2 = calc.surfaceM2;
    if (calc.wood && !node.woodSpecification && calc.materialType === 'kayu') {
      node.woodSpecification = calc.wood;
    }
    if (calc.materialType === 'hardware') {
      node.sf = 0;
      node.wf = 0;
      node.woodGradeId = '';
    }
  });
  return bomData;
}

function makeSummaryProcessPart(line, idx) {
  const material = line.material || 0;
  const labor = line.labor || 0;
  const machine = line.machine || 0;
  const mfg = mapSummaryLabelToMfg(line.label);

  return {
    id: `excel-proc-${idx}`,
    no: 900 + idx,
    nama: line.label,
    kode: `EXCEL-${line.key}`,
    tipe: 'PART',
    qty: 1,
    unit: 'SET',
    p: 0,
    l: 0,
    t: 0,
    vol: 0,
    biaya: Math.round(material),
    materialType: mapSummaryLabelToMaterialType(line.label),
    sf: 0,
    wf: 0,
    catatan: `Impor SUMMARY COST baris ${line.excelRow}`,
    proses_count: labor + machine > 0 ? 1 : 0,
    proses:
      labor + machine > 0
        ? [
            {
              nama: `${line.label} — proses`,
              mfgProcess: mfg,
              summaryKey: mfgProcessToSummaryKey(mfg),
              waktuOperasi: 0,
              totalPerson: 1,
              biayaMesin: Math.round(machine),
              biayaPekerja: Math.round(labor),
            },
          ]
        : [],
    children: [],
  };
}

/** Tambah part proses dari baris SUMMARY (LAMINATING, AMPLAS, …) */
export function appendSummaryProcessParts(bomData, summaryLines) {
  if (!bomData || !summaryLines?.length) return bomData;

  const extras = pickSummaryProcessLines(summaryLines)
    .filter((ln) => (ln.total || 0) > 0)
    .map((ln, idx) => makeSummaryProcessPart(ln, idx));

  if (!extras.length) return bomData;

  const sm = {
    id: 'excel-summary-proses',
    no: 99,
    nama: 'PROSES (SUMMARY COST)',
    kode: 'EXCEL-SUMMARY',
    tipe: 'SUBMODUL',
    qty: 1,
    unit: 'SET',
    children: extras,
  };

  if (!bomData.children) bomData.children = [];
  bomData.children.push(sm);
  return bomData;
}

export function buildCogsConfigFromSummary(summary, defaults = {}) {
  return {
    packingJalur: defaults.packingJalur || 'BOX',
    factoryOhPct: summary.factoryOhPct ?? defaults.factoryOhPct ?? 5,
    managementOhPct: summary.managementOhPct ?? defaults.managementOhPct ?? 2.5,
    markupPct: defaults.markupPct ?? 20,
    excelProductionCost: summary.productionCost || 0,
    excelTotalCogs: summary.totalCogs || 0,
    /** Finishing/coating sudah di baris SUMMARY — jangan tambah coatingCost terpisah */
    includeCoatingInCogs: defaults.includeCoatingInCogs ?? false,
    /**
     * hybrid: kayu dari CALCULATION + proses dari SUMMARY (dedupe)
     * rollup: tidak append EXCEL-SUMMARY — gunakan seed terkurati / master
     */
    cogsImportMode: defaults.cogsImportMode ?? 'hybrid',
  };
}
