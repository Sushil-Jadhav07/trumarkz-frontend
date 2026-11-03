import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Clock, MinusCircle, MoreHorizontal, MoreVertical, Search, X,
} from 'lucide-react';
import { StackedSheets } from '@/components/shared/KpiCard';
import { pageItems } from '@/utils/pagination';

// Building blocks shared by the admin list pages (Organizations, User List) so they match each
// other and the Overview / Batch Monitor pages.

// Eyebrow + title + subtitle on the left, actions on the right.
export const PageIntro = ({ eyebrow, title, subtitle, actions }) => (
  <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div>
      {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-blue font-inter">{eyebrow}</p>}
      <h1 className="mt-1.5 font-sora text-xl font-bold leading-tight text-brand-dark sm:text-2xl">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-gray-500 font-inter">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-3">{actions}</div>}
  </div>
);

export const OutlineButton = ({ icon: Icon, children, className = '', ...props }) => (
  <button
    type="button"
    {...props}
    className={`inline-flex h-9 items-center gap-2 rounded-lg border-2 border-brand-blue/80 bg-white px-4 text-sm font-semibold text-brand-blue font-inter transition-colors hover:bg-blue-50 disabled:opacity-60 ${className}`}
  >
    {Icon && <Icon size={16} />}{children}
  </button>
);

export const SolidButton = ({ icon: Icon, children, className = '', ...props }) => (
  <button
    type="button"
    {...props}
    className={`inline-flex h-9 items-center gap-2 rounded-lg bg-brand-blue px-4 text-sm font-semibold text-white font-inter transition-colors hover:bg-brand-blue-hover disabled:opacity-60 ${className}`}
  >
    {Icon && <Icon size={16} />}{children}
  </button>
);

// Wide blue strip: big total on the left, short facts to its right.
export const SummaryBanner = ({ icon: Icon, label, value, segments = [] }) => (
  <div className="relative mb-4 overflow-hidden rounded-xl bg-gradient-to-r from-[#1D5CF2] to-[#2B6BFA] px-5 py-3.5 text-white shadow-[0_10px_24px_-14px_rgba(29,92,242,0.6)]">
    <StackedSheets className="pointer-events-none absolute -right-6 top-1/2 h-[110%] -translate-y-1/2" />
    <div className="relative flex flex-col gap-3 md:flex-row md:items-center md:gap-0">
      <div className="flex items-center gap-3.5 md:min-w-[260px]">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15"><Icon size={22} strokeWidth={1.75} /></span>
        <div>
          <p className="text-xs text-white/95 font-inter">{label}</p>
          <p className="mt-0.5 font-inter text-2xl font-bold leading-tight tracking-[-0.02em]">{value}</p>
        </div>
      </div>
      {segments.map((segment, i) => (
        <div key={i} className="flex items-center text-sm text-white/95 font-inter md:ml-8 md:border-l md:border-white/20 md:pl-8">{segment}</div>
      ))}
    </div>
  </div>
);

