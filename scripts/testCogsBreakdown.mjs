/**
 * Regresi buildCogsInsight — pie ≈ production, deviasi curated PASS.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeCogs, computePackingTotals } from '../src/services/bomCalculations.js';
import { linkProjectToMasters } from '../src/utils/linkProjectToMasters.js';
import { CURATED_SAMPLE_KEYS } from '../src/utils/emptyProject.js';
import { buildCogsInsight } from '../src/utils/cogsBreakdown.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PROJECTS_DIR = path.join(ROOT, 'src/data/samples/projects');
const MANIFEST = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'src/data/samples/manifest.json'), 'utf8'),
);

function loadProject(file, sampleKey) {
  const raw = JSON.parse(fs.readFileSync(path.join(PROJECTS_DIR, file), 'utf8'));
  const opts = CURATED_SAMPLE_KEYS.has(sampleKey)
    ? { applyBiaya: false, skipBiayaIfExcel: true }
    : { applyBiaya: true, skipBiayaIfExcel: true };
  return linkProjectToMasters(raw, opts);
}

const CURATED = ['ZAN-100', 'FNA-550'];

console.log('--- testCogsBreakdown ---\n');

for (const key of CURATED) {
  const entry = MANIFEST.projects.find((p) => p.sampleKey === key);
  assert.ok(entry, `manifest entry ${key}`);
  const doc = loadProject(entry.file, entry.sampleKey);
  const packingTotals = computePackingTotals(doc.packingSpec);
  const cogsData = computeCogs({
    bomData: doc.bomData,
    cogsConfig: doc.cogsConfig,
    packingTotals,
    productMeta: doc.productMeta,
  });
  const insight = buildCogsInsight({
    bomData: doc.bomData,
    cogsConfig: doc.cogsConfig,
    packingTotals,
    productMeta: doc.productMeta,
    excelMirror: doc.excelMirror,
    importedFromExcel: doc.importedFromExcel,
    cogsData,
    sampleKey: entry.sampleKey,
  });

  const pieSum = insight.pieSlices.reduce((s, sl) => s + sl.amount, 0);
  assert.ok(
    Math.abs(pieSum - insight.production.total) <= 1,
    `${key}: pie sum ${pieSum} vs production ${insight.production.total}`,
  );

  assert.ok(insight.excelCompare.comparable, `${key}: excel compare must be comparable`);
  assert.equal(
    insight.excelCompare.production.status,
    'pass',
    `${key}: production deviation status`,
  );
  assert.equal(
    insight.excelCompare.totalCogs.status,
    'pass',
    `${key}: total COGS deviation status`,
  );

  console.log(`OK ${key} pie=${pieSum} prod=${insight.production.total} notes=${insight.notes.length}`);
}

console.log('\ntestCogsBreakdown: done');
