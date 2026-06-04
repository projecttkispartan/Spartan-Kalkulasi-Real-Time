/**
 * Patch sample JSON tanpa re-read Excel — terapkan optimasi COGS terbaru.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createProjectFromZanSeed,
  createProjectFromFionaSeed,
  CURATED_SAMPLE_KEYS,
} from '../src/utils/emptyProject.js';
import { COGS_IMPORT_ROLLUP } from '../src/utils/cogsImportStrategy.js';
import { dedupeSummaryCostLines } from '../src/utils/excelWorkbookParsers.js';
import { optimizeImportedProject } from '../src/utils/sampleProjectOptimize.js';
import { linkProjectToMasters } from '../src/utils/linkProjectToMasters.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PROJECTS_DIR = path.join(ROOT, 'src/data/samples/projects');
const MANIFEST = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'src/data/samples/manifest.json'), 'utf8'),
);

function walkParts(node, fn) {
  if (node?.tipe === 'PART') fn(node);
  (node?.children || []).forEach((ch) => walkParts(ch, fn));
}

for (const p of MANIFEST.projects) {
  const filePath = path.join(PROJECTS_DIR, p.file);
  let doc = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  if (p.sampleKey === 'ZAN-100') {
    const seed = createProjectFromZanSeed();
    doc = {
      ...doc,
      sampleSeedVersion: 5,
      bomData: seed.bomData,
      packingSpec: seed.packingSpec,
      packingDimensions: seed.packingDimensions,
      containerCapacity: seed.containerCapacity,
      productMeta: { ...seed.productMeta, surfaceM2Coating: 0 },
      productInfo: { ...doc.productInfo, ...seed.productInfo },
      dimensi: seed.dimensi,
      cogsConfig: {
        ...seed.cogsConfig,
        includeCoatingInCogs: false,
        cogsImportMode: COGS_IMPORT_ROLLUP,
        excelProductionCost: doc.excelMirror?.summaryCost?.productionCost || 0,
        excelTotalCogs: doc.excelMirror?.summaryCost?.totalCogs || 0,
      },
    };
  } else if (p.sampleKey === 'FNA-550') {
    const seed = createProjectFromFionaSeed();
    const mirror = doc.excelMirror;
    if (mirror?.summaryCost?.lines) {
      mirror.summaryCost.lines = dedupeSummaryCostLines(mirror.summaryCost.lines);
    }
    doc = {
      ...doc,
      sampleSeedVersion: 6,
      bomData: seed.bomData,
      packingSpec: seed.packingSpec,
      packingDimensions: seed.packingDimensions,
      containerCapacity: seed.containerCapacity,
      productMeta: { ...seed.productMeta },
      productInfo: { ...doc.productInfo, ...seed.productInfo },
      dimensi: seed.dimensi?.w ? seed.dimensi : doc.dimensi,
      excelMirror: mirror || doc.excelMirror,
      cogsConfig: {
        ...seed.cogsConfig,
        includeCoatingInCogs: false,
        cogsImportMode: COGS_IMPORT_ROLLUP,
        excelProductionCost: doc.excelMirror?.summaryCost?.productionCost || 0,
        excelTotalCogs: doc.excelMirror?.summaryCost?.totalCogs || 0,
      },
    };
  } else {
    doc.cogsConfig = {
      ...(doc.cogsConfig || {}),
      includeCoatingInCogs: false,
      excelProductionCost: doc.excelMirror?.summaryCost?.productionCost || doc.cogsConfig?.excelProductionCost || 0,
      excelTotalCogs: doc.excelMirror?.summaryCost?.totalCogs || doc.cogsConfig?.excelTotalCogs || 0,
    };
    if (doc.excelMirror?.summaryCost) {
      doc.excelMirror.summaryCost.productionCost = Math.max(
        doc.excelMirror.summaryCost.productionCost || 0,
        doc.cogsConfig.excelProductionCost || 0,
      );
      doc.excelMirror.summaryCost.totalCogs = Math.max(
        doc.excelMirror.summaryCost.totalCogs || 0,
        doc.cogsConfig.excelTotalCogs || 0,
      );
    }
  }

  doc = optimizeImportedProject(doc);
  const linkOpts = CURATED_SAMPLE_KEYS.has(p.sampleKey)
    ? { applyBiaya: false, skipBiayaIfExcel: true }
    : { applyBiaya: true, skipBiayaIfExcel: true };
  doc = linkProjectToMasters(doc, linkOpts);
  doc.sampleSeedVersion = 5;
  doc.updatedAt = new Date().toISOString();

  fs.writeFileSync(filePath, JSON.stringify(doc, null, 2));
  console.log('Patched', p.sampleKey);
}

console.log('Done —', MANIFEST.projects.length, 'projects');
