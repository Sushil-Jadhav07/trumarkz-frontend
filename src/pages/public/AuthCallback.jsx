import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Logo } from '@/components/ui/Logo';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';

const getBooleanParam = (searchParams, key) => {
  const value = searchParams.get(key);
  if (value == null) return undefined;
  return value === 'true' || value === '1';
};

const steps = ['Completing sign in…', 'Loading your account…', 'Almost ready…'];

export const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { completeOAuthRedirect } = useAuth();
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStepIndex(1), 1200);
    const t2 = setTimeout(() => setStepIndex(2), 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    const finishAuth = async () => {
      const token =
        searchParams.get('token') ||
        searchParams.get('access_token') ||
        searchParams.get('jwt');
      const requiresOnboarding = getBooleanParam(searchParams, 'requires_onboarding');
      const userType =
        searchParams.get('user_type') ||
        searchParams.get('type') ||
        sessionStorage.getItem('trumarkz_google_user_type') ||
        '';
      const email  = searchParams.get('email')   || '';
      const userId = searchParams.get('user_id') || '';
      const error  = searchParams.get('error');
      const message = searchParams.get('message');

      if (error) {
        window.history.replaceState(null, '', '/auth/callback');
        navigate(`/auth/error?message=${encodeURIComponent(message || error)}`, { replace: true });
        return;
      }

      if (!token) {
        window.history.replaceState(null, '', '/auth/callback');
        navigate('/login?error=auth_failed', { replace: true });
        return;
      }

      const result = await completeOAuthRedirect(token, { requiresOnboarding, userType, email, userId });

      if (!result.success) {
        window.history.replaceState(null, '', '/auth/callback');
        navigate(`/auth/error?message=${encodeURIComponent(result.error || 'Authentication failed')}`, { replace: true });
        return;
      }

      toast.success('Signed in with Google!');
      sessionStorage.removeItem('trumarkz_google_user_type');
      window.history.replaceState(null, '', '/auth/callback');

      if (result.userType === 'super-admin')     navigate('/admin/dashboard',      { replace: true });
      else if (result.requiresOnboarding)        navigate('/org/onboarding',       { replace: true });
      else if (result.userType === 'individual') navigate('/individual/dashboard', { replace: true });
      else                                       navigate('/dashboard',             { replace: true });
    };

    finishAuth();
  }, [completeOAuthRedirect, navigate, searchParams]);

  return (
    <div className="fixed inset-0 bg-brand-dark flex flex-col items-center justify-center overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="w-[500px] h-[500px] rounded-full bg-brand-blue/20 blur-[120px]"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28, delay: 0.1 }}
        className="relative z-10 flex flex-col items-center gap-6"
      >
        <Logo size="lg" dark />

        <LoadingSpinner size="md" color="white" />

        <AnimatePresence mode="wait">
          <motion.p
            key={stepIndex}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="text-gray-400 font-inter text-sm text-center"
          >
            {steps[stepIndex]}
          </motion.p>
        </AnimatePresence>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5">
          {steps.map((_, i) => (
            <motion.div
              key={i}
              animate={{ opacity: i <= stepIndex ? 1 : 0.25, scale: i === stepIndex ? 1 : 0.75 }}
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              className="w-1.5 h-1.5 rounded-full bg-brand-blue"
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default AuthCallback;
