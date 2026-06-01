# Panduan: Excel vs App (Manufaktur BOM)

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
| Biaya coating | COATING RATIO rounded/m² × Σ surfaceM2 part |
| Harga jual | ROUND rules (floor ribuan) + markup |

## Regresi otomatis

```bash
npm test
```

Mencakup volume/kontainer ELBA, formula engine, rounding, dan parity COGS ZAN.
