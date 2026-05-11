import React from 'react';
import { motion } from 'framer-motion';

export const PageHeader = ({ title, subtitle, action }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-sora font-bold text-2xl text-brand-dark">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 font-inter mt-1">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
    </motion.div>
  );
};

export default PageHeader;
