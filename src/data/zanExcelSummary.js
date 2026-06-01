/**
 * Referensi baris SUMMARY COST — file 1 - ZAN-100 - 2-12-25.xlsx
 * Kolom total Rp (indeks 13 pada sheet).
 */

export const ZAN_EXCEL_KAYU_TOTAL = 1291224.5705357143;
export const ZAN_EXCEL_KAYU_MATERIAL = 781738.65;
export const ZAN_EXCEL_KAYU_PROCESS = ZAN_EXCEL_KAYU_TOTAL - ZAN_EXCEL_KAYU_MATERIAL;
export const ZAN_EXCEL_RAW_PRODUCTION = 1567717.3249172142;
export const ZAN_EXCEL_PRODUCTION_COST = 2043406.871939539;
export const ZAN_EXCEL_COGS = 2196662.3873350048;
export const ZAN_EXCEL_OH_MULTIPLIER = 1.075;

export const ZAN_EXCEL_SUMMARY_LINES = [
  {
    key: 'laminating',
    label: 'LAMINATING',
    materialType: 'veneer',
    material: 995.275215,
    process: 16920.367629,
    total: 17915.642844,
  },
  {
    key: 'assemblingHw',
    label: 'ASSEMBLING HARDWARE',
    materialType: 'hardware',
    material: 94430.6,
    process: 164146.511538,
    total: 258577.111538,
  },
  {
    key: 'fittingHw',
    label: 'FITTING HARDWARE',
    materialType: 'hardware',
    material: 15078.8,
    process: 22115.506,
    total: 37194.306,
  },
  {
    key: 'amplas',
    label: 'AMPLAS',
    materialType: 'komponen',
    material: 6490.387405,
    process: 176181.689486,
    total: 182672.076891,
  },
  {
    key: 'finishing',
    label: 'FINISHING',
    materialType: 'komponen',
    material: 100608.725291,
    process: 97278.616399,
    total: 197887.34169,
  },
];

export const ZAN_EXCEL_BOX_PACKING = {
  material: 45726.007495,
  labor: 12209.814947,
  total: 57935.822442,
};
