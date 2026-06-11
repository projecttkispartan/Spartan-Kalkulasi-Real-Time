/**
 * Regression: hierarki import BOM — root kode produk, modul Excel, part terpisah.
 */
import {
  buildTreeFromFlatRows,
  parseBomTemplateRows,
} from '../src/utils/importBomFromExcel.js';
import {
  BOM_TEMPLATE_ALL_ROWS,
  BOM_TEMPLATE_PART_ROWS,
} from '../tests/fixtures/bom-template-hierarchy-min.js';

function flattenParts(node, out = []) {
  if (node.tipe === 'PART') out.push(node);
  (node.children || []).forEach((ch) => flattenParts(ch, out));
  return out;
}

function findChild(node, pred) {
  return (node.children || []).find(pred);
}

const partRows = parseBomTemplateRows(BOM_TEMPLATE_ALL_ROWS);
if (partRows.length !== 3) {
  console.error('FAIL: expected 3 part rows, got', partRows.length);
  process.exit(1);
}

if (partRows[0].partName !== 'SLAT TOP' || partRows[0].modulName !== 'TOP') {
  console.error('FAIL: parseBomTemplateRows column map', partRows[0]);
  process.exit(1);
}

if (partRows[0].submodulName) {
  console.error('FAIL: submodulName should not copy partName when codes equal', partRows[0]);
  process.exit(1);
}

const tree = buildTreeFromFlatRows(partRows, { productKode: 'DEMO-01' });

if (tree.kode !== 'DEMO-01') {
  console.error('FAIL: root kode', tree.kode);
  process.exit(1);
}
if (tree.nama) {
  console.error('FAIL: root nama should be empty, got', tree.nama);
  process.exit(1);
}

const mod12 = findChild(tree, (n) => n.kode === '1.2');
const mod13 = findChild(tree, (n) => n.kode === '1.13');
const modKaki = findChild(tree, (n) => n.kode === '2.0');

if (!mod12 || mod12.nama !== 'TOP' || mod12.tipe !== 'SUBMODUL') {
  console.error('FAIL: modul 1.2', mod12);
  process.exit(1);
}
if (!mod13 || mod13.nama !== 'TOP') {
  console.error('FAIL: modul 1.13', mod13);
  process.exit(1);
}

const slat = findChild(mod12, (n) => n.tipe === 'PART');
if (!slat || slat.nama !== 'SLAT TOP') {
  console.error('FAIL: SLAT TOP should be direct child of modul when sub code equals mod code', slat);
  process.exit(1);
}

const purus = findChild(mod13, (n) => n.tipe === 'PART');
if (!purus || purus.nama !== 'PURUS TANAM') {
  console.error('FAIL: PURUS part', purus);
  process.exit(1);
}

const sub2 = findChild(modKaki, (n) => n.tipe === 'SUBMODUL 2');
const kakiPart = sub2 ? findChild(sub2, (n) => n.tipe === 'PART') : null;
if (!sub2 || sub2.kode !== '2.1' || !kakiPart || kakiPart.nama !== 'KAKI DEPAN') {
  console.error('FAIL: distinct submodul 2.1 under KAKI', { sub2, kakiPart });
  process.exit(1);
}

const dupMod = tree.children.filter((c) => c.nama === 'TOP' && c.kode === '1.2');
if (tree.nama === 'TOP' || tree.children.some((c) => c.nama === tree.nama && tree.nama)) {
  console.error('FAIL: duplicate modul layer at root');
  process.exit(1);
}

const parts = flattenParts(tree);
if (parts.length !== 3) {
  console.error('FAIL: part count', parts.length);
  process.exit(1);
}

console.log('testImportBomHierarchy: PASS');
