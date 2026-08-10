# FAQ & Manual Book — PART, MAT, PROD, dan PROD/U

**Audience:** Engineer BOM, QA parity, stakeholder produksi  
**Versi:** draft v1 · Manufaktur BOM  
**Dokumen terkait:** [Sample-MAT-PROD-PROD-U.md](./Sample-MAT-PROD-PROD-U.md) · [Table-Details.mmd](./qa/Table-Details.mmd) · Manual Book in-app §4b

---

## Ringkasan (30 detik)

| Level | Apa itu? | PROD/U artinya… |
|-------|----------|-----------------|
| **PART** | Komponen terkecil (kayu, plywood, hardware) + routing sendiri | **Biaya per 1 pcs komponen** (bukan produk jadi) |
| **SUBMODUL / MODUL** | Rakitan / grouping struktur | **Total biaya subtree** (= PROD, tidak dibagi qty) |
| **COGS / Summary** | Produk jadi 1 unit | **Biaya produksi produk akhir** (+ OH, markup) |

---

## 1. Apa itu PART di sistem ini?

**PART** = baris komponen terkecil dalam BOM yang:

- punya **spesifikasi material** (picker DATA BASE, P×L×T, qty, SF/WF);
- punya **routing manufaktur sendiri** (tab Proses — potong, laminating, amplas, dll.);
- muncul di tab **Material** dan **Summary** sebagai baris HPP.

**PART bukan produk jadi.** PART adalah bahan/komponen yang **diproduksi dulu** (potong + proses) **sebelum** dirakit ke SUBMODUL/MODUL.

Hierarki standar:

```text
MODUL          → grouping besar (mis. BODI-ATAS)
  SUBMODUL     → sub-rakitan (mis. SANDARAN)
    PART       → komponen + material + routing (mis. SUNDUK, SIKON)
```

Hanya **PART** yang punya material dan routing default. MODUL/SUBMODUL **rollup** biaya dari anak (+ proses assembly di level induk jika ada).

---

## 2. FAQ — pertanyaan yang sering muncul

### Q1. PART kan cuma komponen/bahan — kenapa ada kolom “Harga Produksi (Satuan)”?

**Jawaban:** Label **PROD/U** di PART **bukan** harga produk jadi. Artinya **biaya untuk menghasilkan 1 pcs komponen itu** = material + operasi yang dikerjakan **pada komponen tersebut**.

Contoh alur pabrik:

```text
PART “SUNDUK”  →  potong kayu → laminating → amplas   (biaya di baris PART)
       ↓ dirakit
SUBMODUL       →  (bisa ada proses assembly tambahan)
       ↓
MODUL          →  assembly modul
       ↓
Produk jadi    →  COGS / Summary (1 unit furniture)
```

Ini selaras Excel: sheet **CALCULATION** menghitung HPP **per kode part**; proses kayu (LAMINATING, AMPLAS, …) dialokasi ke baris part — bukan hanya ke modul.

---

### Q2. Bukankah harga produksi baru dihitung setelah dirakit jadi Modul/Submodul?

**Jawaban:** Ada **dua lapisan** biaya:

| Lapisan | Di mana terlihat | Isi |
|---------|------------------|-----|
| **Biaya komponen** | Baris PART (MAT, PROD, PROD/U) | Material + proses **pada potongan/komponen** |
| **Biaya rakitan** | Baris SUBMODUL/MODUL | Jumlah semua anak + proses **assembly di level induk** |
| **Biaya produk jadi** | Tab Summary / COGS | Σ part + proses modul + packing + OH + markup |

Jadi PART **memang dihitung**, tapi sebagai **HPP line item**, bukan sebagai “hasil produksi akhir”.

---

### Q3. Apakah user akan mengira PART = produk jadi?

**Risiko:** Valid — label **“Harga Produksi (Satuan)”** di PART bisa terdengar seperti produk jadi.

**Framing yang disarankan untuk training:**

| Level | Sebut sebagai… | Jangan sebut… |
|-------|----------------|---------------|
| PART | **Biaya komponen / pcs** · **HPP line item** | Produk jadi · harga jual |
| MODUL/SUBMODUL | **Total biaya rakitan** | Harga satuan produk |
| COGS | **Biaya produksi 1 unit produk** | — |

**Rekomendasi UX (backlog):** rename kolom PART menjadi “Biaya Komponen / pcs”; tooltip di header PROD/U.

---

### Q4. Apa beda MAT, PROD, dan PROD/U di PART?

| Kolom | PART |
|-------|------|
| **MAT** | Harga material **1 unit** (`biaya` per pcs) |
| **PROD** | Material total (× qty, + SF/WF) + proses routing part |
| **PROD/U** | **PROD ÷ qty** = biaya **per 1 pcs** komponen |

**Contoh:** SUNDUK, qty=2, biaya=46.105, proses=60.000

```
MAT     = 46.105
PROD    = (46.105 × 2) + 60.000 = 152.210
PROD/U  = 152.210 ÷ 2 = 76.105
```

---

### Q5. Apa beda MAT, PROD, dan PROD/U di MODUL/SUBMODUL?

