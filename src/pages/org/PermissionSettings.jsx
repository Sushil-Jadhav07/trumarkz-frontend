import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { HUMAN_VERIFICATION_STEPS, HUMAN_VERIFICATION_STEP_META, HUMAN_VERIFICATION_STEP_ROUTES } from '@/data/humanVerificationFlow';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { StepWizard } from '@/components/ui/StepWizard';
import { ArrowRight, Check, Globe2, Fingerprint } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const options = [
  {
    id: 'public',
    icon: Globe2,
    title: 'Open Search',
    subtitle: 'Public registry access',
    description: 'Let anyone search and view these credentials without requesting permission from the person.',
    details: ['Anyone with a report link can view the reports', 'Email is optional for bulk uploads'],
  },
  {
    id: 'private',
    icon: Fingerprint,
    title: 'Permission Required',
    subtitle: 'Holder approves who views reports',
    description: 'Verification starts straight away. Outside your organization, people must get the person’s approval before they can view their certificate reports.',
    details: ['A valid email is required for each person, so they can approve access requests', 'Verifier assignment and emails are never delayed'],
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

        <div role="group" aria-label="Credential permission settings" className="grid gap-4 md:grid-cols-2 lg:gap-5">
          {options.map((option, index) => {
            const isSelected = selectedPermission === option.id;
            const Icon = option.icon;

            return (
              <motion.button
                key={option.id}
                type="button"
                aria-pressed={isSelected}
                aria-describedby={`permission-${option.id}-description`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                onClick={() => setSelectedPermission(option.id)}
                className={clsx(
                  'group flex h-full flex-col rounded-2xl border p-5 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-4 focus-visible:ring-offset-brand-bg sm:p-6',
                  isSelected
                    ? 'border-brand-blue bg-blue-50/40 ring-1 ring-inset ring-brand-blue/10'
                    : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50/50'
                )}
              >
                <div className="flex items-start gap-3.5">
                  <div className={clsx(
                    'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-colors',
                    isSelected ? 'bg-brand-blue text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-brand-blue'
                  )}>
                    <Icon size={23} strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <h3 className="font-sora text-base font-semibold leading-6 tracking-tight text-brand-dark sm:text-lg">{option.title}</h3>
                    <p className="mt-1 font-inter text-xs leading-5 text-slate-500">{option.subtitle}</p>
                  </div>
                  <div className={clsx(
                    'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors',
                    isSelected ? 'border-brand-blue bg-brand-blue text-white' : 'border-slate-300 bg-white group-hover:border-blue-300'
                  )} aria-hidden="true">
                    {isSelected && <Check size={14} strokeWidth={2.5} />}
                  </div>
                </div>
                <p id={`permission-${option.id}-description`} className="mt-5 flex-1 font-inter text-sm leading-6 text-slate-600">{option.description}</p>
                <div className={clsx('mt-5 space-y-2.5 border-t pt-4', isSelected ? 'border-blue-100' : 'border-slate-100')}>
                  {option.details.map((detail) => <div key={detail} className="flex items-start gap-2.5 font-inter text-xs leading-5 text-slate-600"><Check size={14} strokeWidth={2} className={clsx('mt-0.5 shrink-0', isSelected ? 'text-brand-blue' : 'text-slate-400')} /><span>{detail}</span></div>)}
                </div>
              </motion.button>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col-reverse sm:flex-row justify-end gap-3">
          <Button variant="outline" size="lg" className="w-full sm:w-auto" onClick={() => navigate('/org/verifications')}>
            Back
          </Button>
          <Button variant="primary" size="lg" className="w-full sm:w-auto" onClick={handleContinue} icon={ArrowRight}>
            Continue
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
};

export default PermissionSettings;
