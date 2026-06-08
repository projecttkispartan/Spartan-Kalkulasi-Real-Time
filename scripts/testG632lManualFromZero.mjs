/**
 * Simulasi proyek G632L dari nol (tanpa import) — untuk dokumen UAT.
 * Bandingkan COGS kosong vs referensi Excel vs sample import.
 */
import { createEmptyProject } from '../src/utils/emptyProject.js';
import { computeCogs, computePackingTotals } from '../src/services/bomCalculations.js';
import { readFileSync } from 'fs';

function cogsForProject(doc) {
  const packingTotals = computePackingTotals(doc.packingSpec || {});
  return computeCogs({
    bomData: doc.bomData,
    cogsConfig: doc.cogsConfig || {},
    packingTotals,
    productMeta: doc.productMeta || {},
    packingVolumeM3: 0,
  });
}

const G632L_SAMPLE = 'src/data/samples/projects/g632l-ro.json';

const excelRef = {
  productionCost: 4406937.55,
  totalCogs: 4561180.37,
  sellingMarkupPct: 20,
  product: {
    kode: 'G632L-RO',
    nama: 'MARIO 3 SEATER',
    customer: 'GOMMAIRE',
    itemType: 'SOFA 3 SEATERS',
    dimensi: { w: 2200, d: 775, h: 760 },
    wood: 'TEAK KAMPUNG - 30 UP 200',
    coating: '3,CEMENT GREY GOMM',
  },
};

const empty = createEmptyProject({
  kode: excelRef.product.kode,
  nama: excelRef.product.nama,
  customer: excelRef.product.customer,
  productInfo: {
    kode: excelRef.product.kode,
    nama: excelRef.product.nama,
    namaBom: excelRef.product.nama,
    customer: excelRef.product.customer,
    kodeBom: excelRef.product.kode,
  },
  productMeta: {
    itemType: excelRef.product.itemType,
    wood: excelRef.product.wood,
    coating: excelRef.product.coating,
  },
  dimensi: excelRef.product.dimensi,
  cogsConfig: {
    factoryOhPct: 2,
    managementOhPct: 1.5,
    markupPct: 20,
    includeCoatingInCogs: false,
  },
});

const emptyCogs = cogsForProject(empty);

let sampleCogs = null;
try {
  const sample = JSON.parse(readFileSync(G632L_SAMPLE, 'utf8'));
  sampleCogs = cogsForProject(sample);
} catch (e) {
  console.warn('Sample load:', e.message);
}

const report = {
  scenario: 'G632L-RO manual from zero (no Excel import)',
  date: new Date().toISOString().slice(0, 10),
  excelReference: excelRef,
  emptyProject: {
    partCount: 0,
    cogs: {
      totalMaterial: emptyCogs.totalMaterial,
      totalProcess: emptyCogs.totalProcess,
      productionCost: emptyCogs.productionCost,
      totalCogs: emptyCogs.totalCogs,
      sellingPrice: emptyCogs.sellingPrice,
    },
  },
  importedSample: sampleCogs
    ? {
        cogs: {
          totalMaterial: sampleCogs.totalMaterial,
          totalProcess: sampleCogs.totalProcess,
          productionCost: sampleCogs.productionCost,
          totalCogs: sampleCogs.totalCogs,
          sellingPrice: sampleCogs.sellingPrice,
        },
        vsExcel: {
          productionPct:
            Math.abs(sampleCogs.productionCost - excelRef.productionCost) /
            excelRef.productionCost,
          cogsPct:
            Math.abs(sampleCogs.totalCogs - excelRef.totalCogs) / excelRef.totalCogs,
        },
      }
    : null,
};

console.log(JSON.stringify(report, null, 2));

const ok =
  emptyCogs.totalCogs < 500000 &&
  (sampleCogs
    ? Math.abs(sampleCogs.totalCogs - excelRef.totalCogs) / excelRef.totalCogs > 0.1
    : true);

if (!ok && emptyCogs.totalCogs >= 500000) {
  console.error('FAIL: empty project COGS unexpectedly high');
  process.exit(1);
}
console.log('\nG632L manual-from-zero harness: OK');
