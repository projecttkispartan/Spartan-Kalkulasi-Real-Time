/**
 * Proses penambahan data master — langkah per tab + factory baris baru.
 */

export const MASTER_GLOBAL_ADD_STEPS = [
  {
    id: 'tab',
    title: 'Pilih tab',
    body: 'Buka tab yang sesuai (DATA BASE untuk kayu, COATING untuk finishing, WORK CENTER untuk rate proses).',
  },
  {
    id: 'add',
    title: 'Tambah atau reset',
    body: 'Klik «Tambah baris» untuk data manual, atau «Reset import» untuk muat ulang dari Excel (`npm run import:masters`).',
  },
  {
    id: 'fill',
    title: 'Isi field wajib',
    body: 'Lengkapi kode/specification, harga, dan tipe material. Ikuti petunjuk langkah di bawah tabel.',
  },
  {
    id: 'save',
    title: 'Simpan tab',
    body: 'Klik «Simpan tab ini» — data tersimpan di browser (IndexedDB). Ulangi per tab yang diedit.',
  },
  {
    id: 'use',
    title: 'Pakai di BOM',
    body: 'Di project: pilih grade/coating di header produk atau part; routing pilih workCenterId. Refresh editor jika combo kosong.',
  },
];

/** Tab yang mendukung Tambah baris / Hapus */
export const MASTER_TABS_ALLOW_ADD = new Set([
  'materials',
  'nonWood',
  'ratios',
  'woodLabor',
  'coatings',
  'formulaRows',
  'workCenters',
  'catalog',
]);

/** Langkah spesifik per tab (setelah global) */
export const MASTER_TAB_ADD_STEPS = {
  materials: [
    { title: 'Specification unik', body: 'Contoh: MINDI - 30 UP 200 — harus cocok dengan teks di BOM / woodGradeId lookup.' },
    { title: 'Harga supplier / m³', body: 'Isi hargaMaterialSupplier — dipakai engine `wood_material_cost` saat hitung part kayu.' },
    { title: 'SF buyer', body: 'Opsional di baris; waste kayu utama dari tab MASTER RATIO (WF 30%).' },
  ],
  nonWood: [
    { title: 'materialType', body: 'plywood, hardware, steel, komponen, … — menentukan ratio & perilaku part non-kayu.' },
    { title: 'Harga / m³', body: 'Buyer & supplier — untuk part yang lookup specification ini.' },
  ],
  ratios: [
    { title: 'Satu baris per kategori', body: 'materialType kayu / plywood / hardware — SF & WF % dipakai rollup jika part belum punya SF/WF=0.' },
    { title: 'Jangan duplikat', body: 'Cek label sudah ada sebelum tambah kategori baru.' },
  ],
  woodLabor: [
    { title: 'Job description', body: 'Nama pekerjaan kayu — referensi estimasi, bukan pengganti routing WC di part.' },
    { title: 'Biaya / m³', body: 'Labor cost per m³ untuk benchmarking woodworking.' },
  ],
  coatings: [
    { title: 'Nama finishing', body: 'Harus bisa dicocokkan di header produk (coatingId / nama coating).' },
    { title: 'Rounded / m²', body: 'Isi roundedCostM2 — dipakai `coating_cost` × luas m² part.' },
  ],
  formulaRows: [
    { title: 'Material type + proses', body: 'Baris mirror FORMULA DATA — WF/SF % dan ketebalan (mm).' },
    { title: 'Hati-hati ubah', body: 'Mempengaruhi interpretasi waste di engine; samakan dengan Excel jika perlu parity.' },
  ],
  workCenters: [
    { title: 'Kode = workCenterId', body: 'Kode unik dipilih di operasi part (routing).' },
    { title: 'Rate / menit', body: 'ratePerMin + labor — biaya proses = waktu × rate (+ TK).' },
  ],
  catalog: [
    { title: 'Kode part', body: 'Sama dengan kode di BOM / CALCULATION — lookup hardware & komponen.' },
    { title: 'Harga material', body: 'Untuk katalog gabungan; kayu utama tetap dari tab DATA BASE.' },
  ],
};

