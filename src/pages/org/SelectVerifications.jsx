import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StepWizard } from '@/components/ui/StepWizard';
import { HUMAN_VERIFICATION_STEPS } from '@/data/humanVerificationFlow';
import { verificationTypes } from '@/data/mockData';
import {
  Check,
  ArrowRight,
  Home,
  ChevronRight,
  GraduationCap,
  Briefcase,
  Building2,
  CalendarClock,
  FileSearch,
  HeartPulse,
  IdCard,
  Shield,
  ShieldAlert,
  Siren,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const iconMap = {
  police: Siren,
  dob: CalendarClock,
  education: GraduationCap,
  skills: Sparkles,
  criminal_record: ShieldAlert,
  address: Home,
  driving_license: IdCard,
  experience: Briefcase,
  drug_test: HeartPulse,
  police_verification: Shield,
  company: Building2,
};

export const SelectVerifications = () => {
  const navigate = useNavigate();
  const { selectedVerifications, setSelectedVerifications, selectedIndustry } = useApp();

  const selectedIndustries = Array.isArray(selectedIndustry)
    ? selectedIndustry
    : selectedIndustry
      ? [selectedIndustry]
      : [];

  const toggleVerification = (id) =>
    setSelectedVerifications((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]
    );

  const totalCost = selectedVerifications.reduce((sum, id) => {
    const item = verificationTypes.find((check) => check.id === id);
    return sum + (item?.price || 0);
  }, 0);

  const handleContinue = () => {
    if (selectedVerifications.length === 0) {
      toast.error('Select at least one verification');
      return;
    }
    navigate('/org/permissions');
  };

  return (
    <AuthLayout title="Select Verifications">
      <div className="w-full mx-auto lg:max-w-none">
        <div className="mb-8 rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_-46px_rgba(15,23,42,0.22)]">
          <StepWizard steps={HUMAN_VERIFICATION_STEPS} currentStep={1} />
        </div>

        <div className="flex items-start justify-between gap-4 mb-1">
          <PageHeader
            title="Select Verification Checks"
            subtitle={selectedVerifications.length > 0 ? `${selectedVerifications.length} selected` : 'Choose the checks to include in this batch'}
          />
          {selectedVerifications.length > 0 && (
            <motion.span
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              className="shrink-0 rounded-full bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white"
            >
              {selectedVerifications.length} selected
            </motion.span>
          )}
        </div>

        {selectedIndustries.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-brand-blue/20 bg-brand-blue/5 p-4"
          >
            <span className="mr-1 self-center text-xs text-gray-500">Industry:</span>
            {selectedIndustries.map((industry) => (
              <button
                key={industry.id}
                type="button"
                onClick={() => navigate('/org/industry')}
                className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-blue/85"
              >
                <span>{industry.name}</span>
                <ChevronRight size={12} />
              </button>
            ))}
            <button
              type="button"
              onClick={() => navigate('/org/industry')}
              className="inline-flex items-center gap-1.5 rounded-full border border-brand-blue/25 bg-white px-3 py-1.5 text-xs font-medium text-brand-blue transition-colors hover:bg-brand-blue/5"
            >
              Edit selection
              <ChevronRight size={12} />
            </button>
          </motion.div>
        )}

        <Card className="p-3 sm:p-6">
          <div className="space-y-3">
            {verificationTypes.map((check, index) => {
              const isSelected = selectedVerifications.includes(check.id);
              const Icon = iconMap[check.id] || FileSearch;

              return (
                <motion.div
                  key={check.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => toggleVerification(check.id)}
                  className={clsx(
                    'flex items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl cursor-pointer border-2 transition-all',
                    isSelected ? 'border-brand-blue bg-brand-blue/5' : 'border-gray-100 hover:border-gray-200'
                  )}
                >
                  <div
                    className={clsx(
                      'w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors shrink-0',
                      isSelected ? 'bg-brand-blue border-brand-blue' : 'border-gray-300'
                    )}
                  >
                    {isSelected && <Check size={14} className="text-white" />}
                  </div>

                  <div className="p-2 bg-gray-100 rounded-lg shrink-0">
                    <Icon size={18} className="text-gray-600" />
                  </div>

                  <div className="flex-1 pr-2">
                    <span className="block text-sm font-medium text-brand-dark font-inter leading-snug">{check.name}</span>
                    <span className="block mt-1 text-xs text-gray-500 font-inter">{check.description}</span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 sm:gap-2 ml-auto shrink-0">
                    {check.type === 'api' ? (
                      <span className="text-[11px] sm:text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-inter font-medium whitespace-nowrap">
                        Auto · {check.apiLabel}
                      </span>
                    ) : (
                      <span className="text-[11px] sm:text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-inter font-medium whitespace-nowrap">
                        Manual · {check.turnaround}
                      </span>
                    )}
                    <span className="text-sm font-semibold text-brand-dark font-inter whitespace-nowrap">Rs. {check.price}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Card>

        {selectedVerifications.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-5 mt-4 border-2 border-brand-blue/20 bg-brand-blue/5">
              <h4 className="font-sora font-semibold text-brand-dark mb-3">Cost per user</h4>
              <div className="space-y-2 mb-3">
                {selectedVerifications.map((id) => {
                  const item = verificationTypes.find((check) => check.id === id);
                  return item ? (
                    <div key={id} className="flex justify-between text-sm font-inter">
                      <span className="text-gray-600">{item.name}</span>
                      <span className="font-medium text-brand-dark">Rs. {item.price}</span>
                    </div>
                  ) : null;
                })}
              </div>
              <div className="border-t border-brand-blue/20 pt-3 flex justify-between">
                <span className="font-sora font-semibold text-brand-dark">Total per record</span>
                <span className="font-sora font-bold text-brand-blue text-lg">Rs. {totalCost}</span>
              </div>
              <p className="text-xs text-gray-400 font-inter mt-2">
                * You will be charged this amount x number of records when the batch is submitted
              </p>
            </Card>
          </motion.div>
        )}

        <div className="mt-8 flex justify-end">
          <Button variant="primary" size="lg" onClick={handleContinue} icon={ArrowRight}>
            Continue
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
};

export default SelectVerifications;
