/**
 * Parse workbook Excel BOM → project lengkap (BOM + CALCULATION + SUMMARY + packing)
 */
import * as XLSX from 'xlsx';
import { linkProjectToMasters } from './linkProjectToMasters.js';
import { createEmptyProject } from './emptyProject.js';
import { calcPartVolume } from './packingVolume.js';
import {
  readSheetRows,
  parseFullWorkbookMirror,
  parseCalculationPartsMap,
  mergeCalculationIntoBom,
  appendSummaryProcessParts,
  buildPackingSpecFromSummary,
  buildCogsConfigFromSummary,
} from './excelWorkbookParsers.js';
import { attachExcelImagesToProject } from './excelImageExtract.js';

function createEmptyProductInfo() {
  return { kode: '', nama: '', varian: '', customer: '', kodeBom: '', namaBom: '', versi: '' };
}

function createEmptyProductMeta() {
  return { itemType: '', wood: '', woodGradeId: '', coating: '', coatingId: '' };
}

function parseProductDimensi(rows) {
  for (let i = 4; i < Math.min(15, rows.length); i++) {
    const r = rows[i] || [];
    const w = Number(r[20]);
    const d = Number(r[21]);
    const h = Number(r[22]);
    if (w > 0 && d > 0 && h > 0) return { w, d, h };
  }
  for (let i = 0; i < Math.min(12, rows.length); i++) {
    const r = rows[i] || [];
    const label = String(r[12] ?? '').trim().toUpperCase();
    if (label.includes('DIMENSION')) {
      const w = Number(r[14] ?? r[5]);
      const d = Number(r[15] ?? r[6]);
      const h = Number(r[16] ?? r[7]);
      if (w > 0 && d > 0 && h > 0) return { w, d, h };
    }
  }
  return { w: 0, d: 0, h: 0 };
}

function parseProductHeader(rows) {
  const info = createEmptyProductInfo();
  const meta = createEmptyProductMeta();
  for (let i = 0; i < Math.min(20, rows.length); i++) {
    const r = rows[i];
    const label = String(r[12] ?? r[11] ?? '').trim().toUpperCase();
    const val = r[14] ?? r[13] ?? '';
    if (label.includes('CUSTOMER')) info.customer = String(val || info.customer);
    if (label.includes('SPARTAN PRODUCT')) info.kode = String(val || info.kode);
    if (label.includes('DESCRIPTION')) info.nama = String(val || info.nama);
    if (label.includes('ITEM TYPE')) meta.itemType = String(val || meta.itemType);
    if (label === 'WOOD') {
      const w1 = String(r[14] ?? '').trim();
      const w2 = String(r[15] ?? '').trim();
      meta.wood = [w1, w2].filter(Boolean).join(' - ') || meta.wood;
    }
    if (label.includes('COATING')) {
      const coatVal = String(r[14] ?? r[18] ?? '').trim();
      if (coatVal) meta.coating = coatVal;
    }
  }
  info.namaBom = info.nama;
  info.kodeBom = info.kode;
  return { productInfo: info, productMeta: meta, dimensi: parseProductDimensi(rows) };
}

function buildTreeFromFlatRows(partRows) {
  if (!partRows.length) {
    return {
      id: 'root-import',
      tipe: 'MODUL',
      nama: 'IMPORT',
      kode: '',
      qty: 1,
      unit: 'SET',
      children: [],
    };
  }

  const root = {
    id: 'root-import',
    no: 1,
    nama: partRows[0].modulName || 'MODUL',
    kode: partRows[0].modulCode || '',
    tipe: 'MODUL',
    qty: 1,
    unit: 'SET',
    p: 0,
    l: 0,
    t: 0,
    vol: 0,
    biaya: 0,
    children: [],
  };

  const modMap = new Map();
  const subMap = new Map();

  partRows.forEach((p, idx) => {
    const partNode = {
      id: `part-${idx}`,
      no: p.no || idx + 1,
      nama: p.nama,
      kode: p.kode,
      tipe: 'PART',
      qty: p.qty || 1,
      unit: 'EA',
      p: p.p || 0,
      l: p.l || 0,
      t: p.t || 0,
      vol: p.vol || 0,
      biaya: 0,
      materialType: p.materialType || '',
      sf: 0,
      wf: 0,
      proses_count: 0,
      proses: [],
      children: [],
      excelRow: p.excelRow,
      photoIndex: p.photoIndex,
    };

    const modKey = p.modulCode || p.modulName || 'default';
    if (!modMap.has(modKey)) {
      const sm = {
        id: `sm-${modMap.size}`,
        no: modMap.size + 2,
        nama: p.modulName || modKey,
        kode: p.modulCode || modKey,
        tipe: 'SUBMODUL',
        qty: 1,
        unit: 'SET',
        children: [],
      };
      modMap.set(modKey, sm);
      root.children.push(sm);
    }
    const subKey = `${modKey}::${p.submodulCode || p.submodulName || 'main'}`;
    const modNode = modMap.get(modKey);
    if (!subMap.has(subKey)) {
      const sub = {
        id: `sub-${subMap.size}`,
        no: subMap.size + 10,
        nama: p.submodulName || 'SUBMODUL',
        kode: p.submodulCode || '',
        tipe: 'SUBMODUL',
        qty: 1,
        unit: 'SET',
        children: [],
      };
      subMap.set(subKey, sub);
      modNode.children.push(sub);
    }
    subMap.get(subKey).children.push(partNode);
  });

  return root;
}

