import { getCachedMaterials, getCachedNonWoodMaterials, getCachedWasteRatios, getCachedCoatings } from '../services/masterStorage.js';
import { evalFormula } from './formulaEngine.js';

function allMaterials() {
  return [...getCachedMaterials(), ...getCachedNonWoodMaterials()];
}

/**
 * Biaya material per pcs dari DATA BASE: harga/m³ × volume part (m³)
 * + WF% dari MASTER RATIO (default kayu 30%)
 */
export function computeWoodBiayaFromMaster(partData, materialId) {
  const materials = allMaterials();
  const ratios = getCachedWasteRatios();
  const mat = materials.find((m) => m.id === materialId || m.specification === materialId);
  if (!mat) return null;

  const vol = Number(partData.vol) || 0;
  if (!vol) return null;

  const priceM3 =
    Number(mat.hargaMaterialSupplier) ||
    Number(mat.pricePerM3Supplier) ||
    Number(mat.hargaMaterialBuyer) ||
    Number(mat.pricePerM3Buyer) ||
    0;
  const ratio = ratios.find((r) => r.materialType === 'kayu' && r.aktif !== false) || { sf: 0, wf: 30 };
  const sf = Number(ratio.sf) || 0;
  const wf = Number(ratio.wf) ?? 30;

  const biaya = evalFormula('wood_material_cost', { pricePerM3: priceM3, vol, sf, wf });

  return {
    biaya: biaya ?? Math.round(priceM3 * vol * (1 + sf / 100 + wf / 100)),
    matBase: Math.round(priceM3 * vol),
    sf,
    wf,
    material: mat,
    pricePerM3: priceM3,
  };
}

export function findMaterialBySpec(specText) {
  const q = String(specText || '').trim().toUpperCase();
  if (!q) return null;
  const materials = allMaterials();

  const exactSpec = materials.find((m) => m.specification?.toUpperCase() === q);
  if (exactSpec) return exactSpec;

  const exactName = materials.find((m) => m.woodName?.toUpperCase() === q);
  if (exactName) return exactName;

  const partial = materials.filter(
    (m) =>
      m.specification?.toUpperCase().includes(q) ||
      q.includes(m.specification?.toUpperCase()) ||
      `${m.woodName}`.toUpperCase() === q,
  );

  if (partial.length === 1) return partial[0];
  if (partial.length > 1) {
    partial.sort((a, b) => (b.specification?.length || 0) - (a.specification?.length || 0));
    return partial[0];
  }

  return null;
}

export function findCoatingByName(name) {
  const q = String(name || '').trim().toUpperCase();
  if (!q) return null;
  const coatings = getCachedCoatings();
  const exact = coatings.find((c) => c.name?.toUpperCase() === q);
  if (exact) return exact;
  const partial = coatings.filter(
    (c) => c.name?.toUpperCase().includes(q) || q.includes(c.name?.toUpperCase()),
  );
  if (partial.length === 1) return partial[0];
  return partial.sort((a, b) => (b.name?.length || 0) - (a.name?.length || 0))[0] || null;
}

export function getWasteRatioForMaterialType(materialType) {
  const ratios = getCachedWasteRatios();
  return (
    ratios.find((r) => r.materialType === materialType && r.aktif !== false) ||
    ratios.find((r) => r.category === materialType) ||
    { sf: 0, wf: 0 }
  );
}

export function applyMasterToWoodPart(partData, woodGradeId) {
  const result = computeWoodBiayaFromMaster(partData, woodGradeId);
  if (!result) return partData;
  return {
    ...partData,
    woodGradeId: result.material.id,
    woodSpecification: result.material.specification,
    materialType: 'kayu',
    biaya: result.biaya,
    sf: result.sf,
    wf: result.wf,
  };
}

export function listActiveWoodMaterials() {
  return getCachedMaterials().filter((m) => m.aktif !== false && m.materialType === 'kayu');
}

export function listActiveCoatings() {
  return getCachedCoatings().filter((c) => c.aktif !== false);
}

/**
 * Isi otomatis dari DATA BASE berdasarkan nama/kode node atau info produk.
 * Dipakai saat load project, edit nama di struktur BOM, atau sinkron manual.
 */
