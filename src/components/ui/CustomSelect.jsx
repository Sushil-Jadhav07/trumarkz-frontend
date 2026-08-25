import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

// Compact custom dropdown — replaces native <select> so the open-list
// styling/positioning is consistent across browsers (native select popups
// render with OS-default styling that can't be themed).
export const CustomSelect = ({ value, onChange, options, placeholder, className = '' }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold font-inter text-gray-600 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition-colors"
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <ChevronDown size={12} className={`text-gray-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-30 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden max-h-60 overflow-y-auto">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-inter text-left transition-colors ${
                value === o.value ? 'bg-blue-50 text-brand-blue font-semibold' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="truncate">{o.label}</span>
              {value === o.value && <Check size={12} className="text-brand-blue shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
