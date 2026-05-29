import { useState } from 'react';
import { X, Network, Package, Grid, Wrench, Calculator, DollarSign, PieChart } from 'lucide-react';
import { flattenTree } from '../../utils/treeHelpers';
import { formatIDR } from '../../utils/formatters';

export default function KalkulasiModal({ isOpen, onClose, bomData }) {
  const [activeTab, setActiveTab] = useState('breakdown');

  if (!isOpen) return null;

  // Helper untuk mengkalkulasi biaya dari bawah (Part) ke atas (Modul)
  const calculateTreeCosts = (node) => {
    let costs = { material: 0, manufacture: 0, hardware: 0, packing: 0, total: 0 };

    if (node.children && node.children.length > 0) {
      node.children.forEach(child => {
        const childCosts = calculateTreeCosts(child);
        costs.material += childCosts.material;
        costs.manufacture += childCosts.manufacture;
        costs.hardware += childCosts.hardware;
        costs.packing += childCosts.packing;
      });
    } else {
      costs.material = (node.biaya || 0) * (node.qty || 1);
      costs.manufacture = (node.proses_count || 0) * 110000; 
    }
    costs.total = Object.values(costs).reduce((sum, val) => sum + (typeof val === 'number' && val !== costs.total ? val : 0), 0);
    
    node._costs = costs;
    return costs;
  };

  const rootCosts = calculateTreeCosts(bomData);
  const flatNodes = flattenTree(bomData);

  const stats = {
    modul: flatNodes.filter(n => n.data.tipe === 'MODUL').length,
    subModul: flatNodes.filter(n => n.data.tipe.includes('SUBMODUL')).length,
    part: flatNodes.filter(n => n.data.tipe === 'PART').length,
  };

  const fmt = (val) => val === 0 ? '—' : new Intl.NumberFormat('id-ID').format(val);

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 lg:p-8">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[1400px] h-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <h2 className="text-lg font-black text-slate-800 tracking-tight">View Kalkulasi Lengkap</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 border-b border-slate-200 shrink-0">
          <button 
            onClick={() => setActiveTab('breakdown')}
            className={`px-6 py-3.5 text-sm font-bold border-b-2 transition-colors ${activeTab === 'breakdown' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Breakdown Biaya
          </button>
          <button 
            onClick={() => setActiveTab('skenario')}
            className={`px-6 py-3.5 text-sm font-bold border-b-2 transition-colors ${activeTab === 'skenario' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Skenario Formula
          </button>
        </div>

        {activeTab === 'breakdown' && (
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30 flex flex-col gap-6">
            
            {/* Grid Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
              <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
                <span className="text-[11px] font-bold text-slate-400">Biaya Material</span>
                <div className="text-xl font-bold text-amber-500 mt-1">Rp {fmt(rootCosts.material)}</div>
              </div>
              <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
                <span className="text-[11px] font-bold text-slate-400">Biaya Proses Produksi</span>
                <div className="text-xl font-bold text-blue-600 mt-1">Rp {fmt(rootCosts.manufacture)}</div>
              </div>
              <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
                <span className="text-[11px] font-bold text-slate-400">Biaya Hardware/Misc</span>
                <div className="text-xl font-bold text-red-500 mt-1">Rp {fmt(rootCosts.hardware)}</div>
              </div>
              <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
                <span className="text-[11px] font-bold text-slate-400">Biaya Packing</span>
                <div className="text-xl font-bold text-sky-500 mt-1">Rp {fmt(rootCosts.packing)}</div>
              </div>
            </div>

            {/* Grand Total Banner */}
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-5 flex justify-between items-center shrink-0">
              <span className="font-black text-slate-700 tracking-wide">GRAND TOTAL</span>
              <span className="text-2xl font-black text-blue-700">Rp {fmt(rootCosts.total)}</span>
            </div>

            {/* Tabel Breakdown */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex-1 flex flex-col min-h-[300px]">
              <div className="overflow-auto flex-1 relative">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="py-4 px-4 text-[10px] font-extrabold text-slate-500 tracking-widest border-r border-slate-200 w-12 text-center">NO</th>
                      <th className="py-4 px-4 text-[10px] font-extrabold text-slate-500 tracking-widest border-r border-slate-200">KODE</th>
                      <th className="py-4 px-4 text-[10px] font-extrabold text-slate-500 tracking-widest border-r border-slate-200">NAMA</th>
                      <th className="py-4 px-4 text-[10px] font-extrabold text-slate-500 tracking-widest border-r border-slate-200 text-center">QTY</th>
                      <th className="py-4 px-4 text-[10px] font-extrabold text-slate-500 tracking-widest border-r border-slate-200 text-right">MATERIAL</th>
                      <th className="py-4 px-4 text-[10px] font-extrabold text-slate-500 tracking-widest border-r border-slate-200 text-right">PROSES PRODUKSI</th>
                      <th className="py-4 px-4 text-[10px] font-extrabold text-slate-500 tracking-widest text-right">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flatNodes.map((node, index) => {
                      const d = node.data;
                      const c = d._costs;
                      return (
                        <tr key={node.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="py-4 px-4 text-xs text-slate-400 text-center border-r border-slate-100">{index + 1}</td>
                          <td className="py-4 px-4 text-xs font-mono text-slate-500 border-r border-slate-100">{d.kode}</td>
                          <td className="py-4 px-4 text-xs font-bold text-slate-700 border-r border-slate-100">
                            <div className="flex items-center" style={{ paddingLeft: `${node.level * 12}px` }}>
                              {node.level > 0 && <span className="w-3 border-b border-slate-300 mr-2 inline-block"></span>}
                              {d.nama}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-xs text-slate-600 text-center border-r border-slate-100">{parseFloat(d.qty).toFixed(2)}</td>
                          <td className="py-4 px-4 text-xs font-medium text-amber-500 text-right border-r border-slate-100">{fmt(c.material)}</td>
                          <td className="py-4 px-4 text-xs font-medium text-blue-500 text-right border-r border-slate-100">{fmt(c.manufacture)}</td>
                          <td className="py-4 px-4 text-xs font-bold text-red-500 text-right">{fmt(c.total)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* Footer Stat Tabel */}
              <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 text-[11px] font-medium text-slate-500 flex gap-6 shrink-0">
                <span>Total baris: <span className="font-bold text-slate-700">{flatNodes.length}</span></span>
                <span>Modul: <span className="font-bold text-slate-700">{stats.modul}</span></span>
                <span>Sub Modul: <span className="font-bold text-slate-700">{stats.subModul}</span></span>
                <span>Part: <span className="font-bold text-slate-700">{stats.part}</span></span>
              </div>
            </div>

          </div>
        )}

        {activeTab === 'skenario' && (
          <div className="flex-1 p-6 flex flex-col items-center justify-center text-slate-400">
            <Settings className="w-16 h-16 mb-4 text-slate-200" />
            <p className="font-bold">Skenario Formula Belum Dikonfigurasi</p>
          </div>
        )}
      </div>
    </div>
  );
}
