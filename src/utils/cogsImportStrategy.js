/**
 * Strategi COGS impor Excel — mutually exclusive rollup vs hybrid.
 */
import { appendSummaryProcessParts } from './excelWorkbookParsers.js';

export const COGS_IMPORT_HYBRID = 'hybrid';
export const COGS_IMPORT_ROLLUP = 'rollup';

function walkBom(node, fn) {
  if (!node) return;
  fn(node);
  (node?.children || []).forEach((ch) => walkBom(ch, fn));
}

/** Hapus submodul EXCEL-SUMMARY (mode rollup / seed terkurati). */
export function stripExcelSummaryParts(bomData) {
  if (!bomData?.children) return bomData;
  bomData.children = bomData.children.filter(
    (ch) => String(ch?.kode || '').trim() !== 'EXCEL-SUMMARY',
  );
  return bomData;
}

/**
 * Terapkan mode impor pada project (setelah parse / patch).
 * rollup: tidak ada part EXCEL-* — COGS dari part kayu + master + seed graph.
 */
export function applyCogsImportStrategy(project) {
  if (!project?.bomData) return project;

  const mode = project.cogsConfig?.cogsImportMode || COGS_IMPORT_HYBRID;
  if (mode === COGS_IMPORT_ROLLUP) {
    stripExcelSummaryParts(project.bomData);
    walkBom(project.bomData, (part) => {
      if (part.tipe === 'PART' && String(part.kode || '').startsWith('EXCEL-')) {
        part.biaya = 0;
        part.proses = [];
        part.proses_count = 0;
      }
    });
  }

  return project;
}

/**
 * Parse workbook: hybrid menambah EXCEL-SUMMARY; rollup hanya template + CALCULATION.
 */
export function attachSummaryPartsForImport(bomData, summaryLines, cogsImportMode) {
  const mode = cogsImportMode || COGS_IMPORT_HYBRID;
  if (mode === COGS_IMPORT_ROLLUP) {
    return stripExcelSummaryParts(bomData);
  }
  return appendSummaryProcessParts(bomData, summaryLines || []);
}
