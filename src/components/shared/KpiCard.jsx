import React from 'react';
import { motion } from 'framer-motion';

// Three filled, round-cornered diamonds stacked like sheets — the faded motif on each KPI tile.
const StackedSheets = ({ className }) => (
  <svg aria-hidden="true" viewBox="0 0 140 170" className={className}>
    {[{ y: 76, o: 0.07 }, { y: 38, o: 0.1 }, { y: 0, o: 0.14 }].map(({ y, o }) => (
      <polygon
        key={y}
        points={`70,${y + 12} 128,${y + 46} 70,${y + 80} 12,${y + 46}`}
        fill="#fff"
        stroke="#fff"
        strokeWidth="18"
        strokeLinejoin="round"
        opacity={o}
      />
    ))}
  </svg>
);

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.35, ease: 'easeOut' },
});

// Blue KPI tile shared by the admin Overview and Batch Monitor: icon square,
// label, big number, caption, stacked sheets fading off the right edge.
export const KpiCard = ({ label, value, sub, icon: Icon, delay = 0 }) => (
  <motion.div {...fadeUp(delay)} className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#1D5CF2] to-[#2B6BFA] px-4 py-3.5 text-white shadow-[0_10px_24px_-14px_rgba(29,92,242,0.6)]">
    <StackedSheets className="pointer-events-none absolute -right-7 top-1/2 h-[125%] -translate-y-1/2" />
    <div className="relative flex items-center gap-3.5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
        <Icon size={20} strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-white/95 font-inter">{label}</p>
        <p className="mt-0.5 font-inter text-2xl font-bold leading-tight tracking-[-0.02em]">{value}</p>
        <p className="mt-0.5 truncate text-xs text-white/90 font-inter">{sub}</p>
      </div>
    </div>
  </motion.div>
);

export const KpiSkeleton = () => (
  <div className="rounded-xl bg-gradient-to-r from-[#1D5CF2] to-[#2B6BFA] px-4 py-3.5 opacity-70">
    <div className="flex items-center gap-3.5">
      <div className="h-11 w-11 rounded-xl bg-white/20" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-24 rounded bg-white/25" />
        <div className="h-6 w-16 rounded bg-white/25" />
        <div className="h-3 w-32 rounded bg-white/20" />
      </div>
    </div>
  </div>
);

export default KpiCard;
