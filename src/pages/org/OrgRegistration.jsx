import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StepWizard } from '@/components/ui/StepWizard';
import { Card } from '@/components/ui/Card';
import { Building2, Mail, Phone, Lock, ArrowLeft, ArrowRight, ChevronDown } from 'lucide-react';
import { SERVICE_TYPE_OPTIONS } from '@/data/serviceTypeOptions';
import toast from 'react-hot-toast';

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
    humanSpaceId: '', // optional, only for orgs that already have a space
    productSpaceId: '', // optional, only for orgs that already have a space
    warrentySpaceId: '', // optional, only for orgs that already have a space
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

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

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Card className="p-6 sm:p-8">
          <StepWizard steps={['Registration', 'OTP Verification', 'Onboarding']} currentStep={0} />

          <h2 className="font-sora font-bold text-xl text-brand-dark text-center mb-1">
            Organization Registration
          </h2>
          <p className="text-sm text-gray-500 font-inter text-center mb-6">
            Create your organization account to get started
          </p>

          <form onSubmit={handleSubmit} autoComplete="on" className="space-y-4">
            <Input
              label="Organization Name"
              placeholder="Enter organization name"
              value={form.orgName}
              onChange={e => updateField('orgName', e.target.value)}
              error={errors.orgName}
              icon={Building2}
            />
            <Input
              label="Official Email Address"
              placeholder="Enter official email"
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

            <div>
              <label className="block text-sm font-medium text-brand-dark font-inter mb-1.5">
                What does your organization verify?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SERVICE_TYPE_OPTIONS.map(({ value, label, description, icon: Icon }) => {
                  const selected = form.serviceType === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => updateField('serviceType', value)}
                      className={`text-left rounded-xl border-2 p-4 transition-all duration-200 ${
                        selected ? 'border-brand-blue bg-brand-blue/5' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon size={20} className={selected ? 'text-brand-blue' : 'text-gray-400'} />
                      <p className="font-sora font-semibold text-sm text-brand-dark mt-2">{label}</p>
                      <p className="text-xs text-gray-500 font-inter mt-1 leading-relaxed">{description}</p>
                    </button>
                  );
                })}
              </div>
              {errors.serviceType && (
                <p className="text-xs text-red-500 font-inter mt-1.5">{errors.serviceType}</p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-dark font-inter"
            >
              <ChevronDown size={14} className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
              Advanced (optional)
            </button>

            {showAdvanced && (
              <>
                {!form.serviceType && (
                  <p className="text-xs text-gray-400 font-inter">
                    Select a verification type above to set an existing space ID.
                  </p>
                )}
                {form.serviceType === 'human' && (
                  <Input
                    label="Human Space ID (optional)"
                    placeholder="Leave blank unless your organization already has one"
                    value={form.humanSpaceId}
                    onChange={e => updateField('humanSpaceId', e.target.value)}
                  />
                )}
                {form.serviceType === 'product' && (
                  <>
                    <Input
                      label="Product Space ID (optional)"
                      placeholder="Leave blank unless your organization already has one"
                      value={form.productSpaceId}
                      onChange={e => updateField('productSpaceId', e.target.value)}
                    />
                    <Input
                      label="Warranty Space ID (optional)"
                      placeholder="Leave blank unless your organization already has one"
                      value={form.warrentySpaceId}
                      onChange={e => updateField('warrentySpaceId', e.target.value)}
                    />
                  </>
                )}
              </>
            )}

            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={submitting}>
              {submitting ? 'Sending OTP...' : 'Create Account & Send OTP'} <ArrowRight size={18} />
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => navigate('/login?type=organization')}
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

export default OrgRegistration;
