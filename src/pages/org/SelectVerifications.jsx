import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { HUMAN_VERIFICATION_STEPS, HUMAN_VERIFICATION_STEP_META } from '@/data/humanVerificationFlow';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StepWizard } from '@/components/ui/StepWizard';
import { verificationTypes } from '@/data/mockData';
import {
  Check,
  ArrowRight,
  Shield,
  MapPin,
  GraduationCap,
  Briefcase,
  CalendarDays,
  Sparkles,
  ShieldAlert,
  Car,
  FlaskConical,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const iconMap = {
  police: Shield,
  dob: CalendarDays,
  education: GraduationCap,
  skills: Sparkles,
  criminal_record: ShieldAlert,
  address: MapPin,
  driving_license: Car,
  experience: Briefcase,
  drug_test: FlaskConical,
  police_verification: ShieldCheck,
  company: Building2,
};

export const SelectVerifications = () => {
  const navigate = useNavigate();
  const { selectedVerifications, setSelectedVerifications } = useApp();

  const toggleVerification = (id) => {
    setSelectedVerifications((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]
    );
  };

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
        <StepWizard
          steps={HUMAN_VERIFICATION_STEPS}
          currentStep={HUMAN_VERIFICATION_STEP_META.verifications.currentStep}
        />
        <PageHeader
          title="Select Verifications"
          subtitle={`${selectedVerifications.length} selected`}
        />

        <div>
          <Card className="overflow-hidden border border-blue-100 p-4 shadow-[0_18px_48px_-40px_rgba(37,99,235,0.35)] sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-inter text-xs font-medium uppercase tracking-[0.14em] text-brand-blue/70">Verification catalog</p>
                <h3 className="mt-1 font-sora text-lg font-semibold text-brand-dark">Choose checks for this batch</h3>
              </div>
              <div className="rounded-xl bg-blue-50 px-3 py-2 text-right">
                <p className="font-inter text-[11px] uppercase tracking-[0.14em] text-brand-blue/65">Available</p>
                <p className="font-sora text-lg font-semibold text-brand-dark">{verificationTypes.length}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {verificationTypes.map((verification, index) => {
                const isSelected = selectedVerifications.includes(verification.id);
                const Icon = iconMap[verification.id] || Shield;

                return (
                  <motion.button
                    key={verification.id}
                    type="button"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => toggleVerification(verification.id)}
                    className={clsx(
                      'relative flex min-h-[180px] flex-col rounded-2xl border p-4 text-left transition-all',
                      isSelected
                        ? 'border-brand-blue bg-brand-blue/[0.06] shadow-[0_16px_34px_-26px_rgba(37,99,235,0.75)]'
                        : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/30'
                    )}
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className={clsx(
                        'flex h-10 w-10 items-center justify-center rounded-xl',
                        isSelected ? 'bg-brand-blue text-white' : 'bg-slate-100 text-slate-600'
                      )}>
                        <Icon size={18} />
                      </div>
                      <div className={clsx(
                        'flex h-6 w-6 items-center justify-center rounded-full border transition-colors',
                        isSelected ? 'border-brand-blue bg-brand-blue text-white' : 'border-slate-300 bg-white text-transparent'
                      )}>
                        <Check size={13} />
                      </div>
                    </div>

                    <div className="flex-1">
                      <h4 className="font-inter text-sm font-semibold text-brand-dark">{verification.name}</h4>
                      <p className="mt-2 font-inter text-xs leading-5 text-slate-500">
                        {verification.type === 'api'
                          ? `Auto flow via ${verification.apiLabel}`
                          : `Manual review in ${verification.turnaround}`}
                      </p>
                    </div>

                    <div className="mt-4 space-y-2">
                      <span
                        className={clsx(
                          'inline-flex rounded-full px-2.5 py-1 font-inter text-[11px] font-medium',
                          verification.type === 'api'
                            ? 'bg-blue-50 text-brand-blue'
                            : 'bg-slate-100 text-slate-600'
                        )}
                      >
                        {verification.type === 'api' ? 'Auto check' : 'Manual check'}
                      </span>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-inter text-[11px] uppercase tracking-[0.12em] text-slate-400">
                          Per record
                        </span>
                        <span className="font-sora text-base font-semibold text-brand-dark">
                          Rs. {verification.price}
                        </span>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="mt-6 flex justify-end">
          <Button variant="primary" size="lg" onClick={handleContinue} icon={ArrowRight}>
            Continue
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
};

export default SelectVerifications;
