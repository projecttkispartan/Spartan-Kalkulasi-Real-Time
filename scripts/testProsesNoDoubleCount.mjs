/**
 * Regresi: proses MODUL/SUBMODUL tidak double-count dengan PART hasil sync bahan.
 */
import assert from 'node:assert/strict';
import { syncPartsFromProsesMaterials } from '../src/utils/syncPartsFromProses.js';
import { flattenTree } from '../src/utils/treeHelpers.js';
import { collectProsesEntries } from '../src/services/bomCalculations.js';
import { computePartsTotals } from '../src/utils/bomCostRollup.js';
import { calcProsesCosts } from '../src/utils/operationCosts.js';

const expensiveOp = {
  id: 1,
  opKey: 1,
  nama: 'Finishing',
  mfgProcess: 'Finishing',
  posisiOperasi: 'F:A',
  waktuOperasi: 120,
  totalPerson: 2,
  biayaMesin: 50000,
  biayaPekerja: 80000,
  materialsUsed: [
    {
      id: 'm1',
      nama: 'Panel A',
      kode: 'PA',
      qty: 1,
      unit: 'pcs',
      manualSpec: 'Panel A',
      materialSourceMode: 'manual',
    },
    {
      id: 'm2',
      nama: 'Panel B',
      kode: 'PB',
      qty: 1,
      unit: 'pcs',
      manualSpec: 'Panel B',
      materialSourceMode: 'manual',
    },
  ],
};

const opCost = calcProsesCosts(expensiveOp).total;

const modul = {
  id: 'mod-1',
  tipe: 'MODUL',
  nama: 'MODUL',
  kode: 'M1',
  qty: 1,
  children: [],
  proses: [],
};

const bom = syncPartsFromProsesMaterials(structuredClone(modul), {
  routingNodeId: 'mod-1',
  routingNodeTipe: 'MODUL',
  prosesList: [expensiveOp],
});

// Simulate save routing on MODUL (proses lives on owner node)
bom.proses = [expensiveOp];
bom.proses_count = 1;

const flat = flattenTree(bom);
const entries = collectProsesEntries(flat);
const totals = computePartsTotals(bom);

assert.equal(entries.length, 1, 'one proses line from MODUL only');
assert.equal(
  Math.round(totals.prosesTotal),
  Math.round(opCost),
  'COGS process = single operation cost',
);

const syncedParts = flat.filter((n) => n.data.tipe === 'PART' && n.data.sourceProsesKey);
assert.equal(syncedParts.length, 2, 'two synced material parts');
syncedParts.forEach((p) => {
  assert.equal(p.data.proses?.length || 0, 0, 'synced part has no proses');
});

console.log('PASS: proses no double-count — MODUL owner only, synced PART material-only');
