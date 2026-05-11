import React from 'react';
import { motion } from 'framer-motion';

export const ProgressBar = ({ progress, color = 'blue', height = 'h-3', showLabel = true, className = '' }) => {
  const colors = {
    blue: 'bg-brand-blue',
    green: 'bg-green-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500'
  };

  return (
    <div className={`w-full ${className}`}>
      <div className={`w-full ${height} bg-gray-200 rounded-full overflow-hidden`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={`${height} ${colors[color]} rounded-full`}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between mt-1.5">
          <span className="text-xs text-gray-500 font-inter">Progress</span>
          <span className="text-xs font-semibold text-brand-dark font-inter">{progress}%</span>
        </div>
      )}
    </div>
  );
};

export default ProgressBar;
