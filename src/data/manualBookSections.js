/**
 * Manual Book — konten & skenario step-by-step (Manufaktur BOM v1.0)
 */
export const MANUAL_SCENARIOS = [
  {
    id: 's-new-project',
    sectionId: 'dashboard',
    title: 'S1 — Buat project baru (kosong)',
    steps: [
      { n: 1, action: 'Buka Dashboard', detail: 'Pastikan banner master tidak merah. Jika error cache: refresh + npm run import:masters.' },
      { n: 2, action: 'Klik Buat Baru', detail: 'Project UUID baru dibuat · BOM = 1 MODUL kosong · cogsMode = live-master.' },
      { n: 3, action: 'Editor terbuka', detail: 'Tab Struktur Perakitan (tabel) · inline bar data produk di atas tab — isi kapan saja.' },
      { n: 4, action: 'Tambah hierarki', detail: 'Pada baris MODUL → tombol SUBMODUL / PART. Hanya PART yang punya material & routing.' },
      { n: 5, action: 'Simpan otomatis', detail: 'Badge header: Tersimpan. Data di IndexedDB browser (per mesin).' },
    ],
    flow: 'manualFromZero',
  },
  {
    id: 's-import-excel',
    sectionId: 'dashboard',
    title: 'S2 — Migrasi dari Excel (.xlsx)',
    steps: [
      { n: 1, action: 'Dashboard → Import Excel', detail: 'Pilih file workbook costing (contoh: ZAN-100, G632L-RO).' },
      { n: 2, action: 'Tunggu overlay', detail: 'Tahap: validate → parse BOM/CALCULATION → SUMMARY mirror → save IndexedDB.' },
      { n: 3, action: 'Editor terbuka otomatis', detail: 'Badge Mode: Excel Fixed · panel produk lengkap · excelMirror terisi.' },
      { n: 4, action: 'Tab Detail COGS', detail: 'Buka panel deviasi — cek PASS/WARN/FAIL vs SUMMARY COST.' },
      { n: 5, action: 'Gate release', detail: 'ZAN/FNA ≤ 1,5% · G632L ≤ 3%. Jalankan npm test untuk regresi otomatis.' },
    ],
    flow: 'importExcel',
  },
  {
    id: 's-bom-part',
    sectionId: 'bom-material',
    title: 'S3 — Input PART kayu (contoh G632L)',
    steps: [
      { n: 1, action: 'Inline bar', detail: 'Isi kode G632L-RO, dimensi 2200×775×760, grade TEAK KAMPUNG, coating produk.' },
      { n: 2, action: 'Tab Struktur → PART', detail: 'Pilih tipe material Kayu · picker DATA BASE untuk grade part.' },
      { n: 3, action: 'Dimensi part', detail: 'Isi P×L×T (mm) → vol m³ terhitung · qty sesuai Excel CALCULATION.' },
      { n: 4, action: 'SF / WF', detail: 'Default dari MASTER RATIO. Set 0 jika biaya sudah include waste. sfWfManual persist setelah edit.' },
      { n: 5, action: 'Tab Material', detail: 'Verifikasi nominal per part · warna amber/indigo = sumber biaya master vs manual.' },
      { n: 6, action: 'Tab Proses', detail: 'Buka routing modal part · tambah operasi WC · biaya mesin (biru) + pekerja (hijau).' },
    ],
    flow: 'bom',
  },
  {
    id: 's-cogs-parity',
    sectionId: 'cogs',
    title: 'S4 — Verifikasi COGS & parity',
    steps: [
      { n: 1, action: 'Tab Container', detail: 'Isi packing BOX atau SF: material + routing tenaga kerja · pilih jalur aktif di COGS.' },
      { n: 2, action: 'Tab COGS — config', detail: 'Factory OH, Mgmt OH (G632L: 1,5%), markup 20%, include coating ON/OFF.' },
      { n: 3, action: 'Pie production', detail: 'Material + Proses + Packing (+ coating detail jika OFF di COGS).' },
      { n: 4, action: 'Panel deviasi', detail: 'Butuh excelMirror (import) atau baseline future. Δ Rp dan % per kategori.' },
      { n: 5, action: 'Tab Summary', detail: 'Σ baris PART harus = kartu total header (Δ = 0).' },
      { n: 6, action: 'Export', detail: 'Menu Export PDF setelah parity OK.' },
    ],
    flow: 'cogs',
  },
  {
    id: 's-master',
    sectionId: 'master',
    title: 'S5 — Setup & reset Master Data',
    steps: [
      { n: 1, action: 'Terminal (dev)', detail: 'npm run import:masters — refresh seed JSON ke src/data/masters/.' },
      { n: 2, action: 'Editor → Master Data', detail: 'Buka modal DATABASE · edit harga jika perlu · Simpan tab ini.' },
      { n: 3, action: 'Master WC', detail: 'Tarif rate/menit per work center untuk routing.' },
      { n: 4, action: 'Reset import', detail: 'Jika cache rusak: Reset import di Master Data · refresh halaman.' },
      { n: 5, action: 'Sinkron DATA BASE', detail: 'Di tab Struktur: tombol hijau cocokkan grade kayu & coating ke semua part.' },
    ],
    flow: 'master',
  },
];