export function tabAllowsAdd(tabId) {
  return MASTER_TABS_ALLOW_ADD.has(tabId);
}

function nextNo(rows) {
  return Math.max(0, ...rows.map((r) => Number(r.no) || 0)) + 1;
}

function nextWoodId(rows) {
  const n = rows.filter((r) => String(r.id || '').startsWith('wood-')).length + 1;
  return `wood-manual-${n}-${Date.now()}`;
}

/** @returns {object} baris default untuk tab */
export function createMasterRow(tabId, rows = []) {
  const no = nextNo(rows);
  const stamp = Date.now();

  switch (tabId) {
    case 'materials':
      return {
        id: nextWoodId(rows),
        kode: `WOOD-M-${no}`,
        no,
        nama: 'GRADE KAYU BARU',
        specification: 'GRADE KAYU BARU',
        woodName: 'KAYU BARU',
        diameterGrade: '',
        vendorSupplier: '',
        hargaLogBuyer: 0,
        safetyFactorBuyer: 0,
        hargaMaterialBuyer: 0,
        hargaLogSupplier: 0,
        safetyFactorSupplier: 0,
        hargaMaterialSupplier: 0,
        pricePerM3Buyer: 0,
        pricePerM3Supplier: 0,
        unit: 'm³',
        materialType: 'kayu',
        source: 'manual',
        aktif: true,
      };
    case 'nonWood':
      return {
        id: `nonwood-${stamp}`,
        no,
        specification: 'MATERIAL BARU',
        woodName: 'MATERIAL BARU',
        materialType: 'komponen',
        pricePerM3Buyer: 0,
        pricePerM3Supplier: 0,
        unit: 'm³',
        source: 'manual',
        aktif: true,
      };
    case 'ratios':
      return {
        id: `ratio-manual-${stamp}`,
        category: 'komponen',
        materialType: 'komponen',
        label: `KATEGORI BARU ${no}`,
        sf: 0,
        wf: 0,
        wasteFactor: 0,
        source: 'manual',
        aktif: true,
      };
    case 'woodLabor':
      return {
        id: `wl-${stamp}`,
        no,
        jobDescription: 'PEKERJAAN KAYU BARU',
        laborMinPerM3: 0,
        laborHourPerM3: 0,
        laborCostPerM3: 0,
        source: 'manual',
      };
    case 'coatings':
      return {
        id: `coat-manual-${stamp}`,
        no,
        kode: `COAT-M-${no}`,
        name: 'FINISHING BARU',
        nama: 'FINISHING BARU',
        materialCostM2: 0,
        materialWaste: 0,
        laborM2: 0,
        totalProductionM2: 0,
        roundedCostM2: 0,
        unit: 'm²',
        materialType: 'coating',
        source: 'manual',
        aktif: true,
      };
    case 'formulaRows':
      return {
        id: `fdr-${stamp}`,
        no,
        row: no,
        materialType: 'kayu',
        proses: '',
        componentName: 'Komponen baru',
        wfPct: 30,
        sfPct: 0,
        thicknessMm: 0,
        buyerRatio: 1,
        supplierRatio: 1,
        source: 'manual',
      };
    case 'workCenters':
      return {
        id: `WC-${stamp}`,
        kode: `WC-${stamp}`,
        nama: 'Work Center Baru',
        ratePerMin: 500,
        laborRatePerMin: 500,
        wcCostPerMin: 500,
        laborCostPerM3: 0,
        mesin: '—',
        category: 'ROUTING',
        aktif: true,
        source: 'manual',
      };
    case 'catalog':
      return {
        id: `cat-${stamp}`,
        kode: `CAT-${no}`,
        nama: 'Item katalog baru',
        materialType: 'hardware',
        dimensi: { p: 0, l: 0, t: 0, label: '' },
        hargaLog: 0,
        safetyFactor: 0,
        hargaMaterial: 0,
        vendorSupplier: '',
        unit: 'EA',
        source: 'manual',
      };
    default:
      return null;
  }
}
