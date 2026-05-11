import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/ui/Logo';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export const SplashScreen = () => {
  const navigate = useNavigate();
  const { isAuthenticated, role, loading } = useAuth();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) { clearInterval(interval); return 100; }
        return prev + 4;
      });
    }, 100);

    // Wait for AuthContext to finish restoring session, then decide where to go
    const timer = setTimeout(() => {
      if (!loading) {
        if (isAuthenticated) {
          // Send back to their dashboard if already logged in
          if (role === 'individual') navigate('/individual/dashboard', { replace: true });
          else if (role === 'super-admin') navigate('/admin/dashboard', { replace: true });
          else navigate('/org/dashboard', { replace: true });
        } else {
          navigate('/login', { replace: true });
        }
      }
    }, 2800);

    return () => { clearTimeout(timer); clearInterval(interval); };
  }, [navigate, isAuthenticated, role, loading]);

  return (
    <div className="fixed inset-0 bg-brand-dark flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[600px] h-[600px] rounded-full bg-brand-blue/20 blur-[120px]" />
      </div>

      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="relative z-10 flex flex-col items-center"
      >
        <Logo size="xl" dark showTagline />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="relative z-10 mt-12"
      >
        <LoadingSpinner size="md" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="relative z-10 mt-8 w-48"
      >
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-brand-blue rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
        <p className="text-center text-xs text-gray-500 font-inter mt-2">{progress}%</p>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="relative z-10 mt-6 text-sm text-gray-500 font-inter"
      >
        Initializing trust infrastructure...
      </motion.p>
    </div>
  );
};

export default SplashScreen;
