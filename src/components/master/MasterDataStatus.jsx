import { AlertTriangle, RefreshCw, Database } from 'lucide-react';

/** Banner saat master kosong / error load / filter kosong */
export function MasterDataLoadError({ message, onRetry }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex flex-wrap items-start justify-between gap-3 shrink-0">
      <div className="flex gap-2 min-w-0">
        <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-red-900">Gagal memuat master data</p>
          <p className="text-xs text-red-800 mt-1 break-words">{message}</p>
          <p className="text-[11px] text-red-700/90 mt-1">
            Coba F12 → Console. Jika persisten: Application → Clear site data → refresh.
          </p>
        </div>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 text-xs font-bold text-red-900 bg-white border border-red-200 px-3 py-2 rounded-lg hover:bg-red-50 flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Muat ulang
        </button>
      )}
    </div>
  );
}

export function MasterDataEmptyBanner({ tabLabel, rowCount, totalKayu, totalKatalog, onReload, onResetImport }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 flex flex-col gap-3 shrink-0">
      <div className="flex gap-2">
        <Database className="w-5 h-5 text-amber-700 shrink-0" />
        <div>
          <p className="text-sm font-bold text-amber-950">
            {rowCount === 0
              ? `Tab «${tabLabel}» kosong di browser`
              : 'Master global belum terisi'}
          </p>
          <p className="text-xs text-amber-900/90 mt-1 leading-relaxed">
            Seed di project biasanya: ~23 kayu, ~640 katalog. Saat ini di IndexedDB:{' '}
            <strong>{totalKayu} kayu</strong>, <strong>{totalKatalog} katalog</strong>.
            Klik <strong>Reset import</strong> untuk muat ulang dari file{' '}
            <code className="text-[10px] bg-white px-1 rounded">src/data/masters/</code>.
            Dev lokal: jalankan juga <code className="text-[10px] bg-white px-1 rounded">npm run import:masters</code>.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {onReload && (
          <button
            type="button"
            onClick={onReload}
            className="text-xs font-bold text-amber-950 bg-white border border-amber-300 px-3 py-2 rounded-lg hover:bg-amber-100 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Muat ulang tab
          </button>
        )}
        {onResetImport && (
          <button
            type="button"
            onClick={onResetImport}
            className="text-xs font-bold text-white bg-amber-700 px-3 py-2 rounded-lg hover:bg-amber-800 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reset import
          </button>
        )}
      </div>
    </div>
  );
}

/** Baris info jumlah baris tab aktif */
export function MasterDataRowCount({ tabLabel, count, filtered, loading }) {
  if (loading) return null;
  return (
    <p className="text-[11px] font-semibold text-slate-500 shrink-0 tabular-nums">
      {tabLabel}: <span className="text-emerald-700">{count}</span> baris
      {filtered != null && filtered !== count ? (
        <span className="text-slate-400"> · tampil setelah filter: {filtered}</span>
      ) : null}
    </p>
  );
}
