/**
 * Normalisasi project sample pasca-import — parity COGS vs Excel.
 */
import { applyCogsImportStrategy } from './cogsImportStrategy.js';

function walkParts(node, fn) {
  if (node?.tipe === 'PART') fn(node);
  (node?.children || []).forEach((ch) => walkParts(ch, fn));
}

/** Reset SF/WF pada part biaya Excel; hitung ulang surfaceM2Coating dari part */
export function optimizeImportedProject(project) {
  if (!project?.bomData) return project;

  let explicitM2 = 0;
  walkParts(project.bomData, (part) => {
    if (part.biayaFromExcel && Number(part.biaya) > 0 && !part.sfWfManual) {
      part.sf = 0;
      part.wf = 0;
    }
    const m2 = Number(part.surfaceM2) || 0;
    if (m2 > 0) explicitM2 += m2 * (Number(part.qty) || 1);
  });

  const productMeta = { ...(project.productMeta || {}) };
  if (explicitM2 > 0 && !productMeta.surfaceM2Coating) {
    productMeta.surfaceM2Coating = explicitM2;
  }

  const excel = project.excelMirror?.summaryCost;
  const cogsConfig = {
    ...(project.cogsConfig || {}),
    excelProductionCost: excel?.productionCost || project.cogsConfig?.excelProductionCost || 0,
    excelTotalCogs: excel?.totalCogs || project.cogsConfig?.excelTotalCogs || 0,
  };

  return applyCogsImportStrategy({ ...project, productMeta, cogsConfig });
}
