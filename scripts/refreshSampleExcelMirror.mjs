/**
 * Perbaiki excelMirror.productionCost / totalCogs di sample JSON (parser max).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';
import { readSheetRows, parseSummaryCostSheet } from '../src/utils/excelWorkbookParsers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const BASE =
  process.env.BOM_EXCEL_DIR ||
  'd:/Project Spartan Jepara/03. DOKUMEN/Modul Document/Manufacture Management/1. Excel Bill Of Material';
const MANIFEST = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'src/data/samples/manifest.json'), 'utf8'),
);

const fileByKey = Object.fromEntries(
  [
    ['ZAN-100', '1 - ZAN-100 - 2-12-25.xlsx'],
    ['MF081', "2 - MF081 - PURSER'S CHAIR BLACK & HONEY - HARD DAM -FINAL- 28-3-22.xlsx"],
    ['DCTVBS', '2 - DCTVBS - TEMPLATE BARU - 20-8-21.xlsx'],
    ['SVDT-120', '7 - SVDT.120-ST - SAVOY DINING TABLE 120 STAIN COLOR - 17-9-21.xlsx'],
    ['MF056', '2 - MF056 - MADRAS DESK - 20-4-22.xlsx'],
    ['ELB-555-98', '1 - ELB-555-98 - ELBA CHAIR NLH - 19-5-23.xlsx'],
    ['L-LOU-NAT', '3 - L-LOU-NAT - L LOUNGER NATURAL - 17-7-25.xlsx'],
    ['G632L-RO', '17 - G632L-RO - MARIO 3 S - 12-5-26.xlsx'],
    ['FNA-550', '2 - FNA-550 - 4-12-25.xlsx'],
    ['G557', '10 - G557 - ALABAMA 1 SEATER - 9-5-26.xlsx'],
    ['POL-TAB-3', '1 - POL-TAB-3 - 17-3-26.xlsx'],
  ].map(([k, f]) => [k, f]),
);

for (const p of MANIFEST.projects) {
  const excelFile = fileByKey[p.sampleKey];
  if (!excelFile) continue;
  const full = path.join(BASE, excelFile);
  if (!fs.existsSync(full)) continue;

  const wb = XLSX.read(fs.readFileSync(full), { type: 'buffer' });
  const summary = parseSummaryCostSheet(readSheetRows(wb, 'SUMMARY COST'));
  const jsonPath = path.join(ROOT, 'src/data/samples/projects', p.file);
  const doc = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  if (!doc.excelMirror) doc.excelMirror = {};
  doc.excelMirror.summaryCost = {
    ...(doc.excelMirror.summaryCost || {}),
    productionCost: summary.productionCost,
    totalCogs: summary.totalCogs,
    factoryOhPct: summary.factoryOhPct,
    managementOhPct: summary.managementOhPct,
    packingBox: summary.packingBox,
    packingSf: summary.packingSf,
  };
  doc.cogsConfig = {
    ...(doc.cogsConfig || {}),
    excelProductionCost: summary.productionCost,
    excelTotalCogs: summary.totalCogs,
    factoryOhPct: summary.factoryOhPct ?? doc.cogsConfig?.factoryOhPct,
    managementOhPct: summary.managementOhPct ?? doc.cogsConfig?.managementOhPct,
  };
  fs.writeFileSync(jsonPath, JSON.stringify(doc, null, 2));
  console.log(
    p.sampleKey,
    'prod',
    Math.round(summary.productionCost),
    'cogs',
    Math.round(summary.totalCogs),
  );
}

console.log('Mirror totals refreshed');
