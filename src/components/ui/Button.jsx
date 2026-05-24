import clsx from 'clsx';
import { motion } from 'framer-motion';

const LoadingDots = () => (
  <span className="flex items-center gap-[3px]">
    {[0, 1, 2].map((i) => (
      <motion.span
        key={i}
        className="w-[5px] h-[5px] rounded-full bg-current block"
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1, ease: 'easeInOut' }}
      />
    ))}
  </span>
);

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  onClick,
  type = 'button',
  icon: Icon
}) => {
  const variants = {
    primary:   'bg-brand-blue text-white hover:bg-brand-blue-hover shadow-md',
    secondary: 'bg-brand-dark text-white hover:bg-gray-800',
    outline:   'border-2 border-brand-blue text-brand-blue hover:bg-brand-blue hover:text-white',
    ghost:     'text-brand-blue hover:bg-brand-blue/10',
    danger:    'bg-red-500 text-white hover:bg-red-600',
    success:   'bg-green-500 text-white hover:bg-green-600',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm rounded-lg',
    md: 'px-5 py-2.5 text-sm rounded-xl',
    lg: 'px-8 py-3.5 text-base rounded-xl font-semibold',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-inter transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {loading ? <LoadingDots /> : Icon ? <Icon size={size === 'sm' ? 16 : 20} /> : null}
      {children}
    </button>
  );
};

export default Button;
