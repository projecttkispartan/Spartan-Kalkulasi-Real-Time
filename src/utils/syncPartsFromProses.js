import { getPosisiComboItem } from '../data/posisiComboCatalog.js';
import { applyMasterToPart } from './masterLookup.js';

export function buildPartSourceKey(routingNodeId, opIndex, materialId) {
  return `${routingNodeId}:${opIndex}:${materialId}`;
}

function findNode(tree, id) {
  if (!tree || tree.id === id) return tree;
  for (const child of tree.children || []) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}

function updateNodeById(tree, id, updater) {
  if (tree.id === id) return updater(tree);
  if (!tree.children?.length) return tree;
  return {
    ...tree,
    children: tree.children.map((child) => updateNodeById(child, id, updater)),
  };
}

function findPartBySourceKey(tree, sourceKey) {
  let found = null;
  const walk = (node) => {
    if (node.tipe === 'PART' && node.sourceProsesKey === sourceKey) {
      found = node;
      return;
    }
    (node.children || []).forEach(walk);
  };
  walk(tree);
  return found;
}

function resolveSubmodulLabel(posisiOperasi) {
  const item = getPosisiComboItem(posisiOperasi);
  if (item?.groupLabel) return item.groupLabel.toUpperCase();
  if (posisiOperasi) {
    const raw = String(posisiOperasi).trim();
    if (raw.includes(':')) return raw.split(':')[0].replace(/_/g, ' ').toUpperCase();
    return raw.toUpperCase();
  }
  return 'PROSES';
}

function ensureSubmodulForPosisi(tree, modulId, posisiOperasi) {
  const label = resolveSubmodulLabel(posisiOperasi);
  const modul = findNode(tree, modulId);
  if (!modul) return { tree, parentId: modulId };

  const existing = (modul.children || []).find(
    (c) =>
      c.tipe === 'SUBMODUL' &&
      (c.nama === label || c.kode === label || c.nama?.toUpperCase() === label),
  );
  if (existing) return { tree, parentId: existing.id };

  const newSub = {
    id: `submodul-${modulId}-${label}-${Date.now()}`,
    no: 10,
    nama: label,
    kode: label.replace(/\s+/g, '-'),
    tipe: 'SUBMODUL',
    qty: 1,
    unit: 'SET',
    p: 0,
    l: 0,
    t: 0,
    vol: 0,
    biaya: 0,
    catatan: '',
    proses: [],
    proses_count: 0,
    foto: '',
    vendor: '',
    sf: 0,
    wf: 0,
    children: [],
  };
  return {
    tree: updateNodeById(tree, modulId, (node) => ({
      ...node,
      children: [...(node.children || []), newSub],
    })),
    parentId: newSub.id,
  };
}

function resolvePartParentId(tree, routingNodeId, routingNodeTipe, posisiOperasi) {
  if (routingNodeTipe === 'SUBMODUL' || routingNodeTipe === 'SUBMODUL 2') {
    return { tree, parentId: routingNodeId };
  }
  if (routingNodeTipe === 'MODUL') {
    return ensureSubmodulForPosisi(tree, routingNodeId, posisiOperasi);
  }
  return { tree, parentId: null };
}

function materialHasIdentity(material) {
  return Boolean(
    material.materialMasterId ||
      material.manualSpec ||
      material.nama ||
      material.kode,
  );
}

function computeVolMm(p, l, t) {
  const pv = (Number(p) || 0) / 1000;
  const lv = (Number(l) || 0) / 1000;
  const tv = (Number(t) || 0) / 1000;
  if (!pv || !lv || !tv) return 0;
  return Math.round(pv * lv * tv * 1000) / 1000;
}

function materialToPartDraft(material, op, opIndex) {
  const mode =
    material.materialSourceMode ||
    (material.materialMasterId ? 'database' : material.manualSpec ? 'manual' : 'database');

  const p = Number(material.p) || 0;
  const l = Number(material.l) || 0;
  const t = Number(material.t) || 0;
  const vol = Number(material.vol) || computeVolMm(p, l, t);

  let part = {
    tipe: 'PART',
    no: 100 + opIndex,
    nama: material.nama || material.manualSpec || material.kode || 'PART BARU',
    kode: material.kode || `PART-${Date.now()}-${opIndex}`,
    qty: Number(material.qty) || 1,
    unit: material.unit || 'pcs',
    materialSourceMode: mode,
    materialMasterId: material.materialMasterId || '',
    manualSpec: material.manualSpec || '',
    materialType: material.materialType || '',
    p,
    l,
    t,
    vol,
    biaya: Number(material.biaya) || 0,
    sf: Number(material.sf) || 0,
    wf: Number(material.wf) || 0,
    catatan: '',
    foto: '',
    vendor: '',
    posisiOperasi: op.posisiOperasi || '',
    proses: [{ ...op, materialsUsed: [material] }],
    proses_count: 1,
    children: [],
  };

  if (!part.vol && op.dimensiOperasi && op.dimensiOperasi.useParentDimensi === false) {
    part.p = Number(op.dimensiOperasi.p) || part.p;
    part.l = Number(op.dimensiOperasi.l) || part.l;
    part.t = Number(op.dimensiOperasi.t) || part.t;
    part.vol = computeVolMm(part.p, part.l, part.t);
  }

  if (material.materialMasterId) {
    part = applyMasterToPart(part, material.materialMasterId);
  }

  return part;
}

function upsertPart(tree, parentId, sourceKey, draft) {
  const existing = findPartBySourceKey(tree, sourceKey);
  if (existing) {
    return updateNodeById(tree, existing.id, (node) => ({
      ...node,
      ...draft,
      id: node.id,
      sourceProsesKey: sourceKey,
      children: node.children || [],
    }));
  }

  const newPart = {
    ...draft,
    id: `part-${sourceKey.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`,
    sourceProsesKey: sourceKey,
    children: [],
  };

  return updateNodeById(tree, parentId, (node) => ({
    ...node,
    children: [...(node.children || []), newPart],
  }));
}

/**
 * Sinkronkan bahan operasi (materialsUsed) ke pohon BOM sebagai node PART.
 * Skip jika routing node adalah PART (bahan = consumable operasi).
 */
export function syncPartsFromProsesMaterials(bomData, { routingNodeId, routingNodeTipe, prosesList }) {
  if (!bomData || !routingNodeId || routingNodeTipe === 'PART') return bomData;
  if (!prosesList?.length) return bomData;

  let tree = bomData;

  prosesList.forEach((op, opIndex) => {
    const materials = (op.materialsUsed || []).filter(materialHasIdentity);
    materials.forEach((material) => {
      const materialId = material.id || `${material.kode || material.nama || opIndex}`;
      const sourceKey = buildPartSourceKey(routingNodeId, opIndex, materialId);
      const { tree: treeWithParent, parentId } = resolvePartParentId(
        tree,
        routingNodeId,
        routingNodeTipe,
        op.posisiOperasi,
      );
      tree = treeWithParent;
      if (!parentId) return;

      const draft = materialToPartDraft(material, op, opIndex);
      tree = upsertPart(tree, parentId, sourceKey, draft);
    });
  });

  return tree;
}
