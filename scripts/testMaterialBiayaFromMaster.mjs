/**
 * Unit tests — computeMaterialBiayaFromMaster / applyMasterToPart
 */
import assert from 'assert';
import { seedMasterCacheForTests } from '../src/services/masterStorage.js';
import {
  computeMaterialBiayaFromMaster,
  computeWoodBiayaFromMaster,
  applyMasterToPart,
  listMaterialsByType,
} from '../src/utils/masterLookup.js';

import plywoodSeed from '../src/data/masters/database/plywood.json' with { type: 'json' };
import hplSeed from '../src/data/masters/database/hpl.json' with { type: 'json' };
import woodSeed from '../src/data/masters/database/wood.json' with { type: 'json' };
import ratiosSeed from '../src/data/masters/ratios/byCategory.json' with { type: 'json' };

seedMasterCacheForTests({
  materials: woodSeed,
  databaseSections: {
    plywood: plywoodSeed,
    mdf: [],
    core: [],
    hpl: hplSeed,
    veneer: [],
    edging: [],
  },
  wasteRatios: ratiosSeed,
});

const woodPart = { vol: 0.01, p: 100, l: 100, t: 100 };
const plyPart = { vol: 0.002, p: 500, l: 300, t: 15, qty: 1 };
const hplPart = { p: 1000, l: 500, t: 1, qty: 1, surfaceM2: 2 };

const ply = plywoodSeed.find((m) => (m.hargaMaterialSupplier || 0) > 0);
const hpl = hplSeed.find((m) => (m.hargaMaterialSupplier || 0) > 0);
const wood = woodSeed.find((m) => (m.hargaMaterialSupplier || 0) > 0);

assert.ok(ply, 'P0 plywood seed has priced row');
assert.ok(hpl, 'P0 hpl seed has priced row');
assert.ok(wood, 'wood seed has priced row');

const plyResult = computeMaterialBiayaFromMaster(plyPart, ply.id, 'plywood');
assert.ok(plyResult?.biaya > 0, 'plywood biaya > 0');
console.log('plywood biaya:', plyResult.biaya);

const hplResult = computeMaterialBiayaFromMaster(
  { ...hplPart, surfaceM2: 1 },
  hpl.id,
  'komponen',
);
assert.ok(hplResult?.biaya > 0, 'hpl m2 biaya > 0');
console.log('hpl biaya (1 m2):', hplResult.biaya);

const woodResult = computeWoodBiayaFromMaster(woodPart, wood.id);
assert.ok(woodResult?.biaya > 0, 'wood biaya > 0');
console.log('wood biaya:', woodResult.biaya);

const applied = applyMasterToPart(
  { tipe: 'PART', materialType: 'plywood', vol: plyPart.vol, qty: 1 },
  ply.id,
);
assert.equal(applied.wasteIncludedInBiaya, true);
assert.equal(applied.sf, plyResult.sf);
assert.equal(applied.wf, plyResult.wf);
assert.ok(applied.biaya > 0);

const plyList = listMaterialsByType('plywood', 'PLYWOOD');
assert.ok(plyList.length > 0, 'listMaterialsByType plywood');

console.log('\nOK testMaterialBiayaFromMaster');
