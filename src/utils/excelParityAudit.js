/**
 * Audit runtime — mengevaluasi project terhadap checklist parity Excel.
 */
import { expandProsesList } from '../services/bomCalculations.js';
import {
  EXCEL_PARITY_CHECKLIST,
  EXCEL_PARITY_TOLERANCE_IDR,
  EXCEL_PARITY_TOLERANCE_PCT,
} from '../data/excelParityChecklist.js';
import {
  getCachedCoatings,
  getCachedFormulas,
  getCachedMaterials,
} from '../services/masterStorage.js';
import { EXCEL_FACTORY_OH_PCT } from '../data/excelReference.js';

const COATING_PART_TYPES = new Set(['finishing', 'coating', 'veneer']);

function walkParts(node, acc = []) {
  if (node?.tipe === 'PART') acc.push(node);
  (node?.children || []).forEach((ch) => walkParts(ch, acc));
  return acc;
}

function partHasDims(p) {
  return (Number(p.p) || 0) > 0 && (Number(p.l) || 0) > 0 && (Number(p.t) || 0) > 0;
}

function sumKayuMaterial(parts) {
  return parts
    .filter((p) => (p.materialType || 'kayu') === 'kayu')
    .reduce((s, p) => s + (Number(p.biaya) || 0) * (Number(p.qty) || 1), 0);
}

function partsWithDoubleWaste(parts) {
  return parts.filter((p) => {
    const sf = Number(p.sf) || 0;
    const wf = Number(p.wf) || 0;
    return (sf > 0 || wf > 0) && (Number(p.biaya) || 0) > 0;
  });
}

function countProsesParts(parts) {
  let withProses = 0;
  let totalProses = 0;
  parts.forEach((p) => {
    const list = expandProsesList(p);
    if (list.length) withProses += 1;
    totalProses += list.length;
  });
  return { withProses, totalProses };
}

function duplicateKodes(parts) {
  const seen = new Map();
  parts.forEach((p) => {
    const k = String(p.kode || '').trim();
    if (!k) return;
    seen.set(k, (seen.get(k) || 0) + 1);
  });
  return [...seen.entries()].filter(([, n]) => n > 1).map(([k]) => k);
}

function packingJalurTotals(packingSpec, jalur) {
  const sumMat = (list) =>
    (list || []).reduce((s, m) => s + (Number(m.qty) || 0) * (Number(m.harga) || 0), 0);
  const sumRout = (list) =>
    (list || []).reduce(
      (s, r) => s + (Number(r.waktu) || 0) * (Number(r.pekerja) || 0) * (Number(r.rate) || 0),
      0,
    );
  if (jalur === 'SF') {
    return sumMat(packingSpec?.materialsSF) + sumRout(packingSpec?.routingSF);
  }
  return sumMat(packingSpec?.materialsBox) + sumRout(packingSpec?.routingBox);
}

function withinTolerance(actual, expected) {
  if (!expected || expected <= 0) return null;
  const diff = Math.abs(actual - expected);
  return diff <= Math.max(EXCEL_PARITY_TOLERANCE_IDR, expected * EXCEL_PARITY_TOLERANCE_PCT);
}

/**
 * @returns {{ items: Array, summary: { pass: number, fail: number, warn: number, skip: number, score: number }, blockers: string[] }}
 */
