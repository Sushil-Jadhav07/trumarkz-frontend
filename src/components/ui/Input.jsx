import React, { useState } from 'react';
import clsx from 'clsx';
import { Eye, EyeOff, Check } from 'lucide-react';

export const Input = ({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  success,
  disabled = false,
  className = '',
  icon: Icon,
  name,
  // Opt-in smaller variant for tight layouts (e.g. a wide multi-column admin
  // form) — every existing caller is unaffected since this defaults to false
  // and keeps the original size/spacing exactly as before.
  dense = false,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className={clsx('w-full', className)}>
      {label && (
        <label className={clsx('block font-medium text-brand-dark font-inter', dense ? 'text-xs mb-1' : 'text-sm mb-1.5')}>
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Icon size={18} />
          </div>
        )}
        <input
          type={inputType}
          name={name}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          placeholder={placeholder}
          className={clsx(
            'w-full rounded-xl border-2 font-inter transition-all duration-200 outline-none',
            dense ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm',
            Icon && 'pl-10',
            isPassword && 'pr-10',
            success && 'border-green-500 pr-10',
            error && 'border-red-500',
            !error && !success && isFocused && 'border-brand-blue ring-4 ring-brand-blue/10',
            !error && !success && !isFocused && 'border-brand-gray hover:border-gray-400',
            disabled && 'bg-gray-50 cursor-not-allowed'
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
        {success && !isPassword && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
            <Check size={18} />
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-red-500 font-inter">{error}</p>
      )}
    </div>
  );
};

export default Input;
