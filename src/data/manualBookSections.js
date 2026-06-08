/**
 * Manual Book — konten & skenario step-by-step (Manufaktur BOM v1.0)
 */

/** Rekomendasi urutan ideal per persona — ditampilkan di sidebar atas Manual Book */
export const MANUAL_BEST_PRACTICES = [
  {
    id: 'bp-qa-parity',
    sectionId: 'best-practices',
    persona: 'QA / Parity Excel',
    title: 'Import G632L → COGS deviasi → npm test gate',
    steps: [
      { n: 1, action: 'Import workbook G632L-RO', detail: 'Dashboard → Import Excel · tunggu overlay selesai.', expected: 'Editor terbuka · badge Mode: Excel Fixed · excelMirror terisi.', fail: 'File bukan .xlsx atau sheet BOM/SUMMARY hilang — cek format workbook.' },
      { n: 2, action: 'Tab COGS → View Deviasi', detail: 'Tombol full-page di header checklist — bukan panel scroll lama.', expected: 'Modal menampilkan pie produksi + tabel deviasi PASS/WARN/FAIL.', fail: 'excelMirror kosong — ulang import atau cek sheet SUMMARY COST.' },
      { n: 3, action: 'Verifikasi total COGS', detail: 'Δ total ≤ 3% untuk G632L · per kategori material/proses/packing.', expected: 'Badge totalCogs = pass atau warn dalam toleransi.', fail: 'FAIL besar → cek coating, packing jalur, part duplikat EXCEL-SUMMARY.' },
      { n: 4, action: 'npm test (regresi)', detail: 'Di terminal dev: npm test — gate otomatis G632L/ZAN.', expected: 'Semua script test green (kecuali env missing file).', fail: 'Lihat output script gagal · bandingkan dengan excelMirror di project.' },
    ],
    flow: 'importExcel',
  },
  {
    id: 'bp-engineer-new',
    sectionId: 'best-practices',
    persona: 'Engineer BOM baru',
    title: 'Buat Baru → Struktur PART → Material → Proses → Summary',
    steps: [
      { n: 1, action: 'Dashboard → Buat Baru', detail: 'Project kosong · cogsMode = live-master.', expected: 'Editor terbuka · inline bar produk di atas tab.', fail: 'Master banner merah — refresh + npm run import:masters.' },
      { n: 2, action: 'Tab Struktur — tambah PART', detail: 'MODUL → SUBMODUL → PART · isi P×L×T dan picker DATA BASE.', expected: 'Minimal 1 PART dengan vol m³ > 0.', fail: 'Tab Material kosong — PART belum ditambahkan di Struktur.' },
      { n: 3, action: 'Tab Material & Proses', detail: 'Verifikasi nominal material · routing WC per part.', expected: 'Biaya part > 0 · baris proses tampil di tab Proses.', fail: 'Biaya 0 — pilih grade DATA BASE · qty ≥ 1 · master loaded.' },
      { n: 4, action: 'Container → Summary → COGS', detail: 'Packing BOX/SF · rollup Σ part = kartu header.', expected: 'Summary Δ = 0 · COGS terhitung dengan OH + markup.', fail: 'Summary ≠ total — lapor dev (regresi computePartCostRow).' },
    ],
    flow: 'manualFromZero',
  },
  {
    id: 'bp-demo-github',
    sectionId: 'best-practices',
    persona: 'Demo GitHub Pages',
    title: 'Buka sample → verifikasi Jumlah Part > 0',
    steps: [
      { n: 1, action: 'Buka sample dari dashboard', detail: 'Pilih project contoh (G632L/ZAN) yang sudah di-seed.', expected: 'Editor terbuka · Jumlah Part > 0 di footer Material.', fail: 'IndexedDB kosong di browser baru — buka sample sekali atau import Excel.' },
      { n: 2, action: 'Sembunyikan panel produk', detail: 'Tombol Sembunyikan Produk — inline bar tetap menampilkan field penting.', expected: 'Kode, dimensi, grade, coating masih bisa diedit.', fail: 'Field hilang — refresh build terbaru (ProductInlineBar expanded).' },
      { n: 3, action: 'Tab COGS tanpa file Excel', detail: 'Deviasi butuh excelMirror — sample import sudah punya.', expected: 'View Deviasi tampil angka atau N/A jelas jika mirror absent.', fail: 'Jangan expect upload Excel di server static — import hanya lokal.' },
    ],
    flow: 'dashboard',
  },
];

