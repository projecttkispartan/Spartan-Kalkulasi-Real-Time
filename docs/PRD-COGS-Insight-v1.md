# PRD — COGS Insight & Deviasi Excel (v0.1)

## Ringkasan

Fitur di tab **COGS** pada BOM Editor memberi ringkasan visual **biaya produksi** dan panel **deviasi terstruktur** terhadap mirror Excel **SUMMARY COST**, tanpa library chart tambahan.

## Tujuan

- Satu sumber kebenaran angka breakdown (`buildCogsInsight` di `src/utils/cogsBreakdown.js`).
- Pie chart komposisi production: material, proses, packing, coating (jika masuk COGS).
- Panel deviasi: App vs Excel, Δ Rp (signed), %, status PASS / WARN / FAIL.
- Catatan penyebab berbasis aturan (hybrid import, duplikat SUMMARY, arah selisih, coating, master tanpa mirror).

## Ruang lingkup v0.1

| In scope | Out of scope |
|----------|----------------|
| Pie production (CSS conic-gradient) | Badge deviasi di dashboard |
| Deviasi production + total COGS | Toggle OH di pie |
| Notes + tindakan disarankan | Seed per SKU non-curated (P4) |
| Integrasi sebelum checklist parity | Library chart eksternal |

## Functional requirements

### FR-1 — Pie biaya produksi

- Sumber: `cogsData.productionCost` dan komponen material / proses / packing / coating in-COGS.
- Jika `production.total <= 0`: pesan kosong.
- Coating detail yang tidak masuk production: baris info di bawah legend (bukan slice).

### FR-2 — Deviasi Excel

- Comparable hanya jika `excelMirror.summaryCost` punya `productionCost` dan `totalCogs` > 0.
- Jika tidak comparable: kartu kosong + `emptyReason`.
- Baris: Production cost, Total COGS — kolom App, Excel, Δ Rp, %, badge.

### FR-3 — Catatan penyebab

Prioritas (maks. 5 bullet):

1. Hybrid: part `biayaFromExcel` + part EXCEL-SUMMARY.
2. Duplikat label proses di sheet SUMMARY (whitelist proses).
3. Selisih > 8% app di atas Excel → cek EXCEL-*.
4. Selisih > 8% app di bawah Excel → labor / seed.
5. Coating detail besar, coating in-COGS = 0.
6. Import Excel + banyak part master tanpa mirror lengkap.

### Toleransi & status

- Default: 1,5% atau Rp 25.000 (`excelParityChecklist.js`).
- Sample curated (`ZAN-100`, `FNA-550`): ketat 1,5%.
- Status: `pass` (dalam toleransi), `warn` (≤ 8% non-curated), `fail` (> 8%).

## Arsitektur

```
bomData + cogsConfig + excelMirror + cogsData
        → buildCogsInsight()
        → CogsProductionPieCard | ExcelDeviationCard
```

Script diagnosa: `npm run diagnose:samples` memakai utilitas yang sama.

Regresi: `node scripts/testCogsBreakdown.mjs` (bagian `npm test`).

## Acceptance

- Pie slice total ≈ production (± Rp 1).
- ZAN-100 & FNA-550: deviasi PASS di test.
- Tanpa mirror: panel deviasi kosong.
- Upload gagal / mirror tidak terset: deviasi kosong.

## Referensi

- Checklist pengganti Excel: `docs/Checklist-Pengganti-Excel.md`
- Parity audit: `src/utils/excelParityAudit.js`
