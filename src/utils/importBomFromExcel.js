/**
 * Parse BOM TEMPLATE sheet → BomProject skeleton
 */
import * as XLSX from 'xlsx';
import { linkProjectToMasters } from './linkProjectToMasters.js';
import { createEmptyProject } from './emptyProject.js';
import { calcPartVolume } from './packingVolume.js';

function newProjectId() {
  return `proj-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createEmptyProductInfo() {
  return { kode: '', nama: '', varian: '', customer: '', kodeBom: '', namaBom: '', versi: '' };
}

function createEmptyProductMeta() {
  return { itemType: '', wood: '', woodGradeId: '', coating: '', coatingId: '' };
}

function readSheetRows(wb, name) {
  const sh = wb.Sheets[name];
  if (!sh) return [];
  return XLSX.utils.sheet_to_json(sh, { header: 1, defval: '' });
}

function parseProductDimensi(rows) {
  for (let i = 4; i < Math.min(15, rows.length); i++) {
    const r = rows[i] || [];
    const w = Number(r[20]);
    const d = Number(r[21]);
    const h = Number(r[22]);
    if (w > 0 && d > 0 && h > 0) return { w, d, h };
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

function inferTipe(row) {
  const mod = String(row[13] ?? '').trim();
  const sub = String(row[14] ?? '').trim();
  const partCode = String(row[12] ?? '').trim();
  if (partCode && String(row[15] ?? '').trim()) return 'PART';
  if (sub) return 'SUBMODUL 2';
  if (mod) return 'SUBMODUL';
  return 'MODUL';
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
      children: [],
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
        tipe: p.submodul2 ? 'SUBMODUL 2' : 'SUBMODUL',
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

    const p = Number(r[36]) || Number(r[27]) || 0;
    const l = Number(r[37]) || Number(r[28]) || 0;
    const t = Number(r[38]) || Number(r[29]) || 0;
    const vol = Number(r[41]) || 0;
    const qty = Number(r[39]) || 1;

    parts.push({
      no,
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

export function parseBomWorkbook(wb) {
  const templateRows = readSheetRows(wb, 'BOM TEMPLATE');
  const { productInfo, productMeta, dimensi } = parseProductHeader(templateRows);
  const partRows = parseBomTemplateRows(templateRows);
  const bomData = buildTreeFromFlatRows(partRows);

  const project = createEmptyProject({
    productInfo,
    productMeta,
    bomData,
    dimensi,
    importedFromExcel: true,
  });

  return linkProjectToMasters(project, { applyBiaya: true });
}

export function parseBomFromArrayBuffer(buffer) {
  const wb = XLSX.read(buffer, { type: 'array' });
  return parseBomWorkbook(wb);
}

export async function parseBomFromFile(file) {
  const buffer = await file.arrayBuffer();
  return parseBomFromArrayBuffer(buffer);
}
