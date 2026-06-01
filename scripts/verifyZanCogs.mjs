import assert from 'node:assert/strict';
import { zanStoolGraph } from '../src/data/zanStoolGraph.js';
import {
  ZAN_EXCEL_COGS,
  ZAN_EXCEL_KAYU_TOTAL,
  ZAN_EXCEL_PRODUCTION_COST,
  ZAN_EXCEL_RAW_PRODUCTION,
} from '../src/data/zanExcelSummary.js';
import { computeCogs, computePartsTotals, computePackingTotals } from '../src/services/bomCalculations.js';
const cogsConfig = {
  packingJalur: 'BOX',
  factoryOhPct: 5,
  managementOhPct: 2.5,
  markupPct: 20,
};

const packingSpec = {
  materialsBox: [{ id: 1, nama: 'BOX', qty: 1, harga: 45726 }],
  materialsSF: [],
  routingBox: [{ id: 1, nama: 'Lab', waktu: 24, pekerja: 1, rate: 500 }],
  routingSF: [],
};

const packing = computePackingTotals(packingSpec);
const parts = computePartsTotals(zanStoolGraph);
const cogs = computeCogs({
  bomData: zanStoolGraph,
  cogsConfig,
  packingTotals: packing,
});

const tol = (actual, expected, label, pct = 0.02) => {
  const diff = Math.abs(actual - expected);
  const ok = diff <= Math.max(5000, expected * pct);
  console.log(
    `${ok ? 'OK' : 'FAIL'} ${label}: app=${Math.round(actual)} excel=${Math.round(expected)} diff=${Math.round(diff)}`,
  );
  assert.ok(ok, label);
};

console.log('--- ZAN COGS parity ---');
console.log('Material:', Math.round(parts.matAdjusted));
console.log('Process:', Math.round(parts.prosesTotal));
console.log('Packing:', Math.round(packing.packGrand));
console.log('Production:', Math.round(cogs.productionCost));
console.log('TOTAL COGS:', Math.round(cogs.totalCogs));
console.log('Selling +20%:', Math.round(cogs.sellingPrice));

tol(cogs.productionCost, ZAN_EXCEL_PRODUCTION_COST, 'PRODUCTION COST', 0.015);
tol(cogs.totalCogs, ZAN_EXCEL_COGS, 'TOTAL COGS', 0.015);

console.log(
  '\nReferensi Excel RAW PRODUCTION (hanya KAYU+LAMINATING+ASSEMBLING):',
  Math.round(ZAN_EXCEL_RAW_PRODUCTION),
);
console.log('BOM mat+proses (semua part):', Math.round(parts.matAdjusted + parts.prosesTotal));
console.log('Baris KAYU Excel (material+proses kayu):', Math.round(ZAN_EXCEL_KAYU_TOTAL));

console.log('\nZAN COGS verification: passed');
