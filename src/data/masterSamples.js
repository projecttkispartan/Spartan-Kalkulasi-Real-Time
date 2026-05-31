/** Sample vendor untuk combo Kebutuhan Material */
export const VENDOR_SAMPLES = [
  'PT Kayu Jaya Abadi',
  'CV Sumber Material Jepara',
  'UD Hardware Nusantara',
  'PT Plywood Indo',
  'Toko Besi & Komponen Jati',
  'Supplier Lokal (Jepara)',
];

/** Nama produk untuk datalist / combo */
export const PRODUCT_NAME_SAMPLES = [
  'ELBA CHAIR',
  'KURSI MAKAN JATI',
  'MEJA MAKAN SOLID WOOD',
  'LEMARI PAKAIAN MINIMALIS',
  'KURSI CAFE',
  'BANGKU BAR',
];

/** Mark up % — referensi kolom Excel (step 2,5%) */
export const MARKUP_PRESETS = [15, 17.5, 20, 22.5, 25, 27.5, 30, 32.5, 35];

/** Label tipe gaji work center */
export const TIPE_GAJI_OPTIONS = ['Harian', 'Borongan', 'Kontrak', 'Piece Rate'];

/** Unit kapasitas work center */
export const CAPACITY_UNIT_OPTIONS = ['m³', 'Meter (M)', 'Pcs', 'Jam', 'Lembar'];

/** Master rate pekerja per menit */
export const LABOR_RATE_PRESETS = [
  { id: '450', label: 'Rate A — Rp 450 / menit', value: 450 },
  { id: '500', label: 'Rate B — Rp 500 / menit (default)', value: 500 },
  { id: '550', label: 'Rate C — Rp 550 / menit', value: 550 },
  { id: '600', label: 'Rate D — Rp 600 / menit', value: 600 },
  { id: '650', label: 'Rate E — Rp 650 / menit', value: 650 },
];
