/**
 * Diagnosa COGS per sample — kontribusi EXCEL-SUMMARY vs part template.
 * Hanya laporan; tidak mengubah logic COGS production.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { linkProjectToMasters } from '../src/utils/linkProjectToMasters.js';
import { CURATED_SAMPLE_KEYS, resolveCogsMode, COGS_MODES } from '../src/utils/emptyProject.js';
import {
  buildDiagnoseReportRow,
  COGS_PART_GROUPS,
} from '../src/utils/cogsBreakdown.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PROJECTS_DIR = path.join(ROOT, 'src/data/samples/projects');
const MANIFEST_PATH = path.join(ROOT, 'src/data/samples/manifest.json');
const REPORT_PATH = path.join(ROOT, 'src/data/samples/cogs-breakdown-report.json');

function parseArgs(argv) {
  let sampleFilter = null;
  let jsonOnly = false;
  for (const arg of argv.slice(2)) {
    if (arg.startsWith('--sample=')) sampleFilter = arg.slice('--sample='.length).trim();
    else if (arg === '--json-only') jsonOnly = true;
  }
  return { sampleFilter, jsonOnly };
}

function loadProject(file, sampleKey) {
  const raw = JSON.parse(fs.readFileSync(path.join(PROJECTS_DIR, file), 'utf8'));
  const cogsMode = resolveCogsMode(raw);
  const excelFixed = cogsMode === COGS_MODES.EXCEL_FIXED || raw.importedFromExcel;
  const opts =
    CURATED_SAMPLE_KEYS.has(sampleKey) || excelFixed
      ? { applyBiaya: false, skipBiayaIfExcel: true }
      : { applyBiaya: true, skipBiayaIfExcel: true };
  return linkProjectToMasters(raw, opts);
}

function fmt(n) {
  return Math.round(Number(n) || 0).toLocaleString('id-ID');
}

function pctLabel(actual, expected) {
  if (!expected || expected <= 0) return 'n/a';
  const pct = ((actual - expected) / expected) * 100;
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

function printSampleReport(r) {
  console.log(`\n=== ${r.sampleKey} ===`);
  console.log(
    'Kelompok'.padEnd(22),
    'Material'.padStart(14),
    'Process'.padStart(14),
    'Part total'.padStart(14),
    'Parts'.padStart(8),
  );
  for (const g of COGS_PART_GROUPS) {
    const row = r.groups[g];
    console.log(
      g.padEnd(22),
      fmt(row.material).padStart(14),
      fmt(row.process).padStart(14),
      fmt(row.partTotal).padStart(14),
      String(row.partCount).padStart(8),
    );
  }
  console.log(
    'Packing (' + r.packing.jalur + ')'.padEnd(22),
    ''.padStart(14),
    ''.padStart(14),
    fmt(r.packing.total).padStart(14),
  );
  if (r.coating.inCogs > 0) {
    console.log(
      'Coating (in COGS)'.padEnd(22),
      fmt(r.coating.inCogs).padStart(14),
      ''.padStart(14),
      ''.padStart(14),
    );
  }
  console.log(
    `Production app`.padEnd(22) +
      fmt(r.app.productionCost).padStart(14) +
      `  |  Excel  ${fmt(r.excel.productionCost)}  (${pctLabel(r.app.productionCost, r.excel.productionCost)})`,
  );
  console.log(
    `COGS app`.padEnd(22) +
      fmt(r.app.totalCogs).padStart(14) +
      `  |  Excel  ${fmt(r.excel.totalCogs)}  (${pctLabel(r.app.totalCogs, r.excel.totalCogs)})`,
  );
  console.log(
    `EXCEL-* parts: ${r.counts.excelSummaryParts}  |  biayaFromExcel parts: ${r.counts.templateExcelParts}  |  total PART: ${r.counts.totalParts}`,
  );
  console.log(
    `Engine material ${fmt(r.app.totalMaterial)} vs rollup ${fmt(r.partsRollup.material)}  |  process ${fmt(r.app.totalProcess)} vs ${fmt(r.partsRollup.process)}`,
  );
  if (r.insight?.notes?.length) {
    console.log('Catatan:', r.insight.notes.join(' '));
  }
}

function main() {
  const { sampleFilter, jsonOnly } = parseArgs(process.argv);
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  let projects = manifest.projects;
  if (sampleFilter) {
    projects = projects.filter(
      (p) =>
        p.sampleKey.toUpperCase() === sampleFilter.toUpperCase() ||
        p.file.toLowerCase().includes(sampleFilter.toLowerCase()),
    );
    if (!projects.length) {
      console.error('Sample tidak ditemukan:', sampleFilter);
      process.exit(1);
    }
  }

  if (!jsonOnly) {
    console.log('COGS breakdown diagnosa — EXCEL-SUMMARY vs template parts\n');
  }

  const rows = [];
  for (const entry of projects) {
    const doc = loadProject(entry.file, entry.sampleKey);
    const report = buildDiagnoseReportRow(entry, doc);
    rows.push(report);
    if (!jsonOnly) printSampleReport(report);
  }

  const out = {
    generatedAt: new Date().toISOString(),
    sampleFilter: sampleFilter || null,
    rows,
  };
  fs.writeFileSync(REPORT_PATH, JSON.stringify(out, null, 2));

  if (!jsonOnly) {
    console.log('\n' + '-'.repeat(72));
    console.log('Laporan JSON →', REPORT_PATH);
    console.log(`Samples: ${rows.length}`);
  } else {
    console.log(REPORT_PATH);
  }
}

main();
