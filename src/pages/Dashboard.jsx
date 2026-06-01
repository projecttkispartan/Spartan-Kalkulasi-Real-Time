import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Network, Package, Image as ImageIcon, SquarePen, Trash2, Copy, FileSpreadsheet } from 'lucide-react';
import AppHeader from '../components/ui/AppHeader';
import { CurrencyGroup } from '../components/ui/CurrencyInput';
import FontCaseToggle from '../components/ui/FontCaseToggle';
import KpiCard from '../components/ui/KpiCard';
import { formatIDR } from '../utils/formatters';
import { listProjects, deleteProject, duplicateProject, saveProject } from '../services/projectStorage';
import { parseBomFromFile } from '../utils/importBomFromExcel';

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function Dashboard({
  onOpenProject,
  onNewProject,
  kursUsd,
  setKursUsd,
  kursEur,
  setKursEur,
  fontCase,
  setFontCase,
}) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listProjects();
      setProjects(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = projects.filter((p) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      p.kode?.toLowerCase().includes(q) ||
      p.nama?.toLowerCase().includes(q) ||
      p.customer?.toLowerCase().includes(q)
    );
  });

  const totalBom = projects.length;
  const totalProduk = projects.reduce((sum, p) => sum + (p.jumlahProduk || 1), 0);

  const handleDelete = async (id, nama) => {
    if (!window.confirm(`Hapus project "${nama}"?`)) return;
    await deleteProject(id);
    refresh();
  };

  const handleDuplicate = async (id) => {
    await duplicateProject(id);
    refresh();
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const project = await parseBomFromFile(file);
      await saveProject(project);
      refresh();
      onOpenProject(project.id);
    } catch (err) {
      window.alert(`Gagal import Excel: ${err.message || err}`);
    }
    e.target.value = '';
  };

  return (
    <div className="flex flex-1 flex-col min-h-0 min-w-0">
      <AppHeader>
        <FontCaseToggle value={fontCase} onChange={setFontCase} />
        <CurrencyGroup kursUsd={kursUsd} setKursUsd={setKursUsd} kursEur={kursEur} setKursEur={setKursEur} />
        <div className="relative ml-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari produk..."
            className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-400 bg-slate-50 transition-all"
          />
        </div>
        <button type="button" onClick={onNewProject} className="btn-primary shadow-brand-500/30">
          <Plus className="w-4 h-4" /> Buat Baru
        </button>
        <label className="btn-secondary cursor-pointer">
          <FileSpreadsheet className="w-4 h-4" /> Import Excel
          <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportExcel} />
        </label>
      </AppHeader>

      <main className="page-inner-full flex-1 flex flex-col min-h-0 gap-4 py-4 md:py-5">
        <div className="shrink-0">
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Daftar Project BOM</h2>
          <p className="text-sm text-slate-500 mt-1">Kelola struktur perakitan dan operasional produksi (tersimpan di browser).</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
          <KpiCard icon={Network} label="Total BOM Aktif" value={totalBom} accent="amber" />
          <KpiCard icon={Package} label="Total Produk" value={totalProduk} accent="emerald" />
        </div>

        <div className="surface-card flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="overflow-auto flex-1 scroll-thin">
            {loading ? (
              <p className="p-8 text-center text-slate-400 text-sm">Memuat project…</p>
            ) : filtered.length === 0 ? (
              <p className="p-8 text-center text-slate-400 text-sm">Belum ada project. Klik Buat Baru.</p>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="table-head">
                    <th className="py-4 px-4 text-center w-12 border-r border-slate-100">No</th>
                    <th className="py-4 px-6 w-20 text-center border-r border-slate-100">Gambar</th>
                    <th className="py-4 px-4 border-r border-slate-100">Kode Produk</th>
                    <th className="py-4 px-4 border-r border-slate-100">Nama Produk</th>
                    <th className="py-4 px-4 border-r border-slate-100">Customer</th>
                    <th className="py-4 px-4 text-center border-r border-slate-100">Versi</th>
                    <th className="py-4 px-4 text-right border-r border-slate-100">Harga (HPP)</th>
                    <th className="py-4 px-4 text-right border-r border-slate-100">Harga (Dolar)</th>
                    <th className="py-4 px-4 text-center border-r border-slate-100">Status</th>
                    <th className="py-4 px-4 text-center border-r border-slate-100">Update</th>
                    <th className="py-4 px-6 text-center w-28">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, index) => (
                    <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors group">
                      <td className="py-4 px-4 text-center border-r border-slate-100">
                        <span className="text-sm font-medium text-slate-500">{index + 1}</span>
                      </td>
                      <td className="py-4 px-6 border-r border-slate-100">
                        <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center text-slate-300 mx-auto group-hover:border-brand-200 transition-colors">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                      </td>
                      <td className="py-4 px-4 border-r border-slate-100">
                        <button
                          type="button"
                          onClick={() => onOpenProject(p.id)}
                          className="text-sm font-bold text-slate-800 hover:text-brand-600 hover:underline transition-colors"
                        >
                          {p.kode}
                        </button>
                      </td>
                      <td className="py-4 px-4 border-r border-slate-100">
                        <button
                          type="button"
                          onClick={() => onOpenProject(p.id)}
                          className="text-sm font-bold text-brand-700 hover:text-brand-800 hover:underline transition-colors"
                        >
                          {p.nama}
                        </button>
                      </td>
                      <td className="py-4 px-4 text-sm text-slate-500 font-medium border-r border-slate-100">{p.customer}</td>
                      <td className="py-4 px-4 text-center border-r border-slate-100">
                        <span className="inline-flex px-2.5 py-1 rounded bg-slate-100 text-slate-500 text-[10px] font-bold border border-slate-200">{p.versi}</span>
                      </td>
                      <td className="py-4 px-4 text-right border-r border-slate-100">
                        <span className="currency-idr text-sm">Rp {formatIDR(p.hpp)}</span>
                      </td>
                      <td className="py-4 px-4 text-right border-r border-slate-100">
                        <span className="currency-usd text-sm">$ {(p.hpp / kursUsd).toFixed(2)}</span>
                      </td>
                      <td className="py-4 px-4 text-center border-r border-slate-100">
                        <span className="text-[10px] font-bold uppercase text-slate-500">{p.status || 'draft'}</span>
                      </td>
                      <td className="py-4 px-4 text-center text-xs text-slate-500 font-medium border-r border-slate-100">
                        {formatDate(p.tanggalUpdate)}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onOpenProject(p.id)}
                            className="p-1.5 text-brand-500 bg-brand-50 border border-brand-100 rounded-lg hover:bg-brand-100 transition-colors"
                            title="Buka"
                          >
                            <SquarePen className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicate(p.id)}
                            className="p-1.5 text-slate-500 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                            title="Duplikat"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(p.id, p.nama)}
                            className="p-1.5 text-red-500 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition-colors"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
