# Product Requirements Document (PRD)
## Manufaktur BOM App — Excel Parity & Master Data Engine

| Field | Value |
|--------|--------|
| **Produk** | Manufaktur BOM (BOM Design by Gemini) |
| **Versi dokumen** | 1.0 |
| **Tanggal** | 29 Mei 2026 |
| **Status** | Approved for implementation |
| **Referensi Excel** | `1 - ZAN-100 - 2-12-25.xlsx`, `1 - ELB-555-98 - ELBA CHAIR NLH - 19-5-23.xlsx` |

## Outcome utama

Tim costing/BOM dapat membuat dan memelihara BOM di app dengan angka setara **SUMMARY COST Excel** (toleransi ≤ 1,5% atau ≤ Rp 25.000), tanpa bergantung pada file Excel untuk kalkulasi inti.

## Epic summary

| Epic | Fokus |
|------|--------|
| A | Master mirror Excel (DATA BASE, RATIO, COATING) |
| B | Formula engine (FORMULA DATA) |
| C | Rounding engine (ROUND COMPONENT CALC) |
| D | Material & coating live COGS |
| E | BOM import dari .xlsx |
| F | SUMMARY COST export parity |
| G | UX, onboarding, dokumentasi |

Detail requirement lengkap: lihat rencana implementasi di `.cursor/plans/` atau dokumen review stakeholder.

## Checklist operasional

Lihat **[Checklist-Pengganti-Excel.md](./Checklist-Pengganti-Excel.md)** — audit live di tab COGS editor.

## Kriteria release

- [ ] `npm test` lulus (ELBA + ZAN + formula + rounding + parity audit)
- [ ] MASTER RATIO dari sheet Excel
- [ ] ≥10 formula terdaftar & dipakai
- [ ] Selling price rounded = Excel ZAN
- [ ] Coating COGS dari agregasi part `surfaceM2`
- [ ] Export Summary Cost dengan `excelRow`
- [ ] Panduan tim (`docs/Excel-vs-App.md`)
