import React from 'react';
import { motion } from 'framer-motion';

export const SkeletonLoader = ({ width = '100%', height = '20px', circle = false, className = '' }) => {
  return (
    <motion.div
      initial={{ opacity: 0.5 }}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      className={`bg-gray-200 ${circle ? 'rounded-full' : 'rounded-lg'} ${className}`}
      style={{ width, height }}
    />
  );
};

export const SkeletonCard = () => (
  <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
    <SkeletonLoader width="60%" height="20px" />
    <SkeletonLoader width="40%" height="14px" />
    <SkeletonLoader width="80%" height="14px" />
  </div>
);

export default SkeletonLoader;
