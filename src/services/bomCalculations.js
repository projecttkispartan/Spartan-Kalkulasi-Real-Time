/**
 * Single source of truth — kalkulasi BOM untuk UI & export.
 */
import {
  expandProsesList as expandProsesListBase,
  computePartCostRow,
  computePartsTotals,
  rollupTreeCosts,
  buildNodeRollupMap,
} from '../utils/bomCostRollup.js';
import { calcProsesCosts } from '../utils/operationCosts.js';
import { flattenProsesLineItems, sumProsesLineItems } from '../utils/prosesLineItems.js';
import {
  SUMMARY_COST_CATEGORIES,
  mfgProcessToSummaryKey,
} from '../data/excelReference.js';
import { resolveProductCoatingCost } from '../utils/masterLookup.js';
import { applyRoundingForTarget } from '../utils/roundingEngine.js';

const LIVE_OPTIONS = { allowEstimateFallback: false };

export { computePartCostRow, computePartsTotals, rollupTreeCosts, buildNodeRollupMap };

export function expandProsesList(nodeData, options = LIVE_OPTIONS) {
  return expandProsesListBase(nodeData, { ...LIVE_OPTIONS, ...options });
}

export function convertIdrToUsdEur(amount, kursUsd, kursEur) {
  const v = Number(amount) || 0;
  const usd = Number(kursUsd) ? (v / kursUsd).toFixed(2) : '0.00';
  const eur = Number(kursEur) ? (v / kursEur).toFixed(2) : '0.00';
  return { idr: v, usd, eur };
}

/**
 * PART: harga material aktif dari field biaya; proses dari operasi part.
 * MODUL / SUBMODUL: material & proses = rollup anak (+ operasi pada node induk).
 */
export function computeNodeDisplayFinancials(d, rollup, kursUsd, kursEur) {
  if (d.tipe === 'PART') {
    return { ...computePartDisplayFinancials(d, kursUsd, kursEur), isRollup: false };
  }
  if (!rollup) return null;
  const prodTotal = rollup.biayaProduksi || 0;
  const matTotal = rollup.matAdjusted || 0;
  const fxMat = convertIdrToUsdEur(matTotal, kursUsd, kursEur);
  const fxProd = convertIdrToUsdEur(prodTotal, kursUsd, kursEur);
  return {
    ...rollup,
    unitMat: 0,
    matAdjusted: matTotal,
    usdMat: fxMat.usd,
    eurMat: fxMat.eur,
    prodTotal,
    prodUnit: prodTotal,
    usdProd: fxProd.usd,
    eurProd: fxProd.eur,
    usdProdUnit: fxProd.usd,
    eurProdUnit: fxProd.eur,
    isRollup: true,
  };
}

/** Display row: material unit + production total/unit (matAdjusted + proses) */
export function computePartDisplayFinancials(d, kursUsd, kursEur) {
  const row = computePartCostRow(d);
  const qty = row.qty || 1;
  const prodUnit = qty ? row.biayaProduksi / qty : row.biayaProduksi;
  const fx = convertIdrToUsdEur(prodUnit, kursUsd, kursEur);
  const unitMat = Number(d.biaya) || 0;
  const fxMat = convertIdrToUsdEur(unitMat, kursUsd, kursEur);
  const fxProd = convertIdrToUsdEur(row.biayaProduksi, kursUsd, kursEur);
  return {
    ...row,
    unitMat,
    usdMat: fxMat.usd,
    eurMat: fxMat.eur,
    prodTotal: row.biayaProduksi,
    prodUnit,
    usdProd: fxProd.usd,
    eurProd: fxProd.eur,
    usdProdUnit: fx.usd,
    eurProdUnit: fx.eur,
  };
}

export function computePackingTotals(packingSpec = {}) {
  const sumMat = (list) =>
    (list || []).reduce((s, m) => s + (Number(m.qty) || 0) * (Number(m.harga) || 0), 0);
  const sumRout = (list) =>
    (list || []).reduce(
      (s, r) => s + (Number(r.waktu) || 0) * (Number(r.pekerja) || 0) * (Number(r.rate) || 0),
      0,
    );

  const packBoxMat = sumMat(packingSpec.materialsBox);
  const packSfMat = sumMat(packingSpec.materialsSF);
  const packBoxLab = sumRout(packingSpec.routingBox);
  const packSfLab = sumRout(packingSpec.routingSF);

  return {
    packBoxMat,
    packSfMat,
    packBoxLab,
    packSfLab,
    packMat: packBoxMat + packSfMat,
    packLab: packBoxLab + packSfLab,
    packGrand: packBoxMat + packSfMat + packBoxLab + packSfLab,
  };
}

