# Audit COGS — Semua Sample Excel

**Terakhir diperbarui:** sample seed v5 · `npm run audit:samples`

## Ringkasan

| Status | Arti |
|--------|------|
| **PASS ≤1,5%** | Siap menggantikan Excel untuk COGS |
| **WARN 5–8%** | Mendekati, perlu kalibrasi manual |
| **FAIL >8%** | Struktur import hybrid belum parity penuh |

## Hasil (setelah optimasi v5)

| Sample | Deviasi COGS | Deviasi Production | Coating terpisah | Keterangan |
|--------|--------------|-------------------|------------------|------------|
| **ZAN-100** | **~0,01%** | **~0,01%** | 0 | Seed `zanStoolGraph` + mirror Excel |
| SVDT-120 | ~5,8% | ~5,8% | 0 | Terbaik di kelompok import |
| FNA-550 | ~1,1% | ~1,1% | 0 | PASS (seed terkurati + dedupe SUMMARY) |
| MF081 | ~10,9% | ~10,9% | 0 | |
| L-LOU-NAT | ~10,9% | ~10,9% | 0 | |
| G557 | ~10,0% | ~10,0% | 0 | |
| POL-TAB-3 | ~13,1% | ~13,1% | 0 | |
| DCTVBS | ~17,3% | ~17,3% | 0 | |
| MF056 | ~17,2% | ~17,2% | 0 | App di bawah Excel |
| ELB-555-98 | ~23,4% | ~23,4% | 0 | |
| G632L-RO | ~46,9% | ~46,9% | 0 | App di atas Excel |

## Optimasi yang diterapkan

1. **Parser SUMMARY** — `productionCost` / `totalCogs` pakai `Math.max` (sheet punya 2 blok BOX/SF).
2. **Coating** — tidak lagi `max(semua part)`; prioritas `surfaceM2Coating` → part eksplisit → finishing.
3. **`includeCoatingInCogs: false`** pada import — finishing sudah di baris SUMMARY (AMPLAS, FINISHING, …).
4. **SF/WF = 0** pada part `biayaFromExcel` — hindari double waste.
5. **ZAN-100** — BOM seed terkurasi, bukan 68 part import mentah.

## Perintah maintenance

```bash
npm run refresh:mirror   # perbarui total COGS/production di excelMirror
npm run patch:samples    # terapkan config + seed ZAN
npm run audit:samples    # laporan deviasi
npm test                 # regresi termasuk ZAN ≤1,5%
```

Setelah ganti file Excel asli: `npm run import:samples` lalu `npm run patch:samples` + `npm run refresh:mirror`.

## Langkah berikutnya (deviasi import)

- Samakan alokasi proses dengan baris SUMMARY saja (kurangi duplikasi BOM template + part SUMMARY).
- Kalibrasi per produk seperti ZAN (seed terkurasi) untuk MF081, ELB, dll.
- Panel checklist di tab COGS untuk tracking per project.
