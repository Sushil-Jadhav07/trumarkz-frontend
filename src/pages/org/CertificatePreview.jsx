import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BadgeCheck, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StepWizard } from '@/components/ui/StepWizard';
import { useApp } from '@/context/AppContext';
import { HUMAN_VERIFICATION_STEPS, HUMAN_VERIFICATION_STEP_META } from '@/data/humanVerificationFlow';
import { verificationTypes } from '@/data/mockData';

const templates = [
  {
    id: 'classic-blue',
    name: 'Classic Blue',
    image: '/assets/human/WhatsApp%20Image%202026-06-03%20at%203.58.01%20PM.jpeg',
  },
  {
    id: 'trust-navy',
    name: 'Trust Navy',
    image: '/assets/human/WhatsApp%20Image%202026-06-03%20at%203.58.01%20PM%20(1).jpeg',
  },
  {
    id: 'verified-green',
    name: 'Verified Green',
    image: '/assets/human/WhatsApp%20Image%202026-06-03%20at%203.58.01%20PM%20(2).jpeg',
  },
];

const InfoTile = ({ label, value }) => (
  <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_16px_50px_-40px_rgba(15,23,42,0.25)]">
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
    <p className="mt-3 font-sora text-2xl font-semibold tracking-[-0.03em] text-slate-950">{value}</p>
  </div>
);

export const CertificatePreview = () => {
  const navigate = useNavigate();
  const {
    selectedTemplate,
    setSelectedTemplate,
    selectedVerifications,
    selectedIndustry,
  } = useApp();
  const { label, progress } = HUMAN_VERIFICATION_STEP_META.preview;

  const activeTemplate = selectedTemplate || templates[0].id;

  const selectedVerificationNames = useMemo(
    () => selectedVerifications
      .map((id) => verificationTypes.find((item) => item.id === id)?.name)
      .filter(Boolean),
    [selectedVerifications]
  );

  const industryName = Array.isArray(selectedIndustry)
    ? (selectedIndustry[0]?.name || 'All')
    : (selectedIndustry?.name || 'All');

  const handleContinue = () => {
    if (!activeTemplate) {
      toast.error('Select a certificate template');
      return;
    }
    if (!selectedTemplate) {
      setSelectedTemplate(activeTemplate);
    }
    toast.dismiss('human-template-selected');
    toast.success('Certificate template selected', { id: 'human-template-selected' });
    navigate('/org/cost-breakdown');
  };

  return (
    <AuthLayout title="Certificate Preview">
      <div className="mx-auto w-full max-w-[1380px]">
        <div className="mb-8 rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_-46px_rgba(15,23,42,0.22)]">
          <StepWizard steps={HUMAN_VERIFICATION_STEPS} currentStep={3} />
        </div>

        <section className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-blue/70">{label}</p>
          <div className="mt-4 h-2.5 max-w-xl overflow-hidden rounded-full bg-slate-100">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              className="h-full rounded-full bg-brand-blue"
            />
          </div>
          <div className="mt-8">
            <PageHeader
              title="Choose Identity Credential"
              subtitle="Select a secure visual template for your verified digital identity."
            />
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {templates.map((template, index) => {
                const isSelected = activeTemplate === template.id;
                return (
                  <motion.button
                    key={template.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`relative overflow-hidden rounded-[28px] border bg-white p-3 text-left transition-all ${
                      isSelected
                        ? 'border-brand-blue shadow-[0_28px_60px_-38px_rgba(37,99,235,0.5)]'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="overflow-hidden rounded-[24px] bg-slate-100">
                      <img
                        src={template.image}
                        alt={template.name}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    {isSelected && (
                      <div className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-brand-blue text-white shadow-lg">
                        <CheckCircle2 size={20} />
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoTile label="Industry" value={industryName} />
              <InfoTile label="Identity Type" value="Individual" />
            </div>

            <Card className="mt-6 rounded-[24px] border border-slate-200 p-5 shadow-[0_16px_50px_-40px_rgba(15,23,42,0.25)]">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-brand-blue">
                  <BadgeCheck size={18} />
                </div>
                <div>
                  <p className="font-sora text-xl font-semibold text-slate-950">Security Standards Compliance</p>
                  <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
                    Secured via biometric binding and government-grade AES-256 encryption. Supports ISO/IEC 18013-5 mobile ID standards.
                  </p>
                </div>
              </div>
            </Card>
          </div>

          <div>
            <Card className="sticky top-24 rounded-[24px] border border-slate-200 p-5 shadow-[0_18px_60px_-42px_rgba(15,23,42,0.25)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Preview Summary</p>
              <h3 className="mt-3 font-sora text-2xl font-semibold tracking-[-0.03em] text-slate-950">Selected checks</h3>

              <div className="mt-5 flex flex-wrap gap-2">
                {selectedVerificationNames.length > 0 ? selectedVerificationNames.map((name) => (
                  <span key={name} className="rounded-full bg-brand-blue/[0.08] px-3 py-1.5 text-xs font-medium text-brand-blue">
                    {name}
                  </span>
                )) : (
                  <p className="text-sm text-slate-400">No checks selected.</p>
                )}
              </div>

              <div className="mt-6 rounded-[20px] bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Template</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">
                  {templates.find((item) => item.id === activeTemplate)?.name || 'Classic Blue'}
                </p>
              </div>

              <div className="mt-6">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full py-4 text-lg shadow-[0_20px_42px_-24px_rgba(37,99,235,0.62)]"
                  onClick={handleContinue}
                  icon={ArrowRight}
                >
                  Continue
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
};

export default CertificatePreview;
