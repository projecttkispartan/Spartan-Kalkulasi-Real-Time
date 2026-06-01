import * as XLSX from 'xlsx';
import fs from 'fs';

const path = process.argv[2];
if (!fs.existsSync(path)) {
  console.error('NOT FOUND:', path);
  process.exit(1);
}
const buf = fs.readFileSync(path);
const wb = XLSX.read(buf, { type: 'buffer' });
console.log('SHEETS:', wb.SheetNames.join(' | '));
for (const name of wb.SheetNames) {
  const sh = wb.Sheets[name];
  const rows = XLSX.utils.sheet_to_json(sh, { header: 1, defval: '' });
  console.log('\n===', name, '=== rows:', rows.length);
  for (let i = 0; i < Math.min(30, rows.length); i++) {
    const line = JSON.stringify(rows[i]);
    console.log(String(i + 1).padStart(3), line.length > 250 ? line.slice(0, 250) + '…' : line);
  }
}
