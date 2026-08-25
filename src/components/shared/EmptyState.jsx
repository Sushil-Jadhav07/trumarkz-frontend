import React from 'react';
import { motion } from 'framer-motion';

export const EmptyState = ({ icon: Icon, title, description, action }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="p-4 bg-gray-100 rounded-full mb-4">
        {Icon && <Icon size={32} className="text-gray-400" />}
      </div>
      <h3 className="font-sora font-semibold text-lg text-brand-dark mb-1">{title}</h3>
      <p className="text-sm text-gray-500 font-inter max-w-xs mb-4">{description}</p>
      {action}
    </motion.div>
  );
};

export default EmptyState;
