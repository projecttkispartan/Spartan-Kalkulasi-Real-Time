/**
 * Verifikasi COGS project hasil import penuh vs Excel SUMMARY COST (ZAN-100)
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

const wb = XLSX.read(fs.readFileSync(ZAN), { type: 'buffer' });
const project = parseBomWorkbook(wb);
const packing = computePackingTotals(project.packingSpec);
const cogs = computeCogs({
  bomData: project.bomData,
  cogsConfig: project.cogsConfig,
  packingTotals: packing,
  productMeta: project.productMeta,
});

const tol = (actual, expected, label, pct = 0.05) => {
  const diff = Math.abs(actual - expected);
  const ok = diff <= Math.max(50000, expected * pct);
  console.log(
    `${ok ? 'OK' : 'FAIL'} ${label}: app=${Math.round(actual)} excel=${Math.round(expected)} diff=${Math.round(diff)}`,
  );
  assert.ok(ok, label);
};

console.log('--- Imported ZAN full workbook ---');
console.log('Material:', Math.round(cogs.parts.matAdjusted));
console.log('Process:', Math.round(cogs.parts.prosesTotal));
console.log('Coating:', Math.round(cogs.coatingCost));
console.log('Packing:', Math.round(cogs.packingCost));
console.log('Production:', Math.round(cogs.productionCost));
console.log('TOTAL COGS:', Math.round(cogs.totalCogs));
console.log('Excel mirror COGS ref:', Math.round(project.excelMirror?.summaryCost?.totalCogs || 0));

tol(cogs.productionCost, ZAN_EXCEL_PRODUCTION_COST, 'PRODUCTION COST', 0.08);
tol(cogs.totalCogs, ZAN_EXCEL_COGS, 'TOTAL COGS', 0.08);

assert.ok(project.packingSpec?.materialsBox?.length > 0, 'packing materialsBox');
assert.ok(project.excelMirror?.pickList?.length > 0, 'pick list');
assert.ok(Object.keys(project.excelMirror?.calculationParts || {}).length >= 5, 'calculation parts');

console.log('\nImported ZAN verification: passed');
