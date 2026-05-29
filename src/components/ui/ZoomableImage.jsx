import { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Image as ImageIcon } from 'lucide-react';

const btnCls =
  'w-7 h-7 flex items-center justify-center rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm transition-colors disabled:opacity-35';

export default function ZoomableImage({
  src,
  alt = '',
  compact = false,
  minHeight = compact ? 160 : 200,
  minZoom = 0.5,
  maxZoom = 2.5,
  step = 0.25,
  className = '',
}) {
  const [zoom, setZoom] = useState(1);
  const zoomIn = () => setZoom((z) => Math.min(maxZoom, +(z + step).toFixed(2)));
  const zoomOut = () => setZoom((z) => Math.max(minZoom, +(z - step).toFixed(2)));
  const reset = () => setZoom(1);

  return (
    <div className={`relative rounded-lg border border-slate-200 bg-slate-100 overflow-hidden ${className}`} style={{ minHeight }}>
      <div className="absolute inset-0 flex items-center justify-center p-3">
        {src ? (
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-full object-contain transition-transform duration-150 select-none"
            style={{ transform: `scale(${zoom})` }}
            draggable={false}
          />
        ) : (
          <div className="text-center text-slate-400">
            <ImageIcon className={`mx-auto mb-1 opacity-40 ${compact ? 'w-8 h-8' : 'w-10 h-10'}`} />
            <span className="text-[10px] font-semibold">Tidak ada foto</span>
          </div>
        )}
      </div>

      <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5">
        {src && (
          <span className="text-[9px] font-bold text-slate-600 bg-white/90 px-1.5 py-0.5 rounded border border-slate-200 mr-1">
            {Math.round(zoom * 100)}%
          </span>
        )}
        <button type="button" onClick={zoomOut} disabled={zoom <= minZoom} className={btnCls} title="Perkecil">
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={zoomIn} disabled={zoom >= maxZoom} className={btnCls} title="Perbesar">
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={reset} className={btnCls} title="Reset">
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>

      {alt && src && (
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-900/80 to-transparent px-2 pb-1.5 pt-6">
          <p className="text-[9px] font-bold text-white truncate">{alt}</p>
        </div>
      )}
    </div>
  );
}
