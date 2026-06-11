import {
  ArrowLeft,
  Image as ImageIcon,
  Layout,
  Grid,
  Activity,
  Settings,
  Users,
  Wrench,
} from 'lucide-react';
import { tipeStyles } from '../../design/tipeStyles';
import { formatIDR } from '../../utils/formatters';
import { calcProsesCosts, LABOR_RATE_PER_MIN } from '../../utils/operationCosts';
import { expandProsesList, computePartCostRow, computeNodeDisplayFinancials } from '../../services/bomCalculations';
import { getProsesById } from '../../data/routingCatalog';
import { partNameFromMaterialFields } from '../../utils/masterLookup';
import OperasiDetailCell from '../ui/OperasiDetailCell';

const PAGE = 'page-inner-full w-full max-w-[1600px] mx-auto';

export default function SummaryDetailModal({
  node,
  onClose,
  rollup = null,
  kursUsd = 1,
  kursEur = 1,
  onManageProses,
}) {
  if (!node) return null;
  const d = node.data;
  const style = tipeStyles[d.tipe] || tipeStyles.PART;
  const displayNama = d.tipe === 'PART' ? (partNameFromMaterialFields(d) || d.nama) : d.nama;

  const fin = d.tipe !== 'PART' && rollup
    ? computeNodeDisplayFinancials(d, rollup, kursUsd, kursEur)
    : null;

  const costRow = d.tipe === 'PART' ? computePartCostRow(d) : null;
  const materialCostWithFactors = fin?.isRollup
    ? (fin.matAdjusted ?? 0)
    : (costRow?.matAdjusted ?? 0);
  const sf = costRow?.sf ?? (Number(d.sf) || Number(d.masterWasteSfPct) || 0);
  const wf = costRow?.wf ?? (Number(d.wf) || Number(d.masterWasteWfPct) || 0);
  const baseMaterialCost = costRow?.matBase ?? (Number(d.biaya) || 0) * (Number(d.qty) || 1);

  let totalWaktuAll = 0;
  let totalMesinAll = 0;
  let totalPekerjaAll = 0;

  expandProsesList(d).forEach((p) => {
    const c = calcProsesCosts(p);
    totalWaktuAll += c.waktu;
    totalMesinAll += c.mesin + (c.wc || 0);
    totalPekerjaAll += c.pekerja;
  });

  const totalOperationCost = fin?.isRollup
    ? Math.max(0, (fin.prodTotal ?? 0) - materialCostWithFactors)
    : (costRow?.prosesTotal ?? totalMesinAll + totalPekerjaAll);
  const grandTotal = fin?.isRollup
    ? (fin.prodTotal ?? 0)
    : (costRow?.biayaProduksi ?? materialCostWithFactors + totalOperationCost);

  const canManage = onManageProses && ['MODUL', 'SUBMODUL', 'SUBMODUL 2', 'PART'].includes(d.tipe);

  return (
    <div className="routing-fullpage-root font-sans flex flex-col" role="dialog" aria-modal="true" aria-label="Detail komponen">
      <header className="shrink-0 bg-gradient-to-r from-brand-700 to-brand-600 text-white shadow-md">
        <div className={`${PAGE} px-4 sm:px-6 lg:px-8 py-4`}>
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20"
              title="Kembali"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-11 h-11 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
              {d.foto ? (
                <img src={d.foto} alt="" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-5 h-5 text-white/70" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase border bg-white/90 ${style.pill}`}>
                  {d.tipe}
                </span>
                <span className="text-xs font-mono font-bold text-brand-100">{d.kode}</span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold tracking-wide truncate">{displayNama}</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto scroll-thin bg-page">
        <div className={`${PAGE} px-4 sm:px-6 lg:px-8 py-6 lg:py-8 flex flex-col gap-6`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                <Layout className="w-4 h-4 text-brand-500" /> Spesifikasi Fisik
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Dimensi (W x D x H)</span>
                  <span className="font-bold text-slate-700">
                    {d.p || 0} x {d.l || 0} x {d.t || 0}{' '}
                    <span className="text-xs text-slate-400">mm</span>
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Volume Kalkulasi</span>
                  <span className="font-bold text-brand-600">
                    {d.vol} <span className="text-xs text-brand-400">m³</span>
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Kebutuhan (Qty)</span>
                  <span className="font-black text-slate-800">
                    {d.qty} <span className="text-xs font-bold text-slate-400">EA</span>
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Level Hierarki</span>
                  <span className="font-bold text-slate-700">Level {node.level}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                <Grid className="w-4 h-4 text-amber-500" /> Kalkulasi Material
              </h3>
              <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Harga Satuan Part</span>
                  <span className="font-bold text-slate-700">Rp {formatIDR(d.biaya || 0)}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Safety Factor (SF)</span>
                  <span className="font-bold text-amber-600">{sf}%</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Total Base Harga (x Qty)</span>
                  <span className="font-bold text-slate-700">Rp {formatIDR(baseMaterialCost)}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Waste Factor (WF)</span>
                  <span className="font-bold text-red-600">{wf}%</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center bg-amber-50/50 p-2 rounded-lg">
                <span className="text-[10px] font-black text-amber-800 uppercase tracking-wide">Subtotal Material</span>
                <span className="text-sm font-black text-amber-600">Rp {formatIDR(materialCostWithFactors)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap justify-between items-center gap-2 bg-slate-50/80">
              <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-4 h-4 text-brand-500" /> Rincian Operasi Manufaktur
              </h3>
              <span className="text-[10px] font-bold bg-brand-100 text-brand-700 px-2 py-1 rounded-md">
                Total Operasi: {d.proses?.length || d.proses_count || 0}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-brand-50 border-b border-brand-100 text-brand-800 text-[10px] uppercase tracking-widest font-extrabold">
                  <tr>
                    <th className="px-4 py-3 border-r border-brand-100 text-center w-16">Visual</th>
                    <th className="px-4 py-3 border-r border-brand-100 text-center w-20">Proses</th>
                    <th className="px-4 py-3 border-r border-brand-100">Tahap & Nama Operasi</th>
                    <th className="px-4 py-3 border-r border-brand-100 text-center">Durasi</th>
                    <th className="px-4 py-3 border-r border-brand-100 text-right">Biaya Mesin</th>
                    <th className="px-4 py-3 border-r border-brand-100 text-right">Jumlah Pekerja & Biaya</th>
                    <th className="px-4 py-3 border-r border-brand-100 text-left">Detail</th>
                    <th className="px-4 py-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {d.proses && d.proses.length > 0 ? (
                    d.proses.map((p, idx) => {
                      const {
                        waktu,
                        person: totalPerson,
                        mesin: biayaMesin,
                        pekerja: biayaPekerja,
                        total: subtotal,
                        rate,
                        ratePekerja,
                      } = calcProsesCosts(p);
                      const prosesLabel = p.proses ? getProsesById(p.proses).label : (p.mfgProcess || '—');

                      return (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 border-r border-slate-100 text-center align-middle">
                            <div className="w-12 h-12 rounded bg-white border border-slate-200 overflow-hidden mx-auto shadow-sm mb-1.5">
                              {p.gambar ? (
                                <img src={p.gambar} alt="posisi" className="w-full h-full object-cover" />
                              ) : (
                                <ImageIcon className="w-5 h-5 text-slate-300 mx-auto mt-3" />
                              )}
                            </div>
                            <span className="text-[9px] font-black bg-slate-100 text-slate-600 px-2 py-0.5 rounded uppercase tracking-wider">
                              {p.posisiOperasi || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100 text-center align-middle">
                            <span className="inline-block text-[9px] font-black uppercase tracking-wide text-violet-700 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded">
                              {prosesLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100 align-middle">
                            <div className="font-black text-brand-900 text-sm mb-1 flex flex-wrap items-center gap-1.5">
                              {p.nama}
                              {p.inputMode === 'routing' && (
                                <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 border border-indigo-200">
                                  RT{p.routingSteps?.length ? ` · ${p.routingSteps.length} langkah` : ''}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-bold text-slate-500 bg-slate-100 inline-block px-2 py-0.5 rounded border border-slate-200">
                              {p.mfgProcess || '-'}
                            </div>
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100 text-center align-middle">
                            <div className="inline-flex items-center justify-center bg-brand-50 border border-brand-100 text-brand-700 font-black px-2.5 py-1.5 rounded shadow-inner">
                              {waktu} <span className="text-[9px] ml-1 font-bold">Mnt</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100 text-right align-middle">
                            <div className="text-[9px] text-slate-400 font-bold mb-1">Rate: Rp {formatIDR(rate)} / mnt</div>
                            <div className="font-bold text-slate-700">Rp {formatIDR(biayaMesin)}</div>
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100 text-right align-middle">
                            <div className="font-black text-amber-600 text-sm mb-0.5">{totalPerson} org</div>
                            <div className="text-[9px] text-slate-400 font-bold mb-1">
                              @ Rp {formatIDR(ratePekerja || LABOR_RATE_PER_MIN)} / mnt
                            </div>
                            <div className="font-bold text-emerald-700">Rp {formatIDR(biayaPekerja)}</div>
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100 align-top min-w-[7rem]">
                            <OperasiDetailCell operasi={p} operasiIndex={idx} className="text-xs" />
                          </td>
                          <td className="px-4 py-3 text-right align-middle bg-brand-50/20">
                            <div className="font-black text-brand-700">Rp {formatIDR(subtotal)}</div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400 italic text-xs bg-slate-50/50">
                        Belum ada operasi manufaktur terperinci.
                        {d.proses_count > 0 && (
                          <span className="block mt-1 font-bold text-brand-400">
                            Total estimasi biaya kasar tersedia: Rp {formatIDR(totalMesinAll)}
                          </span>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-brand-100/50 border-t border-brand-200 px-4 py-3 flex flex-wrap gap-4 items-center justify-between text-xs font-black">
              <span className="text-brand-900 uppercase tracking-widest text-[10px]">Total Kalkulasi Manufaktur</span>
              <div className="flex gap-6 items-center">
                <span className="text-brand-800 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" /> {totalWaktuAll} Mnt
                </span>
                <span className="text-slate-700 flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5" /> Rp {formatIDR(totalMesinAll)}
                </span>
                <span className="text-slate-700 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Rp {formatIDR(totalPekerjaAll)}
                </span>
                <span className="text-brand-700 bg-white px-3 py-1 rounded shadow-sm border border-brand-100 text-sm">
                  Rp {formatIDR(totalOperationCost)}
                </span>
              </div>
            </div>
          </div>

          <section className="surface-card-lg p-4 sm:p-5 border border-slate-800/10 bg-slate-800 text-white rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">
                Grand Total Biaya (Material + Operasi)
              </span>
              <span className="text-sm font-medium text-slate-300">{displayNama}</span>
            </div>
            <div className="text-2xl font-black text-emerald-400">Rp {formatIDR(grandTotal)}</div>
          </section>
        </div>
      </main>

      <footer className="shrink-0 border-t border-slate-200 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        <div className={`${PAGE} px-4 sm:px-6 lg:px-8 py-4 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3`}>
          <button type="button" onClick={onClose} className="btn-secondary h-10 px-4 text-sm">
            Tutup
          </button>
          {canManage ? (
            <button
              type="button"
              onClick={() => onManageProses()}
              className="inline-flex items-center justify-center gap-2 h-10 px-5 text-sm font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
            >
              <Wrench className="w-4 h-4" />
              Kelola Operasi Manufaktur
            </button>
          ) : null}
        </div>
      </footer>
    </div>
  );
}
