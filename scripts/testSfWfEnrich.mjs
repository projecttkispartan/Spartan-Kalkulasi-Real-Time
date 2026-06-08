/**
 * SF/WF harus persist saat enrich jika sfWfManual === true (P0-5).
 */
import assert from 'assert';
import { seedMasterCacheForTests } from '../src/services/masterStorage.js';
import { linkProjectToMasters } from '../src/utils/linkProjectToMasters.js';
import { resolvePartSfWf } from '../src/utils/masterLookup.js';
import woodSeed from '../src/data/masters/database/wood.json' with { type: 'json' };
import ratiosSeed from '../src/data/masters/ratios/byCategory.json' with { type: 'json' };

seedMasterCacheForTests({ materials: woodSeed, wasteRatios: ratiosSeed });

const ratio = { sf: 10, wf: 5 };

assert.deepEqual(
  resolvePartSfWf({ sfWfManual: true, sf: 5, wf: 3, biayaFromExcel: true, biaya: 1000 }, ratio),
  { sf: 5, wf: 3 },
  'sfWfManual wins over biayaFromExcel',
);

assert.deepEqual(
  resolvePartSfWf({ biayaFromExcel: true, biaya: 1000 }, ratio),
  { sf: 0, wf: 0 },
  'biayaFromExcel defaults SF/WF to 0',
);

assert.deepEqual(
  resolvePartSfWf({ sf: 2, wf: 1 }, ratio),
  { sf: 2, wf: 1 },
  'explicit part values used when not manual/excel',
);

const bom = {
  id: 'root',
  tipe: 'MODUL',
  nama: 'TEST',
  children: [
    {
      id: 'p1',
      tipe: 'PART',
      nama: 'KAKI',
      materialType: 'kayu',
      biayaFromExcel: true,
      biaya: 50000,
      sfWfManual: true,
      sf: 5,
      wf: 2,
      vol: 0.001,
      qty: 1,
      p: 100,
      l: 100,
      t: 100,
    },
  ],
};

const project = {
  bomData: bom,
  productMeta: { wood: 'TEAK' },
  productInfo: { kode: 'T', nama: 'Test' },
};

const linked = linkProjectToMasters(project, { applyBiaya: false, skipBiayaIfExcel: true });
const part = linked.bomData.children[0];

assert.equal(part.sf, 5, 'walkBomEnrich keeps manual SF');
assert.equal(part.wf, 2, 'walkBomEnrich keeps manual WF');

console.log('\nOK testSfWfEnrich');
