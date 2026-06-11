import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { HUMAN_VERIFICATION_STEPS, HUMAN_VERIFICATION_STEP_META, HUMAN_VERIFICATION_STEP_ROUTES } from '@/data/humanVerificationFlow';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { StepWizard } from '@/components/ui/StepWizard';
import { ArrowRight, Globe2, Fingerprint } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const options = [
  {
    id: 'public',
    icon: Globe2,
    title: 'Open Search',
    subtitle: 'Public searchable registry access',
    description: 'Anyone can search and view this credential without asking the worker.',
  },
  {
    id: 'private',
    icon: Fingerprint,
    title: 'Permission Required',
    subtitle: 'Consent-based access before search',
    description: 'The worker must approve access before anyone can search this credential.',
  }
];

export const PermissionSettings = () => {
  const navigate = useNavigate();
  const { selectedPermission, setSelectedPermission } = useApp();

  const handleContinue = () => {
    if (!selectedPermission) {
      toast.error('Please select a visibility setting');
      return;
    }

    toast.success(`${selectedPermission === 'public' ? 'Open search' : 'Permission-based access'} selected`);
    navigate('/org/template');
  };

  return (
    <AuthLayout title="Permission Settings">
      <div className="w-full mx-auto lg:max-w-none">
        <StepWizard
          steps={HUMAN_VERIFICATION_STEPS}
          currentStep={HUMAN_VERIFICATION_STEP_META.permissions.currentStep}
          stepRoutes={HUMAN_VERIFICATION_STEP_ROUTES}
        />
        <PageHeader
          title="Permission Settings"
          subtitle="Choose how these credentials can be searched and viewed."
        />

        <div className="grid gap-4 md:grid-cols-2">
          {options.map((option, index) => {
            const isSelected = selectedPermission === option.id;
            const Icon = option.icon;

            return (
              <motion.button
                key={option.id}
                type="button"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                onClick={() => setSelectedPermission(option.id)}
                className={clsx(
                  'flex min-h-[160px] flex-col rounded-2xl border p-4 text-left transition-all',
                  isSelected
                    ? 'border-brand-blue bg-brand-blue/[0.05] shadow-[0_16px_30px_-28px_rgba(37,99,235,0.55)]'
                    : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/20'
                )}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className={clsx(
                    'flex h-10 w-10 items-center justify-center rounded-xl',
                    isSelected ? 'bg-brand-blue text-white' : 'bg-slate-100 text-slate-500'
                  )}>
                    <Icon size={18} strokeWidth={2.2} />
                  </div>

                  <div className={clsx(
                    'flex h-6 w-6 items-center justify-center rounded-full border-2',
                    isSelected ? 'border-brand-blue bg-brand-blue' : 'border-slate-300 bg-white'
                  )}>
                    {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                  </div>
                </div>

                <div className="flex-1">
                  <h3 className="font-sora text-lg font-semibold text-brand-dark">{option.title}</h3>
                  <p className="mt-1.5 font-inter text-xs font-medium text-brand-blue/70">{option.subtitle}</p>
                  <p className="mt-3 max-w-[34ch] font-inter text-sm leading-6 text-slate-600">{option.description}</p>
                </div>
              </motion.button>
            );
          })}
        </div>

        <div className="mt-8 flex justify-end">
          <Button variant="primary" size="lg" onClick={handleContinue} icon={ArrowRight}>
            Continue
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
};

export default PermissionSettings;
