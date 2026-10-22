import React from 'react';

export const SkeletonLoader = ({ width = '100%', height = '20px', circle = false, className = '' }) => {
  return (
    <div
      aria-hidden="true"
      className={`max-w-full shrink-0 motion-safe:animate-pulse bg-slate-200/80 ${circle ? 'rounded-full' : 'rounded-lg'} ${className}`}
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
