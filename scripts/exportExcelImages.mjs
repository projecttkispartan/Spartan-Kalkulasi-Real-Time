/**
 * Ekspor semua gambar dari workbook .xlsx ke folder lokal.
 *
 * Usage:
 *   node scripts/exportExcelImages.mjs [path.xlsx] [output-dir]
 *
 * Default: ZAN-100 → assets/excel-images/zan-100
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import JSZip from 'jszip';
import { extractExcelImages } from '../src/utils/excelImageExtract.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const defaultExcel =
  'd:/Project Spartan Jepara/03. DOKUMEN/Modul Document/Manufacture Management/1. Excel Bill Of Material/1 - ZAN-100 - 2-12-25.xlsx';

const defaultTemplate =
  'd:/Project Spartan Jepara/03. DOKUMEN/Modul Document/Manufacture Management/1. Excel Bill Of Material/1 - CALCULATION TEMPLATE 2014 - 10-12-13.xlsx';

function slugify(name) {
  return String(name)
    .replace(/\.xlsx?$/i, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 60);
}

async function exportAllMediaFiles(buffer, outDir) {
  const zip = await JSZip.loadAsync(buffer);
  const saved = [];

  for (const [entryPath, entry] of Object.entries(zip.files)) {
    if (!entryPath.startsWith('xl/media/') || entry.dir) continue;
    const fileName = path.basename(entryPath);
    const dest = path.join(outDir, 'media', fileName);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const data = await entry.async('nodebuffer');
    fs.writeFileSync(dest, data);
    saved.push({ file: fileName, bytes: data.length, path: dest });
  }

  return saved;
}

async function exportMappedJpegPng(buffer, outDir, imagesBySheetRow) {
  const mappedDir = path.join(outDir, 'by-sheet-row');
  fs.mkdirSync(mappedDir, { recursive: true });
  const index = [];

  for (const [sheet, rowMap] of imagesBySheetRow) {
    const sheetSlug = sheet.replace(/[^\w]+/g, '_');
    for (const [row, dataUrl] of rowMap) {
      const m = /^data:image\/(\w+);base64,(.+)$/.exec(dataUrl);
      if (!m) continue;
      const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
      const buf = Buffer.from(m[2], 'base64');
      const name = `${sheetSlug}_row${row}.${ext}`;
      const dest = path.join(mappedDir, name);
      fs.writeFileSync(dest, buf);
      index.push({ sheet, excelRow: row, file: name });
    }
  }

  return index;
}

async function exportOne(excelPath, outDir) {
  if (!fs.existsSync(excelPath)) {
    console.warn('SKIP (file tidak ada):', excelPath);
    return null;
  }

  const buffer = fs.readFileSync(excelPath);
  fs.mkdirSync(outDir, { recursive: true });

  const mediaFiles = await exportAllMediaFiles(buffer, outDir);
  const { imagesBySheetRow, stats } = await extractExcelImages(buffer);
  const mapped = await exportMappedJpegPng(buffer, outDir, imagesBySheetRow);

  const manifest = {
    sourceFile: path.basename(excelPath),
    sourcePath: excelPath,
    exportedAt: new Date().toISOString(),
    stats,
    mediaCount: mediaFiles.length,
    mediaFiles: mediaFiles.map((f) => ({ file: f.file, bytes: f.bytes })),
    mappedByAnchor: mapped,
    folders: {
      allMedia: path.join(outDir, 'media'),
      anchorMapped: path.join(outDir, 'by-sheet-row'),
    },
    notes: [
      'media/ = semua file dari xl/media/ (termasuk .emf)',
      'by-sheet-row/ = hanya PNG/JPEG yang terpetakan ke baris sheet (anchor)',
      'Legenda FINISHING/ASSEMBLING CODE (template): lihat media/image30.jpeg–image76.jpeg pada export template',
    ],
  };

  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');

  console.log('\n===', path.basename(excelPath), '===');
  console.log('Output:', outDir);
  console.log('Media files:', mediaFiles.length, '(png/jpeg/emf/...)');
  console.log('Anchor-mapped (browser):', mapped.length);
  console.log('Manifest:', path.join(outDir, 'manifest.json'));

  return manifest;
}

const args = process.argv.slice(2);
const runAll = args.includes('--all') || args.length === 0;

if (runAll) {
  const base = path.join(root, 'assets', 'excel-images');
  await exportOne(defaultExcel, path.join(base, 'zan-100'));
  await exportOne(defaultTemplate, path.join(base, 'calculation-template-2014'));
  console.log('\nSelesai. Buka folder:', base);
} else {
  const excelPath = args[0] || defaultExcel;
  const outDir =
    args[1] || path.join(root, 'assets', 'excel-images', slugify(path.basename(excelPath)));
  await exportOne(excelPath, outDir);
}
