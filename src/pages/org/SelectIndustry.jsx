import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { StepWizard } from '@/components/ui/StepWizard';
import { HUMAN_VERIFICATION_STEPS } from '@/data/humanVerificationFlow';
import { industries } from '@/data/mockData';
import { authAPI } from '@/services/api';
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

const industryAliases = {
  info: 'others',
  it: 'others',
};

export const SelectIndustry = () => {
  const navigate = useNavigate();
  const { selectedIndustry: _si, toggleIndustry, setSelectedIndustry } = useApp() || {};
  const selectedIndustry = Array.isArray(_si) ? _si : [];
  const { user } = useAuth() || {};
  const [preselecting, setPreselecting] = useState(false);

  // Pre-select from API on first visit (only when nothing is already selected)
  useEffect(() => {
    if (!user?.id || selectedIndustry.length > 0) return;
    let mounted = true;
    setPreselecting(true);
    authAPI.getOrgIndustryType(user.id)
      .then(({ data }) => {
        if (!mounted) return;
        const rawValue =
          typeof data === 'string'
            ? data
            : (Array.isArray(data?.industry_type) ? data.industry_type[0] : data?.industry_type);
        const raw = typeof rawValue === 'string' ? rawValue.toLowerCase().trim() : null;
        if (!raw) return;
        const normalized = industryAliases[raw] || raw;
        const match = industries.find(
          (ind) => ind.id === normalized || ind.name.toLowerCase().includes(normalized)
        );
        if (match) setSelectedIndustry([match]);
      })
      .catch(() => {})
      .finally(() => { if (mounted) setPreselecting(false); });
    return () => { mounted = false; };
  }, [user?.id]);

  const handleContinue = () => {
    if (selectedIndustry.length === 0) {
      toast.error('Please select at least one industry');
      return;
    }
    toast.success(`${selectedIndustry.length > 1 ? `${selectedIndustry.length} industries` : selectedIndustry[0].name} selected`);
    navigate('/org/verifications');
  };

  return (
    <AuthLayout title="Select Industry">
      <div className="w-full mx-auto lg:max-w-none">
        <div className="mb-8 rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_-46px_rgba(15,23,42,0.22)]">
          <StepWizard steps={HUMAN_VERIFICATION_STEPS} currentStep={0} />
        </div>

        <div className="flex items-center justify-between mb-1">
          <PageHeader
            title="Select Industry"
            subtitle="Choose one or more industries for your verification batch"
          />
          {selectedIndustry.length > 0 && (
            <motion.span
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              className="shrink-0 text-xs font-semibold font-inter bg-brand-blue text-white px-3 py-1.5 rounded-full"
            >
              {selectedIndustry.length} selected
            </motion.span>
          )}
        </div>

        {preselecting && (
          <p className="text-xs text-gray-400 font-inter mb-4 flex items-center gap-1.5">
            <svg className="animate-spin w-3 h-3 text-brand-blue" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Loading your current industry…
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {industries.map((industry, i) => {
            const isSelected = selectedIndustry.some((s) => s.id === industry.id);
            const Icon = industryIconMap[industry.id] || Grid2X2;
            return (
              <motion.div
                key={industry.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => toggleIndustry(industry)}
                className={`relative flex min-h-[170px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 bg-white p-6 text-center shadow-sm transition-all ${
                  isSelected
                    ? 'border-brand-blue shadow-md shadow-brand-blue/10'
                    : 'border-gray-100 hover:border-brand-blue/30 hover:shadow-md'
                }`}
              >
                <motion.div
                  initial={false}
                  animate={{ scale: isSelected ? 1.06 : 1 }}
                  className={`mb-4 flex h-16 w-16 items-center justify-center rounded-2xl transition-all ${
                    isSelected
                      ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/25'
                      : 'bg-brand-blue/10 text-brand-blue'
                  }`}
                >
                  <Icon size={30} strokeWidth={2.2} />
                </motion.div>

                <p className="font-inter text-lg font-semibold text-brand-dark">{industry.name}</p>
                <p className="mt-2 max-w-[300px] text-sm leading-6 text-gray-500">
                  {industryDescriptions[industry.id] || 'Verification workflow for this industry.'}
                </p>

                <motion.div
                  initial={false}
                  animate={{ scale: isSelected ? 1 : 0.85, opacity: isSelected ? 1 : 0 }}
                  className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-brand-blue text-white shadow-sm"
                >
                  <Check size={16} />
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        {/* Selected summary strip */}
        {selectedIndustry.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 flex flex-wrap gap-2 p-4 bg-brand-blue/5 border border-brand-blue/20 rounded-xl"
          >
            <span className="text-xs text-gray-500 font-inter self-center mr-1">Selected:</span>
            {selectedIndustry.map((ind) => (
              <button
                key={ind.id}
                onClick={() => toggleIndustry(ind)}
                className="flex items-center gap-1.5 bg-brand-blue text-white text-xs font-inter font-medium px-2.5 py-1 rounded-full hover:bg-brand-blue/80 transition-colors"
              >
                {ind.name}
                <span className="opacity-70 text-[10px]">✕</span>
              </button>
            ))}
          </motion.div>
        )}

        <div className="mt-6 flex justify-end">
          <Button
            variant="primary"
            size="lg"
            className="w-full sm:w-auto"
            onClick={handleContinue}
            icon={ArrowRight}
            disabled={selectedIndustry.length === 0}
          >
            Continue{selectedIndustry.length > 1 ? ` (${selectedIndustry.length})` : ''}
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
};

export default SelectIndustry;
