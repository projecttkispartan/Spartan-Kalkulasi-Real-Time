import fs from 'fs';
import * as XLSX from 'xlsx';
import { readSheetRows } from '../src/utils/excelWorkbookParsers.js';

const f =
  'd:/Project Spartan Jepara/03. DOKUMEN/Modul Document/Manufacture Management/1. Excel Bill Of Material/1 - ZAN-100 - 2-12-25.xlsx';
const rows = readSheetRows(XLSX.read(fs.readFileSync(f), { type: 'buffer' }), 'SUMMARY COST');
for (let i = 0; i < rows.length; i++) {
  const r = rows[i] || [];
  const labels = [1, 10, 0, 2].map((idx) => String(r[idx] ?? '').trim()).filter(Boolean);
  const joined = labels.join(' | ');
  const total = Number(r[13]) || 0;
  if (/PRODUCTION|COGS|GOOD SOLD|RAW PRODUCTION|FACTORY PROCESS/i.test(joined) && total > 1000) {
    console.log(i + 1, joined.slice(0, 60), 'total@13=', total, 'r16=', r[16]);
  }
}
