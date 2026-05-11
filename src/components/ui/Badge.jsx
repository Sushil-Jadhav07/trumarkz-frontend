import React from 'react';
import clsx from 'clsx';
import { Check, Clock, X, Loader2 } from 'lucide-react';

export const Badge = ({ status, children, className }) => {
  const variants = {
    verified: 'bg-green-500 text-white',
    pending: 'bg-orange-500 text-white',
    failed: 'bg-red-500 text-white',
    'in-progress': 'bg-brand-blue text-white',
    success: 'bg-green-500 text-white',
    warning: 'bg-orange-500 text-white',
    error: 'bg-red-500 text-white',
    info: 'bg-brand-blue text-white',
    default: 'bg-brand-gray text-brand-dark'
  };

  const icons = {
    verified: Check,
    success: Check,
    pending: Clock,
    warning: Clock,
    failed: X,
    error: X,
    'in-progress': Loader2,
    info: Loader2
  };

  const Icon = icons[status] || null;
  const variant = variants[status] || variants.default;

  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium font-inter', variant, className)}>
      {Icon && <Icon size={12} className={status === 'in-progress' || status === 'info' ? 'animate-spin' : ''} />}
      {children || status}
    </span>
  );
};

export default Badge;
