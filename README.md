# Demo Wireframe Spartan — Manufaktur BOM

Aplikasi demo **Bill of Materials (BOM)** untuk manufaktur furniture: struktur perakitan, packing, kapasitas kontainer, kalkulasi proses, dan COGS.

Referensi kalkulasi: Excel BOM ELB-555-98 (ELBA CHAIR NLH).

## Menjalankan

```bash
npm install
npm run build
npm run dev
```

Buka URL yang ditampilkan di terminal (biasanya `http://localhost:5173`).

## Struktur

- `src/pages/` — Dashboard & BOM Editor (7 tab)
- `src/components/modals/` — Routing, Kalkulasi, Summary detail
- `src/utils/` — Volume packing, biaya operasi
- `src/data/` — Mock BOM & referensi Excel
- `canvases/` — Wireframe konsep (Cursor Canvas)

## Tech

React 18, esbuild, Tailwind CSS 3, Lucide icons.
