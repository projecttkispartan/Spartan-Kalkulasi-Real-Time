/**
 * Checklist optimasi parity Excel — sumber kebenaran untuk UI audit & dokumentasi.
 * Toleransi release: ≤ 1,5% atau ≤ Rp 25.000 (COGS vs SUMMARY COST).
 */

export const EXCEL_PARITY_TOLERANCE_PCT = 0.015;
export const EXCEL_PARITY_TOLERANCE_IDR = 25000;

/** @typedef {'master'|'produk'|'bom'|'material'|'proses'|'coating'|'packing'|'cogs'|'verifikasi'|'opsional'} ChecklistGroup */

/**
 * @typedef {object} ChecklistItemDef
 * @property {string} id
 * @property {ChecklistGroup} group
 * @property {string} label
 * @property {string} [hint]
 * @property {'required'|'recommended'|'warning'} severity
 * @property {string} [excelRef] — sheet / baris referensi
 */

/** Definisi statis — urutan = alur kerja dari 0 → COGS */
export const EXCEL_PARITY_CHECKLIST = [
  // ── Master global ──
  {
    id: 'master-imported',
    group: 'master',
    label: 'Master global ter-import (DATA BASE, RATIO, COATING, FORMULA, ROUND)',
    hint: 'Jalankan npm run import:masters — cek Master Data di app',
    severity: 'required',
    excelRef: 'DATA BASE · MASTER RATIO · COATING RATIO · FORMULA DATA · ROUND COMPONENT',
  },
  {
    id: 'master-work-centers',
    group: 'master',
    label: 'Work center & tarif routing tersedia',
    hint: 'Diperlukan jika proses pakai mode routing (bukan biaya tetap SUMMARY)',
    severity: 'recommended',
    excelRef: 'CALCULATION · routing catalog',
  },
  {
    id: 'master-kurs',
    group: 'master',
    label: 'Kurs USD/EUR diset (jika banding multi-mata uang)',
    hint: 'Default 16004 / 17500 — sesuaikan file Excel produk',
    severity: 'opsional',
    excelRef: 'BOM TEMPLATE header',
  },

  // ── Produk ──
  {
    id: 'produk-item-type',
    group: 'produk',
    label: 'itemType produk (STOOL, CHAIR, TABLE, …)',
    hint: 'Mempengaruhi rumus volume packing BOX/SF',
    severity: 'required',
    excelRef: 'BOM TEMPLATE',
  },
  {
    id: 'produk-wood-grade',
    group: 'produk',
    label: 'woodGradeId / spesifikasi kayu default',
    hint: 'Grade dari DATA BASE — contoh ZAN: MINDI 30 UP 200',
    severity: 'required',
    excelRef: 'DATA BASE · BOM TEMPLATE',
  },
  {
    id: 'produk-coating',
    group: 'produk',
    label: 'coatingId / nama coating produk',
    hint: 'Tanpa coating → biaya finishing = 0 di COGS',
    severity: 'required',
    excelRef: 'COATING RATIO · BOM TEMPLATE',
  },
  {
    id: 'produk-dimensi',
    group: 'produk',
    label: 'Dimensi produk W × D × H (mm)',
    hint: 'Harus sama sheet BOM TEMPLATE — dipakai packing & kontainer',
    severity: 'required',
    excelRef: 'BOM TEMPLATE',
  },
  {
    id: 'produk-header',
    group: 'produk',
    label: 'Kode BOM, nama, customer, versi terisi',
    hint: 'Sinkron ke root MODUL & export',
    severity: 'recommended',
    excelRef: 'BOM TEMPLATE',
  },

  // ── BOM ──
  {
    id: 'bom-struktur',
    group: 'bom',
    label: 'Struktur MODUL → SUBMODUL → PART lengkap',
    hint: 'Mirror hierarki Excel / PICK LIST',
    severity: 'required',
    excelRef: 'BOM TEMPLATE · PICK LIST',
  },
  {
    id: 'bom-part-identitas',
    group: 'bom',
    label: 'Setiap PART: kode, nama, qty > 0, materialType',
    hint: 'materialType = kategori SUMMARY (kayu, veneer, hardware, komponen, …)',
    severity: 'required',
    excelRef: 'SUMMARY COST baris 15–20',
  },
  {
    id: 'bom-dimensi-vol',
    group: 'bom',
    label: 'Part kayu: P × L × T (mm) → vol otomatis (÷ 10⁹ m³)',
    hint: 'vol = 0 → biaya master kayu = 0',
    severity: 'required',
    excelRef: 'CALCULATION · FORMULA vol_part_mm',
  },
  {
    id: 'bom-kode-unik',
    group: 'bom',
    label: 'Kode part unik (tidak duplikat)',
    severity: 'recommended',
    excelRef: 'CALCULATION kolom kode',
  },

  // ── Material kayu ──
  {
    id: 'mat-kayu-biaya',
    group: 'material',
    label: 'Biaya kayu: dari master ATAU manual — konsisten satu metode',
    hint: 'harga/m³ × vol × (1 + SF% + WF%) dari DATA BASE + MASTER RATIO',
    severity: 'required',
    excelRef: 'CALCULATION · DATA BASE',
  },
  {
    id: 'mat-sf-wf-zero',
    group: 'material',
    label: 'sf = 0 & wf = 0 pada part jika biaya sudah include waste',
    hint: 'Setelah “Hitung dari master” — waste sudah di biaya; rollup menambah SF/WF lagi jika > 0',
    severity: 'required',
    excelRef: 'MASTER RATIO · rollup BOM',
  },
  {
    id: 'mat-kayu-summary',
    group: 'material',
    label: 'Total material kayu ≈ baris KAYU material Excel (bukan HPP mentah saja)',
    hint: 'ZAN ref: material kayu ~Rp 781.738 — bukan total baris KAYU ~Rp 1,29 jt',
    severity: 'required',
    excelRef: 'SUMMARY COST baris KAYU kolom material',
  },
  {
    id: 'mat-non-kayu',
    group: 'material',
    label: 'Part non-kayu (hardware, veneer, komponen) + biaya material',
    hint: 'Bisa part ringkasan per baris SUMMARY (LAMINATING, AMPLAS, …)',
    severity: 'recommended',
    excelRef: 'SUMMARY COST baris 18–28',
  },

  // ── Proses ──
  {
    id: 'proses-routing',
    group: 'proses',
    label: 'Proses: routing per part ATAU part ringkasan per baris SUMMARY',
    hint: 'Live COGS tidak mengestimasi dari proses_count saja — waktu × tarif wajib',
    severity: 'required',
    excelRef: 'CALCULATION · SUMMARY COST proses',
  },
  {
    id: 'proses-mfg-map',
    group: 'proses',
    label: 'mfgProcess map ke kategori SUMMARY (Woodworking, Finishing, Assembly, …)',
    severity: 'recommended',
    excelRef: 'SUMMARY COST',
  },
  {
    id: 'proses-total-nonzero',
    group: 'proses',
    label: 'Total biaya proses > 0',
    hint: 'Proses kosong → COGS jauh di bawah Excel',
    severity: 'required',
    excelRef: 'SUMMARY COST factory processing',
  },

  // ── Coating ──
  {
    id: 'coat-id',
    group: 'coating',
    label: 'coatingId produk terpilih',
    severity: 'required',
    excelRef: 'COATING RATIO',
  },
  {
    id: 'coat-m2-kontrol',
    group: 'coating',
    label: 'Luas m² coating terkontrol (part finishing / surfaceM2 / meta fallback)',
    hint: 'Jangan biarkan semua part berdimensi ikut hitung — coating membengkak',
    severity: 'required',
    excelRef: 'CALCULATION luas m² · COATING RATIO',
  },
  {
    id: 'coat-biaya',
    group: 'coating',
    label: 'Biaya coating > 0 jika produk ber-finish',
    severity: 'recommended',
    excelRef: 'SUMMARY COST FINISHING / coating rollup',
  },

  // ── Packing ──
  {
    id: 'pack-dimensi-toleransi',
    group: 'packing',
    label: 'Toleransi packing BOX & SINGLE FACE (mm)',
    hint: 'Default tolW/D/H — sesuaikan BOM TEMPLATE',
    severity: 'recommended',
    excelRef: 'BOM TEMPLATE packing cols',
  },
  {
    id: 'pack-material-routing',
    group: 'packing',
    label: 'Packing: material + routing tenaga (BOX dan/atau SF)',
    hint: 'Qty × harga material + waktu × pekerja × rate',
    severity: 'required',
    excelRef: 'SUMMARY COST BOX PACKING · SINGLE FACE',
  },
  {
    id: 'pack-jalur',
    group: 'packing',
    label: 'Jalur packing COGS: BOX atau SF dipilih di cogsConfig',
    severity: 'required',
    excelRef: 'SUMMARY COST — satu jalur masuk production',
  },
  {
    id: 'pack-biaya',
    group: 'packing',
    label: 'Biaya packing jalur aktif > 0',
    severity: 'required',
    excelRef: 'SUMMARY COST BOX PACKING',
  },

  // ── COGS config ──
  {
    id: 'cogs-oh',
    group: 'cogs',
    label: 'OH pabrik 5% + OH manajemen 2,5% (atau sesuai sheet produk)',
    severity: 'required',
    excelRef: 'SUMMARY COST overhead rows',
  },
  {
    id: 'cogs-markup',
    group: 'cogs',
    label: 'Markup 20% + pembulatan ribuan (ROUND COMPONENT)',
    severity: 'required',
    excelRef: 'ROUND COMPONENT CALC',
  },
  {
    id: 'cogs-production-positive',
    group: 'cogs',
    label: 'Production cost > 0 sebelum OH',
    severity: 'required',
    excelRef: 'SUMMARY COST PRODUCTION COST',
  },

  // ── Verifikasi ──
  {
    id: 'verify-excel-mirror',
    group: 'verifikasi',
    label: 'Banding production & COGS vs Excel / excelMirror.summaryCost',
    hint: 'Import workbook menyimpan mirror — banding per komponen',
    severity: 'required',
    excelRef: 'SUMMARY COST total COGS',
  },
  {
    id: 'verify-toleransi',
    group: 'verifikasi',
    label: 'Selisih COGS ≤ 1,5% atau ≤ Rp 25.000',
    severity: 'required',
    excelRef: 'verifyZanCogs.mjs',
  },
  {
    id: 'verify-npm-test',
    group: 'verifikasi',
    label: 'Regresi npm test lulus (formula, rounding, ZAN seed)',
    severity: 'recommended',
    excelRef: 'scripts/runElbaTests.mjs · verifyZanCogs.mjs',
  },
  {
    id: 'verify-no-double-source',
    group: 'verifikasi',
    label: 'Tidak campur import Excel + hitung ulang master pada part yang sama',
    severity: 'warning',
    excelRef: '—',
  },
  {
    id: 'verify-export',
    group: 'verifikasi',
    label: 'Export Summary Cost / PDF setelah parity OK',
    severity: 'recommended',
    excelRef: 'SUMMARY COST export',
  },

  // ── Opsional optimasi ──
  {
    id: 'opt-container',
    group: 'opsional',
    label: 'Kapasitas kontainer (20ft / 40ft / 40HC) dari volume packing',
    hint: 'floor(netM³ ÷ vol box) — paritas logistik ELBA/ZAN',
    severity: 'opsional',
    excelRef: 'SUMMARY COST container rows',
  },
  {
    id: 'opt-hpp-supplier',
    group: 'opsional',
    label: 'Mirror HPP mentah & supplier (excelMirror) untuk audit samping',
    severity: 'opsional',
    excelRef: 'KALKULASI HPP · KALKULASI SUPPLIER',
  },
  {
    id: 'opt-pick-list',
    group: 'opsional',
    label: 'PICK LIST ter-import / tercatat',
    severity: 'opsional',
    excelRef: 'PICK LIST',
  },
  {
    id: 'opt-foto-part',
    group: 'opsional',
    label: 'Foto produk/part (opsional UX — tidak mempengaruhi COGS)',
    severity: 'opsional',
    excelRef: 'BOM TEMPLATE images',
  },
];

export const CHECKLIST_GROUP_LABELS = {
  master: 'Master global',
  produk: 'Header produk',
  bom: 'Struktur BOM',
  material: 'Material kayu & kategori',
  proses: 'Proses manufaktur',
  coating: 'Coating / finishing',
  packing: 'Packing',
  cogs: 'Konfigurasi COGS',
  verifikasi: 'Verifikasi & release',
  opsional: 'Opsional / logistik',
};

export const CHECKLIST_GROUP_ORDER = [
  'master',
  'produk',
  'bom',
  'material',
  'proses',
  'coating',
  'packing',
  'cogs',
  'verifikasi',
  'opsional',
];
