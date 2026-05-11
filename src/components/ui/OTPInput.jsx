import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

export const OTPInput = ({ length = 6, value = '', onChange, error }) => {
  const [otp, setOtp] = useState(value.split('').concat(Array(length).fill('')).slice(0, length));
  const inputs = useRef([]);

  useEffect(() => {
    const newOtp = value.split('').concat(Array(length).fill('')).slice(0, length);
    setOtp(newOtp);
  }, [value, length]);

  const handleChange = (index, e) => {
    const val = e.target.value;
    if (val.length > 1) return;
    if (!/^[0-9]*$/.test(val)) return;

    const newOtp = [...otp];
    newOtp[index] = val;
    setOtp(newOtp);
    onChange(newOtp.join(''));

    if (val && index < length - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    const newOtp = pasted.split('').concat(Array(length).fill('')).slice(0, length);
    setOtp(newOtp);
    onChange(newOtp.join(''));
    const focusIndex = Math.min(pasted.length, length - 1);
    inputs.current[focusIndex]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center">
      {otp.map((digit, index) => (
        <motion.div
          key={index}
          animate={digit ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 0.15 }}
        >
          <input
            ref={el => inputs.current[index] = el}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={e => handleChange(index, e)}
            onKeyDown={e => handleKeyDown(index, e)}
            onPaste={handlePaste}
            className={clsx(
              'w-12 h-14 text-center text-xl font-bold font-sora rounded-xl border-2 outline-none transition-all duration-200',
              digit ? 'border-brand-blue bg-brand-blue/5 text-brand-dark' : 'border-brand-gray text-brand-dark',
              error && 'border-red-500',
              'focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10'
            )}
          />
        </motion.div>
      ))}
    </div>
  );
};

export default OTPInput;
