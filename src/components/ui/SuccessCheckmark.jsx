import React from 'react';
import { motion } from 'framer-motion';

export const SuccessCheckmark = ({ size = 'lg', className = '' }) => {
  const sizes = {
    sm: { container: 48, stroke: 3 },
    md: { container: 64, stroke: 3 },
    lg: { container: 96, stroke: 4 },
    xl: { container: 128, stroke: 5 }
  };

  const s = sizes[size] || sizes.lg;

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      className={`inline-flex items-center justify-center ${className}`}
    >
      <svg width={s.container} height={s.container} viewBox="0 0 100 100">
        <motion.circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="#22C55E"
          strokeWidth={s.stroke}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        />
        <motion.path
          d="M30 52 L43 65 L70 38"
          fill="none"
          stroke="#22C55E"
          strokeWidth={s.stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, delay: 0.4, ease: 'easeInOut' }}
        />
      </svg>
    </motion.div>
  );
};

export default SuccessCheckmark;
