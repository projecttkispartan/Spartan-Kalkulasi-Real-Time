import { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Overlay full viewport — untuk master data / editor besar
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
}) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const iconBg =
    accent === 'indigo'
      ? 'bg-indigo-100 text-indigo-600'
      : 'bg-emerald-100 text-emerald-600';

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-gradient-to-br from-slate-100 via-slate-50 to-emerald-50/30"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <header className="shrink-0 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            {Icon && (
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
                <Icon className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight truncate">{title}</h1>
              {subtitle && <p className="text-xs text-slate-500 mt-1 max-w-3xl">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {headerActions}
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 bg-white"
              title="Tutup (Esc)"
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">Tutup</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {children}
        </div>
      </main>

      {footer && (
        <footer className="shrink-0 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3">{footer}</div>
        </footer>
      )}
    </div>
  );
}
