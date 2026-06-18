/**
 * Laporan parity UAT ZAN-100 — import workbook + sample seed vs Excel SUMMARY COST.
 * Usage:
 *   $env:ZAN_EXCEL = "d:\path\to\1 - ZAN-100 - 2-12-25.xlsx"
 *   node scripts/uatZan100Report.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';
import { parseBomWorkbook } from '../src/utils/importBomFromExcel.js';
import { zanStoolGraph } from '../src/data/zanStoolGraph.js';
import {
  ZAN_EXCEL_COGS,
  ZAN_EXCEL_PRODUCTION_COST,
  ZAN_EXCEL_RAW_PRODUCTION,
  ZAN_EXCEL_KAYU_MATERIAL,
  ZAN_EXCEL_BOX_PACKING,
} from '../src/data/zanExcelSummary.js';
import { computeCogs, computePackingTotals, computePartsTotals } from '../src/services/bomCalculations.js';
import { linkProjectToMasters } from '../src/utils/linkProjectToMasters.js';
import {
  EXCEL_PARITY_TOLERANCE_IDR,
  EXCEL_PARITY_TOLERANCE_PCT,
} from '../src/data/excelParityChecklist.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const DEFAULT_PATHS = [
  process.env.ZAN_EXCEL,
  'd:/Project Spartan Jepara/03. DOKUMEN/Excel Document/1 - ZAN-100 - 2-12-25.xlsx',
  'd:/Project Spartan Jepara/03. DOKUMEN/Modul Document/Manufacture Management/1. Excel Bill Of Material/1 - ZAN-100 - 2-12-25.xlsx',
].filter(Boolean);

function resolveExcelPath() {
  for (const p of DEFAULT_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function withinTolerance(actual, expected) {
  if (!expected || expected <= 0) return { ok: false, diff: 0, pct: 0 };
  const diff = Math.abs(actual - expected);
  const pct = (diff / expected) * 100;
  const ok = diff <= Math.max(EXCEL_PARITY_TOLERANCE_IDR, expected * EXCEL_PARITY_TOLERANCE_PCT);
  return { ok, diff, pct };
}

function fmt(n) {
  return Math.round(Number(n) || 0).toLocaleString('id-ID');
}

function printRow(label, actual, expected, tolPct = 0.015) {
  const { ok, diff, pct } = withinTolerance(actual, expected);
  const flag = ok ? 'PASS' : pct <= 8 ? 'WARN' : 'FAIL';
  console.log(
    `  ${flag.padEnd(5)} ${label.padEnd(22)} app=Rp ${fmt(actual).padStart(12)}  excel=Rp ${fmt(expected).padStart(12)}  Δ=Rp ${fmt(diff).padStart(8)} (${pct.toFixed(2)}%)`,
  );
  return { ok, flag };
}

const packingSpecSeed = {
  materialsBox: [{ id: 1, nama: 'BOX', qty: 1, harga: Math.round(ZAN_EXCEL_BOX_PACKING.material) }],
  materialsSF: [],
  routingBox: [{ id: 1, nama: 'Lab', waktu: 24, pekerja: 1, rate: 500 }],
  routingSF: [],
};

const cogsConfigSeed = {
  packingJalur: 'BOX',
  factoryOhPct: 5,
  managementOhPct: 2.5,
  markupPct: 20,
  includeCoatingInCogs: false,
};

console.log('='.repeat(72));
console.log('UAT ZAN-100 — Laporan Parity COGS');
console.log('='.repeat(72));

// --- Track B: curated seed (release gate) ---
const packingSeed = computePackingTotals(packingSpecSeed);
const partsSeed = computePartsTotals(zanStoolGraph);
const cogsSeed = computeCogs({
  bomData: zanStoolGraph,
  cogsConfig: cogsConfigSeed,
  packingTotals: packingSeed,
});

console.log('\n[Track B] Sample seed terkurasi (zanStoolGraph) — RELEASE GATE');
console.log('-'.repeat(72));
const bProd = printRow('Production Cost', cogsSeed.productionCost, ZAN_EXCEL_PRODUCTION_COST);
const bCogs = printRow('Total COGS', cogsSeed.totalCogs, ZAN_EXCEL_COGS);
console.log(`  INFO  Material kayu (part)     app=Rp ${fmt(partsSeed.matAdjusted).padStart(12)}  ref=Rp ${fmt(ZAN_EXCEL_KAYU_MATERIAL).padStart(12)} (kolom material KAYU)`);
console.log(`  INFO  Packing BOX              app=Rp ${fmt(packingSeed.packGrand).padStart(12)}  ref=Rp ${fmt(ZAN_EXCEL_BOX_PACKING.total).padStart(12)}`);

// --- Track B: bundled sample JSON ---
const samplePath = path.join(ROOT, 'src/data/samples/projects/zan-100.json');
if (fs.existsSync(samplePath)) {
  const raw = JSON.parse(fs.readFileSync(samplePath, 'utf8'));
  const linked = linkProjectToMasters(raw, { applyBiaya: false, skipBiayaIfExcel: true });
  const packingSample = computePackingTotals(linked.packingSpec);
  const cogsSample = computeCogs({
    bomData: linked.bomData,
    cogsConfig: linked.cogsConfig,
    packingTotals: packingSample,
    productMeta: linked.productMeta,
  });
  const mirrorProd = linked.excelMirror?.summaryCost?.productionCost || ZAN_EXCEL_PRODUCTION_COST;
  const mirrorCogs = linked.excelMirror?.summaryCost?.totalCogs || ZAN_EXCEL_COGS;

  console.log('\n[Track B] Sample JSON (zan-100.json) vs excelMirror');
  console.log('-'.repeat(72));
  printRow('Production Cost', cogsSample.productionCost, mirrorProd);
  printRow('Total COGS', cogsSample.totalCogs, mirrorCogs);
}

// --- Track A: full workbook import ---
const excelPath = resolveExcelPath();
if (!excelPath) {
  console.warn('\n[Track A] SKIP — file Excel tidak ditemukan. Set ZAN_EXCEL.');
} else {
  console.log(`\n[Track A] Import workbook penuh — ${excelPath}`);
  console.log('-'.repeat(72));
  const wb = XLSX.read(fs.readFileSync(excelPath), { type: 'buffer' });
  const project = parseBomWorkbook(wb);
  const linked = linkProjectToMasters(project, { applyBiaya: true, skipBiayaIfExcel: true });
  const packing = computePackingTotals(linked.packingSpec);
  const cogs = computeCogs({
    bomData: linked.bomData,
    cogsConfig: linked.cogsConfig,
    packingTotals: packing,
    productMeta: linked.productMeta,
  });
  const mirrorProd = linked.excelMirror?.summaryCost?.productionCost || ZAN_EXCEL_PRODUCTION_COST;
  const mirrorCogs = linked.excelMirror?.summaryCost?.totalCogs || ZAN_EXCEL_COGS;

  console.log(`  INFO  Part count (approx)     ${countParts(linked.bomData)} parts`);
  console.log(`  INFO  excelMirror terisi       ${linked.excelMirror?.summaryCost ? 'ya' : 'tidak'}`);
  printRow('Production Cost', cogs.productionCost, mirrorProd);
  printRow('Total COGS', cogs.totalCogs, mirrorCogs);
  printRow('RAW Production (info)', cogs.productionCost - (cogs.factoryOh + cogs.managementOh), ZAN_EXCEL_RAW_PRODUCTION, 0.05);
}

console.log('\n' + '='.repeat(72));
console.log('Referensi Excel SUMMARY COST (jalur BOX):');
console.log(`  Production Cost : Rp ${fmt(ZAN_EXCEL_PRODUCTION_COST)}`);
console.log(`  Total COGS      : Rp ${fmt(ZAN_EXCEL_COGS)}`);
console.log('Toleransi sign-off: ≤ 1,5% atau ≤ Rp 25.000');
console.log('Dokumen UAT: docs/qa/09-UAT-ZAN-100-End-to-End.mmd');
console.log('='.repeat(72));

// Gate: seed must pass
assert.ok(bProd.ok, 'Track B seed Production Cost');
assert.ok(bCogs.ok, 'Track B seed Total COGS');
console.log('\nTrack B release gate: PASS');

function countParts(node) {
  let n = node.tipe === 'PART' ? 1 : 0;
  for (const ch of node.children || []) n += countParts(ch);
  return n;
}
