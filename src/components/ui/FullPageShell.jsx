import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Overlay full viewport — master data / editor besar (portal ke body).
 */
export default function FullPageShell({
  isOpen,
  onClose,
  title,
  icon: Icon,
  subtitle,
  headerActions,
  footer,
  children,
  accent = 'emerald',
  headerLabel,
  contentClassName = 'page-inner-full w-full py-4 overflow-hidden',
}) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const headerGradient =
    accent === 'indigo'
      ? 'bg-gradient-to-r from-indigo-700 to-indigo-600'
      : 'bg-gradient-to-r from-emerald-700 to-emerald-600';

  const iconBg =
    accent === 'indigo'
      ? 'bg-white/15 text-white'
      : 'bg-white/15 text-white';

  const content = (
    <div
      className="viewport-shell viewport-shell-modal flex flex-col bg-page"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <header className={`shrink-0 text-white shadow-md ${headerGradient}`}>
        <div className="page-inner-full w-full py-4 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {Icon && (
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
                <Icon className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">
                {headerLabel || 'Master'}
              </p>
              <h1 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight truncate">{title}</h1>
              {subtitle && (
                <p className="text-xs opacity-90 mt-1 max-w-4xl line-clamp-2 sm:line-clamp-none">{subtitle}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {headerActions}
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-white/95 border border-white/25 rounded-lg hover:bg-white/15 bg-white/10"
              title="Tutup (Esc)"
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">Tutup</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 flex flex-col overflow-hidden bg-slate-50/80">
        <div className={`flex flex-col flex-1 min-h-0 h-full ${contentClassName}`}>
          {children}
        </div>
      </main>

      {footer && (
        <footer className="shrink-0 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
          <div className="page-inner-full w-full py-3">{footer}</div>
        </footer>
      )}
    </div>
  );

  return createPortal(content, document.body);
}
