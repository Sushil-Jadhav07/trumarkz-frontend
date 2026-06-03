import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/ui/Logo';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

const getBooleanParam = (searchParams, key) => {
  const value = searchParams.get(key);
  if (value == null) return undefined;
  return value === 'true' || value === '1';
};

export const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { completeOAuthRedirect } = useAuth();

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
      const email = searchParams.get('email') || '';
      const userId = searchParams.get('user_id') || '';
      const error = searchParams.get('error');
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

      toast.success('Signed in with Google');
      sessionStorage.removeItem('trumarkz_google_user_type');
      window.history.replaceState(null, '', '/auth/callback');

      if (result.userType === 'super-admin') navigate('/admin/dashboard', { replace: true });
      else if (result.requiresOnboarding) navigate('/org/onboarding', { replace: true });
      else if (result.userType === 'individual') navigate('/individual/dashboard', { replace: true });
      else navigate('/dashboard', { replace: true });
    };

    finishAuth();
  }, [completeOAuthRedirect, navigate, searchParams]);

  return (
    <div className="fixed inset-0 bg-brand-dark flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-4"
      >
        <Logo size="lg" dark />
        <LoadingSpinner size="md" color="white" />
        <p className="text-sm text-gray-300 font-inter">Completing sign in...</p>
      </motion.div>
    </div>
  );
};

export default AuthCallback;
