/**
 * Ekstrak referensi ringkas dari Excel G632L untuk dokumen uji coba.
 * Usage: node scripts/inspectG632lReference.mjs
 */
import * as XLSX from 'xlsx';
import fs from 'fs';

const G632L =
  'd:/Project Spartan Jepara/03. DOKUMEN/Support Dokumen/Excel/17 - G632L-RO - MARIO 3 S - 12-5-26.xlsx';

if (!fs.existsSync(G632L)) {
  console.error('FILE_NOT_FOUND:', G632L);
  process.exit(1);
}

const wb = XLSX.read(fs.readFileSync(G632L), { type: 'buffer' });

function sheetRows(name, maxRow = 30) {
  const ws = wb.Sheets[name];
  if (!ws) return null;
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }).slice(0, maxRow);
}

const out = {
  file: G632L,
  sheets: wb.SheetNames,
  bomHeader: null,
  summaryCostSample: [],
  calculationSample: [],
};

const bom = sheetRows('BOM TEMPLATE', 15);
if (bom) {
  out.bomHeader = bom.slice(0, 8);
}

const summary = sheetRows('SUMMARY COST', 45);
if (summary) {
  out.summaryCostSample = summary.filter((r) =>
    r.some((c) => String(c).trim() && !String(c).startsWith('=')),
  );
}

const calc = sheetRows('CALCULATION', 20);
if (calc) {
  out.calculationSample = calc.slice(0, 12);
}

// Cari baris TOTAL / COGS di SUMMARY COST
const summaryAll = XLSX.utils.sheet_to_json(wb.Sheets['SUMMARY COST'], { header: 1, defval: '' });
const totals = summaryAll.filter((r) => {
  const label = String(r[0] || r[1] || '').toUpperCase();
  return /TOTAL|COGS|PRODUCTION|SELLING|HPP|GRAND/i.test(label);
});
out.summaryTotals = totals.slice(-25);

console.log(JSON.stringify(out, null, 2));
