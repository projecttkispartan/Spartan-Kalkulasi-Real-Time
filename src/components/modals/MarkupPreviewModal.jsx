import { createPortal } from 'react-dom';
import { X, TrendingUp } from 'lucide-react';
import { formatIDR } from '../../utils/formatters';
import { MARKUP_PRESETS } from '../../data/masterSamples';

export default function MarkupPreviewModal({ isOpen, onClose, totalCogs, selectedPct, onSelect }) {
  if (!isOpen) return null;

  const cogs = Number(totalCogs) || 0;

  const content = (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Preview Mark Up</h3>
              <p className="text-[10px] text-slate-500">COGS: Rp {formatIDR(cogs)}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-white/80 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto scroll-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                <th className="px-5 py-3 text-left">Mark Up</th>
                <th className="px-5 py-3 text-right">Harga Jual FOB</th>
              </tr>
            </thead>
            <tbody>
              {MARKUP_PRESETS.map((pct) => {
                const selling = cogs * (1 + pct / 100);
                const fob = Math.floor(selling / 1000) * 1000;
                const active = Number(selectedPct) === pct;
                return (
                  <tr
                    key={pct}
                    className={`border-t border-slate-100 cursor-pointer transition-colors ${
                      active ? 'bg-emerald-100 hover:bg-emerald-100' : 'hover:bg-slate-50'
                    }`}
                    onClick={() => onSelect(pct)}
                  >
                    <td className="px-5 py-3 font-black text-slate-800 tabular-nums">
                      {pct.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                    </td>
                    <td className="px-5 py-3 text-right font-black text-emerald-800 tabular-nums">
                      Rp {formatIDR(fob)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 text-[10px] text-slate-500">
          Klik baris untuk memilih markup. FOB dibulatkan ke ribuan.
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
