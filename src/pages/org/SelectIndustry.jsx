import React, { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { authAPI, getApiError } from '@/services/api';
import { matchProfileIndustry } from '@/utils/industry';
import { useIndustryTypes, loadIndustryTypes } from '@/hooks/useIndustryTypes';
import { setBatchIndustry } from '@/utils/batchIndustry';
import {
  ArrowRight,
  BriefcaseMedical,
  Building2,
  Check,
  Cpu,
  Laptop,
  Package,
  Sparkles,
  Truck,
  Warehouse,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { batchOrigin } from '@/utils/batchOrigin';

const humanIconMap = {
  healthcare:     BriefcaseMedical,
  transportation: Truck,
  logistics:      Warehouse,
  it:             Laptop,
  real_estate:    Building2,
};

const productIconMap = {
  electronics_appliances: Cpu,
  beauty_cosmetics: Sparkles,
};

const humanDescriptions = {
  healthcare:     'Staff, licence, and healthcare compliance checks.',
  transportation: 'Driver credentials and vehicle verification.',
  logistics:      'Supply chain and courier staff verification.',
  it:             'Employee background and technical credential checks.',
  real_estate:    'Agent, property, and compliance verification.',
};

const productDescriptions = {
  electronics_appliances: 'Device warranty and serial number certificates.',
  beauty_cosmetics: 'Authenticity certificates with lab reports and batch proofs.',
};

export const SelectIndustry = () => {
  const navigate = useNavigate();
  const { user, updateUserProfile, refreshUser } = useAuth();
  const [saving, setSaving] = React.useState(false);
  const { batchEntityType, selectedIndustry, setSelectedIndustry } = useApp();

  const isProduct     = batchEntityType === 'product';
  const { items: industries } = useIndustryTypes(isProduct ? 'product' : 'human');
  const iconMap      = isProduct ? productIconMap    : humanIconMap;
  const descMap       = isProduct ? productDescriptions : humanDescriptions;

  const selectedIndustries = useMemo(() => {
    if (!selectedIndustry) return [];
    return Array.isArray(selectedIndustry)
      ? selectedIndustry.filter(Boolean)
      : [selectedIndustry].filter(Boolean);
  }, [selectedIndustry]);

  // Pre-select from user profile on first visit
  useEffect(() => {
    if (selectedIndustries.length > 0) return;
    const matched = matchProfileIndustry(user?.industryType, industries);
    if (matched) setSelectedIndustry([matched]);
  }, [selectedIndustries.length, setSelectedIndustry, user?.industryType, industries]);

  const toggleIndustry = (industry) => {
    const exists = selectedIndustries.some((item) => item.id === industry.id);
    setSelectedIndustry(exists ? null : [industry]);
  };

  // This page is only reached when the profile has no industry the batch flow supports. The
  // choice is remembered for this user so it is asked once. The profile industry is validated
  // against the organization list, so it is only updated too when the choice is on that list.
  const handleContinue = async () => {
    if (selectedIndustries.length === 0) {
      toast.error('Please select an industry');
      return;
    }
    const name = selectedIndustries[0].name;
    if (!isProduct) {
      setBatchIndustry(user?.id, name);
      if (name !== user?.industryType) {
        setSaving(true);
        try {
          const { items: orgIndustries } = await loadIndustryTypes('organization');
          const onOrgList = orgIndustries.find((item) => item.name.toLowerCase() === name.toLowerCase());
          if (onOrgList) {
            await authAPI.updateOwnProfile({ industryType: onOrgList.name });
            updateUserProfile?.({ industryType: onOrgList.name });
            await refreshUser?.();
          }
        } catch (err) {
          // The batch goes ahead with the choice made here; the profile just keeps its old value.
          toast.error(`${getApiError(err, 'Could not save your industry')}. You can set it in Profile.`);
        } finally {
          setSaving(false);
        }
      }
    }
    navigate('/org/verifications', { replace: true });
  };

  const selectedNames = selectedIndustries.map((ind) => ind.name).join(', ');

  return (
    <AuthLayout title="Select Industry">
      <div className="w-full mx-auto lg:max-w-none">
        <PageHeader
          title="Select Industry"
          subtitle={
            selectedIndustries.length > 0
              ? `Selected • ${selectedNames}`
              : 'Pick your organization’s industry — you only need to do this once. You can change it any time in Profile.'
          }
          action={
            <button
              type="button"
              onClick={() => navigate(batchOrigin())}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors font-inter"
            >
              ← Back
            </button>
          }
        />

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 ">
          {industries.map((industry, i) => {
            const isSelected = selectedIndustries.some((item) => item.id === industry.id);
            const Icon = iconMap[industry.id] || Package;
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

                <p className="font-inter text-[15px] font-semibold leading-5 text-brand-dark">
                  {industry.name}
                </p>
                <p className="mt-1.5 max-w-[180px] text-xs leading-5 text-gray-500">
                  {descMap[industry.id] || 'Verification workflow for this industry.'}
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

        <div className="mt-8 flex flex-col-reverse sm:flex-row justify-end gap-3">
          <Button
            variant="outline"
            size="lg"
            className="w-full sm:w-auto"
            onClick={() => navigate(batchOrigin())}
          >
            Back
          </Button>
          <Button
            variant="primary"
            size="lg"
            className="w-full sm:w-auto"
            onClick={handleContinue}
            icon={ArrowRight}
            loading={saving}
          >
            Continue
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
};

export default SelectIndustry;
