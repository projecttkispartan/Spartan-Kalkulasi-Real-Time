#!/usr/bin/env node
/**
 * CLI: import BOM project from Excel BOM TEMPLATE
 * Usage: node scripts/importBomFromExcel.mjs [path-to.xlsx] [out.json]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as XLSX from 'xlsx';
import { parseBomWorkbook } from '../src/utils/importBomFromExcel.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const excelPath =
  process.argv[2] ||
  process.env.ZAN_EXCEL ||
  'd:/Project Spartan Jepara/03. DOKUMEN/Modul Document/Manufacture Management/1. Excel Bill Of Material/1 - ZAN-100 - 2-12-25.xlsx';
const outPath = process.argv[3] || path.join(__dirname, '../src/data/imported-zan-project.json');

if (!fs.existsSync(excelPath)) {
  console.error('File not found:', excelPath);
  process.exit(1);
}

const wb = XLSX.read(fs.readFileSync(excelPath), { type: 'buffer' });
const project = parseBomWorkbook(wb);

fs.writeFileSync(outPath, JSON.stringify(project, null, 2));
console.log('Imported BOM →', outPath);
console.log('  product:', project.productInfo?.kode, project.productInfo?.nama);
console.log('  parts in tree:', countParts(project.bomData));

function countParts(node) {
  let n = node.tipe === 'PART' ? 1 : 0;
  (node.children || []).forEach((c) => {
    n += countParts(c);
  });
  return n;
}
