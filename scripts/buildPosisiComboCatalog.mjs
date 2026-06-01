/**
 * Verifikasi image30–103 ada + tulis manifest pemetaan combo.
 * Usage: node scripts/buildPosisiComboCatalog.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { POSISI_COMBO_GROUPS, POSISI_COMBO_ALL } from '../src/data/posisiComboCatalog.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const mediaDir = path.join(root, 'assets/excel-images/calculation-template-2014/media');

let missing = 0;
for (const item of POSISI_COMBO_ALL) {
  const file = path.join(mediaDir, `image${item.imageNumber}.jpeg`);
  if (!fs.existsSync(file)) {
    console.warn('MISSING', file);
    missing += 1;
  }
}

const manifest = {
  generatedAt: new Date().toISOString(),
  total: POSISI_COMBO_ALL.length,
  missing,
  groups: POSISI_COMBO_GROUPS.map((g) => ({
    id: g.id,
    label: g.label,
    count: g.items.length,
    range: g.items.length
      ? `image${g.items[0].imageNumber}–image${g.items[g.items.length - 1].imageNumber}`
      : null,
    items: g.items.map((it) => ({
      value: it.value,
      code: it.code,
      image: `image${it.imageNumber}.jpeg`,
      src: it.src,
    })),
  })),
};

const out = path.join(root, 'assets/excel-images/calculation-template-2014/posisi-combo-manifest.json');
fs.writeFileSync(out, JSON.stringify(manifest, null, 2), 'utf-8');

console.log('Combo entries:', POSISI_COMBO_ALL.length);
console.log('Missing files:', missing);
console.log('Manifest:', out);
if (missing) process.exit(1);