export function computeCogs({
  bomData,
  cogsConfig = {},
  packingTotals,
  productMeta = {},
}) {
  const parts = computePartsTotals(bomData);
  const totalMaterial = parts.matAdjusted;
  const totalProcess = parts.prosesTotal;
  const { coatingCost, surfaceM2 } = resolveProductCoatingCost(bomData, productMeta);
  const useCoating =
    cogsConfig.includeCoatingInCogs !== false &&
    cogsConfig.includeCoatingInCogs !== 'false';
  const coatingForCogs = useCoating ? coatingCost : 0;

  const jalur = cogsConfig.packingJalur === 'SF' ? 'SF' : 'BOX';
  const packingMat = jalur === 'BOX' ? packingTotals.packBoxMat : packingTotals.packSfMat;
  const packingLab = jalur === 'BOX' ? packingTotals.packBoxLab : packingTotals.packSfLab;
  const packingCost = packingMat + packingLab;

  const productionCost = totalMaterial + totalProcess + packingCost + coatingForCogs;
  const factoryOhPct = Number(cogsConfig.factoryOhPct) || 0;
  const managementOhPct = Number(cogsConfig.managementOhPct) || 0;
  const markupPct = Number(cogsConfig.markupPct) || 0;

  const factoryOh = productionCost * (factoryOhPct / 100);
  const managementOh = productionCost * (managementOhPct / 100);
  const totalCogs = productionCost + factoryOh + managementOh;
  const sellingPriceRaw = totalCogs * (1 + markupPct / 100);
  const sellingPrice = applyRoundingForTarget('sellingPrice', sellingPriceRaw);

  return {
    totalMaterial,
    totalProcess,
    coatingCost: coatingForCogs,
    coatingCostDetail: coatingCost,
    coatingSurfaceM2: surfaceM2,
    packingMat,
    packingLab,
    packingCost,
    packingJalur: jalur,
    productionCost,
    factoryOh,
    managementOh,
    totalCogs,
    sellingPrice,
    sellingPriceRaw,
    parts,
  };
}

export function computeSummaryFromParts(parts) {
  return {
    material: parts.matAdjusted,
    process: parts.prosesTotal,
    production: parts.matAdjusted + parts.prosesTotal,
    partCount: 0,
    modulCount: 0,
  };
}

export function computeSummaryFromBom(bomData, flatNodes) {
  const parts = computePartsTotals(bomData);
  let partCount = 0;
  let modulCount = 0;
  (flatNodes || []).forEach((node) => {
    if (node.data?.tipe === 'PART') partCount++;
    if (node.data?.tipe === 'MODUL') modulCount++;
  });
  return {
    material: parts.matAdjusted,
    process: parts.prosesTotal,
    total: parts.matAdjusted + parts.prosesTotal,
    production: parts.matAdjusted + parts.prosesTotal,
    partCount,
    modulCount,
  };
}

export function computeMaterialTabTotals(flatNodes) {
  let material = 0;
  let materialBase = 0;
  let partCount = 0;
  let totalQty = 0;
  flatNodes.forEach((node) => {
    if (node.data?.tipe !== 'PART') return;
    partCount++;
    const r = computePartCostRow(node.data);
    material += r.matAdjusted;
    materialBase += r.matBase;
    totalQty += Number(node.data.qty) || 0;
  });
  return { material, materialBase, partCount, totalQty };
}

export function collectProsesEntries(flatNodes) {
  const result = [];
  flatNodes.forEach((node) => {
    expandProsesList(node.data).forEach((p) => {
      result.push({
        ...p,
        nodeId: node.id,
        nodeNama: node.data.nama,
        nodeKode: node.data.kode,
      });
    });
  });
  return result;
}

