import * as XLSX from 'xlsx';
import fs from 'fs';

const ZAN =
  'd:/Project Spartan Jepara/03. DOKUMEN/Modul Document/Manufacture Management/1. Excel Bill Of Material/1 - ZAN-100 - 2-12-25.xlsx';
const wb = XLSX.read(fs.readFileSync(ZAN), { type: 'buffer' });

function dumpSheet(name, maxRow = 25, cols = 20) {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '' });
  console.log('\n====', name, 'rows:', rows.length, '====');
  for (let i = 0; i < Math.min(maxRow, rows.length); i++) {
    const r = rows[i];
    const cells = [];
    for (let c = 0; c < cols; c++) {
      const v = r[c];
      if (v !== '' && v != null) cells.push(`[${c}]=${String(v).slice(0, 40)}`);
    }
    if (cells.length) console.log(`R${i + 1}:`, cells.join(' '));
  }
}

['MASTER RATIO', 'FORMULA DATA', 'ROUND COMPONENT CALC', 'DATA BASE'].forEach((s) => dumpSheet(s));

// BOM header row sample
dumpSheet('BOM TEMPLATE', 25, 45);
