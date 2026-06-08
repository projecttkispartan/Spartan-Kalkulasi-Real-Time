/** Warna nominal — selaras header BOM (amber / indigo / violet) + proses (biru / hijau) */
export const moneyVariantClass = {
  /** Harga material satuan */
  matIdr: 'text-amber-800 font-bold tabular-nums',
  matUsd: 'text-amber-700 font-semibold tabular-nums',
  matEur: 'text-amber-600 font-semibold tabular-nums',
  /** Biaya produksi total */
  prodIdr: 'text-indigo-800 font-black tabular-nums',
  prodUsd: 'text-indigo-700 font-bold tabular-nums',
  prodEur: 'text-indigo-600 font-bold tabular-nums',
  /** Harga produksi per unit */
  unitIdr: 'text-violet-800 font-bold tabular-nums',
  unitUsd: 'text-violet-700 font-bold tabular-nums',
  unitEur: 'text-violet-600 font-bold tabular-nums',
  /** Harga di combo / master */
  price: 'text-amber-700 font-bold tabular-nums',
  /** Biaya mesin / routing */
  mesin: 'text-blue-700 font-bold tabular-nums',
  pekerja: 'text-emerald-700 font-bold tabular-nums',
  total: 'text-indigo-800 font-black tabular-nums',
  /** COGS & penjualan */
  cogs: 'text-slate-800 font-bold tabular-nums',
  cogsAccent: 'text-emerald-800 font-black tabular-nums',
  cogsMuted: 'text-slate-500 font-semibold tabular-nums',
};

export function moneyClass(variant = 'matIdr', extra = '') {
  const base = moneyVariantClass[variant] || moneyVariantClass.matIdr;
  return extra ? `${base} ${extra}` : base;
}
