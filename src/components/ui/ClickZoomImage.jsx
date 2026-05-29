import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ZoomIn, ZoomOut, RotateCcw, Image as ImageIcon } from 'lucide-react';

const btnCls =
  'w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-md disabled:opacity-40';

/** Thumbnail kecil — klik untuk buka lightbox zoom */
export default function ClickZoomImage({
  src,
  alt = '',
  size = 72,
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const zoomIn = () => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)));
  const zoomOut = () => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)));

  const openLightbox = () => {
    setZoom(1);
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={openLightbox}
        className={`group relative shrink-0 rounded-lg border-2 border-slate-200 bg-slate-100 overflow-hidden hover:border-brand-400 hover:ring-2 hover:ring-brand-100 transition-all focus:outline-none focus:ring-2 focus:ring-brand-400 ${className}`}
        style={{ width: size, height: size }}
        title="Klik untuk perbesar / perkecil"
      >
        {src ? (
          <img src={src} alt={alt} className="w-full h-full object-cover" draggable={false} />
        ) : (
          <span className="flex flex-col items-center justify-center h-full text-slate-400">
            <ImageIcon className="w-6 h-6 opacity-50" />
          </span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/35 transition-colors">
          <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 drop-shadow" />
        </span>
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[400] flex flex-col bg-slate-900/90 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label={alt || 'Preview gambar'}
            onClick={() => setOpen(false)}
          >
            <div className="shrink-0 flex items-center justify-between px-4 py-3 text-white">
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">{alt || 'Visual posisi'}</p>
                <p className="text-[11px] text-slate-300">Klik di luar gambar atau tombol tutup · Zoom {Math.round(zoom * 100)}%</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button type="button" onClick={(e) => { e.stopPropagation(); zoomOut(); }} className={btnCls} title="Perkecil">
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button type="button" onClick={(e) => { e.stopPropagation(); zoomIn(); }} className={btnCls} title="Perbesar">
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button type="button" onClick={(e) => { e.stopPropagation(); setZoom(1); }} className={btnCls} title="Reset">
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div
              className="flex-1 flex items-center justify-center p-6 min-h-0 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {src ? (
                <img
                  src={src}
                  alt={alt}
                  className="max-w-full max-h-full object-contain transition-transform duration-150 select-none"
                  style={{ transform: `scale(${zoom})` }}
                  draggable={false}
                />
              ) : (
                <ImageIcon className="w-16 h-16 text-slate-500" />
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
