import { useId, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import clsx from 'clsx';

// One tab/filter control for the whole app. The highlight is a single element that slides
// (and resizes) from the old tab to the new one instead of each tab fading on its own.
//   segmented: white rounded track, light-blue highlight   (page-level view switches)
//   pills:     bordered buttons, light-blue highlight       (filters with icons)
//   solid:     bordered buttons, solid-blue highlight       (category filters)
//   filters:   borderless row, solid-blue highlight (status filters with counts)
//   chips:     rounded grey chips, solid-blue highlight
//   underline: text tabs on a rule, blue underline slides   (section tabs)
const VARIANTS = {
  segmented: {
    wrap: 'flex items-center gap-1 rounded-xl border border-gray-100 bg-white p-1',
    btn: 'h-9 rounded-lg px-4 text-sm',
    on: 'text-brand-blue', off: 'text-gray-600 hover:text-brand-dark',
    indicator: 'inset-0 rounded-lg bg-[#e3ebf8]',
  },
  pills: {
    wrap: 'flex flex-wrap items-center gap-2',
    btn: 'h-9 rounded-lg border px-4 text-[13px]',
    on: 'border-transparent text-brand-blue', off: 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
    indicator: '-inset-px rounded-lg border border-[#c7d8f5] bg-[#e3ebf8]',
  },
  solid: {
    wrap: 'flex flex-wrap items-center gap-2',
    btn: 'h-8 rounded-lg border px-4 text-xs',
    on: 'border-transparent text-white', off: 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
    indicator: '-inset-px rounded-lg bg-brand-blue',
  },
  filters: {
    wrap: 'flex flex-wrap items-center gap-1',
    btn: 'h-9 rounded-lg px-3 text-[13px]',
    on: 'text-white', off: 'text-gray-600 hover:bg-gray-50 hover:text-brand-dark',
    indicator: 'inset-0 rounded-lg bg-brand-blue',
  },
  chips: {
    wrap: 'flex gap-2 overflow-x-auto pb-0.5 no-scrollbar',
    btn: 'rounded-full px-4 py-2 text-sm',
    on: 'text-white', off: 'bg-gray-100 text-gray-600 hover:bg-gray-200',
    indicator: 'inset-0 rounded-full bg-brand-blue',
  },
  underline: {
    wrap: 'flex gap-1 overflow-y-hidden border-b border-gray-200 scrollbar-hidden',
    btn: 'px-4 py-2.5 text-sm',
    on: 'text-brand-blue', off: 'text-gray-500 hover:text-brand-dark',
    indicator: 'bottom-0 left-0 right-0 h-0.5 rounded-full bg-brand-blue',
  },
};

export const SlidingTabs = ({
  tabs, value, onChange, ariaLabel, variant = 'segmented', className = '', buttonClassName = '', toggle = false,
}) => {
  const id = useId();
  const reduce = useReducedMotion();
  const refs = useRef({});
  const v = VARIANTS[variant] || VARIANTS.segmented;

  // Arrow keys move between tabs, like a native tab list.
  const onKeyDown = (event, index) => {
    if (toggle || (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft')) return;
    event.preventDefault();
    const next = tabs[(index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
    onChange(next.value);
    refs.current[next.value]?.focus();
  };

  return (
    <div role={toggle ? 'group' : 'tablist'} aria-label={ariaLabel} className={clsx(v.wrap, className)}>
      {tabs.map((tab, index) => {
        const on = tab.value === value;
        const Icon = tab.icon;
        return (
          <button
            key={tab.value}
            ref={(el) => { refs.current[tab.value] = el; }}
            type="button"
            role={toggle ? undefined : 'tab'}
            aria-selected={toggle ? undefined : on}
            aria-pressed={toggle ? on : undefined}
            tabIndex={toggle || on ? 0 : -1}
            onClick={() => onChange(tab.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={clsx(
              'relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-medium font-inter transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40',
              v.btn, on ? v.on : v.off, buttonClassName,
            )}
          >
            {on && (
              <motion.span
                layoutId={id}
                aria-hidden="true"
                className={clsx('absolute', v.indicator)}
                transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 40, mass: 0.8 }}
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-2">
              {Icon && <Icon size={16} strokeWidth={1.75} />}
              {tab.label}
              {tab.count != null && (
                <span className={clsx('rounded-full px-1.5 text-[11px] font-semibold tabular-nums', on && (variant === 'solid' || variant === 'filters') ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600')}>{tab.count}</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default SlidingTabs;
