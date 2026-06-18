/**
 * Insight COGS — breakdown part, pie production, deviasi Excel, catatan penyebab.
 * Dipakai UI (tab COGS) dan scripts/diagnoseSampleCogsBreakdown.mjs.
 */
import { computeCogs, computePackingTotals } from '../services/bomCalculations.js';
import { computePartCostRow } from './bomCostRollup.js';
import {
  EXCEL_PARITY_TOLERANCE_IDR,
  EXCEL_PARITY_TOLERANCE_PCT,
} from '../data/excelParityChecklist.js';
import { PROCESS_SUMMARY_WHITELIST, dedupeSummaryCostLines } from './excelWorkbookParsers.js';
import { CURATED_SAMPLE_KEYS } from './emptyProject.js';

export const COGS_PART_GROUPS = [
  'excel-summary',
  'template-excel',
  'template-master',
  'template-other',
];

const PIE_COLORS = {
  material: '#3b82f6',
  process: '#f97316',
  packing: '#22c55e',
  coating: '#a855f7',
};

function normLabel(s) {
  return String(s ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

export function isExcelSummaryPart(node, parentKode) {
  const kode = String(node.kode || '').trim();
  if (kode.startsWith('EXCEL-')) return true;
  if (parentKode === 'EXCEL-SUMMARY') return true;
  return false;
}

export function classifyPart(node, parentKode) {
  if (isExcelSummaryPart(node, parentKode)) return 'excel-summary';
  if (node.biayaFromExcel && Number(node.biaya) > 0) return 'template-excel';
  const hasBiaya = Number(node.biaya) > 0;
  const hasGrade = Boolean(node.woodGradeId);
  const hasProses = (node.proses?.length || 0) > 0 || (node.proses_count || 0) > 0;
  if (!hasBiaya && !hasProses && !hasGrade) return 'template-other';
  return 'template-master';
}

export function walkBomParts(node, parentKode, onPart) {
  const pk =
    node?.tipe === 'SUBMODUL' && String(node.kode || '').trim() === 'EXCEL-SUMMARY'
      ? 'EXCEL-SUMMARY'
      : parentKode;

  if (node?.tipe === 'PART') {
    onPart(node, pk);
    return;
  }
  const nextParent =
    node?.tipe === 'SUBMODUL' && String(node.kode || '').trim() === 'EXCEL-SUMMARY'
      ? 'EXCEL-SUMMARY'
      : parentKode;
  (node?.children || []).forEach((ch) => walkBomParts(ch, nextParent, onPart));
}

export function countBomParts(node) {
  if (!node) return 0;
  let n = node.tipe === 'PART' ? 1 : 0;
  for (const child of node.children || []) {
    n += countBomParts(child);
  }
  return n;
}

function emptyGroupAgg() {
  return { partCount: 0, material: 0, process: 0, partTotal: 0, parts: [] };
}

function withinTolerance(actual, expected, strictPct) {
  if (!expected || expected <= 0) {
    return { ok: false, diffIdr: 0, diffPct: 0 };
  }
  const diffIdr = (Number(actual) || 0) - expected;
  const diffPct = Math.abs(diffIdr) / expected;
  const pctTol = strictPct ?? EXCEL_PARITY_TOLERANCE_PCT;
  const ok =
    Math.abs(diffIdr) <= Math.max(EXCEL_PARITY_TOLERANCE_IDR, expected * pctTol);
  return { ok, diffIdr, diffPct };
}

function deviationStatus(diffPct, ok, strictPct) {
  if (ok) return 'pass';
  if (diffPct <= 0.08 && !strictPct) return 'warn';
  if (diffPct <= strictPct) return 'pass';
  return diffPct <= 0.08 ? 'warn' : 'fail';
}

/** Baris proses SUMMARY duplikat (blok kedua sheet) */
export function findDuplicateSummaryProcessLabels(summaryLines) {
  if (!summaryLines?.length) return [];
  const byLabel = new Map();
  for (const ln of summaryLines) {
    const label = normLabel(ln.label);
    if (!PROCESS_SUMMARY_WHITELIST.has(label)) continue;
    if (!byLabel.has(label)) byLabel.set(label, []);
    byLabel.get(label).push(ln);
  }
  const dupes = [];
  for (const [label, entries] of byLabel) {
    if (entries.length < 2) continue;
    entries.sort((a, b) => (a.excelRow || 0) - (b.excelRow || 0));
    const primary = entries[0];
    for (let i = 1; i < entries.length; i++) {
      const extra = entries[i];
      const total = Number(extra.total) || 0;
      dupes.push({
        label,
        excelRow: extra.excelRow,
        total: Math.round(total),
        primaryRow: primary.excelRow,
      });
    }
  }
  return dupes;
}

function buildPieSlices(material, process, packing, coatingInCogs, fobExport, total) {
  const slices = [
    { id: 'material', label: 'Material', amount: material, color: PIE_COLORS.material },
    { id: 'process', label: 'Proses', amount: process, color: PIE_COLORS.process },
    { id: 'packing', label: 'Packing', amount: packing, color: PIE_COLORS.packing },
  ];
  if (coatingInCogs > 0) {
    slices.push({
      id: 'coating',
      label: 'Coating',
      amount: coatingInCogs,
      color: PIE_COLORS.coating,
    });
  }
  if (fobExport > 0) {
    slices.push({
      id: 'fob',
      label: 'FOB Export',
      amount: fobExport,
      color: '#8b5cf6',
    });
  }
  const denom = total > 0 ? total : slices.reduce((s, x) => s + x.amount, 0);
  return slices.map((s) => ({
    ...s,
    amount: Math.round(s.amount),
    pct: denom > 0 ? s.amount / denom : 0,
  }));
}

function buildDeviationNotes(ctx) {
  const notes = [];
  const {
    counts,
    duplicateSummaryLabels,
    cogs,
    excelCompare,
    coating,
    importedFromExcel,
    groups,
    cogsMode,
  } = ctx;

  const isHybrid =
    counts.excelSummaryParts > 0 && counts.templateExcelParts > 0;
  const masterInExcelFixed =
    cogsMode === 'excel-fixed' && (groups['template-master']?.partCount || 0) > 0;

  if (isHybrid) {
    notes.push(
      `Model hybrid: ${counts.templateExcelParts} part dari CALCULATION (biayaFromExcel) + ${counts.excelSummaryParts} part proses SUMMARY (EXCEL-*) — risiko double-count.`,
    );
  }
  if (cogsMode === 'excel-fixed' && masterInExcelFixed) {
    notes.push(
      `Mode Excel Fixed: ${groups['template-master'].partCount} part dihitung ulang dari master — campur sumber biaya.`,
    );
  }

  if (duplicateSummaryLabels.length > 0) {
    const infl = duplicateSummaryLabels.reduce((s, d) => s + d.total, 0);
    const labels = [...new Set(duplicateSummaryLabels.map((d) => d.label))].join(', ');
    notes.push(
      `Sheet SUMMARY punya baris proses duplikat (${labels}) — perkiraan inflasi ~Rp ${infl.toLocaleString('id-ID')} jika dijadikan part BOM.`,
    );
  }

  const prodDiff = excelCompare.production;
  if (prodDiff.comparable && prodDiff.diffPct > 0.08) {
    if (prodDiff.diffIdr > 0) {
      notes.push(
        'App di atas Excel — cek part EXCEL-* dan baris SUMMARY duplikat di pohon BOM.',
      );
    } else {
      notes.push(
        'App di bawah Excel — cek labor KAYU / proses belum dialokasi ke part; pertimbangkan seed terkurati.',
      );
    }
  }

  if (
    coating.detail > 10000 &&
    coating.inCogs === 0 &&
    !notes.some((n) => n.includes('Coating'))
  ) {
    notes.push(
      `Coating di detail Rp ${Math.round(coating.detail).toLocaleString('id-ID')} tidak masuk production (includeCoatingInCogs=false).`,
    );
  }

  const masterCount = groups['template-master']?.partCount || 0;
  if (importedFromExcel && masterCount > 0 && !excelCompare.comparable) {
    notes.push(
      `${masterCount} part dihitung dari master tanpa mirror Excel lengkap — banding manual ke SUMMARY COST.`,
    );
  }

  let suggestedAction =
    'Siap bandingkan dengan baris SUMMARY COST di Excel mirror.';
  if (prodDiff.status === 'fail' || excelCompare.totalCogs?.status === 'fail') {
    suggestedAction =
      'Jalankan kalibrasi seed (QA) atau sesuaikan BOM: satu jalur — rollup part terkurati atau mirror SUMMARY, jangan keduanya.';
  } else if (prodDiff.status === 'pass' && excelCompare.totalCogs?.status === 'pass') {
    suggestedAction = 'Siap bandingkan dengan Excel SUMMARY COST (≤1,5%).';
  }

  return { notes: notes.slice(0, 5), suggestedAction };
}

function compareMetric(app, excel, strictPct) {
  const { ok, diffIdr, diffPct } = withinTolerance(app, excel, strictPct);
  return {
    app: Math.round(app),
    excel: Math.round(excel),
    diffIdr: Math.round(diffIdr),
    diffPct,
    status: excel > 0 ? deviationStatus(diffPct, ok, strictPct) : 'skip',
  };
}

const SUMMARY_SUBTOTAL_LABELS = new Set([
  'RAW PRODUCTION COST',
  'FACTORY PROCESSING COST',
  'PRODUCTION COST',
  'COST OF GOOD SOLD',
  'COST OF GOODS SOLD',
  'MATERIAL COST',
  'BOX PACKING',
  'SINGLE FACE PACKING',
]);

function partMatchesSummaryLine(part, line) {
  const label = normLabel(line.label);
  const kode = String(part.kode || '').trim();
  if (kode.startsWith('EXCEL-')) {
    const partKey = kode.slice(6).toLowerCase().replace(/-/g, '_');
    const lineKey = String(line.key || '').toLowerCase();
    if (partKey === lineKey) return true;
    if (partKey.replace(/_/g, '') === lineKey.replace(/_/g, '')) return true;
  }
  const mt = String(part.materialType || '').toLowerCase();
  const nama = String(part.nama || '').toUpperCase();
  if (label === 'KAYU') return mt === 'kayu';
  if (label === 'PLYWOOD') return mt === 'plywood';
  if (label === 'MDF') return mt === 'mdf';
  if (label === 'VENEER' || label.includes('LAMINAT')) {
    return mt === 'veneer' || mt === 'finishing' || nama.includes('LAMIN');
  }
  if (label.includes('HARDWARE') || label.includes('FITTING') || label.includes('ASSEMBL')) {
    return mt === 'hardware';
  }
  if (label.includes('AMPLAS') || label.includes('FINISH') || label.includes('GERINDA')) {
    return mt === 'finishing' || mt === 'coating';
  }
  if (label.includes('UPHOLST')) return mt === 'upholstery' || mt === 'fabric';
  if (label.includes('QC') || label.includes('LAIN')) return false;
  return false;
}

function aggregatePartsForSummaryLines(bomData, summaryLines) {
  const lines = dedupeSummaryCostLines(summaryLines || []).filter(
    (ln) => !SUMMARY_SUBTOTAL_LABELS.has(normLabel(ln.label)),
  );
  const buckets = new Map(
    lines.map((ln) => [
      normLabel(ln.label),
      { material: 0, process: 0, total: 0, partCount: 0 },
    ]),
  );
  const unallocated = { material: 0, process: 0, total: 0, partCount: 0 };

  walkBomParts(bomData, null, (part) => {
    const row = computePartCostRow(part);
    let matched = false;
    for (const ln of lines) {
      if (partMatchesSummaryLine(part, ln)) {
        const b = buckets.get(normLabel(ln.label));
        b.material += row.matAdjusted;
        b.process += row.prosesTotal;
        b.total += row.biayaProduksi;
        b.partCount += 1;
        matched = true;
        break;
      }
    }
    if (!matched) {
      unallocated.material += row.matAdjusted;
      unallocated.process += row.prosesTotal;
      unallocated.total += row.biayaProduksi;
      unallocated.partCount += 1;
    }
  });

  for (const b of buckets.values()) {
    b.material = Math.round(b.material);
    b.process = Math.round(b.process);
    b.total = Math.round(b.total);
  }
  unallocated.material = Math.round(unallocated.material);
  unallocated.process = Math.round(unallocated.process);
  unallocated.total = Math.round(unallocated.total);

  return { lines, buckets, unallocated };
}

function summaryLineHint(label) {
  const u = normLabel(label);
  if (u === 'KAYU') return 'Tab Material · part kayu (P×L×T, grade, SF/WF)';
  if (u.includes('LAMINAT') || u === 'VENEER') return 'Tab Material · veneer/laminating';
  if (u.includes('HARDWARE') || u.includes('FITTING') || u.includes('ASSEMBL')) {
    return 'Tab Material / Proses · hardware';
  }
  if (u.includes('AMPLAS') || u.includes('FINISH') || u.includes('GERINDA')) {
    return 'Tab Proses · finishing / coating';
  }
  if (u.includes('PACKING')) return 'Tab Container · packing';
  return 'Tab Material / Proses';
}

function componentHint(id) {
  const hints = {
    material: 'Tab Material · Σ biaya material part',
    process: 'Tab Proses · routing WC per part',
    packing: 'Tab Container · material + TK packing (jalur aktif)',
    coating: 'Config COGS · includeCoatingInCogs + coating produk',
    fob: 'Config COGS · FOB export',
    factoryOh: 'Config COGS · Factory OH %',
    managementOh: 'Config COGS · Management OH %',
    rawProduction: 'Sheet SUMMARY · baris RAW PRODUCTION (informasi)',
  };
  return hints[id] || '—';
}

/**
 * Breakdown deviasi per komponen production + baris SUMMARY COST.
 * @returns {{ productionComponents: object[], summaryLines: object[], unallocated: object|null }}
 */
export function buildExcelDeviationBreakdown({
  bomData,
  cogs,
  cogsConfig = {},
  excelMirror = null,
  strictPct = null,
}) {
  const excel = excelMirror?.summaryCost || {};
  if (!excel.productionCost || !excel.totalCogs) {
    return { productionComponents: [], summaryLines: [], unallocated: null };
  }

  const jalur = cogsConfig.packingJalur === 'SF' ? 'SF' : 'BOX';
  const packingExcel = jalur === 'SF' ? excel.packingSf : excel.packingBox;
  const excelPackTotal = Number(packingExcel?.total) || 0;

  const { lines, buckets, unallocated } = aggregatePartsForSummaryLines(
    bomData,
    excel.lines,
  );

  let excelMatSum = 0;
  let excelProcSum = 0;
  for (const ln of lines) {
    excelMatSum += Number(ln.material) || 0;
    excelProcSum += (Number(ln.labor) || 0) + (Number(ln.machine) || 0);
  }

  const factoryOhPct = Number(excel.factoryOhPct ?? cogsConfig.factoryOhPct) || 0;
  const mgmtOhPct = Number(excel.managementOhPct ?? cogsConfig.managementOhPct) || 0;
  const excelProd = Number(excel.productionCost) || 0;
  const excelFactoryOh = Math.round(excelProd * (factoryOhPct / 100));
  const excelMgmtOh = Math.round(excelProd * (mgmtOhPct / 100));

  const rawLine = dedupeSummaryCostLines(excel.lines || []).find(
    (ln) => normLabel(ln.label) === 'RAW PRODUCTION COST',
  );

  const productionComponents = [
    {
      id: 'material',
      label: 'Material (Σ part)',
      hint: componentHint('material'),
      ...compareMetric(cogs.totalMaterial, excelMatSum, strictPct),
    },
    {
      id: 'process',
      label: 'Proses (Σ part)',
      hint: componentHint('process'),
      ...compareMetric(cogs.totalProcess, excelProcSum, strictPct),
    },
    {
      id: 'packing',
      label: `Packing ${jalur}`,
      hint: componentHint('packing'),
      ...compareMetric(cogs.packingCost, excelPackTotal, strictPct),
    },
  ];

  if ((cogs.coatingCostDetail || 0) > 0 || (cogs.coatingCost || 0) > 0) {
    productionComponents.push({
      id: 'coating',
      label: 'Coating (production)',
      hint: componentHint('coating'),
      ...compareMetric(cogs.coatingCost || 0, 0, strictPct),
      excelNote: 'Excel often excludes coating from production when includeCoatingInCogs=false',
    });
  }

  if ((cogs.fobExportCost || 0) > 0) {
    productionComponents.push({
      id: 'fob',
      label: 'FOB export',
      hint: componentHint('fob'),
      ...compareMetric(cogs.fobExportCost, 0, strictPct),
    });
  }

  if (rawLine) {
    productionComponents.push({
      id: 'rawProduction',
      label: 'RAW Production (info)',
      hint: componentHint('rawProduction'),
      app: Math.round(cogs.totalMaterial + cogs.totalProcess),
      excel: Math.round(Number(rawLine.total) || 0),
      diffIdr: Math.round(
        cogs.totalMaterial + cogs.totalProcess - (Number(rawLine.total) || 0),
      ),
      diffPct:
        rawLine.total > 0
          ? Math.abs(cogs.totalMaterial + cogs.totalProcess - rawLine.total) / rawLine.total
          : 0,
      status: 'skip',
    });
  }

  productionComponents.push(
    {
      id: 'factoryOh',
      label: `Factory OH (${factoryOhPct}%)`,
      hint: componentHint('factoryOh'),
      ...compareMetric(cogs.factoryOh, excelFactoryOh, strictPct),
    },
    {
      id: 'managementOh',
      label: `Management OH (${mgmtOhPct}%)`,
      hint: componentHint('managementOh'),
      ...compareMetric(cogs.managementOh, excelMgmtOh, strictPct),
    },
  );

  const summaryLines = lines.map((ln) => {
    const label = normLabel(ln.label);
    const appBucket = buckets.get(label) || { material: 0, process: 0, total: 0, partCount: 0 };
    const excelMaterial = Math.round(Number(ln.material) || 0);
    const excelProcess = Math.round((Number(ln.labor) || 0) + (Number(ln.machine) || 0));
    const excelTotal = Math.round(Number(ln.total) || excelMaterial + excelProcess);
    const matCmp = compareMetric(appBucket.material, excelMaterial, strictPct);
    const procCmp = compareMetric(appBucket.process, excelProcess, strictPct);
    const totalCmp = compareMetric(appBucket.total, excelTotal, strictPct);
    return {
      label: ln.label,
      key: ln.key,
      excelRow: ln.excelRow,
      hint: summaryLineHint(ln.label),
      partCount: appBucket.partCount,
      material: matCmp,
      process: procCmp,
      total: totalCmp,
      isProcessCategory: PROCESS_SUMMARY_WHITELIST.has(label),
    };
  });

  summaryLines.sort((a, b) => {
    const da = Math.abs(b.total.diffIdr);
    const db = Math.abs(a.total.diffIdr);
    return da - db;
  });

  return {
    productionComponents,
    summaryLines,
    unallocated: unallocated.partCount > 0 ? unallocated : null,
  };
}

/**
 * @param {object} params
 * @param {object} params.bomData
 * @param {object} params.cogsConfig
 * @param {object} [params.packingTotals]
 * @param {object} [params.productMeta]
 * @param {object} [params.excelMirror]
 * @param {boolean} [params.importedFromExcel]
 * @param {string} [params.cogsMode] — excel-fixed | live-master
 * @param {object} [params.cogsData] — jika sudah di-compute di UI
 * @param {string} [params.sampleKey] — untuk toleransi curated 1,5%
 */
export function buildCogsInsight({
  bomData,
  cogsConfig = {},
  packingTotals: packingTotalsIn,
  productMeta = {},
  excelMirror = null,
  importedFromExcel = false,
  cogsMode = 'live-master',
  cogsData: cogsDataIn = null,
  sampleKey = null,
}) {
  const packingTotals = packingTotalsIn || computePackingTotals({});
  const cogs =
    cogsDataIn ||
    computeCogs({
      bomData,
      cogsConfig,
      packingTotals,
      productMeta,
    });

  const strictPct = sampleKey && CURATED_SAMPLE_KEYS.has(sampleKey) ? 0.015 : null;

  const byGroup = Object.fromEntries(COGS_PART_GROUPS.map((g) => [g, emptyGroupAgg()]));
  let excelSummaryPartCount = 0;
  let templateExcelPartCount = 0;

  walkBomParts(bomData, null, (part, parentKode) => {
    const group = classifyPart(part, parentKode);
    const row = computePartCostRow(part);
    const g = byGroup[group];
    g.partCount += 1;
    g.material += row.matAdjusted;
    g.process += row.prosesTotal;
    g.partTotal += row.biayaProduksi;
    g.parts.push({
      kode: part.kode,
      nama: part.nama,
      group,
      material: Math.round(row.matAdjusted),
      process: Math.round(row.prosesTotal),
      partTotal: Math.round(row.biayaProduksi),
      biayaFromExcel: Boolean(part.biayaFromExcel),
    });
    if (group === 'excel-summary') excelSummaryPartCount += 1;
    if (group === 'template-excel') templateExcelPartCount += 1;
  });

  for (const g of COGS_PART_GROUPS) {
    byGroup[g].material = Math.round(byGroup[g].material);
    byGroup[g].process = Math.round(byGroup[g].process);
    byGroup[g].partTotal = Math.round(byGroup[g].partTotal);
    byGroup[g].parts.sort((a, b) => b.partTotal - a.partTotal);
    byGroup[g].top10 = byGroup[g].parts.slice(0, 10).map(({ parts: _p, ...rest }) => rest);
    delete byGroup[g].parts;
  }

  const material = Math.round(cogs.totalMaterial);
  const process = Math.round(cogs.totalProcess);
  const packing = Math.round(cogs.packingCost);
  const coatingInCogs = Math.round(cogs.coatingCost);
  const coatingDetail = Math.round(cogs.coatingCostDetail);
  const fobExport = Math.round(cogs.fobExportCost || 0);
  const productionTotal = Math.round(cogs.productionCost);

  const excel = excelMirror?.summaryCost || {};
  const excelProd = Number(excel.productionCost) || 0;
  const excelCogs = Number(excel.totalCogs) || 0;
  const comparable = excelProd > 0 && excelCogs > 0;

  let emptyReason =
    'Tidak ada referensi Excel. Upload file BOM Spartan (.xlsx) atau buka sample dengan mirror SUMMARY COST.';
  if (importedFromExcel && !comparable) {
    emptyReason =
      'Mirror SUMMARY COST belum lengkap — impor ulang workbook atau periksa sheet SUMMARY COST.';
  }

  const duplicateSummaryLabels = findDuplicateSummaryProcessLabels(excel.lines || []);

  const excelCompare = {
    comparable,
    emptyReason: comparable ? null : emptyReason,
    production: compareMetric(cogs.productionCost, excelProd, strictPct),
    totalCogs: compareMetric(cogs.totalCogs, excelCogs, strictPct),
    breakdown: comparable
      ? buildExcelDeviationBreakdown({
          bomData,
          cogs,
          cogsConfig,
          excelMirror,
          strictPct,
        })
      : null,
  };

  const hybridBlocked =
    cogsMode === 'excel-fixed' &&
    ((excelSummaryPartCount > 0 && templateExcelPartCount > 0) ||
      (byGroup['template-master']?.partCount || 0) > 0);
  if (hybridBlocked && comparable) {
    const hybridReason =
      'Mode Excel Fixed: campur part CALCULATION + SUMMARY/master — perbaiki BOM atau ubah ke Live Master.';
    if (excelCompare.production.status === 'pass') {
      excelCompare.production = {
        ...excelCompare.production,
        status: 'fail',
        hybridBlocked: true,
        reason: hybridReason,
      };
    }
    if (excelCompare.totalCogs.status === 'pass') {
      excelCompare.totalCogs = {
        ...excelCompare.totalCogs,
        status: 'fail',
        hybridBlocked: true,
        reason: hybridReason,
      };
    }
  }

  const counts = {
    excelSummaryParts: excelSummaryPartCount,
    templateExcelParts: templateExcelPartCount,
    totalParts: countBomParts(bomData),
  };

  const { notes, suggestedAction } = buildDeviationNotes({
    counts,
    duplicateSummaryLabels,
    cogs,
    excelCompare,
    coating: { inCogs: coatingInCogs, detail: coatingDetail },
    importedFromExcel,
    groups: byGroup,
    cogsMode,
  });

  return {
    production: {
      material,
      process,
      packing,
      coatingInCogs,
      coatingDetail,
      fobExport,
      total: productionTotal,
    },
    pieSlices: buildPieSlices(material, process, packing, coatingInCogs, fobExport, productionTotal),
    groups: byGroup,
    counts,
    excelCompare,
    duplicateSummaryLabels,
    notes,
    suggestedAction,
    cogsSummary: {
      totalMaterial: material,
      totalProcess: process,
      factoryOh: Math.round(cogs.factoryOh),
      managementOh: Math.round(cogs.managementOh),
      totalCogs: Math.round(cogs.totalCogs),
      packingJalur: cogs.packingJalur,
    },
  };
}

/** Format laporan diagnosa (kompatibel script lama) */
export function buildDiagnoseReportRow(manifestEntry, doc, cogsDataIn = null) {
  const packingTotals = computePackingTotals(doc.packingSpec);
  const insight = buildCogsInsight({
    bomData: doc.bomData,
    cogsConfig: doc.cogsConfig,
    packingTotals,
    productMeta: doc.productMeta,
    excelMirror: doc.excelMirror,
    importedFromExcel: doc.importedFromExcel,
    cogsMode: doc.cogsMode,
    cogsData: cogsDataIn,
    sampleKey: manifestEntry?.sampleKey,
  });

  const cogs =
    cogsDataIn ||
    computeCogs({
      bomData: doc.bomData,
      cogsConfig: doc.cogsConfig,
      packingTotals,
      productMeta: doc.productMeta,
    });

  const partsMaterial = COGS_PART_GROUPS.reduce((s, g) => s + insight.groups[g].material, 0);
  const partsProcess = COGS_PART_GROUPS.reduce((s, g) => s + insight.groups[g].process, 0);
  const partsTotal = COGS_PART_GROUPS.reduce((s, g) => s + insight.groups[g].partTotal, 0);

  return {
    sampleKey: manifestEntry.sampleKey,
    file: manifestEntry.file,
    partCountManifest: manifestEntry.partCount,
    partCountTree: insight.counts.totalParts,
    counts: insight.counts,
    groups: insight.groups,
    partsRollup: {
      material: partsMaterial,
      process: partsProcess,
      partTotal: partsTotal,
    },
    packing: {
      jalur: cogs.packingJalur || doc.cogsConfig?.packingJalur || 'BOX',
      material: Math.round(cogs.packingMat),
      labor: Math.round(cogs.packingLab),
      total: Math.round(cogs.packingCost),
      packBoxMat: Math.round(packingTotals.packBoxMat),
      packSfMat: Math.round(packingTotals.packSfMat),
    },
    coating: {
      inCogs: insight.production.coatingInCogs,
      detail: insight.production.coatingDetail,
    },
    overhead: {
      factoryOhPct: doc.cogsConfig?.factoryOhPct ?? 0,
      managementOhPct: doc.cogsConfig?.managementOhPct ?? 0,
      factoryOh: Math.round(cogs.factoryOh),
      managementOh: Math.round(cogs.managementOh),
    },
    app: {
      totalMaterial: insight.production.material,
      totalProcess: insight.production.process,
      productionCost: insight.production.total,
      totalCogs: insight.cogsSummary.totalCogs,
      sellingPrice: Math.round(cogs.sellingPrice),
    },
    excel: {
      productionCost: insight.excelCompare.production.excel,
      totalCogs: insight.excelCompare.totalCogs.excel,
    },
    deviation: {
      productionPct: insight.excelCompare.comparable
        ? insight.excelCompare.production.diffPct
        : null,
      cogsPct: insight.excelCompare.comparable
        ? insight.excelCompare.totalCogs.diffPct
        : null,
    },
    insight,
    reconcile: {
      partsPlusPackingPlusCoating:
        partsTotal + insight.production.packing + insight.production.coatingInCogs,
      cogsEngineProduction: insight.production.total,
    },
  };
}
