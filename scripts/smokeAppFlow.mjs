/**
 * Smoke flow — ZAN sample COGS parity (tanpa browser).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeCogs, computePackingTotals } from '../src/services/bomCalculations.js';
import { linkProjectToMasters } from '../src/utils/linkProjectToMasters.js';
import { computePartCostRow } from '../src/utils/bomCostRollup.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const zanPath = path.join(__dirname, '../src/data/samples/projects/zan-100.json');

const raw = JSON.parse(fs.readFileSync(zanPath, 'utf8'));
const doc = linkProjectToMasters(raw, { applyBiaya: false, skipBiayaIfExcel: true });
const packing = computePackingTotals(doc.packingSpec);
const cogs = computeCogs({
  bomData: doc.bomData,
  cogsConfig: doc.cogsConfig,
  packingTotals: packing,
  productMeta: doc.productMeta,
});

const excel = doc.excelMirror?.summaryCost || {};
const diff = Math.abs(cogs.totalCogs - excel.totalCogs);
const pct = diff / excel.totalCogs;
assert.ok(pct <= 0.015, `ZAN smoke COGS ${pct * 100}% > 1.5%`);

function walkParts(node, fn) {
  if (node?.tipe === 'PART') fn(node);
  (node?.children || []).forEach((ch) => walkParts(ch, fn));
}
walkParts(doc.bomData, (p) => {
  const row = computePartCostRow(p);
  assert.ok(Number.isFinite(row.biayaProduksi), `part ${p.kode} biayaProduksi`);
});

console.log('OK smokeAppFlow — ZAN COGS', Math.round(cogs.totalCogs), 'diff', Math.round(diff));
