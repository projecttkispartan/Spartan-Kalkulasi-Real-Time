/**
 * Import master mirror Excel ZAN-100:
 * DATA BASE, MASTER RATIO, COATING RATIO, FORMULA DATA, ROUND COMPONENT CALC
 */
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const EXCEL_PATH =
  process.env.ZAN_EXCEL ||
  'd:/Project Spartan Jepara/03. DOKUMEN/Modul Document/Manufacture Management/1. Excel Bill Of Material/1 - ZAN-100 - 2-12-25.xlsx';

const OUT = path.join(ROOT, 'src/data/masters');
const IMPORT_VERSION = '4.0.0';

function slug(s) {
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function writeJson(relPath, data) {
  const full = path.join(OUT, relPath);
  ensureDir(path.dirname(full));
  fs.writeFileSync(full, JSON.stringify(data, null, 2));
}

function parseWoodMaterials(rows) {
  const materials = [];
  const buyerSafetyPct = Number(rows[5]?.[4]) || 0.1;

  for (let i = 7; i < rows.length; i++) {
    const r = rows[i];
    const no = Number(r[0]);
    const spec = String(r[1] ?? '').trim();
    if (!no || !spec) {
      if (materials.length > 0 && !spec) break;
      continue;
    }
    if (String(r[35] ?? '').trim() === 'NO' && String(r[36] ?? '').includes('FINISHING')) break;

    const priceBuyer = Number(r[3]) || 0;
    const priceSupplier = Number(r[13]) || 0;
    if (!priceSupplier && !priceBuyer) continue;

    const safetyBuyer = Number(r[4]) || 0;
    const totalBuyer = Number(r[5]) || 0;
    const safetySupplier = Number(r[14]) || 0;
    const totalSupplier = Number(r[15]) || priceSupplier;
    const finishingCode = String(r[36] ?? '').trim();
    const diameterGrade = String(r[39] ?? '').trim();
    const supplierChannel = String(r[23] ?? '').trim() === '1' ? 'IMPORT' : 'LOKAL';

    materials.push({
      id: `wood-${no}`,
      kode: finishingCode ? `WOOD-${finishingCode}-${no}` : `WOOD-${String(no).padStart(3, '0')}`,
      no,
      nama: spec,
      specification: spec,
      woodName: String(r[2] ?? '').trim(),
      diameterGrade,
      finishingCode,
      dimensi: { p: 0, l: 0, t: 0, label: diameterGrade || spec },
      hargaLogBuyer: priceBuyer,
      safetyFactorBuyer: safetyBuyer,
      buyerSafetyPct,
      hargaMaterialBuyer: totalBuyer,
      hargaLogSupplier: priceSupplier,
      safetyFactorSupplier: safetySupplier,
      hargaMaterialSupplier: totalSupplier,
      pricePerM3Buyer: priceBuyer,
      priceSafetyFactorBuyer: safetyBuyer,
      buyerTotalPerM3: totalBuyer,
      pricePerM3Supplier: totalSupplier || priceSupplier || priceBuyer,
      invoiceCostPerM3: Number(r[12]) || 0,
      vendorSupplier: diameterGrade,
      supplierName: diameterGrade,
      supplierChannel,
      unit: 'm³',
      materialType: 'kayu',
      source: 'DATA BASE',
      excelRef: `DATA BASE row ${i + 1}`,
      aktif: true,
    });
  }
  return materials;
}

/** Material non-kayu dari FORMULA DATA (baris jenis komponen) */
function parseNonWoodFromFormula(rows) {
  const typeMap = {
    PLYWOOD: 'plywood',
    MDF: 'komponen',
    BESI: 'steel',
    HPL: 'komponen',
    HARDWARE: 'hardware',
    BLOCKBOARD: 'komponen',
    VENEER: 'veneer',
    KAYU: 'kayu',
  };
  const items = [];
  let seq = 1;
  for (let i = 4; i < Math.min(35, rows.length); i++) {
    const r = rows[i];
    const label = String(r[1] ?? '').trim().toUpperCase();
    if (!label || !typeMap[label]) continue;
    const mt = typeMap[label];
    if (mt === 'kayu') continue;
    items.push({
      id: `nw-${seq++}`,
      no: seq - 1,
      specification: label,
      woodName: label,
      materialType: mt,
      pricePerM3Supplier: 0,
      pricePerM3Buyer: 0,
      aktif: true,
      source: 'FORMULA DATA',
    });
  }
  return items;
}

/** Rasio SF/WF dari FORMULA DATA kolom P/L/T (12/13/14) per jenis material */
function parseRatiosFromFormula(rows) {
  const typeMap = {
    KAYU: 'kayu',
    PLYWOOD: 'plywood',
    MDF: 'komponen',
    BESI: 'steel',
    HPL: 'komponen',
    HARDWARE: 'hardware',
    BLOCKBOARD: 'komponen',
    VENEER: 'veneer',
  };
  const ratios = [];
  const seen = new Set();

  for (let i = 4; i < Math.min(35, rows.length); i++) {
    const r = rows[i];
    const label = String(r[1] ?? '').trim().toUpperCase();
    const mt = typeMap[label];
    if (!mt || seen.has(mt)) continue;
    seen.add(mt);

    const p = Number(r[12]) || 0;
    const l = Number(r[13]) || 0;
    const t = Number(r[14]) || 0;

    let sf = 0;
    let wf = 0;
    if (mt === 'kayu') {
      wf = p || 30;
      sf = 0;
    } else {
      sf = l || 10;
      wf = 0;
    }

    ratios.push({
      id: `ratio-${mt}`,
      category: mt,
      materialType: mt,
      label: `${label} — ratio (FORMULA DATA)`,
      sf,
      wf,
      wasteFactor: mt === 'kayu' ? wf / 100 : undefined,
      materialRatio: mt !== 'kayu' ? sf / 100 : undefined,
      source: 'FORMULA DATA',
      excelRef: `FORMULA DATA row ${i + 1}`,
      aktif: true,
    });
  }

  return ratios;
}

/** Rasio material plywood/mdf/veneer dari MASTER RATIO (kolom MATERIAL RATIO ≈ 0.1) */
function parseRatiosFromMasterRatio(rows) {
  const extras = [];
  const blocks = [
    { col: 11, name: 'plywood', label: 'Plywood — Material Ratio' },
    { col: 17, name: 'mdf', materialType: 'komponen', label: 'MDF — Material Ratio' },
    { col: 33, name: 'veneer', label: 'Veneer — Material Ratio' },
  ];

  for (const block of blocks) {
    for (let i = 5; i < Math.min(25, rows.length); i++) {
      const r = rows[i];
      const job = String(r[block.col] ?? '').trim().toUpperCase();
      if (job !== 'MATERIAL') continue;
      const ratio = Number(r[block.col + 2]);
      if (!ratio || ratio <= 0) continue;
      const mt = block.materialType || block.name;
      const sf = Math.round(ratio * 100);
      extras.push({
        id: `ratio-${block.name}-mr`,
        category: block.name,
        materialType: mt,
        label: block.label,
        sf,
        wf: 0,
        materialRatio: ratio,
        source: 'MASTER RATIO',
        excelRef: `MASTER RATIO row ${i + 1}`,
        aktif: true,
      });
      break;
    }
  }

  return extras;
}

function parseCoatings(rows) {
  const byNo = new Map();
  for (let i = 5; i < rows.length; i++) {
    const r = rows[i];
    const no = Number(r[0]);
    const name = String(r[1] ?? '').trim();
    if (!no || !name || name.length < 3) continue;
    if (!name.includes('.') && !name.includes('HARKA') && !name.includes('STAIN')) continue;

    const codeFin = Number(r[2]) || 0;
    const entry = {
      id: `coat-${no}`,
      no,
      kode: codeFin ? `COAT-${codeFin}` : `COAT-${no}`,
      name,
      nama: name,
      code: codeFin,
      kodeFinishing: codeFin,
      materialCostM2: Number(r[3]) || 0,
      materialWaste: Number(r[5]) || 0,
      totalMaterialM2: Number(r[7]) || Number(r[3]) || 0,
      laborM2: Number(r[9]) || 0,
      totalProductionM2: Number(r[11]) || 0,
      roundedCostM2: Number(r[13]) || 0,
      hargaMaterial: Number(r[7]) || Number(r[3]) || 0,
      hargaSatuan: Number(r[13]) || 0,
      vendorSupplier: '',
      unit: 'm²',
      materialType: 'coating',
      source: 'COATING RATIO',
      aktif: true,
    };

    const prev = byNo.get(no);
    if (!prev || (entry.roundedCostM2 > 0 && prev.roundedCostM2 <= 0)) {
      byNo.set(no, entry);
    }
  }
  return [...byNo.values()].sort((a, b) => a.no - b.no);
}

function buildFormulaRegistry() {
  return [
    {
      id: 'vol_part_mm',
      label: 'Volume part (m³)',
      description: 'P × L × T (mm) ÷ 10⁹',
      excelRef: 'BOM TEMPLATE / FORMULA DATA',
      inputs: ['p', 'l', 't'],
      handler: 'vol_part_mm',
      outputUnit: 'm3',
    },
    {
      id: 'vol_packing_box',
      label: 'Volume packing box (m³)',
      description: '(W+tolW)×(D+tolD)×(H+tolH) ÷ 10⁹',
      excelRef: 'BOM TEMPLATE',
      inputs: ['w', 'd', 'h', 'tolW', 'tolD', 'tolH'],
      handler: 'vol_packing_box',
      outputUnit: 'm3',
    },
    {
      id: 'vol_packing_sf',
      label: 'Volume single face (m³)',
      description: 'Volume box × 0.6 untuk CHAIR',
      excelRef: 'BOM TEMPLATE',
      inputs: ['w', 'd', 'h', 'tolW', 'tolD', 'tolH', 'itemType'],
      handler: 'vol_packing_sf',
      outputUnit: 'm3',
    },
    {
      id: 'container_pcs',
      label: 'Kapasitas kontainer (pcs)',
      description: 'floor(volumeMuatanKontainer ÷ volumePacking)',
      excelRef: 'SUMMARY COST',
      inputs: ['containerNetM3', 'volPacking'],
      handler: 'container_pcs',
      outputUnit: 'pcs',
    },
    {
      id: 'wood_material_cost',
      label: 'Biaya material kayu (IDR)',
      description: 'harga/m³ × vol × (1 + SF% + WF%)',
      excelRef: 'DATA BASE + MASTER RATIO',
      inputs: ['pricePerM3', 'vol', 'sf', 'wf'],
      handler: 'wood_material_cost',
      outputUnit: 'idr',
    },
    {
      id: 'coating_cost',
      label: 'Biaya coating (IDR)',
      description: 'luas m² × rounded cost/m²',
      excelRef: 'COATING RATIO',
      inputs: ['surfaceM2', 'roundedCostM2'],
      handler: 'coating_cost',
      outputUnit: 'idr',
    },
    {
      id: 'surface_m2_estimate',
      label: 'Estimasi luas permukaan part (m²)',
      description: '2×(P×L + P×T + L×T) mm² → m²',
      excelRef: 'FORMULA DATA',
      inputs: ['p', 'l', 't'],
      handler: 'surface_m2_estimate',
      outputUnit: 'm2',
    },
    {
      id: 'cogs_production',
      label: 'Production cost',
      description: 'Material + proses + packing',
      excelRef: 'SUMMARY COST',
      inputs: ['totalMaterial', 'totalProcess', 'packingCost'],
      handler: 'cogs_production',
      outputUnit: 'idr',
    },
    {
      id: 'cogs_total',
      label: 'Total COGS',
      description: 'Production + factory OH + management OH',
      excelRef: 'SUMMARY COST',
      inputs: ['productionCost', 'factoryOhPct', 'managementOhPct'],
      handler: 'cogs_total',
      outputUnit: 'idr',
    },
    {
      id: 'cogs_selling',
      label: 'Harga jual',
      description: 'COGS × (1 + markup%)',
      excelRef: 'SUMMARY COST',
      inputs: ['totalCogs', 'markupPct'],
      handler: 'cogs_selling',
      outputUnit: 'idr',
    },
    {
      id: 'round_table_component',
      label: 'Volume komponen meja bundar (m³)',
      description: 'ROUND COMPONENT CALC — cubic meter components',
      excelRef: 'ROUND COMPONENT CALC',
      inputs: ['sections', 'outerDiameterMm', 'radialWidthMm', 'thicknessMm'],
      handler: 'round_table_component',
      outputUnit: 'm3',
    },
  ];
}

function buildRoundingRules() {
  return [
    {
      id: 'selling_price_1000',
      target: 'sellingPrice',
      method: 'floor',
      step: 1000,
      label: 'Harga jual — floor ke ribuan',
      excelRef: 'SUMMARY COST / export',
      aktif: true,
    },
    {
      id: 'part_biaya_1',
      target: 'part.biaya',
      method: 'round',
      step: 1,
      label: 'Biaya part per unit — round IDR',
      excelRef: 'CALCULATION',
      aktif: true,
    },
    {
      id: 'summary_category_1',
      target: 'summaryCategory',
      method: 'round',
      step: 1,
      label: 'Subtotal kategori SUMMARY COST',
      excelRef: 'SUMMARY COST',
      aktif: true,
    },
  ];
}

function mergeRatios(formulaRatios, masterRatioExtras) {
  const byType = new Map();
  for (const r of formulaRatios) byType.set(r.materialType, r);
  for (const r of masterRatioExtras) {
    const existing = byType.get(r.materialType);
    if (existing && r.source === 'MASTER RATIO') {
      byType.set(r.materialType, { ...existing, ...r, sf: r.sf || existing.sf });
    } else if (!existing) {
      byType.set(r.materialType, r);
    }
  }
  return [...byType.values()];
}

/** MASTER RATIO — WOOD LABOR RATIO (kolom B–H) */
function parseWoodLaborRows(rows) {
  const list = [];
  for (let i = 5; i < Math.min(100, rows.length); i++) {
    const r = rows[i];
    const no = Number(r[1]);
    const job = String(r[2] ?? '').trim();
    if (!no || !job || job.toUpperCase().includes('TOTAL')) continue;
    const laborCostM3 = Number(r[6]) || 0;
    if (!laborCostM3 && !Number(r[3])) continue;
    list.push({
      id: `wl-${no}-${slug(job)}`,
      no,
      jobDescription: job,
      laborMinPerM3: Number(r[3]) || 0,
      laborHourPerM3: Number(r[4]) || 0,
      laborDayPerM3: Number(r[5]) || 0,
      laborCostPerM3: laborCostM3,
      laborCostUsd: Number(r[7]) || 0,
      source: 'MASTER RATIO',
      excelRef: `MASTER RATIO row ${i + 1}`,
    });
  }
  return list;
}

/** MASTER RATIO — PLYWOOD / MDF blocks (kolom J–N, P–T) */
function parseMasterRatioBlocks(rows) {
  const blocks = [
    { key: 'plywood', startCol: 9, label: 'PLYWOOD RATIO' },
    { key: 'mdf', startCol: 15, label: 'MDF RATIO' },
  ];
  const out = {};
  for (const block of blocks) {
    const list = [];
    for (let i = 5; i < Math.min(40, rows.length); i++) {
      const r = rows[i];
      const no = Number(r[block.startCol]);
      const job = String(r[block.startCol + 1] ?? '').trim();
      if (!no || !job) continue;
      list.push({
        id: `${block.key}-${no}-${slug(job)}`,
        no,
        jobDescription: job,
        man: Number(r[block.startCol + 2]) || 0,
        materialRatio: Number(r[block.startCol + 3]) || 0,
        laborRatioSec: Number(r[block.startCol + 4]) || 0,
        source: block.label,
        excelRef: `MASTER RATIO row ${i + 1}`,
      });
    }
    out[block.key] = list;
  }
  return out;
}

/** FORMULA DATA — baris jenis komponen + ratio P/L/T */
function parseFormulaDataRows(rows) {
  const list = [];
  for (let i = 4; i < Math.min(120, rows.length); i++) {
    const r = rows[i];
    const no = Number(r[0]);
    const label = String(r[1] ?? '').trim();
    if (!label && !no) continue;
    if (String(r[1] ?? '').toUpperCase() === 'KODE MATERIAL') break;
    list.push({
      id: `fd-${i}`,
      row: i + 1,
      no: no || list.length + 1,
      materialType: label,
      veneer: r[2] ?? '',
      edging: r[3] ?? '',
      plywoodType: r[5] ?? '',
      grade: r[7] ?? '',
      proses: r[9] ?? '',
      materialRatioKey: r[11] ?? '',
      wfPct: Number(r[12]) || 0,
      sfPct: Number(r[13]) || 0,
      thicknessMm: Number(r[14]) || 0,
      componentName: r[16] ?? '',
      buyerRatio: Number(r[17]) || 0,
      supplierRatio: Number(r[18]) || 0,
      source: 'FORMULA DATA',
    });
  }
  return list;
}

/** ROUND COMPONENT CALC — preset meja bundar */
function parseRoundComponentPresets(rows) {
  const presets = [];
  const scanBlock = (baseCol, suffix) => {
    let sections = 0;
    let outerDia = 0;
    let radialWidth = 0;
    let thickness = 0;
    let cubicM = 0;
    for (let i = 3; i < rows.length; i++) {
      const r = rows[i];
      const label = String(r[baseCol] ?? '').trim().toUpperCase();
      if (label.includes('NUMBER OF SECTIONS')) sections = Number(r[baseCol + 1]) || 0;
      if (label.includes('OUTER DIAMETER')) outerDia = Number(r[baseCol + 1]) || 0;
      if (label.includes('RADIAL WIDTH')) radialWidth = Number(r[baseCol + 1]) || 0;
      if (label.includes('THICKNESS') && !label.includes('COMPONENT')) thickness = Number(r[baseCol + 1]) || 0;
      if (label.includes('CUBIC METER')) cubicM = Number(r[baseCol + 1]) || 0;
    }
    if (sections || outerDia) {
      presets.push({
        id: `round-${suffix}`,
        label: `Round table preset ${suffix}`,
        sections,
        outerDiameterMm: outerDia,
        radialWidthMm: radialWidth,
        thicknessMm: thickness,
        cubicMeter: cubicM,
        source: 'ROUND COMPONENT CALC',
      });
    }
  };
  scanBlock(1, 'a');
  scanBlock(8, 'b');
  return presets;
}

function buildWorkCentersFromExcel(woodLabor, routingBase) {
  const fromExcel = woodLabor.map((w) => ({
    id: w.id,
    kode: `WL-${w.no}`,
    nama: w.jobDescription,
    ratePerMin: w.laborHourPerM3 ? w.laborCostPerM3 / (w.laborHourPerM3 * 60) : 500,
    laborCostPerM3: w.laborCostPerM3,
    laborMinPerM3: w.laborMinPerM3,
    mesin: '—',
    category: 'WOOD LABOR',
    aktif: true,
    source: 'MASTER RATIO',
  }));
  const seen = new Set(fromExcel.map((x) => x.kode));
  const merged = [...fromExcel];
  for (const wc of routingBase) {
    if (!seen.has(wc.kode)) merged.push(wc);
  }
  return merged;
}

function parseSupplierSheets(wb) {
  const parts = [];
  for (const n of [1, 2, 3]) {
    const name = `KALKULASI SUPPLIER ${n}`;
    const sh = wb.Sheets[name];
    if (!sh) continue;
    const rows = XLSX.utils.sheet_to_json(sh, { header: 1, defval: '' });
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] || [];
      const no = Number(r[0]);
      const material = String(r[1] ?? '').trim();
      const desc = String(r[3] ?? '').trim();
      if (!no || !material || material === '0' || !desc || desc.includes('DESCRIPTION')) continue;
      parts.push({
        no,
        material,
        module: String(r[2] ?? '').trim(),
        description: desc,
        partCode: `SUP${n}-${no}`,
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
        wasteFactor: Number(r[17]) || 0,
        source: name,
        excelRow: i + 1,
        supplierIndex: n,
      });
    }
  }
  return parts;
}

