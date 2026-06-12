# Dokumentasi QA — Perbandingan BOM ERP vs Design Baru

| Dokumen | Isi |
|---------|-----|
| [PRD-Manufaktur-BOM-System.mmd](../PRD-Manufaktur-BOM-System.mmd) | **PRD induk sistem** |
| [01-UAT-ERP-Staging.mmd](./01-UAT-ERP-Staging.mmd) | Hasil uji **ERPKu Staging** (sistem lama) |
| [02-UAT-App-Design-Baru.mmd](./02-UAT-App-Design-Baru.mmd) | Hasil uji **BOM Design by Gemini** (UX baru) |
| [03-Perbandingan-Tabel.mmd](./03-Perbandingan-Tabel.mmd) | Gap kolom & tab per layar |
| [04-PRD-Migrasi-BOM.mmd](./04-PRD-Migrasi-BOM.mmd) | PRD improvement lama → baru |
| [05-Rekomendasi-Improvement.mmd](./05-Rekomendasi-Improvement.mmd) | Masukan prioritas |
| [06-Master-Data-Strategy.mmd](./06-Master-Data-Strategy.mmd) | Master dummy vs ERP terpisah |
| [07-Dev-Improvement-Backlog.mmd](./07-Dev-Improvement-Backlog.mmd) | **Backlog dev** — P0/P1/P2 penggantian Excel |
| [08-Acceptance-Criteria-Perbaikan-BOM.mmd](./08-Acceptance-Criteria-Perbaikan-BOM.mmd) | **Acceptance criteria** — sign-off untuk programmer |
| [Table-Details.mmd](./Table-Details.mmd) | **Inventaris kolom UI** — posisi menu, nama kolom, tipe data (client) |

**Environment ERP:** [https://erp.stg.solusiuntuknegeri.com/manufacture/bill-of-materials](https://erp.stg.solusiuntuknegeri.com/manufacture/bill-of-materials)  
**Evidence:** `evidence/*.png`, `erp-wizard-steps.json`, `erp-bom-structure.json`  
**Probe scripts:** `scripts/exploreErpBomUi*.mjs`, `scripts/exploreErpWizard.mjs`

**Tanggal audit:** 5 Juni 2026 | **Role:** Senior QA Manufacture BOM
