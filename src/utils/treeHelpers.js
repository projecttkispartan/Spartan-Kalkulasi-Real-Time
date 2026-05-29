export const flattenTree = (node, level = 0, isLast = true, result = []) => {
  result.push({ id: node.id, level, isLast, data: node });
  if (node.children) {
    node.children.forEach((child, idx) => {
      flattenTree(child, level + 1, idx === node.children.length - 1, result);
    });
  }
  return result;
};
