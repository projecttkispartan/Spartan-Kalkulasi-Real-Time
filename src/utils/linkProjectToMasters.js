import {
  getCachedMaterials,
  getCachedCoatings,
} from '../services/masterStorage.js';
import {
  findMaterialBySpec,
  findCoatingByName,
  applyMasterToWoodPart,
  enrichNodeFromMaster,
} from './masterLookup.js';
import { calcPartVolume } from './packingVolume.js';

/** Perbaiki vol part yang salah baca dari Excel (angka dimensi mm, bukan m³). */
export function normalizePartVolume(part) {
  if (!part || part.tipe !== 'PART') return part;
  const p = Number(part.p) || 0;
  const l = Number(part.l) || 0;
  const t = Number(part.t) || 0;
  if (!p || !l || !t) return part;

  const computed = calcPartVolume(p, l, t);
  if (!computed) return part;

  const vol = Number(part.vol) || 0;
  const looksLikeMmDim = [p, l, t].some((d) => Math.abs(vol - d) < 0.01);
  const tooLarge = vol > 0.05;
  if (!vol || tooLarge || looksLikeMmDim) {
    return { ...part, vol: computed };
  }
  return part;
}

/** Cocokkan grade kayu dari id / teks yang sudah ada di project */
export function resolveWoodGradeId({ woodGradeId, wood, woodSpecification } = {}) {
  const materials = getCachedMaterials();

  if (woodGradeId && materials.some((m) => m.id === woodGradeId)) {
    return woodGradeId;
  }

  const specCandidates = [woodSpecification, wood].filter(Boolean);
  for (const text of specCandidates) {
    const found = findMaterialBySpec(text);
    if (found) return found.id;
  }

  return woodGradeId || '';
}

export function resolveCoatingMeta({ coatingId, coating } = {}) {
  const coatings = getCachedCoatings();

  if (coatingId && coatings.some((c) => c.id === coatingId)) {
    const c = coatings.find((x) => x.id === coatingId);
    return { coatingId, coating: c?.name || coating || '' };
  }

  if (coating) {
    const c = findCoatingByName(coating);
    if (c) return { coatingId: c.id, coating: c.name };
  }

  return { coatingId: coatingId || '', coating: coating || '' };
}

function walkBomEnrich(node, ctx) {
  const { productMeta, productInfo, applyBiaya = false, skipBiayaIfExcel = false } = ctx;
  const defaultGradeId = resolveWoodGradeId(productMeta || {});

  let updated = enrichNodeFromMaster(node, { productInfo, productMeta });

  const gradeId =
    resolveWoodGradeId({
      woodGradeId: updated.woodGradeId,
      woodSpecification: updated.woodSpecification,
      wood: productMeta?.wood,
    }) ||
    (updated.tipe === 'PART' && !updated.woodGradeId ? defaultGradeId : updated.woodGradeId);

  if (gradeId) {
    const mat = getCachedMaterials().find((m) => m.id === gradeId);
    if (mat && (updated.materialType === 'kayu' || mat.materialType === 'kayu')) {
      updated = {
        ...updated,
        woodGradeId: gradeId,
        woodSpecification: updated.woodSpecification || mat.specification || '',
        materialType: 'kayu',
      };
    }
  }

  if (updated.tipe === 'PART') {
    updated = normalizePartVolume(updated);
  }

  const isWoodPart =
    updated.tipe === 'PART' &&
    (updated.materialType === 'kayu' || updated.woodGradeId) &&
    updated.woodGradeId;

  const skipBiaya = skipBiayaIfExcel && updated.biayaFromExcel && Number(updated.biaya) > 0;
  if (applyBiaya && isWoodPart && updated.vol && !skipBiaya) {
    updated = applyMasterToWoodPart(updated, updated.woodGradeId);
  }

  if (updated.children?.length) {
    return {
      ...updated,
      children: updated.children.map((ch) => walkBomEnrich(ch, ctx)),
    };
  }

  return updated;
}

/**
 * Hubungkan project yang sudah ada dengan master (combo + struktur BOM).
 * Default: hanya id + label, biaya part tidak di-overwrite.
 */
export function linkProjectToMasters(project, options = {}) {
  if (!project) return project;

  const woodGradeId = resolveWoodGradeId(project.productMeta || {});
  const coatingMeta = resolveCoatingMeta(project.productMeta || {});
  const mat = getCachedMaterials().find((m) => m.id === woodGradeId);

  const productMeta = {
    ...(project.productMeta || {}),
    woodGradeId,
    wood: mat?.specification || project.productMeta?.wood || '',
    coatingId: coatingMeta.coatingId,
    coating: coatingMeta.coating,
  };

  const bomData = project.bomData
    ? walkBomEnrich(structuredClone(project.bomData), {
        productMeta,
        productInfo: project.productInfo,
        ...options,
      })
    : project.bomData;

  return { ...project, productMeta, bomData };
}

/** Sinkron seluruh pohon BOM dari DATA BASE (nama → grade, tipe material, modul ← produk) */
export function enrichBomFromMasters(bomData, { productMeta, productInfo } = {}, options = {}) {
  if (!bomData) return bomData;
  return walkBomEnrich(structuredClone(bomData), {
    productMeta,
    productInfo,
    ...options,
  });
}

/** Terapkan grade produk ke semua part kayu (+ opsional hitung ulang biaya) */
export function syncProductWoodToParts(bomData, woodGradeId, { applyBiaya = true } = {}) {
  if (!bomData || !woodGradeId) return bomData;
  const mat = getCachedMaterials().find((m) => m.id === woodGradeId);
  const productMeta = {
    woodGradeId,
    wood: mat?.specification || '',
  };
  return walkBomEnrich(bomData, { productMeta, applyBiaya });
}
