/**
 * Verifikasi import workbook penuh — struktur & mirror (bukan parity COGS ketat).
 * Parity COGS ≤1,5%: sample ZAN-100 seed (verifyZanCogs / verifyAllSampleCogs).
 */
import assert from 'node:assert/strict';
import fs from 'fs';
import * as XLSX from 'xlsx';
import { parseBomWorkbook } from '../src/utils/importBomFromExcel.js';
import {
  ZAN_EXCEL_COGS,
  ZAN_EXCEL_PRODUCTION_COST,
} from '../src/data/zanExcelSummary.js';
import { computeCogs, computePackingTotals } from '../src/services/bomCalculations.js';

const ZAN =
  process.env.ZAN_EXCEL ||
  'd:/Project Spartan Jepara/03. DOKUMEN/Modul Document/Manufacture Management/1. Excel Bill Of Material/1 - ZAN-100 - 2-12-25.xlsx';

if (!fs.existsSync(ZAN)) {
  console.warn('SKIP verifyImportedZanCogs — ZAN Excel not found:', ZAN);
  process.exit(0);
}

const wb = XLSX.read(fs.readFileSync(ZAN), { type: 'buffer' });
const project = parseBomWorkbook(wb);
const packing = computePackingTotals(project.packingSpec);
const cogs = computeCogs({
  bomData: project.bomData,
  cogsConfig: project.cogsConfig,
  packingTotals: packing,
  productMeta: project.productMeta,
});

const prodDiff = Math.abs(cogs.productionCost - ZAN_EXCEL_PRODUCTION_COST);
const cogsDiff = Math.abs(cogs.totalCogs - ZAN_EXCEL_COGS);

console.log('--- Imported ZAN full workbook (struktur) ---');
console.log('Material:', Math.round(cogs.parts.matAdjusted));
console.log('Process:', Math.round(cogs.parts.prosesTotal));
console.log('Coating in COGS:', Math.round(cogs.coatingCost));
console.log('Production:', Math.round(cogs.productionCost), 'vs excel', Math.round(ZAN_EXCEL_PRODUCTION_COST), 'diff', Math.round(prodDiff));
console.log('TOTAL COGS:', Math.round(cogs.totalCogs), 'vs excel', Math.round(ZAN_EXCEL_COGS), 'diff', Math.round(cogsDiff));
console.log('Excel mirror COGS ref:', Math.round(project.excelMirror?.summaryCost?.totalCogs || 0));
console.log('includeCoatingInCogs:', project.cogsConfig?.includeCoatingInCogs);

assert.ok(project.packingSpec?.materialsBox?.length > 0, 'packing materialsBox');
assert.ok(project.excelMirror?.pickList?.length > 0, 'pick list');
assert.ok(Object.keys(project.excelMirror?.calculationParts || {}).length >= 5, 'calculation parts');
assert.ok(project.excelMirror?.summaryCost?.totalCogs > 0, 'summary totalCogs mirror');
assert.ok(project.cogsConfig?.includeCoatingInCogs === false, 'import disables separate coating');

console.log(
  '\nNOTE: Import penuh belum parity COGS ketat — gunakan sample ZAN-100 seed untuk release (≤1,5%).',
);
console.log('Imported ZAN structure verification: passed');
