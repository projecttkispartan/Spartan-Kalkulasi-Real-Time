/**
 * Cek gambar embedded di workbook Excel BOM.
 * Usage: node scripts/inspectExcelImages.mjs [path.xlsx]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractExcelImages } from '../src/utils/excelImageExtract.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultPath =
  'd:/Project Spartan Jepara/03. DOKUMEN/Modul Document/Manufacture Management/1. Excel Bill Of Material/1 - ZAN-100 - 2-12-25.xlsx';

const excelPath = process.argv[2] || defaultPath;
const buf = fs.readFileSync(excelPath);
const { imagesBySheetRow, stats } = await extractExcelImages(buf);

console.log('File:', excelPath);
console.log('Stats:', stats);
for (const [sheet, rowMap] of imagesBySheetRow) {
  console.log(`\n${sheet}:`);
  for (const [row, url] of [...rowMap.entries()].sort((a, b) => a[0] - b[0])) {
    console.log(`  baris ${row} → ${url.slice(0, 48)}… (${Math.round(url.length / 1024)} KB data URL)`);
  }
}
