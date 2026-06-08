/**
 * Verifikasi FOB COST — tarif rounded per m³ & biaya per unit packing.
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { parseFobCostSheet } from './lib/parseFobCost.mjs';
import { computeFobExportCost } from '../src/utils/fobCostEngine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const excelPath =
  process.env.ZAN_EXCEL ||
  'd:/Project Spartan Jepara/03. DOKUMEN/Support Dokumen/Excel/1 - ZAN-100 - 2-12-25.xlsx';

let failed = 0;

function ok(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    failed += 1;
  } else {
    console.log('OK', msg);
  }
}

const XLSX = await import('xlsx');
const wb = XLSX.read(readFileSync(excelPath));
const rows = XLSX.utils.sheet_to_json(wb.Sheets['DATA BASE'], { header: 1, defval: '' });
const parsed = parseFobCostSheet(rows);

ok(parsed.exchangeRateUsd === 16000, 'kurs USD 16000');
ok(parsed.containers['20foot']?.roundedFobPerM3 === 500000, '20ft Rp 500.000/m³');
ok(parsed.containers['40foot']?.roundedFobPerM3 === 300000, '40ft Rp 300.000/m³');
ok(parsed.containers['40hc']?.roundedFobPerM3 === 300000, '40hc Rp 300.000/m³');
ok((parsed.containers['20foot']?.lineItems?.length || 0) >= 15, '≥15 layanan 20ft');

const vol = 0.080142;
const fob20 = computeFobExportCost({
  packingVolumeM3: vol,
  containerKey: '20foot',
  master: parsed,
});
ok(fob20.fobExportCost === Math.round(500000 * vol), `FOB 20ft × vol: ${fob20.fobExportCost}`);

const fob40 = computeFobExportCost({
  packingVolumeM3: vol,
  containerKey: '40foot',
  master: parsed,
});
ok(fob40.fobExportCost === Math.round(300000 * vol), `FOB 40ft × vol: ${fob40.fobExportCost}`);

if (failed) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log('\nFOB COST tests: passed');
