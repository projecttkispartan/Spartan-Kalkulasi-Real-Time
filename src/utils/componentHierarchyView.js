/** Util tampilan hierarki komponen di explorer detail. */

export function findTreeNode(root, targetId) {
  if (!root) return null;
  if (root.id === targetId) return root;
  for (const child of root.children || []) {
    const hit = findTreeNode(child, targetId);
    if (hit) return hit;
  }
  return null;
}

export function getAncestorChain(root, targetId, trail = []) {
  if (!root) return null;
  if (root.id === targetId) return trail;
  for (const child of root.children || []) {
    const hit = getAncestorChain(child, targetId, [...trail, root]);
    if (hit) return hit;
  }
  return null;
}

export function getDirectChildren(node) {
  return (node?.children || []).map((ch) => ({ ...ch }));
}

export function groupChildrenByTipe(node) {
  const groups = {};
  getDirectChildren(node).forEach((ch) => {
    const key = ch.tipe || 'LAINNYA';
    if (!groups[key]) groups[key] = [];
    groups[key].push(ch);
  });
  return groups;
}

export function collectDescendantParts(node, acc = []) {
  if (!node) return acc;
  if (node.tipe === 'PART') {
    acc.push(node);
    return acc;
  }
  (node.children || []).forEach((ch) => collectDescendantParts(ch, acc));
  return acc;
}

export function countDescendantsByTipe(node) {
  const counts = { MODUL: 0, SUBMODUL: 0, 'SUBMODUL 2': 0, PART: 0 };
  const walk = (n, isRoot = true) => {
    if (!isRoot && n.tipe && counts[n.tipe] != null) counts[n.tipe] += 1;
    (n.children || []).forEach((ch) => walk(ch, false));
  };
  walk(node, true);
  return counts;
}
