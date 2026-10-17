import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search } from 'lucide-react';

// Compact custom dropdown — replaces native <select> so the open-list
// styling/positioning is consistent across browsers (native select popups
// render with OS-default styling that can't be themed).
//
// The option list renders through a portal into document.body, positioned
// with `position: fixed` from the trigger button's own bounding rect —
// never inline/absolute under the trigger. A scrollable ancestor (almost
// always true here: this is opened inside Modal's own overflow-y-auto
// content area) clips an absolutely-positioned child the moment it extends
// past that ancestor's box, even though the dropdown's own content would
// otherwise fit — confirmed live (a verifier/type list cut off a few rows
// in, well short of its own max-height). The portal sidesteps that
// entirely, matching the same technique already used by SmartSendModal's
// VerifierRow dropdown elsewhere in this app.
export const CustomSelect = ({ value, onChange, options, placeholder, className = '', disabled = false, ariaLabel, title, searchable = false, searchPlaceholder = 'Search options…' }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [menuPos, setMenuPos] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const selected = options.find((o) => o.value === value);
  const filteredOptions = searchable ? options.filter((option) => option.label.toLowerCase().includes(search.trim().toLowerCase())) : options;
  useEffect(() => { if (!open) setSearch(''); }, [open]);
  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [open]);

  useEffect(() => {
    const handler = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        menuRef.current && !menuRef.current.contains(e.target)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Recomputed on open and kept in sync while the ancestor scrolls or the
  // viewport resizes — same approach as VerifierRow, so a dropdown opened
  // inside a scrolled modal still tracks its trigger correctly.
  useEffect(() => {
    if (!open) return undefined;
    const updatePos = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) {
        const below = window.innerHeight - rect.bottom - 12;
        const above = rect.top - 12;
        const opensAbove = searchable && below < Math.min(240, above);
        setMenuPos({ top: opensAbove ? undefined : rect.bottom + 4, bottom: opensAbove ? window.innerHeight - rect.top + 4 : undefined, left: rect.left, width: rect.width, maxHeight: searchable ? Math.max(120, Math.min(320, opensAbove ? above : below)) : undefined });
      }
    };
    updatePos();
    window.addEventListener('scroll', updatePos, true);
    window.addEventListener('resize', updatePos);
    return () => {
      window.removeEventListener('scroll', updatePos, true);
      window.removeEventListener('resize', updatePos);
    };
  }, [open, searchable]);

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        title={title || selected?.label}
        aria-haspopup="listbox"
        aria-expanded={open && !disabled}
        onClick={() => setOpen((p) => !p)}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
          event.preventDefault();
          setOpen(true);
          requestAnimationFrame(() => menuRef.current?.querySelector('[aria-selected="true"], [role="option"]')?.focus());
        }}
        className="w-full flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold font-inter text-gray-600 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition-colors disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
      >
        <span className={searchable ? 'min-w-0 truncate text-left text-sm font-medium' : 'truncate'}>{selected?.label ?? placeholder}</span>
        <ChevronDown size={12} className={`text-gray-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && !disabled && menuPos && createPortal(
        <div
          ref={menuRef}
          role={searchable ? undefined : 'listbox'}
          aria-label={searchable ? undefined : ariaLabel}
          onKeyDown={(event) => {
            if (event.target.tagName === 'INPUT' && event.key !== 'ArrowDown') return;
            const items = Array.from(menuRef.current?.querySelectorAll('[role="option"]') || []);
            if (!items.length) return;
            const index = items.indexOf(document.activeElement);
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              items[(index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
            } else if (event.key === 'Home' || event.key === 'End') {
              event.preventDefault();
              items[event.key === 'Home' ? 0 : items.length - 1]?.focus();
            }
          }}
          style={{ position: 'fixed', ...menuPos }}
          className="z-[70] max-h-60 overflow-y-auto overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl"
        >
          {searchable && <div className="sticky top-0 z-10 border-b border-gray-100 bg-white p-2"><div className="flex items-center gap-2 rounded-md bg-gray-50 px-2.5"><Search size={14} className="shrink-0 text-gray-400" /><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} aria-label={searchPlaceholder} placeholder={searchPlaceholder} className="min-w-0 flex-1 bg-transparent py-2 text-sm text-gray-700 outline-none" /></div></div>}
          <div role={searchable ? 'listbox' : undefined} aria-label={searchable ? ariaLabel : undefined}>
          {filteredOptions.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-gray-500 font-inter">{search ? 'No matches found' : 'No options'}</p>
          ) : (
            filteredOptions.map((o) => (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={value === o.value}
                onClick={() => { onChange(o.value); setOpen(false); triggerRef.current?.focus(); }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-inter text-left transition-colors ${
                  value === o.value ? 'bg-blue-50 text-brand-blue font-semibold' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className={searchable ? 'min-w-0 break-words text-sm leading-5' : 'truncate'}>{o.label}</span>
                {value === o.value && <Check size={12} className="text-brand-blue shrink-0" />}
              </button>
            ))
          )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default CustomSelect;
