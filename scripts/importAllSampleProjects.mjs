/**
 * Import semua sample BOM Excel user → src/data/samples/
 * Master di-import dari ZAN-100 (canonical) via importZanMasters.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as XLSX from 'xlsx';
import { parseBomWorkbook } from '../src/utils/importBomFromExcel.js';
import {
  createProjectFromZanSeed,
  createProjectFromFionaSeed,
} from '../src/utils/emptyProject.js';
import { COGS_IMPORT_ROLLUP } from '../src/utils/cogsImportStrategy.js';
import { dedupeSummaryCostLines } from '../src/utils/excelWorkbookParsers.js';
import { optimizeImportedProject } from '../src/utils/sampleProjectOptimize.js';

function createDefaultPackingSpec() {
  return { materialsBox: [], materialsSF: [], routingBox: [], routingSF: [] };
}

function createDefaultPackingDimensions() {
  return [
    { id: 1, type: 'BOX KARTON', tolW: 40, tolD: 40, tolH: 50 },
    { id: 2, type: 'SINGLE FACE', tolW: 10, tolD: 10, tolH: 20, chairFactor: true },
  ];
}

function finalizeSampleProject(raw, key, file) {
  const now = new Date().toISOString();
  const id = stableId(key);
  const pi = raw.productInfo || {};
  const kode = pi.kode || key;
  const nama = pi.namaBom || pi.nama || key;
  return {
    schemaVersion: 1,
    id,
    sampleKey: key,
    sampleSeedVersion: SAMPLE_VERSION,
    sampleSourceFile: file,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    createdBy: 'Excel Import',
    kode,
    nama,
    customer: pi.customer || '',
    versi: pi.versi || '1.0',
    productInfo: { ...pi, kode, namaBom: pi.namaBom || nama },
    productMeta: raw.productMeta || {},
    dimensi: raw.dimensi || { w: 0, d: 0, h: 0 },
    bomData: raw.bomData,
    packingDimensions: raw.packingDimensions?.length ? raw.packingDimensions : createDefaultPackingDimensions(),
    packingSpec: raw.packingSpec || createDefaultPackingSpec(),
    containerCapacity: raw.containerCapacity?.length ? raw.containerCapacity : [],
    cogsConfig: raw.cogsConfig || { packingJalur: 'BOX', factoryOhPct: 5, managementOhPct: 2.5, markupPct: 20 },
    packingSpec: raw.packingSpec || createDefaultPackingSpec(),
    excelMirror: raw.excelMirror || null,
    importSheets: raw.importSheets || [],
    customErp: { parts: [], machines: [], workers: [] },
    kursUsd: 16004,
    kursEur: 17500,
    importedFromExcel: true,
  };
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
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

const OUT_DIR = path.join(ROOT, 'src/data/samples/projects');
const MANIFEST_PATH = path.join(ROOT, 'src/data/samples/manifest.json');
const SAMPLE_VERSION = 5;

function slug(s) {
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function countParts(node) {
  let n = node?.tipe === 'PART' ? 1 : 0;
  (node?.children || []).forEach((c) => {
    n += countParts(c);
  });
  return n;
}

function stableId(key) {
  return `sample-${slug(key)}`;
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const manifest = { version: SAMPLE_VERSION, importedAt: new Date().toISOString(), projects: [] };

  for (const { key, file } of SAMPLE_FILES) {
    const full = path.join(BASE, file);
    if (!fs.existsSync(full)) {
      console.warn('SKIP missing:', file);
      continue;
    }
    console.log('Importing', file, '…');
    const wb = XLSX.read(fs.readFileSync(full), { type: 'buffer' });
    let raw = parseBomWorkbook(wb);
    raw = optimizeImportedProject(raw);

    if (key === 'ZAN-100') {
      const seed = createProjectFromZanSeed();
      raw = optimizeImportedProject({
        ...seed,
        sampleKey: key,
        sampleSourceFile: file,
        excelMirror: raw.excelMirror,
        importSheets: raw.importSheets,
        importedFromExcel: true,
        productInfo: { ...raw.productInfo, ...seed.productInfo },
        productMeta: {
          ...seed.productMeta,
          surfaceM2Coating: 0,
        },
        dimensi: seed.dimensi?.w ? seed.dimensi : raw.dimensi,
        cogsConfig: {
          ...seed.cogsConfig,
          includeCoatingInCogs: false,
          cogsImportMode: COGS_IMPORT_ROLLUP,
          excelProductionCost: raw.excelMirror?.summaryCost?.productionCost || 0,
          excelTotalCogs: raw.excelMirror?.summaryCost?.totalCogs || 0,
        },
      });
    } else if (key === 'FNA-550') {
      const seed = createProjectFromFionaSeed();
      const mirror = raw.excelMirror;
      if (mirror?.summaryCost?.lines) {
        mirror.summaryCost.lines = dedupeSummaryCostLines(mirror.summaryCost.lines);
      }
      raw = optimizeImportedProject({
        ...seed,
        sampleKey: key,
        sampleSourceFile: file,
        excelMirror: mirror,
        importSheets: raw.importSheets,
        importedFromExcel: true,
        productInfo: { ...raw.productInfo, ...seed.productInfo },
        productMeta: { ...seed.productMeta },
        dimensi: seed.dimensi?.w ? seed.dimensi : raw.dimensi,
        cogsConfig: {
          ...seed.cogsConfig,
          includeCoatingInCogs: false,
          cogsImportMode: COGS_IMPORT_ROLLUP,
          excelProductionCost: raw.excelMirror?.summaryCost?.productionCost || 0,
          excelTotalCogs: raw.excelMirror?.summaryCost?.totalCogs || 0,
        },
      });
    }

    const doc = finalizeSampleProject(raw, key, file);
    const id = doc.id;

    const outFile = `${slug(key)}.json`;
    fs.writeFileSync(path.join(OUT_DIR, outFile), JSON.stringify(doc, null, 2));

    const parts = countParts(doc.bomData);
    manifest.projects.push({
      sampleKey: key,
      id,
      file: outFile,
      sourceExcel: file,
      kode: doc.kode,
      nama: doc.nama,
      customer: doc.customer,
      partCount: parts,
    });
    console.log(`  → ${doc.kode} | ${doc.nama} | ${parts} parts`);
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

  const imports = manifest.projects
    .map((p) => `import p_${slug(p.sampleKey).replace(/-/g, '_')} from './projects/${p.file}' with { type: 'json' };`)
    .join('\n');
  const arr = manifest.projects
    .map((p) => `p_${slug(p.sampleKey).replace(/-/g, '_')}`)
    .join(', ');
  const loader = `/** Auto-generated by scripts/importAllSampleProjects.mjs — jangan edit manual */
${imports}

export const SAMPLE_MANIFEST_VERSION = ${SAMPLE_VERSION};
export const SAMPLE_PROJECTS = [${arr}];
`;
  fs.writeFileSync(path.join(ROOT, 'src/data/samples/loadSamples.js'), loader);

  console.log('\nManifest →', MANIFEST_PATH);
  console.log('Loader → src/data/samples/loadSamples.js');
  console.log('Projects:', manifest.projects.length);
}

main();
