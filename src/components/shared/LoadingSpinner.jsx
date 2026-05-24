import { motion } from 'framer-motion';

export const LoadingSpinner = ({ size = 'md', color = 'blue', className = '' }) => {
  const dims   = { sm: 20, md: 32, lg: 48, xl: 64 };
  const strokes = { sm: 2.5, md: 3, lg: 4, xl: 5 };

  const d   = dims[size]    || 32;
  const sw  = strokes[size] || 3;
  const cx  = d / 2;
  const r   = cx - sw * 1.5;
  const arc = 2 * Math.PI * r * 0.68;
  const gap = 2 * Math.PI * r;

  const trackStroke = color === 'white' ? 'rgba(255,255,255,0.12)' : '#e5e7eb';
  const arcStroke   = color === 'white' ? 'rgba(255,255,255,0.88)' : '#2563eb';

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
        style={{ width: d, height: d }}
      >
        <svg width={d} height={d} viewBox={`0 0 ${d} ${d}`}>
          {/* Track */}
          <circle cx={cx} cy={cx} r={r} fill="none" stroke={trackStroke} strokeWidth={sw} />
          {/* Spinning arc */}
          <circle
            cx={cx} cy={cx} r={r}
            fill="none"
            stroke={arcStroke}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeDasharray={`${arc} ${gap}`}
          />
        </svg>
      </motion.div>
    </div>
  );
};

export default LoadingSpinner;