// Search box used by the directory bars (clears with the X).
export const SearchField = ({ search, onSearch, placeholder, className = 'w-full sm:w-72' }) => (
  <label className={`relative block ${className}`}>
    <span className="sr-only">{placeholder}</span>
    <Search size={15} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
    <input
      type="text"
      value={search}
      onChange={(e) => onSearch(e.target.value)}
      placeholder={placeholder}
      className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-8 text-xs text-gray-700 font-inter placeholder:text-gray-500 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
    />
    {search && (
      <button type="button" aria-label="Clear search" onClick={() => onSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-600"><X size={13} /></button>
    )}
  </label>
);

// Title + count pill on the left, search on the right.
export const DirectoryBar = ({ title, count, search, onSearch, placeholder, children }) => (
  <div className="flex flex-col gap-3 px-5 pb-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
    {children || (
      <h2 className="flex items-center gap-2.5 font-sora text-base font-semibold text-brand-dark">
        {title}
        {count != null && <span className="rounded-full bg-[#e3ebf8] px-2.5 py-0.5 text-xs font-semibold text-brand-blue font-inter">{count}</span>}
      </h2>
    )}
    <SearchField search={search} onSearch={onSearch} placeholder={placeholder} />
  </div>
);

// Status with a small icon, the way the admin tables show it. `kind` picks the icon and colour.
const STATUS_KINDS = {
  good: { icon: CheckCircle2, iconClass: 'text-green-500', text: 'text-[#2f3b52]' },
  pending: { icon: Clock, iconClass: 'text-orange-500', text: 'text-[#2f3b52]' },
  neutral: { icon: MinusCircle, iconClass: 'text-gray-400 fill-gray-200', text: 'text-[#8895ad]' },
  warning: { icon: AlertCircle, iconClass: 'text-orange-500', text: 'text-orange-600' },
  approved: { icon: CheckCircle2, iconClass: 'fill-brand-blue text-white', text: 'text-brand-blue' },
};

export const StatusText = ({ kind, children, title }) => {
  if (kind === 'active' || kind === 'inactive') {
    return (
      <span title={title} className="inline-flex items-center gap-2 text-xs text-[#2f3b52] font-inter">
        <span aria-hidden="true" className={`h-2 w-2 rounded-full ${kind === 'active' ? 'bg-green-500' : 'bg-gray-300'}`} />{children}
      </span>
    );
  }
  const meta = STATUS_KINDS[kind] || STATUS_KINDS.neutral;
  const Icon = meta.icon;
  return (
    <span title={title} className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-inter ${meta.text}`}>
      <Icon size={16} strokeWidth={1.75} aria-hidden="true" className={`shrink-0 ${meta.iconClass}`} />{children}
    </span>
  );
};

// Icon-only confirmed / not confirmed / n/a mark with a text alternative.
export const CheckMark = ({ state, label }) => {
  if (state === 'na') return <span title={`${label}: not applicable`} aria-label={`${label}: not applicable`} className="text-xs text-[#8895ad] font-inter">n/a</span>;
  const ok = state === 'yes';
  const Icon = ok ? CheckCircle2 : MinusCircle;
  return (
    <span title={`${label}: ${ok ? 'confirmed' : 'not confirmed'}`} className="inline-flex">
      <Icon size={18} strokeWidth={1.75} aria-label={`${label}: ${ok ? 'confirmed' : 'not confirmed'}`} className={ok ? 'text-green-500' : 'fill-gray-200 text-gray-400'} />
    </span>
  );
};

export const Avatar = ({ name, className = '' }) => (
  <span aria-hidden="true" className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e3ebf8] font-sora text-[11px] font-bold uppercase text-brand-blue ${className}`}>
    {String(name || '?').trim()[0] || '?'}
  </span>
);

// Three-dot menu that opens beside its button (portal, flips up near the bottom edge).
export const RowActionMenu = ({ items, label = 'More actions', horizontal = false }) => {
  const [anchor, setAnchor] = useState(null);
  const buttonRef = useRef(null);
  const visible = items.filter((item) => !item.hidden);
  const close = useCallback(() => setAnchor(null), []);

  useEffect(() => {
    if (!anchor) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') { close(); buttonRef.current?.focus(); } };
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close); };
  }, [anchor, close]);

  if (visible.length === 0) return null;
  const width = 208;
  const height = visible.length * 36 + 12;
  const place = anchor && {
    top: window.innerHeight - anchor.bottom < height + 16 ? Math.max(8, anchor.top - height - 6) : anchor.bottom + 6,
    left: Math.min(Math.max(8, anchor.right - width), window.innerWidth - width - 8),
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={!!anchor}
        onClick={(e) => { e.stopPropagation(); setAnchor(anchor ? null : e.currentTarget.getBoundingClientRect()); }}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 hover:text-brand-dark"
      >
        {horizontal ? <MoreHorizontal size={16} /> : <MoreVertical size={15} />}
      </button>
      {anchor && createPortal(
        <div className="fixed inset-0 z-[100]" onMouseDown={close}>
          <div
            role="menu"
            aria-label={label}
            style={{ top: place.top, left: place.left, width }}
            onMouseDown={(e) => e.stopPropagation()}
            className="fixed z-[101] rounded-xl border border-gray-200 bg-white p-1 shadow-xl"
          >
            {visible.map((item) => {
              const Icon = item.icon;
              const tone = item.tone === 'danger' ? 'text-red-600 hover:bg-red-50' : item.tone === 'warning' ? 'text-amber-700 hover:bg-amber-50' : 'text-gray-700 hover:bg-gray-50';
              return (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => { close(); item.onClick(); }}
                  className={`flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm font-inter transition-colors disabled:opacity-50 ${tone}`}
                >
                  {Icon && <Icon size={15} className="shrink-0" />}{item.label}
                </button>
              );
            })}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
};

export const NumberedPager = ({ page, totalPages, onPage }) => (
  <nav aria-label="Pagination" className="flex items-center gap-1.5">
    <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={15} /></button>
    {pageItems(page, totalPages).map((item, i) => (item === '…' ? (
      <span key={`gap-${i}`} className="w-5 text-center text-xs text-gray-400">…</span>
    ) : (
      <button
        key={item}
        type="button"
        aria-current={page === item ? 'page' : undefined}
        onClick={() => onPage(item)}
        className={`h-8 min-w-8 rounded-lg px-2 text-xs font-medium font-inter ${page === item ? 'bg-brand-blue text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
      >{item}</button>
    )))}
    <button type="button" aria-label="Next page" disabled={page >= totalPages} onClick={() => onPage(page + 1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight size={15} /></button>
  </nav>
);

// Sortable column header content.
export const SortLabel = ({ label, active, onClick }) => (
  <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 hover:text-brand-dark">
    {label}
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={active ? 'text-brand-blue' : 'text-[#5a82cf]'}>
      <path d="m7 15 5 5 5-5" /><path d="m7 9 5-5 5 5" />
    </svg>
  </button>
);
