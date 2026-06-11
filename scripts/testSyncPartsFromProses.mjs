/**
 * Regresi: bahan operasi (materialsUsed) → PART di pohon BOM sesuai hierarki.
 */
import {
  syncPartsFromProsesMaterials,
  buildPartSourceKey,
} from '../src/utils/syncPartsFromProses.js';
import { flattenTree } from '../src/utils/treeHelpers.js';

function countParts(tree) {
  return flattenTree(tree).filter((n) => n.data.tipe === 'PART').length;
}

function findPartByKey(tree, key) {
  return flattenTree(tree).find((n) => n.data.sourceProsesKey === key);
}

const baseModul = {
  id: 'modul-1',
  tipe: 'MODUL',
  nama: 'MODUL UTAMA',
  kode: 'M1',
  qty: 1,
  children: [],
  proses: [],
};

const sampleOp = (posisiOperasi, materialsUsed) => ({
  nama: 'Operasi Test',
  proses: 'veneer',
  mfgProcess: 'Woodworking',
  posisiOperasi,
  waktuOperasi: 10,
  totalPerson: 2,
  materialsUsed,
});

// MODUL + bahan → PART di bawah SUBMODUL dari posisi Finishing
const mat1 = { id: 'mat-a', nama: 'Panel Kayu', kode: 'PK-01', qty: 2, unit: 'pcs', manualSpec: 'Panel Kayu', materialSourceMode: 'manual' };
let bom = syncPartsFromProsesMaterials(structuredClone(baseModul), {
  routingNodeId: 'modul-1',
  routingNodeTipe: 'MODUL',
  prosesList: [sampleOp('F:A', [mat1])],
});

const key1 = buildPartSourceKey('modul-1', 0, 'mat-a');
const part1 = findPartByKey(bom, key1);
if (!part1) {
  console.error('FAIL: PART not created under MODUL routing');
  process.exit(1);
}
const submodul = bom.children?.find((c) => c.tipe === 'SUBMODUL');
if (!submodul) {
  console.error('FAIL: SUBMODUL not created for posisi Finishing');
  process.exit(1);
}
if (part1.data.nama !== 'Panel Kayu') {
  console.error('FAIL: PART nama mismatch', part1.data.nama);
  process.exit(1);
}

// Re-save tidak duplikat
const bom2 = syncPartsFromProsesMaterials(structuredClone(bom), {
  routingNodeId: 'modul-1',
  routingNodeTipe: 'MODUL',
  prosesList: [sampleOp('F:A', [mat1])],
});
if (countParts(bom2) !== 1) {
  console.error('FAIL: duplicate PART on re-save', countParts(bom2));
  process.exit(1);
}

// SUBMODUL + 2 bahan → 2 PART
const submodulRoot = {
  id: 'sub-1',
  tipe: 'SUBMODUL',
  nama: 'BODI',
  kode: 'BODI',
  qty: 1,
  children: [],
  proses: [],
};
const matB = { id: 'b1', nama: 'Part B1', kode: 'B1', qty: 1, unit: 'pcs', manualSpec: 'B1', materialSourceMode: 'manual' };
const matC = { id: 'c1', nama: 'Part C1', kode: 'C1', qty: 1, unit: 'pcs', manualSpec: 'C1', materialSourceMode: 'manual' };
const bomSub = syncPartsFromProsesMaterials(structuredClone(submodulRoot), {
  routingNodeId: 'sub-1',
  routingNodeTipe: 'SUBMODUL',
  prosesList: [sampleOp('F:B', [matB, matC])],
});
if (countParts(bomSub) !== 2) {
  console.error('FAIL: expected 2 PART under SUBMODUL', countParts(bomSub));
  process.exit(1);
}
if (bomSub.children?.[0]?.tipe !== 'PART' || bomSub.children?.[1]?.tipe !== 'PART') {
  console.error('FAIL: PART not direct children of SUBMODUL');
  process.exit(1);
}

// PART-level routing → skip spawn
const partRoot = {
  id: 'part-1',
  tipe: 'PART',
  nama: 'Existing Part',
  kode: 'P1',
  qty: 1,
  children: [],
  proses: [],
};
const bomPart = syncPartsFromProsesMaterials(structuredClone(partRoot), {
  routingNodeId: 'part-1',
  routingNodeTipe: 'PART',
  prosesList: [sampleOp('F:A', [mat1])],
});
if (countParts(bomPart) !== 1) {
  console.error('FAIL: PART routing should not spawn new PART nodes');
  process.exit(1);
}

console.log('PASS: syncPartsFromProses — materialsUsed → PART hierarki');
