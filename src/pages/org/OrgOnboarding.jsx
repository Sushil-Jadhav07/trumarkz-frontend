import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { HeroPanel, AuthField, AuthStepper, AuthTopBar } from '@/components/auth/AuthShell';
import { IndustrySelect } from '@/components/shared/IndustrySelect';
import { FileText, MapPin, ArrowRight, Briefcase, Check, Info, PackageCheck, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const STEPS = ['Registration', 'OTP verification', 'Onboarding'];

// Backend now stores industry_type as a single string, not a list.
const USE_CASE_OPTIONS = [
  {
    key: 'primary',
    label: 'Product verification',
    description: 'Authenticate product records and batches',
    icon: PackageCheck,
  },
  {
    key: 'secondary',
    label: 'Human verification',
    description: 'Verify employee or individual credentials',
    icon: UserCheck,
  },
];

export const OrgOnboarding = () => {
  const navigate = useNavigate();
  const { completeOnboarding } = useAuth();

  const [form, setForm] = useState({
    industryType: '',
    gstin: '',
    businessRegNumber: '',
    addressLine1: '',
    addressLine2: '',
    addressLine3: '',
    useCases: {},
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!form.industryType.trim()) newErrors.industryType = 'Please select an industry type';
    if (!form.gstin.trim()) newErrors.gstin = 'GSTIN is required';
    else if (form.gstin.trim().length !== 15) newErrors.gstin = 'GSTIN must be exactly 15 characters';
    if (!form.businessRegNumber.trim()) newErrors.businessRegNumber = 'Business registration number is required';
    if (!form.addressLine1.trim()) newErrors.addressLine1 = 'Address line 1 is required';
    if (!form.addressLine2.trim()) newErrors.addressLine2 = 'Address line 2 is required';
    if (!form.addressLine3.trim()) newErrors.addressLine3 = 'Address line 3 is required';
    if (Object.keys(form.useCases).length === 0) newErrors.useCases = 'Select at least one use case';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || submitting) return;
    setSubmitting(true);
    const result = await completeOnboarding(form);
    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error || 'Onboarding failed. Please try again.');
      return;
    }

    toast.success('Organization profile complete! Welcome to TruMarkZ.');
    navigate('/dashboard');
  };

  const toggleUseCase = (option) => {
    setForm(prev => {
      const updated = { ...prev.useCases };
      if (updated[option.key]) delete updated[option.key];
      else updated[option.key] = true;
      return { ...prev, useCases: updated };
    });
    if (errors.useCases) setErrors(prev => ({ ...prev, useCases: '' }));
  };

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  return (
    <div className="flex h-[100dvh] gap-5 overflow-hidden bg-white p-3 sm:p-5">
      <HeroPanel />

      <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-y-auto px-4 sm:px-8">
        <AuthTopBar />

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto my-auto w-full max-w-[740px] pb-3"
        >
          <AuthStepper steps={STEPS} current={2} />

          <h1 className="mt-4 font-inter text-[26px] font-semibold leading-tight tracking-[-0.01em] text-brand-dark">Complete your profile</h1>
          <p className="mt-1 text-[13px] text-[#5b6a85] font-inter">Set up your organization to start using TruMarkZ.</p>

          <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-3.5">
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <IndustrySelect
                label="Industry type"
                value={form.industryType}
                onChange={(v) => updateField('industryType', v)}
                error={errors.industryType}
                placeholder="Select an industry type"
              />
              <AuthField
                id="ob-gstin" label="GSTIN" icon={FileText} placeholder="e.g. 27ABCDE1234F1Z5" maxLength={15}
                value={form.gstin} onChange={(e) => updateField('gstin', e.target.value.toUpperCase())} error={errors.gstin}
              />
            </div>

            <AuthField
              id="ob-reg" label="Business registration number" icon={Briefcase} placeholder="e.g. U74999MH2020PTC123456"
              value={form.businessRegNumber} onChange={(e) => updateField('businessRegNumber', e.target.value)} error={errors.businessRegNumber}
            />

            <fieldset>
              <legend className="mb-1.5 text-[13px] font-medium text-brand-dark font-inter">Registered address</legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <AuthField
                  id="ob-a1" icon={MapPin} placeholder="Building, street" aria-label="Address line 1"
                  value={form.addressLine1} onChange={(e) => updateField('addressLine1', e.target.value)} error={errors.addressLine1}
                />
                <AuthField
                  id="ob-a2" icon={MapPin} placeholder="Area, locality" aria-label="Address line 2"
                  value={form.addressLine2} onChange={(e) => updateField('addressLine2', e.target.value)} error={errors.addressLine2}
                />
                <AuthField
                  id="ob-a3" icon={MapPin} placeholder="City, state, PIN" aria-label="Address line 3"
                  value={form.addressLine3} onChange={(e) => updateField('addressLine3', e.target.value)} error={errors.addressLine3}
                />
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-1.5 text-[13px] font-medium text-brand-dark font-inter">What will you use TruMarkZ for?</legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {USE_CASE_OPTIONS.map((uc) => {
                  const Icon = uc.icon;
                  const selected = Boolean(form.useCases[uc.key]);
                  return (
                    <label
                      key={uc.key}
                      className={`relative flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-blue/30 ${
                        selected
                          ? 'border-2 border-brand-blue bg-[#f1f6fe]'
                          : errors.useCases ? 'border-red-300 bg-red-50/30' : 'border-[#dfe6f1] bg-white hover:border-[#c5d1e4]'
                      }`}
                    >
                      <input type="checkbox" checked={selected} onChange={() => toggleUseCase(uc)} className="sr-only" />
                      <Icon size={22} strokeWidth={1.5} className="mt-0.5 shrink-0 text-brand-blue" />
                      <span className="min-w-0 flex-1 pr-6">
                        <span className="block text-sm font-semibold text-brand-dark font-inter">{uc.label}</span>
                        <span className="mt-0.5 block text-xs leading-snug text-[#5b6a85] font-inter">{uc.description}</span>
                      </span>
                      <span className={`absolute right-3 top-3 flex h-[18px] w-[18px] items-center justify-center rounded border-2 ${selected ? 'border-brand-blue bg-brand-blue text-white' : 'border-[#c5d1e4] text-transparent'}`}>
                        <Check size={12} strokeWidth={3} />
                      </span>
                    </label>
                  );
                })}
              </div>
              {errors.useCases && <p className="mt-1.5 text-xs text-red-500 font-inter">{errors.useCases}</p>}
            </fieldset>

            <div className="flex items-start gap-2 rounded-lg bg-[#eef4fd] px-3 py-2 text-xs text-[#2f5fb8] font-inter">
              <Info size={14} className="mt-0.5 shrink-0" />
              <span>Your organization details will be reviewed for compliance. You can update them later from your profile.</span>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-blue text-sm font-semibold text-white font-inter transition-colors hover:bg-brand-blue-hover disabled:opacity-70"
            >
              {submitting ? 'Completing setup…' : 'Complete setup'} <ArrowRight size={16} />
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default OrgOnboarding;
