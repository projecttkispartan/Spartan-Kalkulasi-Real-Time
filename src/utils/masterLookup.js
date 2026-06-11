import {
  getCachedMaterials,
  getCachedNonWoodMaterials,
  getCachedWasteRatios,
  getCachedCoatings,
  getCachedMaterialCatalog,
  getAllDatabaseMaterials,
  getCachedDatabaseSections,
  DATABASE_SECTION_KEYS,
} from '../services/masterStorage.js';
import { evalFormula } from './formulaEngine.js';

function getMaterialsPool() {
  return getAllDatabaseMaterials();
}

function allMaterials() {
  return [...getCachedMaterials(), ...getCachedNonWoodMaterials(), ...getMaterialsPool()];
}

function resolveMaterial(materialId) {
  const pool = getMaterialsPool();
  const legacy = [...getCachedMaterials(), ...getCachedNonWoodMaterials()];
  return (
    pool.find((m) => m.id === materialId || m.specification === materialId) ||
    legacy.find((m) => m.id === materialId || m.specification === materialId) ||
    null
  );
}

function materialUnitPrice(mat) {
  const unit = String(mat.unit || 'm3').toLowerCase();
  if (unit === 'm2' || unit === 'm²') {
    return (
      Number(mat.hargaMaterialSupplier) ||
      Number(mat.pricePerM2Supplier) ||
      Number(mat.pricePerUnitSupplier) ||
      Number(mat.hargaMaterialBuyer) ||
      Number(mat.pricePerM2Buyer) ||
      Number(mat.pricePerUnitBuyer) ||
      0
    );
  }
  const pieceOrFlat = ['pcs', 'lbr', 'roll', 'unit', 'btl', 'kg', 'm', 'ltr', 'ml'];
  if (pieceOrFlat.includes(unit)) {
    return (
      Number(mat.hargaMaterialSupplier) ||
      Number(mat.pricePerUnitSupplier) ||
      Number(mat.hargaMaterialBuyer) ||
      Number(mat.pricePerUnitBuyer) ||
      0
    );
  }
  return (
    Number(mat.hargaMaterialSupplier) ||
    Number(mat.pricePerM3Supplier) ||
    Number(mat.hargaMaterialBuyer) ||
    Number(mat.pricePerM3Buyer) ||
    0
  );
}

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

/**
 * Biaya material per pcs dari DATA BASE
 */
export function computeMaterialBiayaFromMaster(partData, materialId, materialType) {
  const mat = resolveMaterial(materialId);
  if (!mat) return null;

  const mt = materialType || mat.materialType || 'kayu';
  const unit = String(mat.unit || 'm3').toLowerCase();
  const price = materialUnitPrice(mat);
  if (!price) return null;

  const ratio = getWasteRatioForMaterialType(mt);
  const sf = Number(ratio.sf) || 0;
  const wf = Number(ratio.wf) ?? (mt === 'kayu' ? 30 : 0);

  if (unit === 'm2' || unit === 'm²') {
    const m2 = partSurfaceM2(partData);
    if (!m2) return null;
    const biaya = Math.round(price * m2 * (1 + sf / 100));
    return {
      biaya,
      matBase: Math.round(price * m2),
      sf,
      wf: 0,
      material: mat,
      pricePerUnit: price,
      unit: 'm2',
    };
  }

  const pieceUnits = new Set(['pcs', 'lbr', 'roll', 'unit', 'btl']);
  const weightUnits = new Set(['kg']);
  const lengthUnits = new Set(['m', 'ltr', 'ml']);

  if (pieceUnits.has(unit) || mt === 'steel' || mt === 'hardware' || mt === 'finishing') {
    const qty = Number(partData.qty) || 1;
    const biaya = Math.round(price * qty);
    return {
      biaya,
      matBase: biaya,
      sf: 0,
      wf: 0,
      material: mat,
      pricePerUnit: price,
      unit: unit || 'pcs',
    };
  }

  if (weightUnits.has(unit)) {
    const qty = Number(partData.weightKg) || Number(partData.qty) || 1;
    const biaya = Math.round(price * qty);
    return {
      biaya,
      matBase: biaya,
      sf: 0,
      wf: 0,
      material: mat,
      pricePerUnit: price,
      unit: 'kg',
    };
  }

  if (lengthUnits.has(unit)) {
    const qty = Number(partData.lengthM) || Number(partData.qty) || 1;
    const biaya = Math.round(price * qty);
    return {
      biaya,
      matBase: biaya,
      sf: 0,
      wf: 0,
      material: mat,
      pricePerUnit: price,
      unit,
    };
  }

  const vol = Number(partData.vol) || 0;
  if (!vol) return null;

  const biaya =
    evalFormula('wood_material_cost', { pricePerM3: price, vol, sf, wf }) ??
    Math.round(price * vol * (1 + sf / 100 + wf / 100));

  return {
    biaya,
    matBase: Math.round(price * vol),
    sf,
    wf,
    material: mat,
    pricePerM3: price,
    unit: 'm3',
  };
}

