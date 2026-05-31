import { useState } from 'react';
import { Eye } from 'lucide-react';
import OperasiRoutingDetailModal from '../modals/OperasiRoutingDetailModal';

/**
 * Kolom detail operasi di Summary: teks catatan (WC) atau tombol popup (routing).
 */
export default function OperasiDetailCell({ operasi, operasiIndex = 0, className = '' }) {
  const [popupOpen, setPopupOpen] = useState(false);
  const isRouting = operasi?.inputMode === 'routing';
  const stepCount = operasi?.routingSteps?.length || 0;

  if (!isRouting) {
    const note = operasi?.note?.trim();
    return (
      <p
        className={`text-[9px] text-slate-600 leading-snug whitespace-normal font-medium ${className}`}
        title={note || ''}
      >
        {note || '—'}
      </p>
    );
  }

  return (
    <>
      <div className={`flex flex-col items-start gap-1 ${className}`}>
        <button
          type="button"
          onClick={() => setPopupOpen(true)}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wide text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 transition-colors"
          title="Buka detail langkah routing"
        >
          <Eye className="w-3 h-3" />
          Detail
          {stepCount > 0 && <span className="text-indigo-500 font-black">({stepCount})</span>}
        </button>
        {operasi?.note?.trim() && (
          <p className="text-[8px] text-slate-500 leading-snug max-w-[10rem] truncate" title={operasi.note}>
            {operasi.note}
          </p>
        )}
      </div>
      {popupOpen && (
        <OperasiRoutingDetailModal
          operasi={operasi}
          operasiIndex={operasiIndex}
          onClose={() => setPopupOpen(false)}
        />
      )}
    </>
  );
}
