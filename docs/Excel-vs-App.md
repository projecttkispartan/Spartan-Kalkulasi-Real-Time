# Panduan: Excel vs App (Manufaktur BOM)

**Dokumen uji & roadmap (format `.mmd`):**

- **PRD Sistem (induk):** [PRD-Manufaktur-BOM-System.mmd](./PRD-Manufaktur-BOM-System.mmd)
- **QA ERP vs App (folder `docs/qa/`)** — [README qa](./qa/README.md)
- [UAT G632L manual dari nol](./UAT-G632L-Manual-From-Zero.mmd)
- [PRD peningkatan sistem v2](./PRD-System-Improvement-v2.mmd)
- [API contract draft v1](./API-Contract-BOM-Platform.mmd)

## Ringkasan angka

| Referensi | Total COGS (ZAN-100) | Catatan |
|-----------|----------------------|---------|
| Excel SUMMARY COST | ~Rp 2.196.662 | Production + OH + management |
| App (sample ZAN) | ~Rp 2.196.441 | Toleransi ≤ 1,5% atau ≤ Rp 25.000 |
| Baris KAYU saja Excel | ~Rp 1.291.225 | **Bukan** total COGS |

## Alur kerja di app

1. **Refresh** halaman (F5).
2. Pastikan master ter-load: menu **Master Data** → cek sumber file ZAN-100.
3. **Import Excel** (Dashboard) atau buka sample project hasil `npm run import:samples`.
4. Impor workbook membaca: **BOM TEMPLATE**, **CALCULATION**, **SUMMARY COST** (packing + proses), **KALKULASI HPP/SUPPLIER**, **PICK LIST**.
5. Master global: **DATA BASE**, **FORMULA DATA**, **MASTER RATIO**, **COATING RATIO**, **ROUND COMPONENT** (`npm run import:masters`).
6. Tab **COGS / Summary** → bandingkan `excelMirror.summaryCost` dengan Excel → **Export** jika OK.

## Sheet Excel yang di-import per project

| Sheet | Dipakai untuk |
|-------|----------------|
| BOM TEMPLATE | Struktur modul/part, header produk |
| CALCULATION | Biaya kayu per kode part, vol, luas m² |
| SUMMARY COST | Packing BOX/SF, baris proses (LAMINATING, AMPLAS, …), OH % |
| KALKULASI HPP MENTAH | Mirror HPP (`excelMirror.hppMentah`) |
| KALKULASI SUPPLIER 1–3 | Mirror supplier (`excelMirror.supplierKalkulasi`) |
| PICK LIST | Daftar order (`excelMirror.pickList`) |
| DATA BASE / FORMULA / RATIO / COATING / ROUND | Master global (bukan per file project) |

## Import master dari Excel

```bash
# Path default: file ZAN-100 di folder Dokumen
npm run import:masters

# Path custom
set ZAN_EXCEL=D:\path\to\file.xlsx
npm run import:masters
```

Output: `src/data/masters/` (database, ratios, coatings, formulas, rounding, meta).

### DATA BASE — section P0 (material part)

| Section Excel | File master | Unit | Picker Part |
|---------------|-------------|------|-------------|
| WOOD | `database/wood.json` | m³ | `WoodGradeField` |
| PLYWOOD | `database/plywood.json` | m³ | `MaterialMasterField` |
| MDF | `database/mdf.json` | m³ | `MaterialMasterField` + section MDF |
| CORE | `database/core.json` | m³ | `MaterialMasterField` + section CORE |
| HPL | `database/hpl.json` | m² | `MaterialMasterField` + section HPL |
| VENEER | `database/veneer.json` | m² | `MaterialMasterField` (vertikal; kosong di ZAN-100) |
| EDGING | `database/edging.json` | m² | `MaterialMasterField` (kosong di ZAN-100) |

### DATA BASE — katalog horizontal (kolom kanan)

