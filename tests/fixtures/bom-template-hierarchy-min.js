/**
 * Fixture minimal BOM TEMPLATE rows (header + 3 part rows) untuk test hierarki import.
 * Kolom 0-indexed: no=8, subCode=10, modCode=11, partCode=12, modName=13, partName=14
 */
export const BOM_TEMPLATE_HEADER_ROWS = [
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
];

function partRow(no, subCode, modCode, partCode, modName, partName, mat = 'KAYU') {
  const r = new Array(43).fill('');
  r[8] = no;
  r[10] = subCode;
  r[11] = modCode;
  r[12] = partCode;
  r[13] = modName;
  r[14] = partName;
  r[15] = mat;
  r[36] = 100;
  r[37] = 50;
  r[38] = 20;
  r[39] = 1;
  return r;
}

/** Product header — SPARTAN PRODUCT + DESCRIPTION */
export const BOM_TEMPLATE_PRODUCT_HEADER = (() => {
  const r = new Array(20).fill('');
  r[12] = 'SPARTAN PRODUCT';
  r[14] = 'DEMO-01';
  return r;
})();

export const BOM_TEMPLATE_PRODUCT_DESC = (() => {
  const r = new Array(20).fill('');
  r[12] = 'DESCRIPTION';
  r[14] = 'Demo Dining Table';
  return r;
})();

export const BOM_TEMPLATE_PART_ROWS = [
  partRow(1, '1.2', '1.2', 'P-001', 'TOP', 'SLAT TOP'),
  partRow(2, '1.13', '1.13', 'P-002', 'TOP', 'PURUS TANAM'),
  partRow(3, '2.1', '2.0', 'P-003', 'KAKI', 'KAKI DEPAN'),
];

export const BOM_TEMPLATE_ALL_ROWS = [
  ...BOM_TEMPLATE_HEADER_ROWS,
  BOM_TEMPLATE_PRODUCT_HEADER,
  BOM_TEMPLATE_PRODUCT_DESC,
  ...BOM_TEMPLATE_PART_ROWS,
];