| Kolom | MODUL / SUBMODUL |
|-------|------------------|
| **MAT** | **Total** material semua PART di bawahnya |
| **PROD** | Total material + total proses anak + proses di node induk |
| **PROD/U** | **= PROD** (sama; **tidak** dibagi qty modul) |

Qty modul/submodul (biasanya 1 SET) **tidak mempengaruhi** PROD/U.

---

### Q6. Kalau PART dan MODUL sama-sama punya angka PROD, apakah double count?

**Tidak.** Total COGS/Summary dijumlah dari:

- semua **PART** (material + proses part), **plus**
- proses yang melekat di **MODUL/SUBMODUL**,

**bukan** dengan menjumlahkan baris MODUL + SUBMODUL + PART sekaligus.

Baris MODUL/SUBMODUL = **ringkasan tampilan (rollup)** subtree.  
Baris PART = **sumber hitungan** material dan proses komponen.

---

### Q7. PART tanpa routing proses — PROD/U masih muncul?

Ya. Jika routing kosong:

```
PROD   = material total saja
PROD/U = PROD ÷ qty
```

Hardware / material beli jadi sering hanya punya MAT + PROD material, proses = 0.

---

### Q8. Di Excel, PART juga punya HPP per baris?

Ya. Import app membaca:

| Sheet | Untuk PART |
|-------|------------|
| **BOM TEMPLATE** | Hierarki, kode, qty |
| **CALCULATION** | Vol, biaya material per kode part |
| **SUMMARY COST** | Alokasi proses (kayu, finishing, dll.) |

Parity COGS (ZAN-100) membandingkan **Σ baris PART + proses modul + packing** vs SUMMARY COST — bukan hanya total modul.

---

## 3. Sample data — hierarki lengkap

Asumsi: SF=0%, WF=0%.

### Pohon

```text
MODUL BODI-ATAS (qty=1) — proses Assembly Rp 50.000
├── SUBMODUL SANDARAN (qty=1)
│   ├── PART SUNDUK (qty=2, biaya=46.105, proses=60.000)
│   └── PART SIKON  (qty=1, biaya=80.000, proses=30.000)
└── SUBMODUL DUDUKAN (qty=1)
    └── PART PENYANGGA (qty=4, biaya=25.000, proses=0)
```

### Tabel seperti di UI

| Level | Nama | qty | MAT | PROD | PROD/U |
|-------|------|-----|-----|------|--------|
| MODUL | BODI-ATAS | 1 | 272.210 | 412.210 | 412.210 |
| SUBMODUL | SANDARAN | 1 | 172.210 | 262.210 | 262.210 |
| PART | SUNDUK | 2 | 46.105 | 152.210 | **76.105** |
| PART | SIKON | 1 | 80.000 | 110.000 | 110.000 |
| SUBMODUL | DUDUKAN | 1 | 100.000 | 100.000 | 100.000 |
| PART | PENYANGGA | 4 | 25.000 | 100.000 | **25.000** |

Detail perhitungan: lihat [Sample-MAT-PROD-PROD-U.md](./Sample-MAT-PROD-PROD-U.md).

---

## 4. Paragraf siap sampaikan ke stakeholder

> PART di app bukan produk jadi, melainkan komponen terkecil yang punya material dan routing sendiri — mengikuti sheet CALCULATION di Excel. Kolom PROD/U di PART = **biaya per 1 pcs komponen** setelah material dan operasi pada komponen itu (potong, laminating, dll.), **sebelum** dirakit ke Modul/Submodul.
>
> Biaya rakitan terlihat di baris Modul/Submodul (rollup + proses assembly). **Harga produksi 1 unit produk jadi** ada di tab Summary/COGS. Angka PART **tidak double count** — modul hanya ringkasan, part adalah sumber hitungan.

---

## 5. Checklist engineer (input PART)

- [ ] Hierarki: MODUL → SUBMODUL → PART (minimal 1 PART sebelum tab Material)
- [ ] PART: tipe material, P×L×T, qty, picker DATA BASE atau Manual
- [ ] SF/WF: set 0 jika biaya Excel sudah include waste (`biayaFromExcel`)
- [ ] Tab Proses: routing WC per PART yang perlu operasi kayu/finishing
- [ ] Tab Summary: Σ baris PART = kartu total header (Δ = 0)
- [ ] Tab COGS: total production vs excelMirror (mode Excel Fixed)

---

## 6. Referensi kode

| File | Fungsi | Peran |
|------|--------|-------|
| `src/utils/bomCostRollup.js` | `computePartCostRow` | Material + proses per PART |
| `src/utils/bomCostRollup.js` | `rollupTreeCosts` | Agregasi MODUL/SUBMODUL |
| `src/utils/bomCostRollup.js` | `computePartsTotals` | Total produk (tanpa double count) |
| `src/services/bomCalculations.js` | `computePartDisplayFinancials` | PROD/U PART = PROD ÷ qty |
| `src/services/bomCalculations.js` | `computeNodeDisplayFinancials` | PROD/U MODUL = PROD |
| `src/pages/BOMEditor.jsx` | kolom Struktur | Render MAT / PROD / PROD/U |

---

## 7. Changelog draft

| Tanggal | Perubahan |
|---------|-----------|
| 2026-06-05 | Draft v1 — FAQ PART vs PROD/U, sample hierarki, stakeholder paragraph |
