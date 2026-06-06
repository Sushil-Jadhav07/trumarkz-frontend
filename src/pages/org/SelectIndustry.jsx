import React, { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { HUMAN_VERIFICATION_STEPS, HUMAN_VERIFICATION_STEP_META } from '@/data/humanVerificationFlow';
import { useAuth } from '@/context/AuthContext';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { StepWizard } from '@/components/ui/StepWizard';
import { industries } from '@/data/mockData';
import {
  Check,
  ArrowRight,
  Truck,
  BriefcaseMedical,
  GraduationCap,
  Factory,
  ShieldCheck,
  Tractor,
  Package,
  Grid2X2
} from 'lucide-react';
import toast from 'react-hot-toast';

const industryIconMap = {
  transport: Truck,
  healthcare: BriefcaseMedical,
  education: GraduationCap,
  manufacturing: Factory,
  security: ShieldCheck,
  agriculture: Tractor,
  products: Package,
  others: Grid2X2
};

const industryDescriptions = {
  transport: 'Driver, fleet, and logistics credential checks.',
  healthcare: 'Staff, licence, and healthcare compliance checks.',
  education: 'Academic records, certificates, and institute proof.',
  manufacturing: 'Factory staff, plant, and compliance verification.',
  security: 'Guard identity, background, and clearance workflows.',
  agriculture: 'Farm, supplier, and origin verification records.',
  products: 'Product certificates, warranties, and batch records.',
  others: 'Custom verification workflows for your organisation.'
};

const normalizeValue = (value = '') =>
  String(value).trim().toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();

const INDUSTRY_MATCH_MAP = {
  transport: 'transport',
  logistics: 'transport',
  'transport logistics': 'transport',
  healthcare: 'healthcare',
  education: 'education',
  manufacturing: 'manufacturing',
  security: 'security',
  'security services': 'security',
  agriculture: 'agriculture',
  products: 'products',
  'products services': 'products',
  'product services': 'products',
  others: 'others',
  other: 'others',
};

const normalizeIndustrySelection = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return [value].filter(Boolean);
};

export const SelectIndustry = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedIndustry, setSelectedIndustry } = useApp();
  const selectedIndustries = useMemo(() => normalizeIndustrySelection(selectedIndustry), [selectedIndustry]);

  useEffect(() => {
    if (selectedIndustries.length > 0) return;

    const savedIndustries = Array.isArray(user?.industryType)
      ? user.industryType
      : (user?.industryType ? [user.industryType] : []);

    const matchedIndustries = savedIndustries
      .map((item) => {
        const normalized = normalizeValue(item);
        const matchedId =
          INDUSTRY_MATCH_MAP[normalized] ||
          industries.find((industry) => normalizeValue(industry.name) === normalized)?.id;
        return industries.find((industry) => industry.id === matchedId) || null;
      })
      .filter(Boolean)
      .filter((industry, index, list) => list.findIndex((item) => item.id === industry.id) === index);

    if (matchedIndustries.length > 0) {
      setSelectedIndustry(matchedIndustries);
    }
  }, [selectedIndustries.length, setSelectedIndustry, user?.industryType]);

  const selectedIndustryNames = selectedIndustries.map((industry) => industry.name);

  const toggleIndustry = (industry) => {
    const exists = selectedIndustries.some((item) => item.id === industry.id);
    if (exists) {
      const next = selectedIndustries.filter((item) => item.id !== industry.id);
      setSelectedIndustry(next.length > 0 ? next : null);
      return;
    }

    setSelectedIndustry([...selectedIndustries, industry]);
  };

  const handleContinue = () => {
    if (selectedIndustries.length === 0) {
      toast.error('Please select at least one industry');
      return;
    }
    toast.success(`${selectedIndustries.length} industry${selectedIndustries.length > 1 ? 'ies' : ''} selected`);
    navigate('/org/verifications');
  };

  return (
    <AuthLayout title="Select Industry">
      <div className="w-full mx-auto lg:max-w-none">
        <StepWizard
          steps={HUMAN_VERIFICATION_STEPS}
          currentStep={HUMAN_VERIFICATION_STEP_META.industry.currentStep}
        />
        <PageHeader
          title="Select Industry"
          subtitle={selectedIndustries.length > 0
            ? `${selectedIndustries.length} selected${selectedIndustryNames.length > 0 ? ` • ${selectedIndustryNames.join(', ')}` : ''}`
            : 'Choose one or more industries for your verification batch'}
        />

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {industries.map((industry, i) => {
            const isSelected = selectedIndustries.some((item) => item.id === industry.id);
            const Icon = industryIconMap[industry.id] || Grid2X2;
            return (
              <motion.div
                key={industry.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => toggleIndustry(industry)}
                className={`relative flex min-h-[132px] cursor-pointer flex-col items-center justify-center rounded-xl border bg-white p-4 text-center shadow-sm transition-all ${
                  isSelected
                    ? 'border-brand-blue shadow-md shadow-brand-blue/10'
                    : 'border-gray-100 hover:border-brand-blue/30 hover:shadow-md'
                }`}
              >
                <motion.div
                  initial={false}
                  animate={{ scale: isSelected ? 1.04 : 1 }}
                  className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl transition-all ${
                    isSelected
                      ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/20'
                      : 'bg-brand-blue/10 text-brand-blue'
                  }`}
                >
                  <Icon size={20} strokeWidth={2.1} />
                </motion.div>

                <p className="font-inter text-[15px] font-semibold leading-5 text-brand-dark">{industry.name}</p>
                <p className="mt-1.5 max-w-[180px] text-xs leading-5 text-gray-500">
                  {industryDescriptions[industry.id] || 'Verification workflow for this industry.'}
                </p>

                <motion.div
                  initial={false}
                  animate={{ scale: isSelected ? 1 : 0.85, opacity: isSelected ? 1 : 0 }}
                  className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-brand-blue text-white shadow-sm"
                >
                  <Check size={14} />
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
          
          <Button variant="primary" size="lg" className="w-full sm:w-auto" onClick={handleContinue} icon={ArrowRight}>
            Continue
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
};

export default SelectIndustry;
