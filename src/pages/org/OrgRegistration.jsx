import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { HeroPanel, AuthField, AuthStepper, AuthTopBar } from '@/components/auth/AuthShell';
import { Building2, Mail, Phone, Lock, ArrowLeft, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { SERVICE_TYPE_OPTIONS } from '@/data/serviceTypeOptions';
import toast from 'react-hot-toast';

const STEPS = ['Registration', 'OTP verification', 'Onboarding'];

const EyeToggle = ({ shown, onToggle, label }) => (
  <button
    type="button"
    onClick={onToggle}
    aria-label={shown ? `Hide ${label}` : `Show ${label}`}
    aria-pressed={shown}
    className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[#5b6a85] hover:text-brand-dark"
  >
    {shown ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
  </button>
);

export const OrgRegistration = () => {
  const navigate = useNavigate();
  const { registerOrg } = useAuth();

  const [form, setForm] = useState({
    orgName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    serviceType: '', // 'human' | 'product'
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!form.orgName.trim()) newErrors.orgName = 'Organization name is required';
    if (!form.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email.trim())) newErrors.email = 'Invalid email address';
    if (!form.phoneNumber.trim()) newErrors.phoneNumber = 'Phone number is required';
    else if (!/^\+?\d{7,15}$/.test(form.phoneNumber.replace(/\s/g, '')))
      newErrors.phoneNumber = 'Enter a valid phone number';
    if (!form.password) newErrors.password = 'Password is required';
    else if (form.password.length < 8) newErrors.password = 'Minimum 8 characters';
    if (form.confirmPassword !== form.password) newErrors.confirmPassword = 'Passwords do not match';
    if (!form.serviceType) newErrors.serviceType = 'Select what your organization verifies';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || submitting) return;
    setSubmitting(true);
    const result = await registerOrg(form);
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
  const bind = (field) => ({ value: form[field], onChange: (e) => updateField(field, e.target.value), error: errors[field] });

  return (
    <div className="flex h-[100dvh] gap-5 overflow-hidden bg-white p-3 sm:p-5">
      <HeroPanel />

      <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-y-auto px-4 sm:px-8">
        <AuthTopBar backLabel="Back to login" onBack={() => navigate('/login?type=organization')} />

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto my-auto w-full max-w-[740px] pb-3"
        >
          <AuthStepper steps={STEPS} current={0} />

          <h1 className="mt-4 font-inter text-[26px] font-semibold leading-tight tracking-[-0.01em] text-brand-dark">Organization registration</h1>
          <p className="mt-1 text-[13px] text-[#5b6a85] font-inter">Create your organization account to get started.</p>

          <form onSubmit={handleSubmit} autoComplete="on" noValidate className="mt-4 space-y-3.5">
            <AuthField
              id="org-name" label="Organization name" icon={Building2} placeholder="Enter organization name"
              autoComplete="organization" {...bind('orgName')}
            />
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <AuthField
                id="org-email" label="Official email address" icon={Mail} type="email" placeholder="you@company.com"
                name="email" autoComplete="email" {...bind('email')}
              />
              <AuthField
                id="org-phone" label="Phone number" icon={Phone} type="tel" placeholder="+91 9876543210"
                name="tel" autoComplete="tel" {...bind('phoneNumber')}
              />
              <AuthField
                id="org-password" label="Password" icon={Lock} type={showPassword ? 'text' : 'password'} placeholder="Create password"
                name="password" autoComplete="new-password" hint="Minimum 8 characters" {...bind('password')}
                trailing={<EyeToggle shown={showPassword} onToggle={() => setShowPassword((v) => !v)} label="password" />}
              />
              <AuthField
                id="org-confirm" label="Confirm password" icon={Lock} type={showConfirm ? 'text' : 'password'} placeholder="Confirm password"
                name="confirmPassword" autoComplete="new-password" {...bind('confirmPassword')}
                trailing={<EyeToggle shown={showConfirm} onToggle={() => setShowConfirm((v) => !v)} label="confirm password" />}
              />
            </div>

            <fieldset>
              <legend className="mb-1.5 text-[13px] font-medium text-brand-dark font-inter">What does your organization verify?</legend>
              <div role="radiogroup" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {SERVICE_TYPE_OPTIONS.map(({ value, label, description, icon: Icon }) => {
                  const selected = form.serviceType === value;
                  return (
                    <label
                      key={value}
                      className={`relative flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-blue/30 ${
                        selected ? 'border-2 border-brand-blue bg-[#f1f6fe]' : 'border-[#dfe6f1] bg-white hover:border-[#c5d1e4]'
                      }`}
                    >
                      <input
                        type="radio" name="service-type" value={value} checked={selected}
                        onChange={() => updateField('serviceType', value)} className="sr-only"
                      />
                      <Icon size={22} strokeWidth={1.5} className="mt-0.5 shrink-0 text-brand-blue" />
                      <span className="min-w-0 flex-1 pr-6">
                        <span className="block text-sm font-semibold text-brand-dark font-inter">{label}</span>
                        <span className="mt-0.5 block text-xs leading-snug text-[#5b6a85] font-inter">{description}</span>
                      </span>
                      <span className={`absolute right-3 top-3 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 ${selected ? 'border-brand-blue' : 'border-[#c5d1e4]'}`}>
                        {selected && <span className="h-2 w-2 rounded-full bg-brand-blue" />}
                      </span>
                    </label>
                  );
                })}
              </div>
              {errors.serviceType && <p className="mt-1.5 text-xs text-red-500 font-inter">{errors.serviceType}</p>}
            </fieldset>

            <button
              type="submit"
              disabled={submitting}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-blue text-sm font-semibold text-white font-inter transition-colors hover:bg-brand-blue-hover disabled:opacity-70"
            >
              {submitting ? 'Sending OTP…' : 'Create account & send OTP'} <ArrowRight size={16} />
            </button>
            <p className="text-center text-xs leading-relaxed text-[#5b6a85] font-inter">
              By creating an account, you agree to the{' '}
              <Link to="/terms-of-service" className="font-medium text-brand-blue hover:underline">Terms of Service</Link>{' '}
              and acknowledge the{' '}
              <Link to="/privacy-policy" className="font-medium text-brand-blue hover:underline">Privacy Policy</Link>.
            </p>
          </form>

          <div className="mt-3 border-t border-[#e1e7f0] pt-3 text-center text-[13px] text-[#5b6a85] font-inter">
            Already have an account?{' '}
            <button type="button" onClick={() => navigate('/login?type=organization')} className="font-semibold text-brand-blue hover:underline">Sign in</button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default OrgRegistration;
