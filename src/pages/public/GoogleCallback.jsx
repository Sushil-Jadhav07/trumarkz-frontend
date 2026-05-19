import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/ui/Logo';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import toast from 'react-hot-toast';

export const GoogleCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { googleAuth } = useAuth();
  const [status, setStatus] = useState('Processing your Google login...');

  useEffect(() => {
    const handleCallback = async () => {
      const googleToken =
        searchParams.get('code') ||
        searchParams.get('token') ||
        searchParams.get('credential') ||
        searchParams.get('id_token') ||
        searchParams.get('access_token');
      const error = searchParams.get('error');

      if (error) {
        toast.error('Google login was cancelled or failed.');
        navigate('/login');
        return;
      }

      if (!googleToken) {
        toast.error('Invalid callback. Please try again.');
        navigate('/login');
        return;
      }

      setStatus('Verifying your Google account...');
      const result = await googleAuth(googleToken);

      if (!result.success) {
        toast.error(result.error || 'Google authentication failed.');
        navigate('/login');
        return;
      }

      toast.success('Signed in with Google!');
      sessionStorage.removeItem('trumarkz_google_user_type');

      if (result.requiresOnboarding) {
        navigate('/onboarding', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    };

    handleCallback();
  }, []);

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

export default GoogleCallback;
