/**
 * Import master data dari ZAN-100 (canonical) + merge CALCULATION / HPP / supplier
 * dari semua sample Excel agar katalog kalkulasi maksimal.
 */
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import {
  readSheetRows,
  parseCalculationSheet,
  parseKalkulasiMaterialRows,
} from '../src/utils/excelWorkbookParsers.js';
import { buildMaterialCatalog } from '../src/utils/buildMaterialCatalog.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'src/data/masters');
const BASE =
  process.env.BOM_EXCEL_DIR ||
  'd:/Project Spartan Jepara/03. DOKUMEN/Modul Document/Manufacture Management/1. Excel Bill Of Material';

const SAMPLE_FILES = [
  { key: 'ZAN-100', file: '1 - ZAN-100 - 2-12-25.xlsx' },
  { key: 'MF081', file: "2 - MF081 - PURSER'S CHAIR BLACK & HONEY - HARD DAM -FINAL- 28-3-22.xlsx" },
  { key: 'DCTVBS', file: '2 - DCTVBS - TEMPLATE BARU - 20-8-21.xlsx' },
  { key: 'SVDT-120', file: '7 - SVDT.120-ST - SAVOY DINING TABLE 120 STAIN COLOR - 17-9-21.xlsx' },
  { key: 'MF056', file: '2 - MF056 - MADRAS DESK - 20-4-22.xlsx' },
  { key: 'ELB-555-98', file: '1 - ELB-555-98 - ELBA CHAIR NLH - 19-5-23.xlsx' },
  { key: 'L-LOU-NAT', file: '3 - L-LOU-NAT - L LOUNGER NATURAL - 17-7-25.xlsx' },
  { key: 'G632L-RO', file: '17 - G632L-RO - MARIO 3 S - 12-5-26.xlsx' },
  { key: 'FNA-550', file: '2 - FNA-550 - 4-12-25.xlsx' },
  { key: 'G557', file: '10 - G557 - ALABAMA 1 SEATER - 9-5-26.xlsx' },
  { key: 'POL-TAB-3', file: '1 - POL-TAB-3 - 17-3-26.xlsx' },
];

const IMPORT_VERSION = '5.0.0';

function writeJson(relPath, data) {
  const full = path.join(OUT, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, JSON.stringify(data, null, 2));
}

function readJson(relPath, fallback = null) {
  const full = path.join(OUT, relPath);
  if (!fs.existsSync(full)) return fallback;
  return JSON.parse(fs.readFileSync(full, 'utf8'));
}

function mergeByKode(existing, incoming, keyFn = (x) => x.kode) {
  const map = new Map();
  for (const row of existing || []) {
    const k = keyFn(row);
    if (k) map.set(k, row);
  }
  for (const row of incoming || []) {
    const k = keyFn(row);
    if (!k) continue;
    const prev = map.get(k);
    if (!prev || (row.biayaLine || row.totalPrice || 0) >= (prev.biayaLine || prev.totalPrice || 0)) {
      map.set(k, { ...prev, ...row });
    }
  }
  return [...map.values()];
}

function parseWorkbookExtras(filePath, sourceKey) {
  const buf = fs.readFileSync(filePath);
  const wb = XLSX.read(buf, { type: 'buffer' });
  const calcRows = readSheetRows(wb, 'CALCULATION');
  const { catalog } = parseCalculationSheet(calcRows);

  const calcTagged = catalog.map((c) => ({ ...c, sourceFile: sourceKey }));

  const hppRows = readSheetRows(wb, 'KALKULASI HPP MENTAH');
  const hppMentah = parseKalkulasiMaterialRows(hppRows, 'KALKULASI HPP MENTAH').map((r) => ({
    ...r,
    sourceFile: sourceKey,
  }));

  const supplierParts = [];
  for (const n of [1, 2, 3]) {
    const name = `KALKULASI SUPPLIER ${n}`;
    const rows = readSheetRows(wb, name);
    if (!rows.length) continue;
    const items = parseKalkulasiMaterialRows(rows, name);
    for (const item of items) {
      supplierParts.push({ ...item, supplierIndex: n, sourceFile: sourceKey });
    }
  }

  return { calcTagged, hppMentah, supplierParts };
}

async function main() {
  console.log('Step 1: Import canonical masters from ZAN-100…');
  execSync('node scripts/importZanMasters.mjs', { cwd: ROOT, stdio: 'inherit' });

  let calculationComponents = [];
  let hppMentahParts = [];
  let extraSupplierParts = [];
  const sourceFiles = [];

  console.log('\nStep 2: Merge CALCULATION / HPP / supplier from all sample workbooks…');
  for (const { key, file } of SAMPLE_FILES) {
    const filePath = path.join(BASE, file);
    if (!fs.existsSync(filePath)) {
      console.warn('  skip (not found):', file);
      continue;
    }
    const { calcTagged, hppMentah, supplierParts } = parseWorkbookExtras(filePath, key);
    calculationComponents = mergeByKode(calculationComponents, calcTagged);
    hppMentahParts = mergeByKode(hppMentahParts, hppMentah, (x) => `${x.sourceFile}::${x.no}::${x.description}`);
    extraSupplierParts = mergeByKode(
      extraSupplierParts,
      supplierParts,
      (x) => `${x.sourceFile}::${x.supplierIndex}::${x.no}::${x.description}`,
    );
    sourceFiles.push({ key, file, calcRows: calcTagged.length, hppRows: hppMentah.length });
    console.log(`  ${key}: calc=${calcTagged.length} hpp=${hppMentah.length} supplier=${supplierParts.length}`);
  }

  writeJson('catalog/calculationComponents.json', calculationComponents);
  writeJson('catalog/hppMentahParts.json', hppMentahParts);
  writeJson('catalog/supplierKalkulasiParts.json', extraSupplierParts);

  const wood = readJson('database/wood.json', []);
  const nonWood = readJson('database/nonWood.json', []);
  const coatings = readJson('coatings/systems.json', []);
  const formulaDataRows = readJson('tables/formulaDataRows.json', []);
  const zanSupplierParts = readJson('catalog/supplierParts.json', []);
  const existingSupplier = Array.isArray(zanSupplierParts) ? zanSupplierParts : [];

  const materialCatalog = buildMaterialCatalog({
    wood,
    coatings,
    formulaDataRows,
    nonWood,
    supplierParts: mergeByKode(existingSupplier, extraSupplierParts, (x) => x.partCode || `${x.source}::${x.no}`),
    calculationComponents,
    hppMentahParts,
  });

  writeJson('catalog/materialCatalog.json', materialCatalog);

  const meta = readJson('meta.json', {});
  meta.importScriptVersion = IMPORT_VERSION;
  meta.mergedAt = new Date().toISOString();
  meta.mergeSources = sourceFiles;
  meta.counts = {
    ...(meta.counts || {}),
    calculationComponents: calculationComponents.length,
    hppMentahParts: hppMentahParts.length,
    supplierKalkulasiParts: extraSupplierParts.length,
    materialCatalog: materialCatalog.length,
  };
  writeJson('meta.json', meta);

  const hw = calculationComponents.filter((c) => c.materialType === 'hardware');
  console.log('\nMerged master catalog:');
  console.log('  calculationComponents:', calculationComponents.length, `(hardware: ${hw.length})`);
  console.log('  hppMentahParts:', hppMentahParts.length);
  console.log('  supplierKalkulasiParts:', extraSupplierParts.length);
  console.log('  materialCatalog:', materialCatalog.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
