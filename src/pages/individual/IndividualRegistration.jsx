import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StepWizard } from '@/components/ui/StepWizard';
import { Card } from '@/components/ui/Card';
import { User, Mail, Phone, Lock, ArrowLeft, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export const IndividualRegistration = () => {
  const navigate = useNavigate();
  const { registerIndividual } = useAuth();

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!form.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!form.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email.trim())) newErrors.email = 'Invalid email';
    if (!form.phoneNumber.trim()) newErrors.phoneNumber = 'Phone number is required';
    else if (!/^\+?\d{7,15}$/.test(form.phoneNumber.replace(/\s/g, '')))
      newErrors.phoneNumber = 'Enter a valid phone number';
    if (!form.password) newErrors.password = 'Password is required';
    else if (form.password.length < 8) newErrors.password = 'Minimum 8 characters';
    if (form.confirmPassword !== form.password) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || submitting) return;
    setSubmitting(true);
    const result = await registerIndividual(form);
    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error || 'Registration failed');
      return;
    }

    toast.success('OTP sent to your email');
    navigate('/verify-otp');
  };

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Card className="p-6 sm:p-8">
          <StepWizard steps={['Registration', 'OTP', 'Welcome']} currentStep={0} />

          <h2 className="font-sora font-bold text-xl text-brand-dark text-center mb-1">
            Individual Registration
          </h2>
          <p className="text-sm text-gray-500 font-inter text-center mb-6">
            Create your account to build your verified profile
          </p>

          <form onSubmit={handleSubmit} autoComplete="on" className="space-y-4">
            <Input
              label="Full Name"
              placeholder="Enter your full name"
              name="name"
              autoComplete="name"
              value={form.fullName}
              onChange={e => updateField('fullName', e.target.value)}
              error={errors.fullName}
              icon={User}
            />
            <Input
              label="Email Address"
              placeholder="Enter your email"
              name="email"
              autoComplete="email"
              value={form.email}
              onChange={e => updateField('email', e.target.value)}
              error={errors.email}
              icon={Mail}
            />
            <Input
              label="Phone Number"
              placeholder="+91 9876543210"
              name="tel"
              autoComplete="tel"
              value={form.phoneNumber}
              onChange={e => updateField('phoneNumber', e.target.value)}
              error={errors.phoneNumber}
              icon={Phone}
            />
            <Input
              label="Password"
              type="password"
              placeholder="Create password (min 8 characters)"
              name="password"
              autoComplete="new-password"
              value={form.password}
              onChange={e => updateField('password', e.target.value)}
              error={errors.password}
              icon={Lock}
            />
            <Input
              label="Confirm Password"
              type="password"
              placeholder="Confirm password"
              name="confirmPassword"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={e => updateField('confirmPassword', e.target.value)}
              error={errors.confirmPassword}
              icon={Lock}
            />

            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={submitting}>
              {submitting ? 'Sending OTP...' : 'Create Account & Send OTP'} <ArrowRight size={18} />
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => navigate('/login?type=individual')}
              className="text-sm text-brand-blue font-inter hover:underline inline-flex items-center gap-1"
            >
              <ArrowLeft size={14} /> Back to Login
            </button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default IndividualRegistration;
