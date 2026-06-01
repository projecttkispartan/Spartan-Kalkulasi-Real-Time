import assert from 'node:assert/strict';
import { evalFormula, getFormulaMeta, listFormulaIds } from '../src/utils/formulaEngine.js';
import { ELBA_CHAIR_REFERENCE, ZAN_STOOL_REFERENCE } from '../src/data/excelReference.js';
import { calcPackingVolume, findPackingByType, calcContainerNetCapacity, CONTAINER_PRESETS } from '../src/utils/packingVolume.js';

const packingDims = [
  { id: 1, type: 'BOX KARTON', tolW: 40, tolD: 40, tolH: 50 },
  { id: 2, type: 'SINGLE FACE', tolW: 10, tolD: 10, tolH: 20, chairFactor: true },
];

assert.ok(listFormulaIds().length >= 10, 'formula registry >= 10');

const volPart = evalFormula('vol_part_mm', { p: 340, l: 340, t: 505 });
assert.ok(Math.abs(volPart - 0.058372) < 0.0001, 'vol_part_mm');

const box = findPackingByType(packingDims, 'box');
const volBoxElba = calcPackingVolume(ELBA_CHAIR_REFERENCE.dimensi, box, { itemType: 'CHAIR' });
assert.ok(Math.abs(volBoxElba - ELBA_CHAIR_REFERENCE.volBoxRef) < 0.0001, 'vol box ELBA');

const volBoxZan = calcPackingVolume(ZAN_STOOL_REFERENCE.dimensi, { type: 'BOX', tolW: 40, tolD: 40, tolH: 50 });
assert.ok(Math.abs(volBoxZan - ZAN_STOOL_REFERENCE.volBoxRef) < 0.001, 'vol box ZAN');

const p20 = CONTAINER_PRESETS.find((p) => p.id === '20foot');
assert.equal(calcContainerNetCapacity(p20, volBoxElba, 0).netCapBox, 26);

const woodCost = evalFormula('wood_material_cost', { pricePerM3: 2640000, vol: 0.01, sf: 0, wf: 30 });
assert.ok(woodCost > 34000 && woodCost < 35000, 'wood_material_cost');

assert.ok(getFormulaMeta('vol_part_mm')?.excelRef, 'formula meta excelRef');

console.log('Formula engine tests: OK');