/** @deprecated — use computeMaterialBiayaFromMaster */
export function computeWoodBiayaFromMaster(partData, materialId) {
  return computeMaterialBiayaFromMaster(partData, materialId, 'kayu');
}

export function findMaterialBySpec(specText) {
  const q = String(specText || '').trim().toUpperCase();
  if (!q) return null;
  const materials = getMaterialsPool();

  const exactSpec = materials.find((m) => m.specification?.toUpperCase() === q);
  if (exactSpec) return exactSpec;

  const exactName = materials.find((m) => m.woodName?.toUpperCase() === q || m.nama?.toUpperCase() === q);
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

export function findCatalogByKode(kode) {
  const q = String(kode || '').trim().toUpperCase();
  if (!q) return null;
  const catalog = getCachedMaterialCatalog() || [];
  const exact = catalog.find((c) => String(c.kode || '').trim().toUpperCase() === q);
  if (exact) return exact;
  return catalog.find((c) => String(c.nama || '').trim().toUpperCase() === q) || null;
}

export function getWasteRatioForMaterialType(materialType) {
  const ratios = getCachedWasteRatios();
  return (
    ratios.find((r) => r.materialType === materialType && r.aktif !== false) ||
    ratios.find((r) => r.category === materialType) ||
    { sf: 0, wf: 0 }
  );
}

function poolFilterByType(pool, types, section) {
  const typeSet = new Set((types || []).map((t) => String(t).toLowerCase()));
  return pool.filter((m) => {
    if (m.aktif === false) return false;
    if (section && String(m.section || '').toUpperCase() !== String(section).toUpperCase()) {
      return false;
    }
    if (!typeSet.size) return true;
    return typeSet.has(String(m.materialType || '').toLowerCase());
  });
}

function materialLabel(m) {
  return String(m.specification || m.nama || m.woodName || m.id || '').trim();
}

function sortMaterials(a, b) {
  const sa = String(a.section || a.materialType || '');
  const sb = String(b.section || b.materialType || '');
  if (sa !== sb) return sa.localeCompare(sb);
  return materialLabel(a).localeCompare(materialLabel(b));
}

export function listMaterialsByType(materialType, section) {
  const mt = String(materialType || '').toLowerCase();
  const sec = section ? String(section).toUpperCase() : null;

  if (mt === 'kayu') {
    return getCachedMaterials().filter((m) => m.aktif !== false);
  }

  const sections = getCachedDatabaseSections();
  if (sec && DATABASE_SECTION_KEYS[sec]) {
    const key = DATABASE_SECTION_KEYS[sec];
    return (sections[key] || []).filter((m) => m.aktif !== false);
  }

  if (mt === 'plywood') {
    return (sections.plywood || []).filter((m) => m.aktif !== false);
  }
  if (mt === 'veneer') {
    const v = [
      ...(sections.veneer || []),
      ...(sections.veneerTypes || []),
      ...(sections.edging || []),
    ];
    return v.filter((m) => m.aktif !== false);
  }
  if (mt === 'hardware') {
    return ['assemblingHardware', 'fittingHardware']
      .flatMap((k) => sections[k] || [])
      .filter((m) => m.aktif !== false);
  }
  if (mt === 'finishing') {
    return (sections.finishingMaterial || []).filter((m) => m.aktif !== false);
  }
  if (mt === 'steel' || mt === 'besi') {
    return poolFilterByType(getMaterialsPool(), ['steel', 'komponen'], sec);
  }

  if (mt === 'komponen' && sec === 'HPL') {
    return (sections.hpl || []).filter((m) => m.aktif !== false);
  }
  if (mt === 'komponen' && sec === 'MDF') {
    return (sections.mdf || []).filter((m) => m.aktif !== false);
  }
  if (mt === 'komponen' && sec === 'CORE') {
    return (sections.core || []).filter((m) => m.aktif !== false);
  }
  if (mt === 'komponen' && !sec) {
    return [
      ...(sections.mdf || []),
      ...(sections.core || []),
      ...(sections.hpl || []),
      ...(sections.sandingMaterial || []),
      ...(sections.packingMaterial || []),
      ...(sections.plywood || []),
    ].filter((m) => m.aktif !== false);
  }

  return poolFilterByType(getMaterialsPool(), mt ? [mt] : [], sec);
}

/**
 * Semua SKU DATA BASE untuk picker Part (MODUL / SUBMODUL / PART).
 * @param {{ materialType?: string, section?: string, includeAll?: boolean }} [options]
 */
export function listAllPartMaterials(options = {}) {
  const { materialType, section, includeAll = true } = options;
  const mt = String(materialType || '').toLowerCase();

  let list;
  if (mt === 'kayu') {
    list = getCachedMaterials().filter((m) => m.aktif !== false);
  } else if (mt && !includeAll) {
    list = listMaterialsByType(mt, section);
  } else if (section) {
    list = listMaterialsByType(mt || 'komponen', section);
  } else {
    list = getMaterialsPool().filter((m) => m.aktif !== false);
    if (mt) {
      list = list.filter(
        (m) =>
          String(m.materialType || '').toLowerCase() === mt ||
          (mt === 'komponen' &&
            ['komponen', 'plywood'].includes(String(m.materialType || '').toLowerCase())),
      );
    }
  }

  const seen = new Set();
  return list.filter((m) => {
    if (!m.id || seen.has(m.id)) return false;
    seen.add(m.id);
    return materialLabel(m);
  }).sort(sortMaterials);
}

/** Kelompokkan SKU per section untuk &lt;optgroup&gt; */
export function groupMaterialsBySection(materials) {
  const groups = new Map();
  for (const m of materials) {
    const key = m.section || m.materialType || 'LAINNYA';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(m);
  }
  return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

/** Nama/kode tampilan dari baris master DATA BASE */
export function displayNameFromMaster(mat) {
  if (!mat) return '';
  return String(mat.specification || mat.nama || mat.woodName || '').trim();
}

export function kodeFromMaster(mat) {
  if (!mat) return '';
  return String(mat.kode || '').trim();
}

/** Nama tampilan PART dari spec manual atau master id yang terhubung */
export function partNameFromMaterialFields(node) {
  if (!node) return '';
  const mt = String(node.materialType || '').toLowerCase();
  if (mt === 'kayu') {
    const spec = String(node.woodSpecification || '').trim();
    if (spec) return spec;
    if (node.woodGradeId) {
      const mat = resolveMaterial(node.woodGradeId);
      if (mat) return displayNameFromMaster(mat);
    }
  } else {
    const spec = String(node.materialSpecification || '').trim();
    if (spec) return spec;
    if (node.materialMasterId) {
      const mat = resolveMaterial(node.materialMasterId);
      if (mat) return displayNameFromMaster(mat);
    }
  }
  return String(node.nama || '').trim();
}

/** Isi nama, kode, vendor dari SKU master (mode DATA BASE) */
export function patchNodeIdentityFromMaster(nodeData, mat) {
  if (!mat || !nodeData) return nodeData;
  const nama = displayNameFromMaster(mat);
  const kode = kodeFromMaster(mat);
  return {
    ...nodeData,
    ...(nama ? { nama } : {}),
    ...(kode ? { kode } : {}),
    ...(mat.vendorSupplier ? { vendor: mat.vendorSupplier } : {}),
  };
}

/** Hitung ulang biaya satuan part; waste factor sudah termasuk di biaya jika dari master. */
export function recalcPartBiayaForSfWf(partData) {
  const masterId = partData.materialMasterId || partData.woodGradeId;
  const sf = Number(partData.sf) || 0;
  const wf = Number(partData.wf) || 0;

  if (!masterId) {
    return {
      biaya: Number(partData.biaya) || 0,
      sf,
      wf,
      wasteIncludedInBiaya: false,
    };
  }

  const mat = resolveMaterial(masterId);
  if (!mat) {
    return {
      biaya: Number(partData.biaya) || 0,
      sf,
      wf,
      wasteIncludedInBiaya: !!partData.wasteIncludedInBiaya,
    };
  }

  const mt = mat.materialType || partData.materialType || 'komponen';
  const price = materialUnitPrice(mat);
  const unit = String(mat.unit || 'm3').toLowerCase();

  if (unit === 'm2' || unit === 'm²') {
    const m2 = partSurfaceM2(partData);
    if (!m2) {
      return { biaya: Number(partData.biaya) || 0, sf, wf, wasteIncludedInBiaya: true };
    }
    return {
      biaya: Math.round(price * m2 * (1 + sf / 100)),
      sf,
      wf: 0,
      wasteIncludedInBiaya: true,
    };
  }

  const pieceUnits = new Set(['pcs', 'lbr', 'roll', 'unit', 'btl']);
  if (pieceUnits.has(unit) || mt === 'steel' || mt === 'hardware' || mt === 'finishing') {
    const qty = Number(partData.qty) || 1;
    return {
      biaya: Math.round(price * qty),
      sf: 0,
      wf: 0,
      wasteIncludedInBiaya: true,
    };
  }

  const vol = Number(partData.vol) || 0;
  if (!vol) {
    return { biaya: Number(partData.biaya) || 0, sf, wf, wasteIncludedInBiaya: true };
  }

  const biaya =
    evalFormula('wood_material_cost', { pricePerM3: price, vol, sf, wf }) ??
    Math.round(price * vol * (1 + sf / 100 + wf / 100));

  return { biaya, sf, wf, wasteIncludedInBiaya: true };
}

export function applyMasterToPart(partData, masterId) {
  const mat = resolveMaterial(masterId);
  if (!mat) return partData;

  const mt = mat.materialType || partData.materialType || 'komponen';
  const result = computeMaterialBiayaFromMaster(partData, masterId, mt);
  if (!result) return partData;

  const sf = partData.sfWfManual
    ? Number(partData.sf) || 0
    : Number(result.sf) || 0;
  const wf = partData.sfWfManual
    ? Number(partData.wf) || 0
    : Number(result.wf) || 0;
  const recalc = recalcPartBiayaForSfWf({
    ...partData,
    materialMasterId: mat.id,
    woodGradeId: mt === 'kayu' ? mat.id : partData.woodGradeId,
    sf,
    wf,
  });

  const base = patchNodeIdentityFromMaster(
    {
      ...partData,
      materialMasterId: mat.id,
      materialSpecification: mat.specification || displayNameFromMaster(mat),
      materialType: mt,
      materialSection: mat.section || partData.materialSection,
      biaya: recalc.biaya,
      sf: recalc.sf,
      wf: recalc.wf,
      masterWasteSfPct: recalc.sf,
      masterWasteWfPct: recalc.wf,
      wasteIncludedInBiaya: recalc.wasteIncludedInBiaya,
    },
    mat,
  );

  if (mt === 'kayu') {
    return {
      ...base,
      woodGradeId: mat.id,
      woodSpecification: mat.specification,
      woodWasteSfPct: recalc.sf,
      woodWasteWfPct: recalc.wf,
    };
  }

  return base;
}

export function applyMasterToWoodPart(partData, woodGradeId) {
  return applyMasterToPart(partData, woodGradeId);
}

export function listActiveWoodMaterials() {
  return getCachedMaterials().filter((m) => m.aktif !== false && m.materialType === 'kayu');
}

export function listActiveCoatings() {
  return getCachedCoatings().filter((c) => c.aktif !== false);
}

const NON_WOOD_MATERIAL_TYPES = new Set([
  'hardware',
  'steel',
  'plywood',
  'veneer',
  'komponen',
  'finishing',
  'upholstery',
  'coating',
]);

/** Prioritas: sfWfManual → biayaFromExcel (0) → nilai part → MASTER RATIO */
export function resolvePartSfWf(part, ratio = { sf: 0, wf: 0 }) {
  if (part.sfWfManual) {
    return {
      sf: part.sf === '' || part.sf == null ? 0 : Number(part.sf) || 0,
      wf: part.wf === '' || part.wf == null ? 0 : Number(part.wf) || 0,
    };
  }
  if (part.biayaFromExcel && Number(part.biaya) > 0) {
    return { sf: 0, wf: 0 };
  }
  const sf =
    part.sf != null && part.sf !== '' ? Number(part.sf) || 0 : Number(ratio.sf) || 0;
  const wf =
    part.wf != null && part.wf !== '' ? Number(part.wf) || 0 : Number(ratio.wf) || 0;
  return { sf, wf };
}

/**
 * Isi otomatis dari DATA BASE berdasarkan nama/kode node atau info produk.
 */
export function enrichNodeFromMaster(node, { productInfo, productMeta } = {}) {
  if (!node) return node;

  let n = { ...node };

  if (n.tipe === 'MODUL') {
    const pi = productInfo || {};
    if (pi.kode && !String(n.kode || '').trim()) n.kode = pi.kode;
    return n;
  }

  if (n.tipe === 'SUBMODUL' || n.tipe === 'SUBMODUL 2') {
    return n;
  }

  if (n.tipe === 'PART') {
    if (n.materialSourceMode === 'manual') return n;
    const hasManualSpec = Boolean(String(n.materialSpecification || n.woodSpecification || '').trim());
    const hasMasterId = Boolean(n.materialMasterId || n.woodGradeId);
    if (hasManualSpec && !hasMasterId) return n;
  }

  const existingMt = String(n.materialType || '').toLowerCase();
  const lookupTexts = [
    n.materialSpecification,
    n.woodSpecification,
    n.nama,
    n.kode,
    productMeta?.wood,
  ].filter((t) => t && String(t).trim());

  for (const text of lookupTexts) {
    const mat = findMaterialBySpec(text);
    if (!mat) continue;
    const mt = mat.materialType || 'kayu';
    if (existingMt && existingMt !== mt && existingMt !== 'komponen') continue;

    const ratio = getWasteRatioForMaterialType(mt);
    const { sf, wf } = resolvePartSfWf(n, ratio);
    const spec = mat.specification || text;
    const patch = {
      materialMasterId: mat.id,
      materialSpecification: spec,
      materialType: mt,
      materialSection: mat.section,
    };
    if (mt === 'kayu') {
      const namaLooksLikeGrade =
        !n.nama ||
        n.nama === text ||
        findMaterialBySpec(n.nama) ||
        String(n.nama).toUpperCase().includes(mat.woodName?.toUpperCase() || '');
      n = patchNodeIdentityFromMaster(
        {
          ...n,
          ...patch,
          woodGradeId: mat.id,
          woodSpecification: spec,
          sf,
          wf,
        },
        mat,
      );
      if (!displayNameFromMaster(mat) && namaLooksLikeGrade && spec) {
        n.nama = spec;
      }
      return n;
    }
    if (!n.hardware && !n.biayaFromExcel) {
      n = patchNodeIdentityFromMaster(
        {
          ...n,
          ...patch,
          sf,
          wf,
        },
        mat,
      );
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

/** Total m² dari part yang punya surfaceM2 eksplisit (CALCULATION / import) */
export function aggregateExplicitSurfaceM2(bomData) {
  let total = 0;
  const walk = (node) => {
    if (node.tipe === 'PART') {
      const explicit = Number(node.surfaceM2);
      if (explicit > 0) total += explicit * (Number(node.qty) || 1);
    }
    (node.children || []).forEach(walk);
  };
  if (bomData) walk(bomData);
  return total;
}

export function resolveProductCoatingCost(bomData, productMeta) {
  const coatingId = productMeta?.coatingId;
  if (!coatingId) return { coatingCost: 0, surfaceM2: 0 };

  const metaM2 = Number(productMeta?.surfaceM2Coating) || 0;
  const explicitM2 = aggregateExplicitSurfaceM2(bomData);
  const byType = aggregateCoatingSurfaceM2(bomData, { coatingId });

  let m2 = 0;
  if (metaM2 > 0) m2 = metaM2;
  else if (explicitM2 > 0) m2 = explicitM2;
  else if (byType > 0) m2 = byType;

  return {
    surfaceM2: m2,
    coatingCost: computeCoatingCost(coatingId, m2),
  };
}
