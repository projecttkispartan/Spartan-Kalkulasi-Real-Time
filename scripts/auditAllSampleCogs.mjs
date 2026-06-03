/**
 * Audit COGS semua sample Excel vs excelMirror.summaryCost
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeCogs, computePackingTotals } from '../src/services/bomCalculations.js';
import { linkProjectToMasters } from '../src/utils/linkProjectToMasters.js';
import { auditExcelParity } from '../src/utils/excelParityAudit.js';
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

function withinTolerance(actual, expected) {
  if (!expected || expected <= 0) return { ok: false, diff: 0, pct: 0 };
  const diff = Math.abs(actual - expected);
  const pct = diff / expected;
  const ok = diff <= Math.max(EXCEL_PARITY_TOLERANCE_IDR, expected * EXCEL_PARITY_TOLERANCE_PCT);
  return { ok, diff, pct };
}

function loadProject(file, sampleKey) {
  const raw = JSON.parse(fs.readFileSync(path.join(PROJECTS_DIR, file), 'utf8'));
  const opts =
    sampleKey === 'ZAN-100'
      ? { applyBiaya: false, skipBiayaIfExcel: true }
      : { applyBiaya: true, skipBiayaIfExcel: true };
  return linkProjectToMasters(raw, opts);
}

function main() {
  const rows = [];
  console.log('Sample COGS audit vs Excel mirror\n');
  console.log(
    'Key'.padEnd(14),
    'Production%'.padStart(12),
    'COGS%'.padStart(10),
    'Coating'.padStart(12),
    'Score'.padStart(6),
    'Status',
  );
  console.log('-'.repeat(72));

  let passCount = 0;
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
    const prodT = withinTolerance(cogs.productionCost, excel.productionCost);
    const cogsT = withinTolerance(cogs.totalCogs, excel.totalCogs);
    const audit = auditExcelParity({
      bomData: doc.bomData,
      productMeta: doc.productMeta,
      productInfo: doc.productInfo,
      dimensi: doc.dimensi,
      packingSpec: doc.packingSpec,
      packingDimensions: doc.packingDimensions,
      cogsConfig: doc.cogsConfig,
      cogsData: cogs,
      excelMirror: doc.excelMirror,
      importedFromExcel: true,
      mastersReady: true,
    });

    const status =
      prodT.ok && cogsT.ok ? 'PASS' : prodT.pct < 0.08 && cogsT.pct < 0.08 ? 'WARN' : 'FAIL';
    if (status === 'PASS') passCount += 1;

    console.log(
      p.sampleKey.padEnd(14),
      `${(prodT.pct * 100).toFixed(1)}%`.padStart(12),
      `${(cogsT.pct * 100).toFixed(1)}%`.padStart(10),
      String(Math.round(cogs.coatingCost)).padStart(12),
      `${audit.summary.score}%`.padStart(6),
      status,
    );

    rows.push({
      sampleKey: p.sampleKey,
      file: p.file,
      appProduction: Math.round(cogs.productionCost),
      excelProduction: Math.round(excel.productionCost || 0),
      appCogs: Math.round(cogs.totalCogs),
      excelCogs: Math.round(excel.totalCogs || 0),
      coating: Math.round(cogs.coatingCost),
      material: Math.round(cogs.totalMaterial),
      process: Math.round(cogs.totalProcess),
      packing: Math.round(cogs.packingCost),
      prodPct: prodT.pct,
      cogsPct: cogsT.pct,
      auditScore: audit.summary.score,
      status,
      blockers: audit.blockers,
    });
  }

  console.log('-'.repeat(72));
  console.log(`PASS (≤${EXCEL_PARITY_TOLERANCE_PCT * 100}%): ${passCount}/${MANIFEST.projects.length}`);

  const outPath = path.join(ROOT, 'src/data/samples/cogs-audit-report.json');
  fs.writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 2));
  console.log('\nReport →', outPath);

  const fails = rows.filter((r) => r.status === 'FAIL');
  if (fails.length) {
    console.log('\nWorst deviations:');
    fails
      .sort((a, b) => b.cogsPct - a.cogsPct)
      .slice(0, 5)
      .forEach((r) => {
        console.log(
          `  ${r.sampleKey}: COGS diff ${(r.cogsPct * 100).toFixed(1)}% (app ${r.appCogs} vs excel ${r.excelCogs}) coating=${r.coating}`,
        );
      });
  }
}

main();