| Section Excel | File master | Unit umum | Picker Part |
|---------------|-------------|-----------|-------------|
| ASSEMBLING HARDWARE | `database/assemblingHardware.json` | PCS, LBR, KG, M | `MaterialMasterField` (hardware) |
| FITTING HARDWARE | `database/fittingHardware.json` | PCS, … | `MaterialMasterField` (hardware) |
| TYPE OF VENEER | `database/veneerTypes.json` | m² | `MaterialMasterField` (veneer) |
| SANDING MATERIAL | `database/sandingMaterial.json` | PCS, LBR, LTR | `MaterialMasterField` (komponen) |
| FINISHING MATERIAL | `database/finishingMaterial.json` | LTR, LBR, KG, … | `MaterialMasterField` (finishing) |
| PACKING MATERIAL | `database/packingMaterial.json` | M, M2, PCS, KG | `MaterialMasterField` (komponen) |

Harga satuan = kolom **TOTAL PRICE** (sudah termasuk safety factor 5–10%).

Audit section: `npm run audit:database` (env `ZAN_EXCEL`) — vertikal + katalog.

Engine: `computeMaterialBiayaFromMaster` / `applyMasterToPart` di `masterLookup.js`.

### DATA BASE — FOB COST (export kontainer)

| Kontainer | Volume referensi (m³) | Rounded FOB / m³ |
|-----------|----------------------|------------------|
| 20 FT | 28 / 32 | Rp 500.000 |
| 40 FT | 55 / 64 | Rp 300.000 |
| 40 HC | 62 / 70 | Rp 300.000 |

Rumus: per baris `(Qty × Biaya) × 1,05` → total + SF 5% → **rounded Rp/m³** × **volume packing produk** (m³).

Master: `database/fobCost.json` · Tab Master **FOB COST** · COGS: centang **Aktifkan biaya FOB** + pilih kontainer.

## Environment

| Variable | Fungsi |
|----------|--------|
| `ZAN_EXCEL` | File Excel ZAN-100 untuk import master |
| `ELBA_EXCEL` | File Excel ELBA (impor BOM / verifikasi) |

## Sumber perhitungan

| Komponen | Sumber app |
|----------|------------|
| Volume part | `vol_part_mm` — P×L×T / 10⁹ |
| Volume packing | `vol_packing_box` / `vol_packing_sf` |
| Kapasitas kontainer | `container_pcs` — floor(netM³ / vol) |
| Biaya kayu | DATA BASE harga/m³ × vol × (1+SF+WF) |
| Biaya plywood/MDF/CORE | DATA BASE harga/m³ × vol × (1+SF+WF) |
| Biaya HPL/veneer (m²) | DATA BASE harga/m² × surfaceM2 × (1+SF%) |
| Biaya coating | COATING RATIO rounded/m² × Σ surfaceM2 part |
| Harga jual | ROUND rules (floor ribuan) + markup |

## Checklist pengganti Excel (lengkap)

Daftar centang terstruktur + audit live di tab COGS: **[Checklist-Pengganti-Excel.md](./Checklist-Pengganti-Excel.md)**

Ringkas:

| Tahap | Item kunci |
|-------|------------|
| Master | `import:masters`, work center, kurs |
| Produk | itemType, woodGradeId, coatingId, W×D×H |
| BOM | part, qty, materialType, P×L×T → vol |
| Material | biaya kayu, **sf/wf=0** jika waste di biaya, ≈ KAYU material Excel |
| Proses | routing atau part SUMMARY, total proses > 0 |
| Coating | coatingId, m² terkontrol |
| Packing | material + routing, jalur BOX/SF |
| COGS | OH 5%+2,5%, markup 20% |
| Verifikasi | vs excelMirror, toleransi ≤1,5%, `npm test` |

## Hasil audit sample (v5)

Jalankan: `npm run audit:samples`

| Sample | Target | Catatan |
|--------|--------|---------|
| **ZAN-100** | ≤ **1,5%** COGS | BOM **seed terkurasi** (`zanStoolGraph`) + mirror Excel |
| Import lain (10 file) | ≤ **8%** (bertahap) | BOM + CALCULATION + baris SUMMARY; `includeCoatingInCogs: false` |

Perintah optimasi data:

```bash
npm run import:samples      # re-import dari folder Excel (lama)
npm run refresh:mirror      # perbaiki total production/COGS di mirror
npm run patch:samples       # terapkan seed ZAN + config parity
npm run audit:samples       # laporan deviasi
```

(`refresh:mirror` → `node scripts/refreshSampleExcelMirror.mjs` — tambahkan ke package.json jika belum)


```bash
npm test
```

Mencakup volume/kontainer ELBA, formula engine, rounding, dan parity COGS ZAN.
