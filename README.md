# Demo Wireframe Spartan — Manufaktur BOM

Aplikasi demo **Bill of Materials (BOM)** untuk manufaktur furniture: struktur perakitan, packing, kapasitas kontainer, kalkulasi proses, dan COGS.

Referensi kalkulasi: Excel BOM ELB-555-98 (ELBA CHAIR NLH).

---

## Lihat demo langsung (tanpa install)

Setelah **GitHub Pages** diaktifkan (sekali saja, lihat bawah), buka:

**https://projecttkispartan.github.io/demo-wareframe-spartan/**

### Aktifkan GitHub Pages (pemilik repo)

1. Buka [Settings → Pages](https://github.com/projecttkispartan/demo-wareframe-spartan/settings/pages)
2. **Build and deployment** → Source: **GitHub Actions**
3. Push ke branch `main` — workflow akan build & deploy otomatis
4. Tunggu 1–3 menit, lalu buka URL di atas

---

## Jalankan di komputer sendiri

```bash
git clone https://github.com/projecttkispartan/demo-wareframe-spartan.git
cd demo-wareframe-spartan
npm install
npm run build
npm run dev
```

Buka **http://localhost:5173** di browser.

Untuk dibagikan ke rekan di jaringan Wi‑Fi yang sama, gunakan alamat **Network** yang muncul di terminal (mis. `http://192.168.x.x:5173`).

### Hanya preview file statis (tanpa dev server)

```bash
npm install
npm run build
npx --yes serve . -l 3000
```

Buka **http://localhost:3000**

---

## Cara pakai demo (singkat)

1. **Dashboard** — klik nama proyek atau buat alur baru ke editor
2. **Struktur** — pohon BOM, harga part, routing operasi
3. **Container** — volume packing & kapasitas kontainer
4. **Material / Proses** — rekapitulasi kebutuhan
5. **Summary / COGS** — total biaya & harga jual
6. Tombol **View Kalkulasi** di header untuk breakdown lengkap

---

## Struktur proyek

| Folder | Isi |
|--------|-----|
| `src/pages/` | Dashboard & BOM Editor |
| `src/components/modals/` | Routing, Kalkulasi, Summary |
| `src/utils/` | Volume packing, biaya operasi |
| `src/data/` | Mock BOM & referensi Excel |
| `dist/` | Hasil build (CSS + JS) |

## Tech

React 18 · esbuild · Tailwind CSS 3 · Lucide icons
