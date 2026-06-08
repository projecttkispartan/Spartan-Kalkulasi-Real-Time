import { createPortal } from 'react-dom';
import { X, ZoomIn } from 'lucide-react';

export function FlowPreviewModal({ open, title, onClose, children }) {
  if (!open) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 p-4 md:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Preview flowchart'}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-emerald-50">
          <div>
            <p className="text-[10px] font-bold uppercase text-emerald-600 tracking-widest">Preview Flowchart</p>
            <h2 className="text-lg font-black text-slate-800">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-emerald-100 text-slate-600"
            title="Tutup (Esc / klik backdrop)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-8 md:p-12 bg-slate-50/50 flex items-center justify-center min-h-[280px]">
          <div className="transform origin-center">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function ImagePreviewModal({ open, src, alt, caption, onClose }) {
  if (!open || !src) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-slate-900/90"
      role="dialog"
      aria-modal="true"
      aria-label={alt || 'Preview gambar'}
      onClick={onClose}
    >
      <div className="shrink-0 flex items-center justify-between px-4 py-3 text-white" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-bold truncate flex-1 mr-4">{caption || alt}</p>
        <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-white/10">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center p-4 overflow-auto" onClick={onClose}>
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>,
    document.body,
  );
}

export function FlowChartCard({ title, flowId, FlowComponent, onPreview }) {
  if (!FlowComponent) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-white">
        <p className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">{title || 'Flowchart'}</p>
        <button
          type="button"
          onClick={() => onPreview?.(flowId)}
          className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors"
        >
          <ZoomIn className="w-3.5 h-3.5" /> Preview fullscreen
        </button>
      </div>
      <div className="p-5 overflow-x-auto cursor-pointer group" onClick={() => onPreview?.(flowId)} title="Klik untuk preview">
        <FlowComponent />
        <p className="text-[9px] text-center text-slate-400 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
          Klik diagram untuk preview besar
        </p>
      </div>
    </div>
  );
}

export function ManualFigurePreview({ src, alt, caption, onPreview }) {
  return (
    <figure className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm my-3 group">
      <button
        type="button"
        className="relative block w-full text-left"
        onClick={() => onPreview?.({ src, alt, caption })}
      >
        <img src={src} alt={alt} className="w-full h-auto max-h-72 object-contain bg-slate-50" loading="lazy" />
        <span className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/50 text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
          <ZoomIn className="w-3 h-3" /> Preview
        </span>
      </button>
      {caption && (
        <figcaption className="text-[10px] text-slate-500 px-3 py-2 border-t border-slate-100 font-medium">{caption}</figcaption>
      )}
    </figure>
  );
}