export function auditExcelParity({
  bomData,
  productMeta = {},
  productInfo = {},
  dimensi = {},
  packingSpec = {},
  packingDimensions = [],
  cogsConfig = {},
  cogsData = {},
  excelMirror = null,
  kursUsd,
  kursEur,
  mastersReady = false,
  importedFromExcel = false,
}) {
  const parts = walkParts(bomData);
  const defsById = Object.fromEntries(EXCEL_PARITY_CHECKLIST.map((d) => [d.id, d]));
  const results = new Map();
  const blockers = [];

  const set = (id, status, detail = '') => {
    results.set(id, { id, status, detail });
  };

  // ── Master ──
  const matCount = getCachedMaterials().length;
  const coatCount = getCachedCoatings().length;
  const formCount = getCachedFormulas().length;
  if (mastersReady && matCount >= 15 && coatCount >= 10 && formCount >= 8) {
    set('master-imported', 'pass', `${matCount} kayu · ${coatCount} coating · ${formCount} formula`);
  } else if (matCount > 0) {
    set('master-imported', 'warn', `Master partial (${matCount} material) — jalankan import:masters`);
  } else {
    set('master-imported', 'fail', 'Master belum ter-load');
    blockers.push('Master global belum ter-import');
  }

  set(
    'master-work-centers',
    matCount > 0 ? 'pass' : 'skip',
    'Work center dari master/routing catalog',
  );
  set(
    'master-kurs',
    Number(kursUsd) > 0 && Number(kursEur) > 0 ? 'pass' : 'skip',
    `USD ${kursUsd || '—'} · EUR ${kursEur || '—'}`,
  );

  // ── Produk ──
  set(
    'produk-item-type',
    productMeta.itemType ? 'pass' : 'fail',
    productMeta.itemType || 'itemType kosong',
  );
  if (!productMeta.itemType) blockers.push('itemType produk belum diisi');

  const hasWood =
    productMeta.woodGradeId || productMeta.wood || productInfo.wood;
  set('produk-wood-grade', hasWood ? 'pass' : 'fail', productMeta.woodGradeId || productMeta.wood || '—');
  if (!hasWood) blockers.push('Grade kayu produk belum diisi');

  const hasCoat = productMeta.coatingId || productMeta.coating;
  set('produk-coating', hasCoat ? 'pass' : 'fail', productMeta.coatingId || productMeta.coating || '—');

  const w = Number(dimensi.w) || 0;
  const d = Number(dimensi.d) || 0;
  const h = Number(dimensi.h) || 0;
  set(
    'produk-dimensi',
    w > 0 && d > 0 && h > 0 ? 'pass' : 'fail',
    `${w} × ${d} × ${h} mm`,
  );
  if (!(w && d && h)) blockers.push('Dimensi produk belum lengkap');

  const headerOk =
    (productInfo.kode || productInfo.kodeBom) &&
    (productInfo.namaBom || productInfo.nama);
  set('produk-header', headerOk ? 'pass' : 'warn', productInfo.kodeBom || productInfo.kode || '—');

  // ── BOM ──
  set('bom-struktur', parts.length > 0 ? 'pass' : 'fail', `${parts.length} part`);
  if (!parts.length) blockers.push('Belum ada part di BOM');

  const incompleteParts = parts.filter(
    (p) =>
      !String(p.kode || '').trim() ||
      !String(p.nama || '').trim() ||
      !(Number(p.qty) > 0) ||
      !p.materialType,
  );
  set(
    'bom-part-identitas',
    incompleteParts.length === 0 ? 'pass' : 'fail',
    incompleteParts.length
      ? `${incompleteParts.length} part belum lengkap kode/nama/qty/materialType`
      : `${parts.length} part OK`,
  );

  const woodParts = parts.filter((p) => (p.materialType || '') === 'kayu');
  const woodNoVol = woodParts.filter((p) => !(Number(p.vol) > 0) && !partHasDims(p));
  set(
    'bom-dimensi-vol',
    woodParts.length === 0 ? 'skip' : woodNoVol.length === 0 ? 'pass' : 'fail',
    woodParts.length
      ? `${woodParts.length - woodNoVol.length}/${woodParts.length} part kayu punya dimensi/vol`
      : 'Tidak ada part kayu',
  );

  const dupes = duplicateKodes(parts);
  set(
    'bom-kode-unik',
    dupes.length === 0 ? 'pass' : 'warn',
    dupes.length ? `Duplikat: ${dupes.slice(0, 3).join(', ')}` : 'Semua unik',
  );

  // ── Material ──
  const kayuWithBiaya = woodParts.filter((p) => (Number(p.biaya) || 0) > 0);
  set(
    'mat-kayu-biaya',
    kayuWithBiaya.length > 0 || woodParts.length === 0 ? 'pass' : 'fail',
    `${kayuWithBiaya.length}/${woodParts.length} part kayu punya biaya`,
  );

  const doubleWaste = partsWithDoubleWaste(parts);
  set(
    'mat-sf-wf-zero',
    doubleWaste.length === 0 ? 'pass' : 'fail',
    doubleWaste.length
      ? `${doubleWaste.length} part sf/wf > 0 — risiko double count (set ke 0 jika biaya sudah include waste)`
      : 'Tidak ada risiko double SF/WF',
  );
  if (doubleWaste.length) blockers.push(`${doubleWaste.length} part berisiko double SF/WF`);

  const kayuMatSum = Math.round(sumKayuMaterial(parts));
  const excelKayuMat = excelMirror?.summaryCost?.lines?.find(
    (l) => String(l.label || '').toUpperCase() === 'KAYU',
  )?.material;
  if (excelKayuMat > 0) {
    const ok = withinTolerance(kayuMatSum, excelKayuMat);
    set(
      'mat-kayu-summary',
      ok ? 'pass' : 'warn',
      `App Rp ${kayuMatSum.toLocaleString('id-ID')} vs Excel Rp ${Math.round(excelKayuMat).toLocaleString('id-ID')}`,
    );
  } else {
    set('mat-kayu-summary', kayuWithBiaya.length ? 'pass' : 'warn', `Total material kayu Rp ${kayuMatSum.toLocaleString('id-ID')} — banding manual ke SUMMARY`);
  }

  const nonKayu = parts.filter((p) => p.materialType && p.materialType !== 'kayu');
  set(
    'mat-non-kayu',
    nonKayu.length > 0 ? 'pass' : 'warn',
    `${nonKayu.length} part non-kayu`,
  );

  // ── Proses ──
  const { withProses, totalProses } = countProsesParts(parts);
  set(
    'proses-routing',
    totalProses > 0 ? 'pass' : 'fail',
    `${withProses} part · ${totalProses} operasi`,
  );
  if (!totalProses) blockers.push('Belum ada routing/proses operasi');

  set('proses-mfg-map', totalProses > 0 ? 'pass' : 'skip', 'Cek mfgProcess per operasi');
  set(
    'proses-total-nonzero',
    (cogsData.totalProcess || 0) > 0 ? 'pass' : 'fail',
    `Rp ${Math.round(cogsData.totalProcess || 0).toLocaleString('id-ID')}`,
  );

  // ── Coating ──
  set('coat-id', hasCoat ? 'pass' : 'fail', productMeta.coatingId || '—');
  const finishingParts = parts.filter((p) =>
    COATING_PART_TYPES.has(String(p.materialType || '').toLowerCase()),
  );
  const dimmedNonFinish = parts.filter(
    (p) => !COATING_PART_TYPES.has(String(p.materialType || '').toLowerCase()) && partHasDims(p),
  );
  const m2Controlled =
    productMeta.surfaceM2Coating > 0 ||
    finishingParts.some((p) => Number(p.surfaceM2) > 0 || partHasDims(p));
  set(
    'coat-m2-kontrol',
    !hasCoat ? 'skip' : m2Controlled && dimmedNonFinish.length <= finishingParts.length + 2 ? 'pass' : 'warn',
    hasCoat
      ? `${finishingParts.length} part finishing · ${dimmedNonFinish.length} part lain berdimensi (bisa membengkakkan m²)`
      : '—',
  );
  set(
    'coat-biaya',
    !hasCoat ? 'skip' : (cogsData.coatingCost || 0) > 0 ? 'pass' : 'warn',
    `Coating Rp ${Math.round(cogsData.coatingCost || 0).toLocaleString('id-ID')}`,
  );

  // ── Packing ──
  set(
    'pack-dimensi-toleransi',
    packingDimensions.length >= 2 ? 'pass' : 'warn',
    `${packingDimensions.length} baris toleransi`,
  );
  const jalur = cogsConfig.packingJalur === 'SF' ? 'SF' : 'BOX';
  const packTotal = packingJalurTotals(packingSpec, jalur);
  const hasPackLines =
    (jalur === 'BOX'
      ? (packingSpec.materialsBox?.length || 0) + (packingSpec.routingBox?.length || 0)
      : (packingSpec.materialsSF?.length || 0) + (packingSpec.routingSF?.length || 0)) > 0;
  set(
    'pack-material-routing',
    hasPackLines ? 'pass' : 'fail',
    jalur === 'BOX' ? 'BOX material/routing' : 'SF material/routing',
  );
  set('pack-jalur', jalur ? 'pass' : 'fail', jalur);
  set(
    'pack-biaya',
    packTotal > 0 ? 'pass' : 'fail',
    `Rp ${Math.round(packTotal).toLocaleString('id-ID')}`,
  );
  if (!packTotal) blockers.push('Biaya packing jalur aktif = 0');

  // ── COGS ──
  const fOh = Number(cogsConfig.factoryOhPct);
  const mOh = Number(cogsConfig.managementOhPct);
  const mk = Number(cogsConfig.markupPct);
  const ohOk = fOh === EXCEL_FACTORY_OH_PCT && mOh === 2.5;
  set(
    'cogs-oh',
    ohOk ? 'pass' : 'warn',
    `Factory ${fOh}% · Mgmt ${mOh}%` + (excelMirror?.summaryCost ? ' — cek sheet jika beda' : ''),
  );
  set('cogs-markup', mk === 20 ? 'pass' : 'warn', `Markup ${mk}%`);
  set(
    'cogs-production-positive',
    (cogsData.productionCost || 0) > 0 ? 'pass' : 'fail',
    `Rp ${Math.round(cogsData.productionCost || 0).toLocaleString('id-ID')}`,
  );

  // ── Verifikasi ──
  const excelProd = excelMirror?.summaryCost?.productionCost;
  const excelCogs = excelMirror?.summaryCost?.totalCogs;
  if (excelProd || excelCogs) {
    const prodOk = excelProd ? withinTolerance(cogsData.productionCost, excelProd) : null;
    const cogsOk = excelCogs ? withinTolerance(cogsData.totalCogs, excelCogs) : null;
    set(
      'verify-excel-mirror',
      prodOk === false || cogsOk === false ? 'warn' : 'pass',
      [
        excelProd != null && `Production ${prodOk ? 'OK' : 'SELISIH'}`,
        excelCogs != null && `COGS ${cogsOk ? 'OK' : 'SELISIH'}`,
      ]
        .filter(Boolean)
        .join(' · '),
    );
    set(
      'verify-toleransi',
      cogsOk === true || (cogsOk === null && prodOk === true) ? 'pass' : cogsOk === false ? 'fail' : 'warn',
      excelCogs
        ? `App Rp ${Math.round(cogsData.totalCogs || 0).toLocaleString('id-ID')} vs Excel Rp ${Math.round(excelCogs).toLocaleString('id-ID')}`
        : 'Mirror COGS tidak tersedia',
    );
  } else {
    set('verify-excel-mirror', 'warn', 'Tidak ada excelMirror — banding manual ke SUMMARY COST');
    set('verify-toleransi', 'skip', 'Butuh referensi Excel atau import workbook');
  }

  set('verify-npm-test', 'skip', 'Jalankan npm test di terminal');
  set(
    'verify-no-double-source',
    importedFromExcel && doubleWaste.length ? 'fail' : importedFromExcel ? 'warn' : 'pass',
    importedFromExcel
      ? 'Project dari import — hindari hitung ulang master tanpa reset sf/wf'
      : 'Project manual',
  );
  set('verify-export', (cogsData.totalCogs || 0) > 0 ? 'pass' : 'skip', 'Export setelah parity OK');

  // ── Opsional ──
  set('opt-container', 'skip', 'Tab kontainer / kapasitas');
  set(
    'opt-hpp-supplier',
    excelMirror?.hppMentah || excelMirror?.supplierKalkulasi ? 'pass' : 'skip',
    excelMirror ? 'Mirror tersedia' : 'Import workbook untuk mirror',
  );
  set(
    'opt-pick-list',
    excelMirror?.pickList?.length ? 'pass' : 'skip',
    excelMirror?.pickList?.length ? `${excelMirror.pickList.length} baris` : '—',
  );
  set('opt-foto-part', 'skip', 'Tidak mempengaruhi COGS');

  const items = EXCEL_PARITY_CHECKLIST.map((def) => {
    const r = results.get(def.id) || { id: def.id, status: 'skip', detail: '' };
    return { ...def, ...r };
  });

  const counts = { pass: 0, fail: 0, warn: 0, skip: 0 };
  items.forEach((it) => {
    if (it.status === 'pass') counts.pass += 1;
    else if (it.status === 'fail') counts.fail += 1;
    else if (it.status === 'warn') counts.warn += 1;
    else counts.skip += 1;
  });

  const scored = items.filter((it) => it.severity !== 'opsional' && it.status !== 'skip');
  const score =
    scored.length === 0
      ? 0
      : Math.round((scored.filter((it) => it.status === 'pass').length / scored.length) * 100);

  return { items, summary: { ...counts, score }, blockers: [...new Set(blockers)] };
}
