/**
 * Referensi SUMMARY COST — 2 - FNA-550 - 4-12-25.xlsx (blok utama, tanpa duplikat baris 124+)
 */

export const FIONA_EXCEL_KAYU_MATERIAL = 316674.4;
export const FIONA_EXCEL_KAYU_PROCESS = 164981.29548571425;
export const FIONA_EXCEL_KAYU_TOTAL = FIONA_EXCEL_KAYU_MATERIAL + FIONA_EXCEL_KAYU_PROCESS;
export const FIONA_EXCEL_PRODUCTION_COST = 1484080.0322762849;
export const FIONA_EXCEL_COGS = 1595386.0346970062;

export const FIONA_EXCEL_SUMMARY_LINES = [
  {
    key: 'assembling_hardware',
    label: 'ASSEMBLING HARDWARE',
    materialType: 'hardware',
    material: 36980.9,
    process: 132112.08362500003,
    total: 177547.63280625,
  },
  {
    key: 'fitting_hardware',
    label: 'FITTING HARDWARE',
    materialType: 'hardware',
    material: 128653.80000000002,
    process: 26050.59975,
    total: 154704.39975,
  },
  {
    key: 'gerinda',
    label: 'GERINDA',
    materialType: 'komponen',
    material: 825.8376720526633,
    process: 54731.71773619839,
    total: 55557.55540825106,
  },
  {
    key: 'amplas',
    label: 'AMPLAS',
    materialType: 'komponen',
    material: 6014.454579,
    process: 66580.56902644876,
    total: 72595.02360544876,
  },
  {
    key: 'finishing',
    label: 'FINISHING',
    materialType: 'komponen',
    material: 105307.3988178096,
    process: 73105.39579396752,
    total: 178412.79461177712,
  },
  {
    key: 'upholstery',
    label: 'UPHOLSTERY',
    materialType: 'upholstery',
    material: 171764.61750000002,
    process: 58321.321209375004,
    total: 230085.93870937504,
  },
];

export const FIONA_EXCEL_BOX_PACKING = {
  material: 92614.66182499997,
  labor: 33263.53007446875,
  total: 125878.19189946871,
};
