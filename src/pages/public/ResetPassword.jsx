import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { ArrowLeft, ArrowRight, Lock, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Logo } from '@/components/ui/Logo';

export const ResetPassword = () => {
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  const [form, setForm] = useState({
    email: sessionStorage.getItem('trumarkz_reset_email') || '',
    otp: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (errors[field] || errors.form) {
      setErrors((current) => ({ ...current, [field]: '', form: '' }));
    }
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.email.trim()) nextErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email.trim())) nextErrors.email = 'Invalid email address';
    if (!form.otp.trim()) nextErrors.otp = 'OTP is required';
    if (!form.password) nextErrors.password = 'New password is required';
    else if (form.password.length < 8) nextErrors.password = 'Minimum 8 characters';
    if (form.confirmPassword !== form.password) nextErrors.confirmPassword = 'Passwords do not match';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || submitting) return;

    setSubmitting(true);
    const result = await resetPassword(form.email.trim(), form.otp.trim(), form.password);
    setSubmitting(false);

    if (!result.success) {
      setErrors({ form: result.error || 'Reset failed. Please try again.' });
      toast.error(result.error || 'Reset failed');
      return;
    }

    sessionStorage.removeItem('trumarkz_reset_email');
    toast.success('Password reset successfully');
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Card className="p-6 sm:p-8">
          <div className="mb-6 flex justify-center"><Logo size="md" /></div>
          <h1 className="font-sora font-bold text-xl text-brand-dark text-center mb-1">Reset Password</h1>
          <p className="text-sm text-gray-500 font-inter text-center mb-6">
            Enter the OTP sent to your email and choose a new password.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Email Address" name="email" autoComplete="email" placeholder="Enter your email"
              value={form.email} onChange={(e) => updateField('email', e.target.value)} error={errors.email} icon={Mail} />
            <Input label="OTP" name="one-time-code" inputMode="numeric" autoComplete="one-time-code" placeholder="Enter OTP"
              value={form.otp} onChange={(e) => updateField('otp', e.target.value)} error={errors.otp} icon={ShieldCheck} />
            <Input label="New Password" type="password" autoComplete="new-password" placeholder="Create a new password"
              value={form.password} onChange={(e) => updateField('password', e.target.value)} error={errors.password} icon={Lock} />
            <Input label="Confirm Password" type="password" autoComplete="new-password" placeholder="Confirm new password"
              value={form.confirmPassword} onChange={(e) => updateField('confirmPassword', e.target.value)} error={errors.confirmPassword} icon={Lock} />
            {errors.form && <p className="text-sm text-red-500 font-inter">{errors.form}</p>}
            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={submitting}>
              {submitting ? 'Resetting...' : 'Reset Password'} <ArrowRight size={18} />
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

export default ResetPassword;
