import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import {
  Building2, FileText, MapPin, ArrowRight, CheckCircle, Briefcase,
  ChevronDown, ChevronUp, Info, PackageCheck, UserCheck
} from 'lucide-react';
import toast from 'react-hot-toast';

const INDUSTRY_OPTIONS = [
  'Technology', 'Healthcare', 'Education', 'Finance & Banking',
  'Manufacturing', 'Retail & E-commerce', 'Construction',
  'Logistics & Transportation', 'Hospitality', 'Agriculture',
  'Energy & Utilities', 'Media & Entertainment', 'Legal & Compliance',
  'Non-Profit', 'Government', 'Other',
];

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
    industryType: [],
    gstin: '',
    businessRegNumber: '',
    addressLine1: '',
    addressLine2: '',
    addressLine3: '',
    useCases: {},
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [industryOpen, setIndustryOpen] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (form.industryType.length === 0) newErrors.industryType = 'Please select at least one industry type';
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

  const toggleIndustry = (industry) => {
    setForm(prev => ({
      ...prev,
      industryType: prev.industryType.includes(industry)
        ? prev.industryType.filter(i => i !== industry)
        : [...prev.industryType, industry],
    }));
    if (errors.industryType) setErrors(prev => ({ ...prev, industryType: '' }));
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
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
        <Card className="p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-blue/10">
              <Building2 size={28} className="text-brand-blue" />
            </div>
            <h2 className="font-sora font-bold text-2xl text-brand-dark mb-2">
              Complete Your Profile
            </h2>
            <p className="text-sm text-gray-500 font-inter">
              Set up your organization to start using TruMarkZ
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ── Industry Type ── */}
            <div>
              <label className="block text-sm font-medium text-brand-dark font-inter mb-1.5">
                Industry Type <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIndustryOpen(o => !o)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-inter transition-colors ${
                  errors.industryType ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white hover:border-brand-blue'
                }`}
              >
                <span className={form.industryType.length ? 'text-brand-dark' : 'text-gray-400'}>
                  {form.industryType.length
                    ? `${form.industryType.length} selected: ${form.industryType.slice(0, 2).join(', ')}${form.industryType.length > 2 ? '…' : ''}`
                    : 'Select industry type(s)'}
                </span>
                {industryOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </button>
              {errors.industryType && <p className="text-xs text-red-500 mt-1 font-inter">{errors.industryType}</p>}

              {industryOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1 border border-gray-200 rounded-xl bg-white shadow-lg overflow-hidden max-h-52 overflow-y-auto"
                >
                  {INDUSTRY_OPTIONS.map(industry => (
                    <button
                      key={industry}
                      type="button"
                      onClick={() => toggleIndustry(industry)}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 text-sm font-inter text-brand-dark transition-colors"
                    >
                      <span>{industry}</span>
                      {form.industryType.includes(industry) && <CheckCircle size={16} className="text-brand-blue" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>

            {/* ── GSTIN ── */}
            <Input
              label="GSTIN *"
              placeholder="e.g. 27ABCDE1234F1Z5"
              value={form.gstin}
              onChange={e => updateField('gstin', e.target.value.toUpperCase())}
              error={errors.gstin}
              icon={FileText}
            />

            {/* ── Business Reg No ── */}
            <Input
              label="Business Registration Number *"
              placeholder="e.g. U74999MH2020PTC123456"
              value={form.businessRegNumber}
              onChange={e => updateField('businessRegNumber', e.target.value)}
              error={errors.businessRegNumber}
              icon={Briefcase}
            />

            {/* ── Address ── */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-brand-dark font-inter">
                Registered Address <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Address Line 1 (Building, Street)"
                value={form.addressLine1}
                onChange={e => updateField('addressLine1', e.target.value)}
                error={errors.addressLine1}
                icon={MapPin}
              />
              <Input
                placeholder="Address Line 2 (Area, Locality)"
                value={form.addressLine2}
                onChange={e => updateField('addressLine2', e.target.value)}
                error={errors.addressLine2}
              />
              <Input
                placeholder="Address Line 3 (City, State, PIN)"
                value={form.addressLine3}
                onChange={e => updateField('addressLine3', e.target.value)}
                error={errors.addressLine3}
              />
            </div>

            {/* ── Use Cases ── */}
            <div>
              <label className="block text-sm font-medium text-brand-dark font-inter mb-1.5">
                Use Cases <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {USE_CASE_OPTIONS.map(uc => {
                  const Icon = uc.icon;
                  const selected = Boolean(form.useCases[uc.key]);
                  return (
                    <button
                      key={uc.key}
                      type="button"
                      onClick={() => toggleUseCase(uc)}
                      className={`group flex min-h-[116px] items-start gap-3 rounded-2xl border p-4 text-left transition-all ${
                        selected
                          ? 'border-brand-blue bg-brand-blue/5 shadow-sm ring-1 ring-brand-blue/15'
                          : errors.useCases
                            ? 'border-red-200 bg-red-50/40 hover:border-red-300'
                            : 'border-gray-200 bg-white hover:border-brand-blue/50 hover:shadow-sm'
                      }`}
                    >
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                        selected ? 'bg-brand-blue text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-brand-blue/10 group-hover:text-brand-blue'
                      }`}>
                        <Icon size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-start justify-between gap-2">
                          <p className={`font-sora text-sm font-semibold leading-snug ${selected ? 'text-brand-blue' : 'text-brand-dark'}`}>
                            {uc.label}
                          </p>
                          {selected
                            ? <CheckCircle size={17} className="mt-0.5 shrink-0 text-brand-blue" />
                            : <span className="mt-0.5 h-4 w-4 shrink-0 rounded border-2 border-gray-300 bg-white" />
                          }
                        </div>
                        <p className="text-xs leading-relaxed text-gray-500 font-inter">{uc.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              {errors.useCases && <p className="text-xs text-red-500 mt-1.5 font-inter">{errors.useCases}</p>}
            </div>

            {/* Info note */}
            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-xl text-xs text-blue-700 font-inter">
              <Info size={14} className="mt-0.5 shrink-0 text-blue-500" />
              <span>Your organization details will be reviewed for compliance. You can update this information from your profile settings.</span>
            </div>

            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={submitting}>
              {submitting ? 'Completing Setup...' : 'Complete Setup'} <ArrowRight size={18} />
            </Button>
          </form>
        </Card>
      </motion.div>
    </div>
  );
};

export default OrgOnboarding;