export const MANUAL_SCENARIOS = [
  {
    id: 's-new-project',
    sectionId: 'dashboard',
    title: 'S1 — Buat project baru (kosong)',
    steps: [
      { n: 1, action: 'Buka Dashboard', detail: 'Pastikan banner master tidak merah. Jika error cache: refresh + npm run import:masters.', expected: 'Dashboard KPI dan daftar BOM tampil normal.', fail: 'Banner merah master — Reset import di Master Data.' },
      { n: 2, action: 'Klik Buat Baru', detail: 'Project UUID baru dibuat · BOM = 1 MODUL kosong · cogsMode = live-master.', expected: 'Editor terbuka otomatis.', fail: 'Halaman blank — cek console IndexedDB.' },
      { n: 3, action: 'Editor terbuka', detail: 'Tab Struktur Perakitan (tabel) · inline bar data produk di atas tab — isi kapan saja.', expected: 'ProductInlineBar dengan field kode, dimensi, grade.', fail: 'Panel besar default — normal untuk project baru.' },
      { n: 4, action: 'Tambah hierarki', detail: 'Pada baris MODUL → tombol SUBMODUL / PART. Hanya PART yang punya material & routing.', expected: 'Baris SUBMODUL/PART muncul di tabel Struktur.', fail: 'Tab Material kosong sampai ada minimal 1 PART.' },
      { n: 5, action: 'Simpan otomatis', detail: 'Badge header: Tersimpan. Data di IndexedDB browser (per mesin).', expected: 'Badge hijau Tersimpan dalam beberapa detik.', fail: 'Tersimpan error — storage penuh atau private mode.' },
    ],
    flow: 'manualFromZero',
  },
  {
    id: 's-import-excel',
    sectionId: 'dashboard',
    title: 'S2 — Migrasi dari Excel (.xlsx)',
    steps: [
      { n: 1, action: 'Dashboard → Import Excel', detail: 'Pilih file workbook costing (contoh: ZAN-100, G632L-RO).', expected: 'File terpilih · overlay import muncul.', fail: 'Format bukan .xlsx — simpan ulang dari Excel asli.' },
      { n: 2, action: 'Tunggu overlay', detail: 'Tahap: validate → parse BOM/CALCULATION → SUMMARY mirror → save IndexedDB.', expected: 'Overlay sukses · redirect ke editor.', fail: 'Parse error — sheet BOM TEMPLATE atau SUMMARY hilang.' },
      { n: 3, action: 'Editor terbuka otomatis', detail: 'Badge Mode: Excel Fixed · panel produk lengkap · excelMirror terisi.', expected: 'ProductPanel + excelMirror.summaryCost ada angka.', fail: 'Mode live-master — import gagal partial.' },
      { n: 4, action: 'Tab COGS → View Deviasi', detail: 'Tombol full-page di area checklist COGS — pie produksi + deviasi Excel.', expected: 'Modal CogsInsight · badge PASS/WARN/FAIL pada tombol.', fail: 'Mirror kosong — ulang import · cek sheet SUMMARY COST.' },
      { n: 5, action: 'Gate release', detail: 'ZAN/FNA ≤ 1,5% · G632L ≤ 3%. Jalankan npm test untuk regresi otomatis.', expected: 'Deviasi dalam toleransi · test script pass.', fail: 'FAIL besar — lihat S4 dan troubleshooting §8.' },
    ],
    flow: 'importExcel',
  },
  {
    id: 's-bom-part',
    sectionId: 'bom-material',
    title: 'S3 — Input PART kayu (contoh G632L)',
    steps: [
      { n: 1, action: 'Inline bar / panel produk', detail: 'Isi kode G632L-RO, dimensi 2200×775×760, grade TEAK KAMPUNG, coating produk.', expected: 'Vol produk terhitung · coating preview tampil.', fail: 'Dimensi 0 — isi W×D×H numerik.' },
      { n: 2, action: 'Tab Struktur → PART', detail: 'Pilih tipe material Kayu · picker DATA BASE untuk grade part.', expected: 'Grade ter-link · harga/m³ dari master.', fail: 'Picker kosong — npm run import:masters.' },
      { n: 3, action: 'Dimensi part', detail: 'Isi P×L×T (mm) → vol m³ terhitung · qty sesuai Excel CALCULATION.', expected: 'Kolom vol > 0 · biaya dasar terisi.', fail: 'Vol 0 — cek P×L×T dan qty.' },
      { n: 4, action: 'SF / WF', detail: 'Default dari MASTER RATIO. Set 0 jika biaya sudah include waste. sfWfManual persist setelah edit.', expected: 'SF/WF tampil di rollup · persist setelah refresh jika manual.', fail: 'SF/WF reset — set sfWfManual=true pada part import.' },
      { n: 5, action: 'Tab Material', detail: 'Verifikasi nominal per part · warna amber/indigo = sumber biaya master vs manual.', expected: 'Daftar PART dengan nominal > 0.', fail: 'Tab kosong — belum ada PART di Struktur.' },
      { n: 6, action: 'Tab Proses', detail: 'Buka routing modal part · tambah operasi WC · biaya mesin (biru) + pekerja (hijau).', expected: 'Σ proses > 0 di footer part.', fail: 'WC rate 0 — isi Master Work Center.' },
    ],
    flow: 'bom',
  },
  {
    id: 's-cogs-parity',
    sectionId: 'cogs',
    title: 'S4 — Verifikasi COGS & parity',
    steps: [
      { n: 1, action: 'Tab Container', detail: 'Isi packing BOX atau SF: material + routing tenaga kerja · pilih jalur aktif di COGS.', expected: 'Biaya packing BOX dan SF terisi.', fail: 'Packing 0 — isi material packing + routing TK.' },
      { n: 2, action: 'Tab COGS — config', detail: 'Factory OH, Mgmt OH (G632L: 1,5%), markup 20%, include coating ON/OFF.', expected: 'Waterfall COGS update real-time.', fail: 'Angka stale — refresh tab atau toggle config.' },
      { n: 3, action: 'View Deviasi (modal)', detail: 'Pie production: Material + Proses + Packing (+ coating detail jika OFF di COGS).', expected: 'Chart + tabel deviasi full-page.', fail: 'Butuh excelMirror dari import.' },
      { n: 4, action: 'Badge deviasi', detail: 'PASS/WARN/FAIL per kategori · Δ Rp dan % vs SUMMARY COST.', expected: 'Total COGS status sesuai gate produk.', fail: 'Hybrid excel+master — checklist FAIL di excel-fixed.' },
      { n: 5, action: 'Tab Summary', detail: 'Σ baris PART harus = kartu total header (Δ = 0).', expected: 'Total Summary = total header identik.', fail: 'Selisih — regresi computePartCostRow.' },
      { n: 6, action: 'Export', detail: 'Menu Export PDF setelah parity OK.', expected: 'PDF terunduh dengan angka final.', fail: 'Export disabled jika data belum tersimpan.' },
    ],
    flow: 'cogs',
  },
  {
    id: 's-master',
    sectionId: 'master',
    title: 'S5 — Setup & reset Master Data',
    steps: [
      { n: 1, action: 'Terminal (dev)', detail: 'npm run import:masters — refresh seed JSON ke src/data/masters/.', expected: 'Script selesai tanpa error.', fail: 'Path Excel missing — jalankan dari root repo.' },
      { n: 2, action: 'Editor → Master Data', detail: 'Buka modal DATABASE · edit harga jika perlu · Simpan tab ini.', expected: 'Perubahan persist di IndexedDB cache.', fail: 'Simpan gagal — refresh + Reset import.' },
      { n: 3, action: 'Master WC', detail: 'Tarif rate/menit per work center untuk routing.', expected: 'Rate > 0 untuk WC yang dipakai routing.', fail: 'Biaya proses 0 — cek rate WC.' },
      { n: 4, action: 'Reset import', detail: 'Jika cache rusak: Reset import di Master Data · refresh halaman.', expected: 'Master re-hydrate dari seed JSON.', fail: 'Masih error — clear site data browser.' },
      { n: 5, action: 'Sinkron DATA BASE', detail: 'Di tab Struktur: tombol hijau cocokkan grade kayu & coating ke semua part.', expected: 'Semua part ter-link ke master grade.', fail: 'Skip part dengan materialSourceMode = manual.' },
    ],
    flow: 'master',
  },
  {
    id: 's-material-manual',
    sectionId: 'bom-material',
    title: 'S6 — Kebutuhan Material: mode Manual vs DATA BASE',
    steps: [
      { n: 1, action: 'Tab Struktur atau Material → PART', detail: 'Pada picker grade/material, klik toggle Manual (bukan DATA BASE).', expected: 'UI switch ke input spec bebas · materialSourceMode = manual tersimpan di node.', fail: 'Kembali ke DATA BASE setelah pindah tab — update build terbaru (bug fix).' },
      { n: 2, action: 'Isi spec manual', detail: 'Ketik spesifikasi material (contoh: TEAK SOLID 40mm) · biaya unit manual jika perlu.', expected: 'Teks spec tersimpan di woodSpecification / materialSpecification.', fail: 'Spec kosong — mode fallback ke DATA BASE saat remount.' },
      { n: 3, action: 'Pindah tab Proses', detail: 'Buka routing · tambah operasi — biarkan editor beberapa detik.', expected: 'Tab Proses normal · tidak mengubah mode material.', fail: '—' },
      { n: 4, action: 'Kembali tab Material', detail: 'Verifikasi toggle masih Manual · spec dan biaya unchanged.', expected: 'Manual + teks spec identik sebelum pindah tab.', fail: 'Auto-enrich menimpa — pastikan materialSourceMode=manual di PART.' },
      { n: 5, action: 'Switch ke DATA BASE (opsional)', detail: 'Pilih item dari picker master — mode berubah ke database.', expected: 'Master id terisi · harga dari DATA BASE.', fail: 'Harga 0 — pilih SKU valid di section master.' },
      { n: 6, action: 'Regresi otomatis', detail: 'node scripts/testMaterialManualMode.mjs — enrichNodeFromMaster skip auto-link.', expected: 'Test pass: master id tidak di-set saat manual mode.', fail: 'Test fail — cek guard di masterLookup.js.' },
    ],
    flow: 'materialManualMode',
  },
];

