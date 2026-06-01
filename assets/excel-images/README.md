# Gambar diekspor dari Excel BOM

Diekspor dengan `npm run export:images`.

## Folder

| Folder | Isi |
|--------|-----|
| `zan-100/media/` | Semua gambar embedded file ZAN-100 (30 file) |
| `zan-100/by-sheet-row/` | PNG/JPEG yang terpetakan ke baris sheet |
| `calculation-template-2014/media/` | Semua gambar template master (119 file) |
| `calculation-template-2014/legends/` | Thumbnail kecil **image30–76.jpeg** (legenda FINISHING / LAMINATING di sheet INPUTING) |
| `calculation-template-2014/posisi-combo-manifest.json` | Pemetaan **image30–103** → kode combo (dipakai app) |
| `calculation-template-2014/by-sheet-row/` | Gambar terpetakan anchor per sheet |

## Format file

- **`.jpeg` / `.png`** — bisa dibuka di browser / Windows Photos
- **`.emf`** — diagram vektor Excel; buka di Windows (double-click) atau konversi ke PNG dengan tool desktop

## Sumber Excel

- `1 - ZAN-100 - 2-12-25.xlsx`
- `1 - CALCULATION TEMPLATE 2014 - 10-12-13.xlsx`

Detail per file: lihat `manifest.json` di masing-masing subfolder.
