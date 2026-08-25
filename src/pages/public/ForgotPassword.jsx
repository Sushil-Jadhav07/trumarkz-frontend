import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { ArrowLeft, ArrowRight, Mail } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Logo } from '@/components/ui/Logo';

export const ForgotPassword = () => {
  const navigate = useNavigate();
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const value = email.trim();
    if (!value) { setError('Email is required'); return; }
    if (!/\S+@\S+\.\S+/.test(value)) { setError('Invalid email address'); return; }

    setSubmitting(true);
    const result = await forgotPassword(value);
    setSubmitting(false);

    if (!result.success) {
      setError(result.error || 'Could not send reset OTP. Please try again.');
      toast.error(result.error || 'Could not send reset OTP');
      return;
    }

    sessionStorage.setItem('trumarkz_reset_email', value);
    toast.success(result.message || 'Reset OTP sent to your email');
    navigate('/reset-password');
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Card className="p-6 sm:p-8">
          <div className="mb-6 flex justify-center"><Logo size="md" /></div>
          <h1 className="font-sora font-bold text-xl text-brand-dark text-center mb-1">Forgot Password</h1>
          <p className="text-sm text-gray-500 font-inter text-center mb-6">
            Enter your email to receive a reset OTP.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              name="email"
              autoComplete="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              error={error}
              icon={Mail}
            />
            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={submitting}>
              {submitting ? 'Sending OTP...' : 'Send Reset OTP'} <ArrowRight size={18} />
            </Button>
          </form>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="mt-4 mx-auto flex items-center gap-1 text-sm text-brand-blue font-inter hover:underline"
          >
            <ArrowLeft size={14} /> Back to Login
          </button>
        </Card>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