export function computeProsesSummary(allProses) {
  const summary = {};
  let totalWaktu = 0;
  let totalMesin = 0;
  let totalPekerja = 0;
  let grandTotal = 0;

  allProses.forEach((p) => {
    const mfg = p.mfgProcess || 'Lainnya';
    if (!summary[mfg]) summary[mfg] = { waktu: 0, mesin: 0, pekerja: 0, total: 0, count: 0 };
    const { waktu, mesin, pekerja, total } = calcProsesCosts(p);
    summary[mfg].count += 1;
    summary[mfg].waktu += waktu;
    summary[mfg].mesin += mesin;
    summary[mfg].pekerja += pekerja;
    summary[mfg].total += total;
    totalWaktu += waktu;
    totalMesin += mesin;
    totalPekerja += pekerja;
    grandTotal += total;
  });

  return {
    items: Object.entries(summary).map(([name, data]) => ({ name, ...data })),
    totalWaktu,
    totalMesin,
    totalPekerja,
    grandTotal,
  };
}

export { flattenProsesLineItems, sumProsesLineItems };

/** Rollup SUMMARY COST — paritas Excel */
export function computeSummaryCostRollup({ bomData, cogsData, cogsConfig }) {
  const materialByKey = {};
  const processByKey = {};

  const initKeys = () => {
    SUMMARY_COST_CATEGORIES.forEach((c) => {
      if (!c.isSubtotal) materialByKey[c.key] = 0;
    });
    ['finishing', 'coating', 'upholstery', 'assembly', 'qc', 'lain', 'packing'].forEach((k) => {
      processByKey[k] = 0;
    });
  };
  initKeys();

  const walk = (node) => {
    if (node.tipe === 'PART') {
      const row = computePartCostRow(node);
      const mt = node.materialType || 'lain';
      if (materialByKey[mt] !== undefined) materialByKey[mt] += row.matAdjusted;
      else if (materialByKey.komponen !== undefined) materialByKey.komponen += row.matAdjusted;

      expandProsesList(node).forEach((p) => {
        const key = mfgProcessToSummaryKey(p.mfgProcess);
        processByKey[key] = (processByKey[key] || 0) + calcProsesCosts(p).total;
      });
      return;
    }
    (node.children || []).forEach(walk);
  };
  walk(bomData);

  const rawMaterialSum = Object.entries(materialByKey)
    .filter(([k]) => !['rawProduction', 'factoryProcessing', 'packing'].includes(k))
    .reduce((s, [, v]) => s + v, 0);

  const jalur = cogsConfig?.packingJalur === 'SF' ? 'SF' : 'BOX';
  processByKey.packing = cogsData?.packingCost ?? 0;
  if (cogsData?.coatingCost > 0) {
    processByKey.coating = (processByKey.coating || 0) + cogsData.coatingCost;
  }

  const rows = SUMMARY_COST_CATEGORIES.map((cat) => {
    if (cat.key === 'rawProduction') {
      return { ...cat, amount: rawMaterialSum };
    }
    if (cat.key === 'factoryProcessing') {
      return { ...cat, amount: cogsData?.factoryOh ?? 0 };
    }
    if (cat.isSubtotal) return { ...cat, amount: 0 };
    if (materialByKey[cat.key] !== undefined) {
      return { ...cat, amount: materialByKey[cat.key] };
    }
    if (processByKey[cat.key] !== undefined) {
      return { ...cat, amount: processByKey[cat.key] };
    }
    return { ...cat, amount: 0 };
  });

  return { rows, materialByKey, processByKey, jalur };
}

export function validatePartsForExport(flatNodes) {
  const errors = [];
  flatNodes.forEach((node) => {
    const d = node.data;
    if (d?.tipe !== 'PART') return;
    if (!d.kode?.trim()) errors.push(`Part baris ${d.no ?? '?'}: kode wajib`);
    if (!d.nama?.trim()) errors.push(`Part ${d.kode || '?'}: nama wajib`);
    if (!(Number(d.qty) > 0)) errors.push(`Part ${d.kode || '?'}: qty wajib > 0`);
    if (!d.materialType) errors.push(`Part ${d.kode || '?'}: tipe material wajib`);
  });
  return errors;
}
