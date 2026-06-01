import * as XLSX from 'xlsx';
import fs from 'fs';

const files = [
  '1 - ZAN-100 - 2-12-25.xlsx',
  '2 - MF081 - PURSER\'S CHAIR BLACK & HONEY - HARD DAM -FINAL- 28-3-22.xlsx',
  '2 - DCTVBS - TEMPLATE BARU - 20-8-21.xlsx',
  '7 - SVDT.120-ST - SAVOY DINING TABLE 120 STAIN COLOR - 17-9-21.xlsx',
  '2 - MF056 - MADRAS DESK - 20-4-22.xlsx',
  '1 - ELB-555-98 - ELBA CHAIR NLH - 19-5-23.xlsx',
  '3 - L-LOU-NAT - L LOUNGER NATURAL - 17-7-25.xlsx',
  '17 - G632L-RO - MARIO 3 S - 12-5-26.xlsx',
  '2 - FNA-550 - 4-12-25.xlsx',
  '10 - G557 - ALABAMA 1 SEATER - 9-5-26.xlsx',
  '1 - POL-TAB-3 - 17-3-26.xlsx',
];

const BASE =
  'd:/Project Spartan Jepara/03. DOKUMEN/Modul Document/Manufacture Management/1. Excel Bill Of Material';

for (const name of files) {
  const full = `${BASE}/${name}`;
  if (!fs.existsSync(full)) {
    console.log('MISSING', name);
    continue;
  }
  const wb = XLSX.read(fs.readFileSync(full), { type: 'buffer' });
  console.log('\n===', name, '===');
  console.log('sheets:', wb.SheetNames.join(' | '));
  const hasBom = wb.SheetNames.includes('BOM TEMPLATE');
  console.log('BOM TEMPLATE:', hasBom ? 'yes' : 'no');
}
