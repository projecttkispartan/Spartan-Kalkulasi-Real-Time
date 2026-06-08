/**
 * Audit sheet DATA BASE — jumlah SKU per section.
 * Usage: ZAN_EXCEL=path/to.xlsx node scripts/auditDataBaseSections.mjs
 */
import * as XLSX from 'xlsx';
import fs from 'fs';
import { auditReport } from './lib/parseDataBaseSections.mjs';
import { auditCatalogReport } from './lib/parseCatalogTables.mjs';

const EXCEL_PATH =
  process.env.ZAN_EXCEL ||
  'd:/Project Spartan Jepara/03. DOKUMEN/Support Dokumen/Excel/1 - ZAN-100 - 2-12-25.xlsx';

if (!fs.existsSync(EXCEL_PATH)) {
  console.error('Excel not found:', EXCEL_PATH);
  process.exit(1);
}

const wb = XLSX.read(fs.readFileSync(EXCEL_PATH));
const rows = XLSX.utils.sheet_to_json(wb.Sheets['DATA BASE'], { header: 1, defval: '' });
const report = auditReport(rows);
const catalog = auditCatalogReport(rows);

console.log('DATA BASE rows:', rows.length);
console.log('\nSection boundaries:');
for (const b of report.bounds) {
  console.log(`  ${b.section}: header R${b.headerRow}, data R${b.startRow + 1}–${b.endRow + 1}`);
}
console.log('\nSKU counts (with price):');
for (const [sec, n] of Object.entries(report.withPrice)) {
  console.log(`  ${sec}: ${n} / ${report.counts[sec] ?? 0}`);
}
console.log('\nCatalog tables (horizontal, kolom kanan):');
for (const [key, n] of Object.entries(catalog.withPrice)) {
  console.log(`  ${key}: ${n} / ${catalog.counts[key] ?? 0}`);
}
console.log('\nSamples (vertical):');
console.log(JSON.stringify(report.samples, null, 2));
console.log('\nSamples (catalog):');
console.log(JSON.stringify(catalog.samples, null, 2));
