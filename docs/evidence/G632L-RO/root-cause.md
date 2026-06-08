# G632L-RO — Root Cause COGS Gap (resolved)

| Field | Value |
|-------|-------|
| **Sample** | G632L-RO |
| **Tanggal** | 5 Juni 2026 |
| **SEBELUM** | Production +46,9% · COGS app ~Rp 6.699.498 vs Excel ~Rp 4.561.180 |
| **SESUDAH** | Production +0,58% · COGS app ~Rp 4.534.850 vs Excel ~Rp 4.561.180 |

---

## Root cause per komponen

| # | Komponen | Penyebab | Fix |
|---|----------|----------|-----|
| 1 | **template-master (+Rp 3,7 jt)** | `linkProjectToMasters` dengan `applyBiaya: true` menimpa biaya part kayu dari master live (TEAK seed) padahal sample `excel-fixed` | Default `applyBiaya: false` jika `cogsMode === excel-fixed` |
| 2 | **EXCEL-SUMMARY duplikat** | Baris SUMMARY duplikat (GERINDA, AMPLAS, UPHOLSTERY) → part BOM ganda | Dedupe by label saat import + patch sample |
| 3 | **KAYU labor missing (-Rp 146 rb)** | Labor+mesin baris KAYU SUMMARY (~Rp 143k + Rp 2,8k) tidak di-import (whitelist tidak include KAYU) | Part `EXCEL-kayu_labor` — proses only, biaya material = 0 |
| 4 | **Mode hybrid tidak guarded** | Campur CALCULATION + SUMMARY + master recalc | Field `cogsMode: excel-fixed` + checklist FAIL jika hybrid |

---

## Verifikasi

```bash
node scripts/patchG632lSample.mjs
node scripts/diagnoseSampleCogsBreakdown.mjs --sample=G632L-RO
node scripts/verifyAllSampleCogs.mjs
```

**Gate:** G632L-RO ≤ 3% — **PASS (0,58%)**

---

## File terkait

- `src/utils/linkProjectToMasters.js`
- `src/utils/excelWorkbookParsers.js` — `pickSummaryKayuLaborLine`, dedupe SUMMARY
- `src/data/samples/projects/g632l-ro.json`
- `scripts/patchG632lSample.mjs`
- `scripts/verifyAllSampleCogs.mjs`