export function enrichNodeFromMaster(node, { productInfo, productMeta } = {}) {
  if (!node) return node;

  let n = { ...node };

  if (n.tipe === 'MODUL') {
    const pi = productInfo || {};
    if (pi.kode && !String(n.kode || '').trim()) n.kode = pi.kode;
    const productName = pi.namaBom || pi.nama;
    if (productName && !String(n.nama || '').trim()) n.nama = productName;
  }

  const lookupTexts = [
    n.woodSpecification,
    n.nama,
    n.kode,
    productMeta?.wood,
  ].filter((t) => t && String(t).trim());

  for (const text of lookupTexts) {
    const mat = findMaterialBySpec(text);
    if (mat) {
      const ratio = getWasteRatioForMaterialType(mat.materialType || 'kayu');
      const spec = mat.specification || text;
      const namaLooksLikeGrade =
        !n.nama ||
        n.nama === text ||
        findMaterialBySpec(n.nama) ||
        String(n.nama).toUpperCase().includes(mat.woodName?.toUpperCase() || '');

      n = {
        ...n,
        woodGradeId: mat.id,
        woodSpecification: spec,
        materialType: mat.materialType || 'kayu',
        nama: namaLooksLikeGrade ? spec : n.nama,
        sf: n.sf != null && n.sf !== '' ? n.sf : ratio.sf,
        wf: n.wf != null && n.wf !== '' ? n.wf : ratio.wf,
      };
      return n;
    }
  }

  for (const text of lookupTexts) {
    const coat = findCoatingByName(text);
    if (coat) {
      n = {
        ...n,
        coatingId: coat.id,
        materialType: n.materialType || 'finishing',
      };
      return n;
    }
  }

  return n;
}

/** Biaya coating dari COATING RATIO × luas m² */
export function computeCoatingCost(coatingId, surfaceM2) {
  const m2 = Number(surfaceM2) || 0;
  if (!m2 || !coatingId) return 0;
  const coat = getCachedCoatings().find((c) => c.id === coatingId);
  if (!coat) return 0;
  const rate = Number(coat.roundedCostM2) || Number(coat.totalProductionM2) || 0;
  return evalFormula('coating_cost', { surfaceM2: m2, roundedCostM2: rate }) ?? Math.round(m2 * rate);
}

const COATING_PART_TYPES = new Set(['finishing', 'coating', 'veneer']);

function partSurfaceM2(part) {
  const explicit = Number(part.surfaceM2);
  if (explicit > 0) return explicit;
  const p = Number(part.p) || 0;
  const l = Number(part.l) || 0;
  const t = Number(part.t) || 0;
  if (p && l && t) {
    return evalFormula('surface_m2_estimate', { p, l, t }) ?? 0;
  }
  return 0;
}

/** Agregasi luas m² part finishing/coating untuk biaya produk */
export function aggregateCoatingSurfaceM2(bomData, { coatingId } = {}) {
  let total = 0;
  const walk = (node) => {
    if (node.tipe === 'PART') {
      const mt = String(node.materialType || '').toLowerCase();
      const isCoatingPart =
        COATING_PART_TYPES.has(mt) || (coatingId && node.coatingId === coatingId);
      if (isCoatingPart) {
        total += partSurfaceM2(node) * (Number(node.qty) || 1);
      }
    }
    (node.children || []).forEach(walk);
  };
  if (bomData) walk(bomData);
  return total;
}

function aggregateAllPartSurfaceM2(bomData) {
  let total = 0;
  const walk = (node) => {
    if (node.tipe === 'PART') {
      total += partSurfaceM2(node) * (Number(node.qty) || 1);
    }
    (node.children || []).forEach(walk);
  };
  if (bomData) walk(bomData);
  return total;
}

export function resolveProductCoatingCost(bomData, productMeta) {
  const coatingId = productMeta?.coatingId;
  if (!coatingId) return { coatingCost: 0, surfaceM2: 0 };
  const byType = aggregateCoatingSurfaceM2(bomData, { coatingId });
  const allParts = aggregateAllPartSurfaceM2(bomData);
  const fallbackM2 = Number(productMeta?.surfaceM2Coating) || 0;
  const m2 = Math.max(byType, allParts, fallbackM2);
  return {
    surfaceM2: m2,
    coatingCost: computeCoatingCost(coatingId, m2),
  };
}
