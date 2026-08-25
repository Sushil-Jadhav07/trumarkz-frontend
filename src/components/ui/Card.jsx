import React from 'react';
import clsx from 'clsx';

export const Card = ({ children, className, hover = false, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-white rounded-xl border border-gray-100 shadow-sm',
        hover && 'hover:shadow-md transition-shadow duration-200 cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
};

export default Card;
