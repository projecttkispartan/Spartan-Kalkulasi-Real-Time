/**
 * Verifikasi COGS semua sample vs excelMirror — gate regresi.
 * ZAN-100: toleransi ketat 1,5%. Sample import lain: toleransi 8% (parity bertahap).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeCogs, computePackingTotals } from '../src/services/bomCalculations.js';
import { linkProjectToMasters } from '../src/utils/linkProjectToMasters.js';
import {
  EXCEL_PARITY_TOLERANCE_IDR,
  EXCEL_PARITY_TOLERANCE_PCT,
} from '../src/data/excelParityChecklist.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PROJECTS_DIR = path.join(ROOT, 'src/data/samples/projects');
const MANIFEST = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'src/data/samples/manifest.json'), 'utf8'),
);

function withinTolerance(actual, expected, pctOverride) {
  if (!expected || expected <= 0) return { ok: false, skip: true, diff: 0, pct: 0 };
  const diff = Math.abs(actual - expected);
  const pct = diff / expected;
  const pctTol = pctOverride ?? EXCEL_PARITY_TOLERANCE_PCT;
  const ok = diff <= Math.max(EXCEL_PARITY_TOLERANCE_IDR, expected * pctTol);
  return { ok, skip: false, diff, pct };
}

function loadProject(file, sampleKey) {
  const raw = JSON.parse(fs.readFileSync(path.join(PROJECTS_DIR, file), 'utf8'));
  const opts =
    sampleKey === 'ZAN-100'
      ? { applyBiaya: false, skipBiayaIfExcel: true }
      : { applyBiaya: true, skipBiayaIfExcel: true };
  return linkProjectToMasters(raw, opts);
}

console.log('--- All sample COGS vs Excel mirror ---\n');

let passStrict = 0;
let passLoose = 0;
let skipped = 0;

for (const p of MANIFEST.projects) {
  const doc = loadProject(p.file, p.sampleKey);
  const packing = computePackingTotals(doc.packingSpec);
  const cogs = computeCogs({
    bomData: doc.bomData,
    cogsConfig: doc.cogsConfig,
    packingTotals: packing,
    productMeta: doc.productMeta,
  });
  const excel = doc.excelMirror?.summaryCost || {};
  const strictPct = p.sampleKey === 'ZAN-100' ? 0.015 : 0.08;
  const prodT = withinTolerance(cogs.productionCost, excel.productionCost, strictPct);
  const cogsT = withinTolerance(cogs.totalCogs, excel.totalCogs, strictPct);

  if (prodT.skip || cogsT.skip) {
    skipped += 1;
    console.log(`SKIP ${p.sampleKey}: excel mirror COGS/production tidak terbaca`);
    continue;
  }

  const prodOk = prodT.ok;
  const cogsOk = cogsT.ok;
  const ok = prodOk && cogsOk;

  console.log(
    `${ok ? 'OK' : 'FAIL'} ${p.sampleKey.padEnd(12)} prod ${(prodT.pct * 100).toFixed(2)}% cogs ${(cogsT.pct * 100).toFixed(2)}% | app COGS ${Math.round(cogs.totalCogs)} excel ${Math.round(excel.totalCogs)}`,
  );

  if (p.sampleKey === 'ZAN-100') {
    if (ok) passStrict += 1;
    assert.ok(ok, `ZAN-100 must be within ${strictPct * 100}%`);
  } else if (ok) {
    passLoose += 1;
  } else if (cogsT.pct <= 0.12 && prodT.pct <= 0.12) {
    console.log(`  (near pass ${p.sampleKey}: prod ${(prodT.pct * 100).toFixed(1)}% cogs ${(cogsT.pct * 100).toFixed(1)}%)`);
  }
}

console.log(`\nStrict pass (ZAN ≤1.5%): ${passStrict}/1`);
console.log(`Loose pass (≤8% prod+cogs): ${passLoose}/${MANIFEST.projects.length - skipped}`);
assert.ok(passStrict >= 1, 'ZAN-100 parity required');
console.log('\nAll sample COGS verification: done');