function parseBomTemplateRows(rows) {
  const parts = [];
  for (let i = 20; i < rows.length; i++) {
    const r = rows[i];
    const no = Number(r[8]);
    const kode = String(r[12] ?? '').trim();
    const nama = String(r[14] ?? '').trim();
    if (!no || !kode || !nama) continue;

    const mat = String(r[15] ?? '').trim().toUpperCase();
    const materialType =
      mat === 'KAYU' ? 'kayu' : mat === 'PLYWOOD' ? 'plywood' : mat === 'HARDWARE' ? 'hardware' : mat ? 'komponen' : '';

    let p = Number(r[36]) || Number(r[27]) || 0;
    let l = Number(r[37]) || Number(r[28]) || 0;
    let t = Number(r[38]) || Number(r[29]) || 0;
    let vol = calcPartVolume(p, l, t);
    if (!vol) {
      p = Number(r[40]) || p;
      l = Number(r[41]) || l;
      t = Number(r[42]) || t;
      vol = calcPartVolume(p, l, t);
    }
    const qty = Number(r[39]) || 1;
    const photoIndex = Number(r[2]) || Number(r[1]) || 0;

    parts.push({
      no,
      excelRow: i + 1,
      photoIndex,
      kode,
      nama,
      modulName: String(r[13] ?? '').trim(),
      modulCode: String(r[11] ?? '').trim(),
      submodulName: String(r[14] ?? '').trim(),
      submodulCode: String(r[10] ?? '').trim(),
      materialType,
      p,
      l,
      t,
      vol,
      qty,
    });
  }
  return parts;
}

/**
 * Impor workbook penuh — BOM TEMPLATE + CALCULATION + SUMMARY COST + KALKULASI + PICK LIST
 */
export function parseBomWorkbook(wb) {
  const templateRows = readSheetRows(wb, 'BOM TEMPLATE');
  const { productInfo, productMeta, dimensi } = parseProductHeader(templateRows);
  const partRows = parseBomTemplateRows(templateRows);
  let bomData = buildTreeFromFlatRows(partRows);

  const mirror = parseFullWorkbookMirror(wb);
  const calcMap = parseCalculationPartsMap(readSheetRows(wb, 'CALCULATION'));

  mergeCalculationIntoBom(bomData, calcMap);
  appendSummaryProcessParts(bomData, mirror.summaryCost?.lines || []);

  const packingSpec = buildPackingSpecFromSummary(mirror.summaryCost);
  const cogsConfig = buildCogsConfigFromSummary(mirror.summaryCost);

  const project = createEmptyProject({
    productInfo,
    productMeta,
    bomData,
    dimensi,
    packingSpec,
    cogsConfig,
    excelMirror: mirror,
    importedFromExcel: true,
    importSheets: [
      'SUMMARY COST',
      'BOM TEMPLATE',
      'CALCULATION',
      'KALKULASI HPP MENTAH',
      'KALKULASI SUPPLIER 1',
      'KALKULASI SUPPLIER 2',
      'KALKULASI SUPPLIER 3',
      'DATA BASE',
      'FORMULA DATA',
      'MASTER RATIO',
      'COATING RATIO',
      'ROUND COMPONENT CALC',
      'PICK LIST',
    ],
  });

  return linkProjectToMasters(project, {
    applyBiaya: true,
    skipBiayaIfExcel: true,
  });
}

export async function parseBomFromArrayBuffer(buffer) {
  const wb = XLSX.read(buffer, { type: 'array' });
  const project = parseBomWorkbook(wb);
  return attachExcelImagesToProject(project, buffer);
}

export async function parseBomFromFile(file) {
  const buffer = await file.arrayBuffer();
  return parseBomFromArrayBuffer(buffer);
}
