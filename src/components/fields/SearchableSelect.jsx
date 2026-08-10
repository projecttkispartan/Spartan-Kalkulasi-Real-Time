import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search } from 'lucide-react';

const triggerCls =
  'w-full flex items-center gap-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-medium bg-white hover:border-brand-400 focus:border-brand-400 focus:ring-1 focus:ring-brand-100 outline-none text-left min-w-0';
const searchWrapCls =
  'flex items-center gap-1 border-b border-slate-100 px-2 py-1.5 bg-slate-50';
const searchInputCls =
  'flex-1 min-w-0 border-0 bg-transparent py-0.5 text-xs font-medium outline-none placeholder:text-slate-400';
const optionCls =
  'w-full text-left px-2.5 py-1.5 text-xs hover:bg-brand-50 focus:bg-brand-50 text-slate-700 truncate';
const groupHeadCls =
  'px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wide text-slate-400 bg-slate-50 sticky top-0 z-[1]';

const PANEL_MIN_W = 280;
const PANEL_MAX_H = 280;

/** Gabungkan field material untuk pencarian */
export function buildMaterialSearchText(m) {
  return [
    m?.kode,
    m?.specification,
    m?.nama,
    m?.woodName,
    m?.section,
    m?.materialType,
    m?.vendorSupplier,
    m?.diameterGrade,
    m?.name,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function filterOptions(options, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return options;
  return options.filter((o) => o.searchText.includes(q));
}

/**
 * Combo klasik: klik → panel dropdown + search + list panjang (scroll).
 * allowCreate: ketik teks bebas → onCreate(text) (buat entri baru / manual).
 */
export function SearchableSelect({
  value = '',
  onChange,
  options = [],
  placeholder = '— Pilih —',
  emptyMessage = 'Tidak ada hasil',
  className = '',
  disabled = false,
  allowCreate = false,
  onCreate,
  displayLabel = '',
  createHint = 'Buat baru',
}) {
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const searchRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0, width: PANEL_MIN_W });

  const selected = useMemo(
    () => options.find((o) => o.value === value),
    [options, value],
  );

  const filtered = useMemo(() => filterOptions(options, query), [options, query]);

  const queryTrim = String(query || '').trim();
  const exactMatch = useMemo(() => {
    if (!queryTrim) return null;
    const q = queryTrim.toLowerCase();
    return (
      options.find((o) => String(o.label || '').toLowerCase() === q) ||
      options.find((o) => String(o.value || '').toLowerCase() === q) ||
      null
    );
  }, [options, queryTrim]);

  const showCreate =
    allowCreate &&
    typeof onCreate === 'function' &&
    queryTrim.length > 0 &&
    !exactMatch;

  const grouped = useMemo(() => {
    const hasGroup = filtered.some((o) => o.group);
    if (!hasGroup) return null;
    const map = new Map();
    for (const o of filtered) {
      const g = o.group || 'LAINNYA';
      if (!map.has(g)) map.set(g, []);
      map.get(g).push(o);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const syncPanelPosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = Math.max(PANEL_MIN_W, r.width);
    let top = r.bottom + 4;
    let left = r.left;
    const panelH = PANEL_MAX_H + 56;
    if (top + panelH > window.innerHeight - 8) {
      top = Math.max(8, r.top - panelH - 4);
    }
    if (left + width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - width - 8);
    }
    setPanelPos({ top, left, width });
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery('');
      return undefined;
    }
    syncPanelPosition();
    const t = setTimeout(() => searchRef.current?.focus(), 0);
    const onScroll = () => setOpen(false);
    const onResize = () => syncPanelPosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, syncPanelPosition]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      const t = e.target;
      if (
        triggerRef.current?.contains(t) ||
        panelRef.current?.contains(t)
      ) {
        return;
      }
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (opt) => {
    if (!opt?.value) {
      onChange('', null);
    } else {
      onChange(opt.value, opt.raw ?? null);
    }
    setOpen(false);
    setQuery('');
  };

  const createFromQuery = () => {
    if (!showCreate) return;
    onCreate(queryTrim);
    setOpen(false);
    setQuery('');
  };

  const renderOption = (opt) => (
    <button
      key={opt.value}
      type="button"
      className={`${optionCls} ${opt.value === value ? 'bg-brand-50 text-brand-800 font-bold' : ''}`}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => pick(opt)}
      title={opt.label}
    >
      {opt.content ?? opt.label}
    </button>
  );

  const closedLabel = selected?.label || displayLabel || '';
  const isManualDisplay = !selected && Boolean(displayLabel);

  const panel =
    open &&
    createPortal(
      <div
        ref={panelRef}
        role="listbox"
        className="rounded-lg border border-slate-200 bg-white shadow-xl overflow-hidden"
        style={{
          position: 'fixed',
          top: panelPos.top,
          left: panelPos.left,
          width: panelPos.width,
          zIndex: 10000,
        }}
      >
        <div className={searchWrapCls}>
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={allowCreate ? 'Cari atau ketik nama baru…' : 'Cari kode, nama, section…'}
            className={searchInputCls}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') {
                e.preventDefault();
                if (exactMatch) {
                  pick(exactMatch);
                } else if (showCreate) {
                  createFromQuery();
                } else if (filtered.length === 1) {
                  pick(filtered[0]);
                }
              }
            }}
          />
          {query.trim() && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-[9px] font-bold text-slate-400 hover:text-slate-600 px-1"
            >
              ✕
            </button>
          )}
        </div>

        <div
          className="overflow-y-auto overscroll-contain"
          style={{ maxHeight: PANEL_MAX_H }}
        >
          {(value || displayLabel) && (
            <button
              type="button"
              className="w-full text-left px-2.5 py-1.5 text-[10px] font-bold text-slate-400 hover:bg-red-50 hover:text-red-600 border-b border-slate-50"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(null)}
            >
              — Kosongkan pilihan —
            </button>
          )}
          {showCreate ? (
            <button
              type="button"
              className="w-full text-left px-2.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-50/80 hover:bg-emerald-100 border-b border-emerald-100"
              onMouseDown={(e) => e.preventDefault()}
              onClick={createFromQuery}
              title={`${createHint}: ${queryTrim}`}
            >
              + {createHint}: «{queryTrim}»
            </button>
          ) : null}
          {filtered.length === 0 && !showCreate ? (
            <p className="px-2.5 py-4 text-[10px] text-slate-400 text-center">{emptyMessage}</p>
          ) : grouped ? (
            grouped.map(([group, items]) => (
              <div key={group}>
                <div className={groupHeadCls}>{group}</div>
                {items.map(renderOption)}
              </div>
            ))
          ) : (
            filtered.map(renderOption)
          )}
        </div>

        <p className="px-2.5 py-1 text-[9px] text-slate-400 font-medium border-t border-slate-50 bg-slate-50/80">
          {query.trim()
            ? `${filtered.length} dari ${options.length} SKU${showCreate ? ' · Enter = buat baru' : ''}`
            : `${options.length} SKU — scroll daftar${allowCreate ? ' · ketik untuk buat baru' : ''}`}
        </p>
      </div>,
      document.body,
    );

  return (
    <div className={`relative min-w-0 ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) setOpen((v) => !v);
        }}
        className={`${triggerCls} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className={`flex-1 truncate ${closedLabel ? 'text-slate-800' : 'text-slate-400'}`}>
          {closedLabel || placeholder}
        </span>
        {isManualDisplay ? (
          <span className="shrink-0 text-[8px] font-black uppercase tracking-wide text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
            Baru
          </span>
        ) : selected ? (
          <span className="shrink-0 text-[8px] font-black uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
            Master
          </span>
        ) : null}
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {panel}
    </div>
  );
}
