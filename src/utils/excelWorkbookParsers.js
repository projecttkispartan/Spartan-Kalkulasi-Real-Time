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
const PROCESS_SUMMARY_WHITELIST = new Set([
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

    if (label.includes('COST OF GOOD SOLD')) {
      const rowTotal = Number(r[13]) || Number(r[16]) || total;
      if (rowTotal > totalCogs) totalCogs = rowTotal;
      continue;
    }
    if (label.includes('PRODUCTION COST') && !label.includes('RAW')) {
      productionCost = total || productionCost;
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

  return {
    lines,
    packingBox,
    packingSf,
    productionCost,
    totalCogs,
    factoryOhPct,
    managementOhPct,
  };
}

/** CALCULATION — part kayu & biaya per kode part */
export function parseCalculationPartsMap(rows) {
  const map = new Map();
  for (let i = 8; i < rows.length; i++) {
    const r = rows[i] || [];
    const kode = String(r[7] ?? '').trim();
    if (!kode || !kode.includes('-')) continue;
    const type = String(r[3] ?? '').trim().toUpperCase();
    if (type && type !== 'KAYU') continue;
    if (String(r[5] ?? '').toUpperCase() !== 'X' && type === 'KAYU') {
      // baris kayu aktif biasanya X di kolom 5
    }

    const qty = Number(r[16]) || 1;
    const totalPrice = Number(r[26]) || 0;
    const p = Number(r[12]) || 0;
    const l = Number(r[13]) || 0;
    const t = Number(r[14]) || 0;
    const vol = Number(r[15]) || calcPartVolume(p, l, t);
    const surfaceM2 = Number(r[28]) || Number(r[38]) || 0;

    if (!totalPrice && !vol) continue;

    map.set(kode, {
      kode,
      nama: String(r[11] ?? '').trim(),
      qty,
      p,
      l,
      t,
      vol,
      surfaceM2,
      biayaUnit: qty ? Math.round(totalPrice / qty) : Math.round(totalPrice),
      biayaLine: totalPrice,
      wood: String(r[8] ?? '').trim(),
    });
  }
  return map;
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
    if (calc.surfaceM2 > 0) node.surfaceM2 = calc.surfaceM2;
    if (calc.wood && !node.woodSpecification) node.woodSpecification = calc.wood;
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

  const extras = summaryLines
    .filter((ln) => PROCESS_SUMMARY_WHITELIST.has(normLabel(ln.label)))
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
  };
}