export const MANUAL_BOOK_SECTIONS = [
  {
    id: 'best-practices',
    title: '★ Skenario Terbaik',
    summary: 'Urutan ideal untuk QA parity, engineer BOM baru, dan demo GitHub Pages.',
    body: [
      'Tiga alur rekomendasi di bawah mengacu persona tim — bukan mengganti skenario S1–S6, melainkan shortcut operasional harian.',
      'QA: selalu akhiri dengan npm test. Engineer: pastikan PART ada sebelum buka Material. Demo: andalkan sample seeded, bukan upload Excel di server static.',
    ],
    isBestPractices: true,
  },
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
    checklist: [
      'Field wajib sebelum release: Kode BOM, Nama produk, Customer (jika ada kontrak).',
      'Import: file .xlsx dengan sheet BOM TEMPLATE + SUMMARY COST.',
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
      'Sembunyikan Produk: ProductInlineBar expanded — semua field penting tetap editable (kode, dimensi, grade, coating, packing tol).',
      'Urutan disarankan: Struktur → Material → Proses → Container → Summary → COGS.',
      'Kalkulasi Lengkap: tab Rumus & Formula mendokumentasikan registry.json + rollup SF/WF.',
    ],
    checklist: [
      'Struktur: minimal 1 PART sebelum Material.',
      'Material: mode Manual vs DATA BASE per part (S6).',
      'COGS: View Deviasi via modal full-page.',
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
      'Mode Manual: spec bebas · materialSourceMode=manual persist · enrichNodeFromMaster tidak auto-link ke master.',
      'Tab Material hanya menampilkan node tipe PART — kosong jika hierarki belum punya part.',
    ],
    checklist: [
      'Struktur PART: tipe material, P×L×T, qty, SF/WF.',
      'Material tab: verifikasi nominal · toggle Manual/DATA BASE.',
      'Proses: routing WC per PART.',
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
      'View Deviasi: tombol di tab COGS → modal full-page (CogsInsightModal) — menggantikan panel scroll collapsible.',
      'Checklist parity di modal COGS: hybrid template-excel + master → FAIL di mode excel-fixed.',
    ],
    checklist: [
      'Container: isi BOX dan/atau SF · pilih jalur aktif.',
      'COGS config: Factory OH, Mgmt OH, markup, include coating.',
      'View Deviasi: cek PASS/WARN/FAIL vs excelMirror.',
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
      { n: 3, problem: 'Tab Material kosong', fix: 'Tambah PART di tab Struktur — Material hanya render node PART.' },
      { n: 4, problem: 'Manual mode reset ke DATA BASE', fix: 'Build terbaru: materialSourceMode persist · cek S6 · testMaterialManualMode.mjs.' },
      { n: 5, problem: 'COGS jauh dari Excel', fix: 'View Deviasi modal · cek packing jalur · coating · FOB · mode excel-fixed.' },
      { n: 6, problem: 'SF/WF reset setelah refresh', fix: 'Pastikan sfWfManual=true setelah edit manual pada part import.' },
      { n: 7, problem: 'Summary ≠ kartu total', fix: 'Bug regresi — lapor dev · harusnya computePartCostRow unified.' },
    ],
  },
];
