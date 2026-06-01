import assert from 'node:assert/strict';
import {
  ELBA_CHAIR_REFERENCE,
  ZAN_CONTAINER_NET_VOLUME_M3,
  ZAN_STOOL_REFERENCE,
} from '../src/data/excelReference.js';
import {
  calcPackingVolume,
  calcContainerNetCapacity,
  findPackingByType,
  CONTAINER_PRESETS,
} from '../src/utils/packingVolume.js';
import { computePartCostRow } from '../src/services/bomCalculations.js';

const packingDims = [
  { id: 1, type: 'BOX KARTON', tolW: 40, tolD: 40, tolH: 50 },
  { id: 2, type: 'SINGLE FACE', tolW: 10, tolD: 10, tolH: 20, chairFactor: true },
];

const box = findPackingByType(packingDims, 'box');
const volBox = calcPackingVolume(ELBA_CHAIR_REFERENCE.dimensi, box, {
  itemType: ELBA_CHAIR_REFERENCE.itemType,
});
assert.ok(Math.abs(volBox - ELBA_CHAIR_REFERENCE.volBoxRef) < 0.0001, 'volBox');

const sf = findPackingByType(packingDims, 'single');
const volSF = calcPackingVolume(ELBA_CHAIR_REFERENCE.dimensi, sf, {
  itemType: ELBA_CHAIR_REFERENCE.itemType,
});
assert.ok(Math.abs(volSF - ELBA_CHAIR_REFERENCE.volSFRef) < 0.0001, 'volSF');

const p20 = CONTAINER_PRESETS.find((p) => p.id === '20foot');
const p40 = CONTAINER_PRESETS.find((p) => p.id === '40foot');
const phc = CONTAINER_PRESETS.find((p) => p.id === '40hc');
assert.equal(calcContainerNetCapacity(p20, volBox, volSF).netCapBox, 26);
assert.equal(calcContainerNetCapacity(p40, volBox, volSF).netCapBox, 55);
assert.equal(calcContainerNetCapacity(phc, volBox, volSF).netCapBox, 65);

const part = {
  tipe: 'PART',
  biaya: 100000,
  qty: 2,
  sf: 10,
  wf: 5,
  proses: [
    {
      nama: 'Test Op',
      mfgProcess: 'Finishing',
      waktuOperasi: 30,
      totalPerson: 2,
      rateMesin: 1000,
      ratePekerja: 500,
    },
  ],
};
const row = computePartCostRow(part);
assert.equal(row.biayaProduksi, row.matAdjusted + row.prosesTotal);

const zanBox = findPackingByType(packingDims, 'box');
const zanVolBox = calcPackingVolume(ZAN_STOOL_REFERENCE.dimensi, zanBox, {
  itemType: ZAN_STOOL_REFERENCE.itemType,
});
assert.ok(Math.abs(zanVolBox - ZAN_STOOL_REFERENCE.volBoxRef) < 0.0001, 'zan volBox');
const zanP20 = { ...p20, containerNetM3: ZAN_CONTAINER_NET_VOLUME_M3['20foot'] };
const zanP40 = { ...p40, containerNetM3: ZAN_CONTAINER_NET_VOLUME_M3['40foot'] };
const zanPhc = { ...phc, containerNetM3: ZAN_CONTAINER_NET_VOLUME_M3['40hc'] };
assert.equal(
  calcContainerNetCapacity(zanP20, zanVolBox, 0).netCapBox,
  ZAN_STOOL_REFERENCE.containerPcsBox['20foot'],
);
assert.equal(
  calcContainerNetCapacity(zanP40, zanVolBox, 0).netCapBox,
  ZAN_STOOL_REFERENCE.containerPcsBox['40foot'],
);
assert.equal(
  calcContainerNetCapacity(zanPhc, zanVolBox, 0).netCapBox,
  ZAN_STOOL_REFERENCE.containerPcsBox['40hc'],
);

console.log('ELBA + ZAN regression tests: OK');
