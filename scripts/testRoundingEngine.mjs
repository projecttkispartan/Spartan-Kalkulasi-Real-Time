import assert from 'node:assert/strict';
import { applyRounding, applyRoundingForTarget } from '../src/utils/roundingEngine.js';
import { computeCogs, computePackingTotals } from '../src/services/bomCalculations.js';
import { zanStoolGraph } from '../src/data/zanStoolGraph.js';

assert.equal(applyRounding(2635729, 'selling_price_1000'), 2635000);
assert.equal(applyRoundingForTarget('sellingPrice', 2635729), 2635000);

const packing = computePackingTotals({
  materialsBox: [{ id: 1, nama: 'BOX', qty: 1, harga: 45726 }],
  materialsSF: [],
  routingBox: [{ id: 1, nama: 'Lab', waktu: 24, pekerja: 1, rate: 500 }],
  routingSF: [],
});

const cogs = computeCogs({
  bomData: zanStoolGraph,
  cogsConfig: { packingJalur: 'BOX', factoryOhPct: 5, managementOhPct: 2.5, markupPct: 20 },
  packingTotals: packing,
});

assert.equal(cogs.sellingPrice, Math.floor(cogs.sellingPriceRaw / 1000) * 1000);

console.log('Rounding engine tests: OK');
console.log('  sellingPrice:', Math.round(cogs.sellingPrice));
console.log('  sellingPriceRaw:', Math.round(cogs.sellingPriceRaw));