export const MANUAL_BOOK_SECTIONS = [
  {
    id: 'intro',
    title: '1. Pengenalan',
    summary: 'Gambaran sistem, peran app vs Excel, dan prasyarat.',
    body: [
      'Manufaktur BOM v1.0 menggantikan workbook Excel costing (sheet BOM TEMPLATE, CALCULATION, DATA BASE, SUMMARY COST) dengan editor web 7 tab dan engine COGS terintegrasi.',
      'Target parity: Total COGS vs SUMMARY COST ≤ 1,5% (ZAN/FNA) atau ≤ 3% (G632L). Regresi: npm test.',
      'Penyimpanan project: IndexedDB per browser. Master material: seed JSON + cache — bukan live ERP (kecuali mode API diaktifkan).',
    ],
    tips: [
      'Gunakan Chrome/Edge terbaru · resolusi ≥ 1280px untuk tabel lebar.',
      'Backup: duplikat project atau export sebelum hapus sample.',
    ],
  },
  {
    id: 'dashboard',
    title: '2. Dashboard',
    summary: 'Daftar BOM, buat baru, import Excel, duplikat & hapus.',
    flow: 'dashboard',
    body: [
      'Dashboard menampilkan KPI total BOM, kolom Tipe/Kode/Nama/Customer/Versi/HPP/Status, dan expand preview komponen.',
      'Buat Baru: langsung editor kosong — tidak ada wizard template.',
      'Import Excel: satu-satunya cara otomatis mengisi excelMirror untuk audit parity.',
    ],
    images: [
      {
        src: '/docs/qa/evidence/erp-01-bom-list.png',
        alt: 'Daftar BOM ERP staging',
        caption: 'Referensi ERP: daftar BOM manufacture (kolom parity dashboard).',
      },
    ],
  },
  {
    id: 'editor-flow',
    title: '3. Editor & tab kalkulasi',
    summary: 'Layout editor, inline bar produk, urutan tab.',
    flow: 'editor',
    body: [
      'Header editor: kode project, mode COGS, status simpan, Manual Book, Master Data/WC, Export, Simpan.',
      'Project baru: ProductInlineBar (bukan panel besar). Import Excel: ProductPanel lengkap + dimensi packing.',
      'Urutan disarankan: Struktur → Material → Proses → Container → Summary → COGS.',
    ],
    images: [
      {
        src: '/assets/excel-images/zan-100/by-sheet-row/BOM_TEMPLATE_row1.jpg',
        alt: 'Excel BOM TEMPLATE ZAN',
        caption: 'Excel referensi: hierarki BOM TEMPLATE baris ZAN-100.',
      },
    ],
  },
  {
    id: 'bom-material',
    title: '4. Struktur BOM & material',
    summary: 'MODUL → SUBMODUL → PART, picker DATA BASE, biaya kayu.',
    flow: 'bom',
    body: [
      'MODUL/SUBMODUL: rollup biaya dari anak — tidak punya material sendiri.',
      'PART kayu: vol = P×L×T/10⁹ m³ · biaya = harga/m³ × vol × qty × (1+SF+WF).',
      'PART non-kayu: plywood, HPL, hardware, upholstery — picker section DATA BASE · biaya qty atau m².',
      'Mode Manual pada picker: spec bebas · harga di kolom biaya part.',
    ],
  },
  {
    id: 'cogs',
    title: '5. COGS, packing & parity',
    summary: 'Production cost, OH, markup, deviasi Excel.',
    flow: 'cogs',
    body: [
      'Production = material + proses + packing (+ coating jika includeCoatingInCogs) (+ FOB jika aktif).',
      'Total COGS = production × (1 + factory OH) × (1 + mgmt OH) — selaras formula SUMMARY Excel.',
      'Checklist parity di modal COGS: hybrid template-excel + master → FAIL di mode excel-fixed.',
    ],
    images: [
      {
        src: '/assets/excel-images/zan-100/by-sheet-row/SUMMARY_COST_row3.png',
        alt: 'SUMMARY COST Excel',
        caption: 'Acuan angka: sheet SUMMARY COST (production + COGS + markup).',
      },
      {
        src: '/docs/qa/evidence/erp-tab-summary.png',
        alt: 'Summary tab ERP',
        caption: 'ERP staging — tab ringkasan biaya (target UX integrasi).',
      },
    ],
  },
  {
    id: 'master',
    title: '6. Master Data',
    summary: 'DATABASE, FOB, WORK CENTER, import & reset.',
    flow: 'master',
    body: [
      'DATABASE: wood, plywood, MDF, hardware, finishing, packing, dll. per section.',
      'FOB COST: layanan export + tarif bulat Rp/m³ per 20ft/40ft/40HC.',
      'WORK CENTER: kode WC, nama, rate/menit — dipakai routing tab Proses.',
    ],
    images: [
      {
        src: '/docs/qa/evidence/erp-02-bom-new.png',
        alt: 'Wizard BOM baru ERP',
        caption: 'ERP: wizard BOM baru (referensi integrasi master live).',
      },
    ],
  },
  {
    id: 'modes',
    title: '7. Mode Excel Fixed vs Live Master',
    summary: 'Kapan pakai mode mana · guard recalc.',
    flow: 'modes',
    body: [
      'Excel Fixed (import): biaya part dari CALCULATION · jangan recalc master tanpa konfirmasi.',
      'Live Master (baru/manual): hitung dari DATA BASE · tombol «Hitung harga kayu dari master» tersedia.',
      'Switch excel-fixed → live-master: konfirmasi dialog · clears biayaFromExcel flags.',
    ],
  },
  {
    id: 'troubleshoot',
    title: '8. Troubleshooting',
    summary: 'Masalah umum & solusi cepat.',
    body: [],
    steps: [
      { n: 1, problem: 'Master gagal di-cache', fix: 'Refresh · npm run import:masters · Master Data → Reset import.' },
      { n: 2, problem: 'Biaya PART = 0', fix: 'Pilih DATA BASE · isi P×L×T · qty ≥ 1 · master loaded (mastersReady).' },
      { n: 3, problem: 'COGS jauh dari Excel', fix: 'Cek packing jalur · coating · FOB · part EXCEL-SUMMARY duplikat · mode excel-fixed.' },
      { n: 4, problem: 'SF/WF reset setelah refresh', fix: 'Pastikan sfWfManual=true setelah edit manual pada part import.' },
      { n: 5, problem: 'Summary ≠ kartu total', fix: 'Bug regresi — lapor dev · harusnya computePartCostRow unified.' },
    ],
  },
];
