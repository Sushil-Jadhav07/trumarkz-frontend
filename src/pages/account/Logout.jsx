import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/ui/Logo';
import { ArrowRight, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';

// Blue waves along the lower half of the page, drawn in code (viewBox is the bottom 471px of a
// 1672x941 layout; it stretches to the page width).
const Waves = () => (
  <svg aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[50%] w-full" viewBox="0 0 1672 471" preserveAspectRatio="none" fill="none">
    <defs>
      <linearGradient id="lo-deep" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#3f7bf3" />
        <stop offset="0.45" stopColor="#1a5ff0" />
        <stop offset="1" stopColor="#0642cf" />
      </linearGradient>
      <linearGradient id="lo-light-left" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#bcd5fb" stopOpacity="0.95" />
        <stop offset="1" stopColor="#eaf2ff" stopOpacity="0.55" />
      </linearGradient>
      <linearGradient id="lo-light-right" x1="1" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#b3d0fb" stopOpacity="0.95" />
        <stop offset="1" stopColor="#eaf2ff" stopOpacity="0.5" />
      </linearGradient>
    </defs>
    {/* pale ribbons behind the deep wave */}
    <path d="M0 35 C 120 150, 300 235, 560 292 C 700 316, 800 320, 880 318 L880 312 C 800 311, 700 304, 640 296 C 330 268, 150 222, 0 170 Z" fill="url(#lo-light-left)" />
    <path d="M1672 10 C 1580 62, 1450 122, 1340 192 C 1200 277, 1040 308, 860 308 L880 306 C 1020 304, 1250 274, 1380 196 C 1500 126, 1600 98, 1672 104 Z" fill="url(#lo-light-right)" />
    <path d="M0 95 C 150 190, 330 255, 600 300 C 700 314, 780 318, 860 318 L860 306 C 700 300, 520 280, 380 250 C 220 215, 90 160, 0 120 Z" fill="#fff" fillOpacity="0.28" />
    {/* deep wave */}
    <path d="M0 170 C 150 222, 330 272, 700 303 C 780 310, 900 313, 1000 307 C 1250 291, 1420 200, 1672 110 L1672 471 L0 471 Z" fill="url(#lo-deep)" />
    {/* soft sheen shapes */}
    <path d="M60 330 L440 392 L250 471 L40 471 Z" fill="#fff" fillOpacity="0.06" />
    <path d="M1620 300 L1240 400 L1420 471 L1672 471 Z" fill="#fff" fillOpacity="0.07" />
    {/* bright edge */}
    <path d="M0 170 C 150 222, 330 272, 700 303 C 780 310, 900 313, 1000 307 C 1250 291, 1420 200, 1672 110" stroke="#fff" strokeOpacity="0.85" strokeWidth="1.6" />
    <path d="M0 186 C 150 236, 330 284, 700 313 C 780 319, 900 322, 1000 316 C 1250 300, 1420 212, 1672 126" stroke="#fff" strokeOpacity="0.22" strokeWidth="1" />
  </svg>
);

const Dots = ({ className }) => (
  <svg aria-hidden="true" className={`pointer-events-none absolute hidden h-[110px] w-[170px] sm:block ${className}`} viewBox="0 0 170 110" fill="#fff" fillOpacity="0.5">
    {Array.from({ length: 6 }).flatMap((_, row) => Array.from({ length: 10 }).map((__, col) => (
      <circle key={`${row}-${col}`} cx={4 + col * 18} cy={4 + row * 20} r={1.6 - col * 0.04} fillOpacity={0.6 - row * 0.07} />
    )))}
  </svg>
);

export const Logout = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  // React StrictMode runs effects twice in development; sign out (and toast) only once.
  const signedOut = useRef(false);
  useEffect(() => {
    if (signedOut.current) return;
    signedOut.current = true;
    logout().then(() => toast.success('You have been logged out'));
  }, [logout]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_80%_70%_at_50%_30%,#ffffff_0%,#f4f8fe_45%,#d7e6fc_100%)] p-4">
      <div className="absolute inset-x-0 top-6 flex justify-center sm:top-8"><Logo size="lg" showTagline /></div>
      <Waves />
      <Dots className="bottom-[20px] left-[16px]" />
      <Dots className="bottom-[20px] right-[16px]" />

      <motion.main
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-[420px] rounded-[22px] bg-white px-6 pb-8 pt-8 text-center shadow-[0_24px_60px_-28px_rgba(20,60,140,0.4)] sm:px-[36px]"
      >
        <span className="mx-auto mb-5 flex h-[62px] w-[62px] items-center justify-center rounded-2xl bg-[#e9f1fe] text-brand-blue">
          <LogOut size={31} strokeWidth={1.5} />
        </span>
        <h1 className="font-inter text-[24px] font-semibold leading-tight tracking-[-0.01em] text-[#0c1a4a]">Logged out successfully</h1>
        <p className="mt-3.5 text-sm leading-[1.8] text-[#55658a] font-inter">
          You’re now signed out of TruMarkZ.<br />Log in whenever you’re ready to continue.
        </p>
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#0a54e8] text-[15px] font-medium text-white shadow-[0_10px_22px_-12px_rgba(10,84,232,0.8)] transition-colors hover:bg-[#0848cc] font-inter"
        >
          Log in again <ArrowRight size={17} />
        </button>
        <p className="mt-5 text-sm text-[#55658a] font-inter">Thank you for choosing TruMarkZ.</p>
      </motion.main>

      <p className="absolute inset-x-0 bottom-[7%] z-10 text-center text-base font-medium tracking-wide text-white font-inter">Verify · Trust · Transform</p>
    </div>
  );
};

export default Logout;
