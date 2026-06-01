import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ELBA_CHAIR_REFERENCE } from '../src/data/excelReference.js';
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

describe('ELBA CHAIR regression', () => {
  it('volume box mendekati referensi Excel', () => {
    const box = findPackingByType(packingDims, 'box');
    const vol = calcPackingVolume(ELBA_CHAIR_REFERENCE.dimensi, box, {
      itemType: ELBA_CHAIR_REFERENCE.itemType,
    });
    assert.ok(Math.abs(vol - ELBA_CHAIR_REFERENCE.volBoxRef) < 0.0001);
  });

  it('volume SF mendekati referensi Excel', () => {
    const sf = findPackingByType(packingDims, 'single');
    const vol = calcPackingVolume(ELBA_CHAIR_REFERENCE.dimensi, sf, {
      itemType: ELBA_CHAIR_REFERENCE.itemType,
    });
    assert.ok(Math.abs(vol - ELBA_CHAIR_REFERENCE.volSFRef) < 0.0001);
  });

  it('kapasitas kontainer 20/40/40HC pcs', () => {
    const box = findPackingByType(packingDims, 'box');
    const volBox = calcPackingVolume(ELBA_CHAIR_REFERENCE.dimensi, box, {
      itemType: ELBA_CHAIR_REFERENCE.itemType,
    });
    const sf = findPackingByType(packingDims, 'single');
    const volSF = calcPackingVolume(ELBA_CHAIR_REFERENCE.dimensi, sf, {
      itemType: ELBA_CHAIR_REFERENCE.itemType,
    });

    const p20 = CONTAINER_PRESETS.find((p) => p.id === '20foot');
    const p40 = CONTAINER_PRESETS.find((p) => p.id === '40foot');
    const phc = CONTAINER_PRESETS.find((p) => p.id === '40hc');

    assert.equal(calcContainerNetCapacity(p20, volBox, volSF).netCapBox, 26);
    assert.equal(calcContainerNetCapacity(p40, volBox, volSF).netCapBox, 55);
    assert.equal(calcContainerNetCapacity(phc, volBox, volSF).netCapBox, 65);
  });

  it('sample PART: biayaProduksi = matAdjusted + proses', () => {
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
    assert.ok(row.matAdjusted > row.matBase);
    assert.equal(row.biayaProduksi, row.matAdjusted + row.prosesTotal);
  });
});
