import { BookOpen, Database, GitBranch, Calculator, Save, RefreshCw } from 'lucide-react';
import FullPageShell from '../ui/FullPageShell.jsx';
import { MASTER_TAB_META, MASTER_TABS_ORDER } from '../master/masterTabMeta.js';

const STEPS = [
  {
    icon: Database,
    title: '1. Siapkan master global',
    body: 'Buka Master Data dari toolbar editor. Import/reset dari Excel ZAN (`npm run import:masters`) lalu periksa tiap tab: DATA BASE, Non-Kayu, MASTER RATIO, WOOD LABOR, COATING RATIO, FORMULA DATA, WORK CENTER. Klik Simpan tab ini setelah edit.',
  },
  {
    icon: GitBranch,
    title: '2. Bangun / impor BOM project',
    body: 'Pilih sample atau impor workbook. Struktur: MODUL → SUBMODUL → PART. Part kayu: isi dimensi (P×L×T mm), vol, grade kayu. Hardware/finishing: set materialType yang benar. Gunakan Sinkron DATA BASE di tab Struktur.',
  },
  {
    icon: Calculator,
    title: '3. Isi operasi & routing',
    body: 'Di tiap PART tambah proses (work center, waktu, TK). Biaya proses = mesin + WC + pekerja. Master WC menentukan rate/menit. Tab Proses menampilkan agregat per mfg process.',
  },
  {
    icon: Save,
    title: '4. COGS & parity Excel',
    body: 'Tab COGS & Pricing: material + proses + packing + OH + markup. Bandingkan dengan Excel Parity Checklist. ZAN-100 target deviasi ≤1,5%. Sample lain masih bertahap — jangan double-count coating jika finishing sudah di SUMMARY.',
  },
];

export default function MasterUsageGuideModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <FullPageShell
      isOpen={isOpen}
      onClose={onClose}
      title="Panduan Master Data & Kalkulasi"
      icon={BookOpen}
      subtitle="Tata cara penggunaan mirror Excel → BOM → COGS (Manufaktur BOM Spartan)"
      accent="emerald"
    >
      <div className="master-scroll-region scroll-thin touch-pan-y pb-8 flex flex-col">
        <div className="flex flex-col gap-6 max-w-4xl w-full">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide mb-4">Alur kerja</h2>
          <ol className="space-y-4">
            {STEPS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{title}</p>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide mb-3 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-emerald-600" />
            Tab Master Data (seragam)
          </h2>
          <p className="text-xs text-slate-600 mb-4">
            Setiap tab punya header kolom sama (No · Kode/Nama · nilai uang kanan · Sumber). Gunakan kotak cari jika tersedia. Edit sel → Simpan tab ini.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {MASTER_TABS_ORDER.filter((id) => MASTER_TAB_META[id]).map((id) => {
              const m = MASTER_TAB_META[id];
              return (
                <div key={id} className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                  <p className="text-xs font-bold text-emerald-800">{m.label}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{m.sheet}</p>
                  <p className="text-[11px] text-slate-600 mt-1 leading-snug">{m.hint}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
          <h2 className="text-sm font-black text-amber-900 mb-2">Hirarki harga (MODUL → PART)</h2>
          <ul className="text-xs text-amber-950 space-y-1.5 list-disc pl-4 leading-relaxed">
            <li>Harga material & proses hanya di node <strong>PART</strong> (field biaya, SF/WF, proses[]).</li>
            <li>MODUL / SUBMODUL = penjumlahan anak (rollup), tidak diisi manual.</li>
            <li>Kayu dari DATA BASE: harga/m³ × vol; jika biaya sudah include waste, SF/WF part = 0.</li>
            <li>COGS produk = jumlah semua part + packing + (coating opsional) + OH pabrik & manajemen + markup.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5">
          <h2 className="text-sm font-black text-indigo-900 mb-2">Master WC terpisah</h2>
          <p className="text-xs text-indigo-950 leading-relaxed">
            Tombol <strong>Master WC</strong> membuka editor work center yang sama dengan tab WORK CENTER di Master Data.
            Tambah baris, set rate/menit, simpan — lalu pilih <code className="text-[10px] bg-white px-1 rounded">workCenterId</code> di operasi part.
          </p>
        </section>
        </div>
      </div>
    </FullPageShell>
  );
}
