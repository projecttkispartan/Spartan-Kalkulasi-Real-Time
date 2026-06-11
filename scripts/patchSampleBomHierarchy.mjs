/**
 * Patch sample JSON — rebuild bomData dengan parser hierarki baru (tanpa re-import Excel).
 * Metadata part (biaya, proses, woodGradeId, …) dipertahankan per kode part.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildTreeFromFlatRows } from '../src/utils/importBomFromExcel.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '../src/data/samples/projects');

function collectPartsByKode(node, map = new Map()) {
  if (node.tipe === 'PART' && node.kode) {
    map.set(String(node.kode).trim(), node);
  }
  (node.children || []).forEach((ch) => collectPartsByKode(ch, map));
  return map;
}

function walkParts(node, modCtx, subCtx, out) {
  if (node.tipe === 'PART') {
    out.push({
      no: node.no,
      excelRow: node.excelRow,
      photoIndex: node.photoIndex,
      kode: node.kode,
      nama: node.nama,
      partName: node.nama,
      modulName: modCtx.nama,
      modulCode: modCtx.kode,
      submodulName:
        subCtx.kode && subCtx.kode !== modCtx.kode ? subCtx.kode : '',
      submodulCode: subCtx.kode || modCtx.kode,
      materialType: node.materialType,
      p: node.p,
      l: node.l,
      t: node.t,
      vol: node.vol,
      qty: node.qty,
    });
    return;
  }
  (node.children || []).forEach((ch) => {
    if (ch.tipe === 'SUBMODUL' && !modCtx.nama) {
      walkParts(ch, { nama: ch.nama, kode: ch.kode }, subCtx, out);
    } else if ((ch.tipe === 'SUBMODUL' || ch.tipe === 'SUBMODUL 2') && modCtx.nama) {
      walkParts(ch, modCtx, { nama: ch.nama, kode: ch.kode }, out);
    } else {
      walkParts(ch, modCtx, subCtx, out);
    }
  });
}

function restorePartMeta(node, prevByKode) {
  if (node.tipe === 'PART') {
    const prev = prevByKode.get(String(node.kode || '').trim());
    if (prev) {
      return {
        ...prev,
        id: node.id,
        no: node.no,
        nama: node.nama,
        kode: node.kode,
        tipe: 'PART',
        children: [],
      };
    }
    return node;
  }
  return {
    ...node,
    children: (node.children || []).map((ch) => restorePartMeta(ch, prevByKode)),
  };
}

function patchProject(filePath) {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const bom = raw.bomData;
  if (!bom) return false;

  const prevByKode = collectPartsByKode(bom);
  const rows = [];
  walkParts(bom, { nama: '', kode: '' }, { nama: '', kode: '' }, rows);
  if (!rows.length) return false;

  const productKode = raw.productInfo?.kode || raw.kode || '';
  let nextBom = buildTreeFromFlatRows(rows, { productKode });
  nextBom = restorePartMeta(nextBom, prevByKode);

  raw.bomData = nextBom;
  raw.sampleSeedVersion = Math.max(raw.sampleSeedVersion || 0, 6);
  raw.updatedAt = new Date().toISOString();
  fs.writeFileSync(filePath, JSON.stringify(raw, null, 2) + '\n', 'utf8');
  return true;
}

const files = fs.readdirSync(OUT_DIR).filter((f) => f.endsWith('.json'));
let n = 0;
for (const f of files) {
  if (patchProject(path.join(OUT_DIR, f))) {
    console.log('Patched', f);
    n++;
  }
}
console.log('Done:', n, 'projects');