async function main() {
  if (!fs.existsSync(EXCEL_PATH)) {
    console.error('Excel not found:', EXCEL_PATH);
    process.exit(1);
  }

  const buf = fs.readFileSync(EXCEL_PATH);
  const checksum = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);
  const wb = XLSX.read(buf, { type: 'buffer' });

  const dbRows = XLSX.utils.sheet_to_json(wb.Sheets['DATA BASE'], { header: 1, defval: '' });
  const mrRows = XLSX.utils.sheet_to_json(wb.Sheets['MASTER RATIO'], { header: 1, defval: '' });
  const crRows = XLSX.utils.sheet_to_json(wb.Sheets['COATING RATIO'], { header: 1, defval: '' });
  const fdRows = XLSX.utils.sheet_to_json(wb.Sheets['FORMULA DATA'], { header: 1, defval: '' });
  const rcRows = wb.Sheets['ROUND COMPONENT CALC']
    ? XLSX.utils.sheet_to_json(wb.Sheets['ROUND COMPONENT CALC'], { header: 1, defval: '' })
    : [];

  const wood = parseWoodMaterials(dbRows);
  const nonWood = parseNonWoodFromFormula(fdRows);
  const ratios = mergeRatios(parseRatiosFromFormula(fdRows), parseRatiosFromMasterRatio(mrRows));
  const coatings = parseCoatings(crRows);
  const formulas = buildFormulaRegistry();
  const rounding = buildRoundingRules();
  const woodLabor = parseWoodLaborRows(mrRows);
  const masterRatioBlocks = parseMasterRatioBlocks(mrRows);
  const formulaDataRows = parseFormulaDataRows(fdRows);
  const roundPresets = parseRoundComponentPresets(rcRows);
  const routingBase = [
    { id: 'WC-001', kode: 'WC-001', nama: 'Cutting Section', ratePerMin: 500, mesin: 'Panel Saw', aktif: true, source: 'routingCatalog' },
    { id: 'WC-002', kode: 'WC-002', nama: 'CNC Router', ratePerMin: 650, mesin: 'CNC Router 5-Axis', aktif: true, source: 'routingCatalog' },
    { id: 'WC-003', kode: 'WC-003', nama: 'Finishing Booth', ratePerMin: 500, mesin: 'Spray Booth', aktif: true, source: 'routingCatalog' },
  ];
  const workCenters = buildWorkCentersFromExcel(woodLabor, routingBase);
  const supplierParts = parseSupplierSheets(wb);

  const { buildMaterialCatalog } = await import('../src/utils/buildMaterialCatalog.js');
  const materialCatalog = buildMaterialCatalog({
    wood,
    coatings,
    formulaDataRows,
    nonWood,
    supplierParts,
  });

  const meta = {
    sourceFile: path.basename(EXCEL_PATH),
    importedAt: new Date().toISOString(),
    importScriptVersion: IMPORT_VERSION,
    checksum,
    sheetRowCounts: {
      'DATA BASE': dbRows.length,
      'MASTER RATIO': mrRows.length,
      'COATING RATIO': crRows.length,
      'FORMULA DATA': fdRows.length,
      'ROUND COMPONENT CALC': rcRows.length,
    },
    counts: {
      wood: wood.length,
      nonWood: nonWood.length,
      ratios: ratios.length,
      coatings: coatings.length,
      formulas: formulas.length,
      rounding: rounding.length,
      workCenters: workCenters.length,
      woodLabor: woodLabor.length,
      formulaDataRows: formulaDataRows.length,
      roundPresets: roundPresets.length,
      materialCatalog: materialCatalog.length,
      supplierParts: supplierParts.length,
    },
  };

  writeJson('database/wood.json', wood);
  writeJson('catalog/materialCatalog.json', materialCatalog);
  writeJson('database/nonWood.json', nonWood);
  writeJson('ratios/byCategory.json', ratios);
  writeJson('coatings/systems.json', coatings);
  writeJson('formulas/registry.json', formulas);
  writeJson('rounding/rules.json', rounding);
  writeJson('workCenters/systems.json', workCenters);
  writeJson('tables/woodLabor.json', woodLabor);
  writeJson('tables/masterRatioBlocks.json', masterRatioBlocks);
  writeJson('tables/formulaDataRows.json', formulaDataRows);
  writeJson('tables/roundComponentPresets.json', roundPresets);
  writeJson('meta.json', meta);

  // Legacy flat paths (backward compat)
  writeJson('materials.json', wood);
  writeJson('wasteRatios.json', ratios);
  writeJson('coatings.json', coatings);

  console.log('Imported masters → src/data/masters/');
  console.log('  wood:', wood.length);
  console.log('  nonWood:', nonWood.length);
  console.log('  ratios:', ratios.length);
  console.log('  coatings:', coatings.length);
  console.log('  formulas:', formulas.length);
  console.log('  rounding rules:', rounding.length);
  console.log('  work centers:', workCenters.length);
  console.log('  wood labor rows:', woodLabor.length);
  console.log('  formula data rows:', formulaDataRows.length);
  console.log('  round presets:', roundPresets.length);
  console.log('  material catalog:', materialCatalog.length);
  console.log('  supplier part rows:', supplierParts.length);
  console.log('  checksum:', checksum);

  const kayuRatio = ratios.find((r) => r.materialType === 'kayu');
  console.log('  kayu WF%:', kayuRatio?.wf);
  const desert = coatings.find((c) => c.name.includes('DESERT BROWN'));
  console.log('  coat-33 rounded/m²:', desert?.roundedCostM2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
