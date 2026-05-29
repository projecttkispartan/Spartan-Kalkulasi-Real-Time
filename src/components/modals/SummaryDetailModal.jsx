import {
  X, Image as ImageIcon, Layout, Grid, Activity, Settings, Users,
} from 'lucide-react';
import { tipeStyles } from '../../design/tipeStyles';
import { formatIDR } from '../../utils/formatters';
import { calcProsesCosts, LABOR_RATE_PER_MIN } from '../../utils/operationCosts';

export default function SummaryDetailModal({ node, onClose }) {
  if (!node) return null;
  const d = node.data;
  const style = tipeStyles[d.tipe] || tipeStyles.PART;
  
  const sf = Number(d.sf) || 0;
  const wf = Number(d.wf) || 0;
  const baseMaterialCost = (d.biaya || 0) * (d.qty || 1);
  const materialCostWithFactors = baseMaterialCost * (1 + (sf/100) + (wf/100));

  let totalWaktuAll = 0;
  let totalMesinAll = 0;
  let totalPekerjaAll = 0;

  if (d.proses && d.proses.length > 0) {
    d.proses.forEach(p => {
      const c = calcProsesCosts(p);
      totalWaktuAll += c.waktu;
      totalMesinAll += c.mesin;
      totalPekerjaAll += c.pekerja;
    });
  } else if (d.proses_count > 0) {
    totalMesinAll = d.proses_count * 110000;
  }
  
  const totalOperationCost = totalMesinAll + totalPekerjaAll;
  const grandTotal = materialCostWithFactors + totalOperationCost;

  return (
    <div className="fixed inset-0 z-[130] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 lg:p-8 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[1000px] max-h-[90vh] flex flex-col overflow-hidden transform scale-100">
        
        {/* Header Modal */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white border border-slate-200 rounded-xl flex items-center justify-center shadow-sm overflow-hidden">
              {d.foto ? <img src={d.foto} alt="pic" className="w-full h-full object-cover" /> : <ImageIcon className="w-6 h-6 text-slate-300" />}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase border ${style.pill}`}>{d.tipe}</span>
                <span className="text-xs font-mono font-bold text-slate-500">{d.kode}</span>
              </div>
              <h2 className="text-lg font-black text-slate-800 tracking-tight leading-none">{d.nama}</h2>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 hover:bg-slate-100 hover:text-red-500 rounded-xl transition-all shadow-sm">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 flex flex-col gap-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Kartu Spesifikasi & Dimensi */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                <Layout className="w-4 h-4 text-brand-500" /> Spesifikasi Fisik
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Dimensi (W x D x H)</span>
                  <span className="font-bold text-slate-700">{d.p || 0} x {d.l || 0} x {d.t || 0} <span className="text-xs text-slate-400">mm</span></span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Volume Kalkulasi</span>
                  <span className="font-bold text-brand-600">{d.vol} <span className="text-xs text-brand-400">m³</span></span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Kebutuhan (Qty)</span>
                  <span className="font-black text-slate-800">{d.qty} <span className="text-xs font-bold text-slate-400">EA</span></span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Level Hierarki</span>
                  <span className="font-bold text-slate-700">Level {node.level}</span>
                </div>
              </div>
            </div>

            {/* Kartu Biaya Material Dasar */}
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

          {/* Tabel Detail Operasi Manufaktur */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
              <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-4 h-4 text-brand-500" /> Rincian Operasi Manufaktur
              </h3>
              <span className="text-[10px] font-bold bg-brand-100 text-brand-700 px-2 py-1 rounded-md">Total Operasi: {d.proses?.length || d.proses_count || 0}</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-brand-50 border-b border-brand-100 text-brand-800 text-[10px] uppercase tracking-widest font-extrabold">
                  <tr>
                    <th className="px-4 py-3 border-r border-brand-100 text-center w-16">Visual</th>
                    <th className="px-4 py-3 border-r border-brand-100">Tahap & Nama Operasi</th>
                    <th className="px-4 py-3 border-r border-brand-100 text-center">Durasi</th>
                    <th className="px-4 py-3 border-r border-brand-100 text-right">Biaya Mesin</th>
                    <th className="px-4 py-3 border-r border-brand-100 text-right">Biaya Pekerja</th>
                    <th className="px-4 py-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {d.proses && d.proses.length > 0 ? d.proses.map((p, idx) => {
                    const { waktu, person: totalPerson, mesin: biayaMesin, pekerja: biayaPekerja, total: subtotal, rate } = calcProsesCosts(p);

                    return (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 border-r border-slate-100 text-center align-middle">
                          <div className="w-12 h-12 rounded bg-white border border-slate-200 overflow-hidden mx-auto shadow-sm mb-1.5">
                            {p.gambar ? <img src={p.gambar} alt="posisi" className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 text-slate-300 mx-auto mt-3" />}
                          </div>
                          <span className="text-[9px] font-black bg-slate-100 text-slate-600 px-2 py-0.5 rounded uppercase tracking-wider">{p.posisiOperasi || '-'}</span>
                        </td>
                        <td className="px-4 py-3 border-r border-slate-100 align-middle">
                          <div className="font-black text-brand-900 text-sm mb-1">{p.nama}</div>
                          <div className="text-[10px] font-bold text-slate-500 bg-slate-100 inline-block px-2 py-0.5 rounded border border-slate-200">{p.mfgProcess || '-'}</div>
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
                          <div className="flex items-center justify-end gap-1.5 mb-1">
                            <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-1.5 rounded">{totalPerson} Org</span>
                            <span className="text-[9px] text-slate-400 font-bold">@ Rp {formatIDR(LABOR_RATE_PER_MIN)} / mnt</span>
                          </div>
                          <div className="font-bold text-slate-700">Rp {formatIDR(biayaPekerja)}</div>
                        </td>
                        <td className="px-4 py-3 text-right align-middle bg-brand-50/20">
                          <div className="font-black text-brand-700">Rp {formatIDR(subtotal)}</div>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic text-xs bg-slate-50/50">
                        Belum ada operasi manufaktur terperinci. 
                        {d.proses_count > 0 && <span className="block mt-1 font-bold text-brand-400">Total estimasi biaya kasar tersedia: Rp {formatIDR(totalMesinAll)}</span>}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer Summary Operasi */}
            <div className="bg-brand-100/50 border-t border-brand-200 px-4 py-3 flex flex-wrap gap-4 items-center justify-between text-xs font-black">
               <span className="text-brand-900 uppercase tracking-widest text-[10px]">Total Kalkulasi Manufaktur</span>
               <div className="flex gap-6 items-center">
                 <span className="text-brand-800 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5"/> {totalWaktuAll} Mnt</span>
                 <span className="text-slate-700 flex items-center gap-1.5"><Settings className="w-3.5 h-3.5"/> Rp {formatIDR(totalMesinAll)}</span>
                 <span className="text-slate-700 flex items-center gap-1.5"><Users className="w-3.5 h-3.5"/> Rp {formatIDR(totalPekerjaAll)}</span>
                 <span className="text-brand-700 bg-white px-3 py-1 rounded shadow-sm border border-brand-100 text-sm">Rp {formatIDR(totalOperationCost)}</span>
               </div>
            </div>
          </div>

        </div>

        {/* Grand Total Footer */}
        <div className="bg-slate-800 text-white px-6 py-5 shrink-0 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Grand Total Biaya (Material + Operasi)</span>
            <span className="text-sm font-medium text-slate-300">{d.nama}</span>
          </div>
          <div className="text-2xl font-black text-emerald-400">
            Rp {formatIDR(grandTotal)}
          </div>
        </div>

      </div>
    </div>
  );
};

// ==========================================
// KUMPULAN KOMPONEN OUTSIDE-EDITOR (AGAR TIDAK RE-MOUNT / HILANG FOKUS)
// ==========================================
