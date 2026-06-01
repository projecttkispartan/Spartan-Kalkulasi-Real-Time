import assert from 'node:assert/strict';
import { computeCoatingCost, aggregateCoatingSurfaceM2 } from '../src/utils/masterLookup.js';
import { getCachedCoatings } from '../src/services/masterStorage.js';

const coat = getCachedCoatings().find((c) => c.id === 'coat-33');
assert.ok(coat, 'coat-33 exists');
assert.ok(coat.roundedCostM2 > 0, 'coat-33 roundedCostM2');

const cost = computeCoatingCost('coat-33', 1.40654);
assert.ok(cost > 100000, 'coating cost for ~1.4 m2');

const bom = {
  tipe: 'MODUL',
  children: [
    {
      tipe: 'PART',
      materialType: 'finishing',
      p: 420,
      l: 165,
      t: 50,
      qty: 1,
    },
  ],
};

const m2 = aggregateCoatingSurfaceM2(bom);
assert.ok(m2 > 0, 'aggregate surface m2');

console.log('Coating / master lookup tests: OK');
console.log('  coat-33 rate:', coat.roundedCostM2, 'cost 1.4m2:', cost, 'agg m2:', m2.toFixed(4));
