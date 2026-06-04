export const flattenTree = (node, level = 0, isLast = true, result = []) => {
  if (!node) return result;
  result.push({ id: node.id, level, isLast, data: node });
  if (node.children) {
    node.children.forEach((child, idx) => {
      flattenTree(child, level + 1, idx === node.children.length - 1, result);
    });
  }
  return result;
};

/** Naik dari target ke root; kembalikan rantai induk (tanpa node target). */
export function getAncestorChain(root, targetId, trail = []) {
  if (!root) return null;
  if (root.id === targetId) return trail;
  for (const child of root.children || []) {
    const hit = getAncestorChain(child, targetId, [...trail, root]);
    if (hit) return hit;
  }
  return null;
}

/** Ambil modul / submodul / submodul 2 dari posisi part di pohon BOM (level terdalam). */
export function getPartHierarchyLabels(root, partId) {
  const chain = getAncestorChain(root, partId) || [];
  const pickLast = (tipe) => {
    for (let i = chain.length - 1; i >= 0; i--) {
      if (chain[i].tipe === tipe) return chain[i];
    }
    return null;
  };
  return {
    modul: pickLast('MODUL'),
    submodul: pickLast('SUBMODUL'),
    submodul2: pickLast('SUBMODUL 2'),
  };
}
