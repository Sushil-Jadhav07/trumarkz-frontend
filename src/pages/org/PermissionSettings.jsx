import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Globe, Info, Lock, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { StepWizard } from '@/components/ui/StepWizard';
import { useApp } from '@/context/AppContext';
import { HUMAN_VERIFICATION_STEPS } from '@/data/humanVerificationFlow';

const options = [
  {
    id: 'public',
    icon: Globe,
    title: 'Public Searchable',
    eyebrow: 'Registry access',
    description:
      'Results will be visible in the public registry for instant verification by third parties.',
    note: 'Works well for frontline roles, staffing operations, and high-trust public checks.',
    accent: 'blue',
  },
  {
    id: 'private',
    icon: Shield,
    title: 'Permission-Based Access',
    eyebrow: 'Consent required',
    description:
      'Requires explicit consent via WhatsApp or email from the individual before data access.',
    note: 'Better for private candidate records, sensitive checks, and restricted hiring workflows.',
    accent: 'slate',
  },
];

const accentStyles = {
  blue: {
    card: 'border-brand-blue bg-white shadow-[0_24px_60px_-34px_rgba(37,99,235,0.32)]',
    icon: 'bg-blue-50 text-brand-blue ring-1 ring-blue-100',
    radio: 'border-brand-blue bg-brand-blue text-white',
    glow: 'from-blue-100/80 via-blue-50/50 to-transparent',
  },
  slate: {
    card: 'border-slate-300 bg-white shadow-[0_24px_60px_-36px_rgba(15,23,42,0.20)]',
    icon: 'bg-slate-50 text-slate-700 ring-1 ring-slate-200',
    radio: 'border-slate-500 bg-slate-700 text-white',
    glow: 'from-slate-100/80 via-slate-50/40 to-transparent',
  },
};

export const PermissionSettings = () => {
  const navigate = useNavigate();
  const { credentialVisibility, setCredentialVisibility } = useApp();
  const permission = credentialVisibility || 'public';

  const handleContinue = () => {
    if (!permission) {
      toast.error('Please select a visibility setting');
      return;
    }

    toast.success(permission === 'public' ? 'Public searchable selected' : 'Permission-based access selected');
    navigate('/org/template');
  };

  return (
    <AuthLayout title="Permissions">
      <div className="mx-auto w-full max-w-[1380px]">
        <div className="mb-10 rounded-[32px] border border-slate-200/80 bg-white/95 p-5 shadow-[0_30px_80px_-44px_rgba(15,23,42,0.20)] backdrop-blur">
          <StepWizard steps={HUMAN_VERIFICATION_STEPS} currentStep={1} />
        </div>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            {options.map((option, index) => {
              const isSelected = permission === option.id;
              const Icon = option.icon;
              const style = accentStyles[option.accent];

              return (
                <motion.button
                  key={option.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08, duration: 0.26 }}
                  onClick={() => setCredentialVisibility(option.id)}
                  className={clsx(
                    'group relative w-full overflow-hidden rounded-[32px] border p-6 text-left transition-all duration-300 sm:p-7',
                    isSelected
                      ? style.card
                      : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_24px_60px_-42px_rgba(15,23,42,0.20)]'
                  )}
                >
                  <div className={clsx('pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300', isSelected && 'opacity-100')}>
                    <div className={clsx('absolute inset-x-0 top-0 h-28 bg-gradient-to-b', style.glow)} />
                  </div>

                  <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 gap-5">
                      <div className={clsx('flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl', isSelected ? style.icon : 'bg-slate-50 text-slate-500 ring-1 ring-slate-100')}>
                        <Icon size={28} strokeWidth={2.1} />
                      </div>

                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{option.eyebrow}</p>
                        <h3 className="mt-3 font-sora text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                          {option.title}
                        </h3>
                        <p className="mt-4 max-w-2xl text-base leading-8 text-slate-500">
                          {option.description}
                        </p>
                        <div className="mt-5 inline-flex rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-600">
                          {option.note}
                        </div>
                      </div>
                    </div>

                    <div
                      className={clsx(
                        'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                        isSelected ? style.radio : 'border-slate-200 bg-white text-transparent'
                      )}
                    >
                      <div className={clsx('h-3 w-3 rounded-full', isSelected ? 'bg-white' : 'bg-transparent')} />
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>

          <div className="space-y-5">
            {permission === 'private' && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-[28px] border border-amber-200 bg-amber-50/80 p-5 shadow-[0_18px_40px_-34px_rgba(245,158,11,0.55)]"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-amber-600">
                    <Lock size={18} />
                  </div>
                  <div>
                    <p className="font-sora text-lg font-semibold tracking-[-0.02em] text-slate-950">Consent flow</p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      TruMarkZ sends the candidate a WhatsApp or email approval request before anyone can view the record.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_55px_-40px_rgba(15,23,42,0.22)]">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-brand-blue">
                  <Info size={18} />
                </div>
                <div>
                  <p className="font-sora text-lg font-semibold tracking-[-0.02em] text-slate-950">Security standards</p>
                  <p className="mt-2 text-sm leading-7 text-slate-500">
                    Every permission setting is backed by signed verification records and controlled access logs.
                  </p>
                </div>
              </div>
            </div>

            <div className="xl:sticky xl:top-24">
              <Button
                variant="primary"
                size="lg"
                onClick={handleContinue}
                icon={ArrowRight}
                className="w-full rounded-[22px] px-8 py-4 text-lg shadow-[0_24px_54px_-28px_rgba(37,99,235,0.58)]"
              >
                Continue
              </Button>
            </div>
          </div>
        </section>
      </div>
    </AuthLayout>
  );
};

export default PermissionSettings;
