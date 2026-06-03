import fs from 'fs';
import * as XLSX from 'xlsx';
import { readSheetRows, parseSummaryCostSheet } from '../src/utils/excelWorkbookParsers.js';

const base =
  process.env.BOM_EXCEL_DIR ||
  'd:/Project Spartan Jepara/03. DOKUMEN/Modul Document/Manufacture Management/1. Excel Bill Of Material';

const files = fs.readdirSync(base).filter((f) => f.endsWith('.xlsx')).slice(0, 15);
for (const f of files) {
  const wb = XLSX.read(fs.readFileSync(`${base}/${f}`), { type: 'buffer' });
  const s = parseSummaryCostSheet(readSheetRows(wb, 'SUMMARY COST'));
  console.log(
    f.slice(0, 40).padEnd(42),
    'prod',
    Math.round(s.productionCost),
    'cogs',
    Math.round(s.totalCogs),
    'lines',
    s.lines.length,
  );
}
