import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Logo } from '@/components/ui/Logo';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';

const getBooleanParam = (searchParams, key) => {
  const value = searchParams.get(key);
  if (value == null) return undefined;
  return value === 'true' || value === '1';
};

export const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { completeOAuthRedirect } = useAuth();
  const [status, setStatus] = useState('Completing sign in...');

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

      setStatus('Loading your account...');
      const result = await completeOAuthRedirect(token, {
        requiresOnboarding,
        userType,
        email,
        userId,
      });

      if (!result.success) {
        window.history.replaceState(null, '', '/auth/callback');
        navigate(`/auth/error?message=${encodeURIComponent(result.error || 'Authentication failed')}`, { replace: true });
        return;
      }

      toast.success('Signed in with Google!');
      sessionStorage.removeItem('trumarkz_google_user_type');
      window.history.replaceState(null, '', '/auth/callback');

      if (result.userType === 'super-admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (result.requiresOnboarding) {
        navigate('/onboarding', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    };

    finishAuth();
  }, [completeOAuthRedirect, navigate, searchParams]);

  return (
    <div className="fixed inset-0 bg-brand-dark flex flex-col items-center justify-center gap-6">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[400px] h-[400px] rounded-full bg-brand-blue/20 blur-[100px]" />
      </div>
      <div className="relative z-10 flex flex-col items-center gap-4">
        <Logo size="lg" dark />
        <LoadingSpinner size="md" />
        <p className="text-gray-400 font-inter text-sm">{status}</p>
      </div>
    </div>
  );
};

export default AuthCallback;
