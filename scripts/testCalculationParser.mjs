/**
 * Verifikasi parser CALCULATION — hardware & kayu dari sample ELB atau fixture.
 */
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import { readSheetRows, parseCalculationSheet } from '../src/utils/excelWorkbookParsers.js';
import {
  CALCULATION_FIXTURE_ROWS,
  CALCULATION_FIXTURE_SCREW_KODE,
} from '../tests/fixtures/calculation-elb-min.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE =
  process.env.BOM_EXCEL_DIR ||
  process.env.ELB_EXCEL ||
  'd:/Project Spartan Jepara/03. DOKUMEN/Modul Document/Manufacture Management/1. Excel Bill Of Material';

const ELB_FILE = '1 - ELB-555-98 - ELBA CHAIR NLH - 19-5-23.xlsx';
const filePath = path.join(BASE, ELB_FILE);

let rows;
let source = 'fixture';

if (fs.existsSync(filePath)) {
  source = 'ELB Excel';
  const wb = XLSX.read(fs.readFileSync(filePath), { type: 'buffer' });
  rows = readSheetRows(wb, 'CALCULATION');
} else {
  console.warn('ELB Excel not found — using fixture:', filePath);
  rows = CALCULATION_FIXTURE_ROWS;
}

const { partsMap, catalog } = parseCalculationSheet(rows);

const hardware = catalog.filter((c) => c.materialType === 'hardware');
const kayu = catalog.filter((c) => c.materialType === 'kayu');

console.log('CALCULATION parser — ELB-555-98');
console.log('  catalog total:', catalog.length);
console.log('  kayu:', kayu.length, 'hardware:', hardware.length);
console.log('  partsMap (merge BOM):', partsMap.size);

const screwKode = source === 'fixture' ? CALCULATION_FIXTURE_SCREW_KODE : '005-016-002-008';
const screw = partsMap.get(screwKode);
if (!screw) {
  console.error('FAIL: hardware kode not in partsMap:', screwKode);
  process.exit(1);
}
if (screw.materialType !== 'hardware' || !screw.biayaUnit) {
  console.error('FAIL: screw entry invalid:', screw);
  process.exit(1);
}
console.log('  OK hardware', screwKode, 'biayaUnit=', screw.biayaUnit);

const lemRows = catalog.filter((c) => c.calcType === 'LAMINATING' && c.calcSubType?.toUpperCase() === 'LEM');
console.log('  lem rows:', lemRows.length);
if (lemRows.length === 0) {
  console.warn('WARN: no LEM rows parsed (may vary by product)');
}

console.log('testCalculationParser: PASS');
