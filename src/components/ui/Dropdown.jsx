import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import clsx from 'clsx';

export const Dropdown = ({
  value,
  options = [],
  onChange,
  className = ''
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const selected = options.find((opt) => opt.value === value) || options[0];

  return (
    <div ref={rootRef} className={clsx('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={clsx(
          'w-full rounded-xl border-2 border-gray-200 px-4 py-2.5',
          'font-inter text-sm text-left outline-none',
          'focus:border-brand-blue'
        )}
      >
        <span>{selected?.label || ''}</span>
        <ChevronDown
          size={16}
          className={clsx(
            'absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={clsx(
                  'w-full px-4 py-2.5 text-left text-sm font-inter transition-colors',
                  isSelected
                    ? 'bg-brand-blue text-white'
                    : 'text-brand-dark hover:bg-gray-50'
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Dropdown;
