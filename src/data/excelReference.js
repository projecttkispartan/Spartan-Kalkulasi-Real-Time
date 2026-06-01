/**
 * Referensi: 1 - ELB-555-98 - ELBA CHAIR NLH - 19-5-23.xlsx
 * Sheet SUMMARY COST & BOM TEMPLATE (formula volume packing & kapasitas kontainer).
 */

/** Referensi: 1 - ZAN-100 - 2-12-25.xlsx — ZANZIBAR STOOL */
export {
  ZAN_EXCEL_COGS,
  ZAN_EXCEL_PRODUCTION_COST,
  ZAN_EXCEL_RAW_PRODUCTION,
  ZAN_EXCEL_KAYU_TOTAL,
} from './zanExcelSummary.js';

export const ZAN_STOOL_REFERENCE = {
  kode: 'ZAN-10',
  numericCode: '1200230',
  nama: 'ZANZIBAR STOOL/ SIDE TABLE',
  namaBom: 'ZAN-10 - ZANZIBAR STOOL/ SIDE TABLE',
  kodeBom: 'ZAN-100',
  customer: 'AMATA',
  wood: 'MINDI',
  woodGrade: '30 UP 200',
  itemType: 'STOOL',
  coating: '33.DESERT BROWN HARKA',
  versi: '2-12-25',
  dimensi: { w: 340, d: 340, h: 505 },
  volBoxRef: 0.080142,
  containerPcsBox: { '20foot': 28, '40foot': 55, '40hc': 62 },
};

/**
 * Volume muatan netto kontainer (m³) — disesuaikan agar
 * floor(netM3 / volBoxRef) = pcs referensi Excel SUMMARY COST (ZAN).
 */
/** +ε agar floor(netM³ / volBox) = pcs Excel (hindari error floating-point) */
const zanContainerNet = (pcs) => pcs * ZAN_STOOL_REFERENCE.volBoxRef + 1e-6;

export const ZAN_CONTAINER_NET_VOLUME_M3 = {
  '20foot': zanContainerNet(ZAN_STOOL_REFERENCE.containerPcsBox['20foot']),
  '40foot': zanContainerNet(ZAN_STOOL_REFERENCE.containerPcsBox['40foot']),
  '40hc': zanContainerNet(ZAN_STOOL_REFERENCE.containerPcsBox['40hc']),
};

export const ELBA_CHAIR_REFERENCE = {
  kode: 'ELB-555-98',
  nama: 'ELBA CHAIR',
  namaBom: 'ELBA CHAIR NLH',
  kodeBom: 'ELB-555-98',
  customer: 'AMATA',
  wood: 'MINDI',
  itemType: 'CHAIR',
  coating: '32.NATURAL LIMED HARKA',
  versi: '19-5-23',
  dimensi: { w: 710, d: 712, h: 806 },
  /** Volume packing referensi (m³) — BOM TEMPLATE AH13 / AQ13 */
  volBoxRef: 0.482784,
  volSFRef: 0.257632704,
  /** Kapasitas Box (Pcs) — SUMMARY COST R6:R8 */
  containerPcsBox: { '20foot': 26, '40foot': 55, '40hc': 65 },
};

/**
 * Volume muatan netto kontainer (m³) — disesuaikan agar
 * floor(netM3 / volBoxRef) = pcs referensi Excel untuk produk ELBA.
 */
export const CONTAINER_NET_VOLUME_M3 = {
  '20foot': 12.552384,
  '40foot': 26.55312,
  '40hc': 31.38096,
};

/** Kategori biaya SUMMARY COST (baris 15–32) — label analisa Excel */
export const SUMMARY_COST_CATEGORIES = [
  { key: 'kayu', label: 'KAYU', excelRow: 15 },
  { key: 'plywood', label: 'PLYWOOD', excelRow: 16 },
  { key: 'veneer', label: 'VENEER', excelRow: 17 },
  { key: 'komponen', label: 'KOMPONEN', excelRow: 18 },
  { key: 'steel', label: 'STEEL', excelRow: 19 },
  { key: 'hardware', label: 'HARDWARE', excelRow: 20 },
  { key: 'rawProduction', label: 'RAW PRODUCTION COST', excelRow: 21, isSubtotal: true },
  { key: 'finishing', label: 'FINISHING', excelRow: 22 },
  { key: 'coating', label: 'COATING', excelRow: 23 },
  { key: 'upholstery', label: 'UPHOLSTERY', excelRow: 24 },
  { key: 'packing', label: 'PACKING', excelRow: 25 },
  { key: 'assembly', label: 'ASSEMBLY', excelRow: 26 },
  { key: 'qc', label: 'QC', excelRow: 27 },
  { key: 'lain', label: 'LAIN-LAIN', excelRow: 28 },
  { key: 'factoryProcessing', label: 'FACTORY PROCESSING COST', excelRow: 32, isSubtotal: true },
];

export const EXCEL_FACTORY_OH_PCT = 5;

/** Kategori tipe material untuk part — baris 15–20 SUMMARY COST Excel */
export const MATERIAL_TYPE_OPTIONS = SUMMARY_COST_CATEGORIES.filter(
  (c) => !c.isSubtotal && ['kayu', 'plywood', 'veneer', 'komponen', 'steel', 'hardware'].includes(c.key),
);

export function getMaterialTypeLabel(key) {
  if (!key) return '—';
  const found = MATERIAL_TYPE_OPTIONS.find((c) => c.key === key);
  return found?.label || key;
}

/** Mapping tahap manufaktur → kunci kategori SUMMARY COST (proses) */
export const MFG_PROCESS_TO_SUMMARY_KEY = {
  Woodworking: 'lain',
  Preparation: 'lain',
  Finishing: 'finishing',
  'Finishing + NC Coating': 'coating',
  Coating: 'coating',
  Assembly: 'assembly',
  QC: 'qc',
  Upholstery: 'upholstery',
};

export function mfgProcessToSummaryKey(mfgProcess) {
  if (!mfgProcess) return 'lain';
  return MFG_PROCESS_TO_SUMMARY_KEY[mfgProcess] || 'lain';
}
