import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Logo } from '@/components/ui/Logo';

export const AuthError = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const message = searchParams.get('message') || 'Something went wrong while signing in.';

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-sm p-6 text-center">
        <div className="mb-6 flex justify-center">
          <Logo size="md" />
        </div>
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50">
          <AlertCircle size={24} className="text-red-500" />
        </div>
        <h1 className="font-sora text-xl font-bold text-brand-dark mb-2">Authentication Error</h1>
        <p className="text-sm text-gray-500 font-inter mb-6">{message}</p>
        <Button variant="primary" size="md" className="w-full" onClick={() => navigate('/login')}>
          <ArrowLeft size={16} /> Back to Login
        </Button>
      </Card>
    </div>
  );
};

export default AuthError;
