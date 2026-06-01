import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const BASE =
  'd:/Project Spartan Jepara/03. DOKUMEN/Modul Document/Manufacture Management/1. Excel Bill Of Material';

const files = fs.readdirSync(BASE).filter((f) => f.endsWith('.xlsx') && !f.startsWith('~$'));

for (const name of files.sort()) {
  const full = path.join(BASE, name);
  const wb = XLSX.read(fs.readFileSync(full), { type: 'buffer' });
  console.log('\n===', name, '===');
  console.log('sheets:', wb.SheetNames.join(' | '));
}
