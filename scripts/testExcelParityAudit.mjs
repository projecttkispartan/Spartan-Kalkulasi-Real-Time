import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { zanStoolGraph } from '../src/data/zanStoolGraph.js';
import { ZAN_EXCEL_BOX_PACKING } from '../src/data/zanExcelSummary.js';
import { ZAN_STOOL_REFERENCE } from '../src/data/excelReference.js';
import { computeCogs, computePackingTotals } from '../src/services/bomCalculations.js';
import { auditExcelParity } from '../src/utils/excelParityAudit.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const zanJson = JSON.parse(
  readFileSync(join(__dirname, '../src/data/samples/projects/zan-100.json'), 'utf8'),
);

const packingSpec = {
  materialsBox: [{ id: 1, nama: 'BOX', qty: 1, harga: Math.round(ZAN_EXCEL_BOX_PACKING.material) }],
  materialsSF: [],
  routingBox: [
    {
      id: 1,
      nama: 'Lab',
      waktu: Math.round(ZAN_EXCEL_BOX_PACKING.labor / 500),
      pekerja: 1,
      rate: 500,
    },
  ],
  routingSF: [],
};

const cogsConfig = { packingJalur: 'BOX', factoryOhPct: 5, managementOhPct: 2.5, markupPct: 20 };
const packingTotals = computePackingTotals(packingSpec);
const cogsData = computeCogs({
  bomData: zanStoolGraph,
  cogsConfig,
  packingTotals,
  productMeta: {
    itemType: ZAN_STOOL_REFERENCE.itemType,
    woodGradeId: 'wood-11',
    coatingId: 'coat-33',
    coating: ZAN_STOOL_REFERENCE.coating,
  },
});

const auditSeed = auditExcelParity({
  bomData: zanStoolGraph,
  productMeta: {
    itemType: ZAN_STOOL_REFERENCE.itemType,
    woodGradeId: 'wood-11',
    coatingId: 'coat-33',
  },
  productInfo: { kode: 'ZAN-10', namaBom: 'ZANZIBAR STOOL' },
  dimensi: ZAN_STOOL_REFERENCE.dimensi,
  packingSpec,
  packingDimensions: [
    { id: 1, type: 'BOX KARTON', tolW: 40, tolD: 40, tolH: 50 },
    { id: 2, type: 'SINGLE FACE', tolW: 10, tolD: 10, tolH: 20 },
  ],
  cogsConfig,
  cogsData,
  excelMirror: zanJson.excelMirror,
  mastersReady: true,
  kursUsd: 16000,
  kursEur: 17800,
});

console.log('--- Excel parity audit (ZAN seed) ---');
console.log('Score:', auditSeed.summary.score, '%');
console.log('Pass/Fail/Warn:', auditSeed.summary.pass, auditSeed.summary.fail, auditSeed.summary.warn);
assert.ok(auditSeed.summary.score >= 70, 'ZAN seed score should be >= 70%');
assert.ok(
  auditSeed.items.find((i) => i.id === 'mat-sf-wf-zero')?.status === 'pass',
  'ZAN seed should have no double SF/WF',
);

const emptyAudit = auditExcelParity({
  bomData: { tipe: 'MODUL', children: [] },
  productMeta: {},
  dimensi: {},
  packingSpec: {},
  cogsConfig,
  cogsData: { productionCost: 0, totalCogs: 0, totalProcess: 0, coatingCost: 0 },
  mastersReady: true,
});

assert.ok(emptyAudit.summary.fail > 3, 'Empty project should have multiple failures');
console.log('OK empty project has blockers:', emptyAudit.blockers.length);
console.log('OK excelParityAudit tests');
