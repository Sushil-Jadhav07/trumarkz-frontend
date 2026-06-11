import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle,
  Eye,
  FileBadge2,
  ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StepWizard } from '@/components/ui/StepWizard';
import { useApp } from '@/context/AppContext';
import { HUMAN_VERIFICATION_STEPS, HUMAN_VERIFICATION_STEP_META, HUMAN_VERIFICATION_STEP_ROUTES } from '@/data/humanVerificationFlow';
import { verificationTypes } from '@/data/mockData';
import { verificationAPI, getApiError } from '@/services/api';
import { getIndustryTypeList } from '@/utils/verificationFlow';

const CERTIFICATE_TEMPLATES = [
  {
    id: 'classic-blue',
    name: 'Classic Blue',
    image: '/assets/human/WhatsApp%20Image%202026-06-03%20at%203.58.01%20PM.jpeg',
  },
  {
    id: 'trust-blue',
    name: 'Trust Blue',
    image: '/assets/human/WhatsApp%20Image%202026-06-03%20at%203.58.01%20PM%20(1).jpeg',
  },
  {
    id: 'clean-blue',
    name: 'Clean Blue',
    image: '/assets/human/WhatsApp%20Image%202026-06-03%20at%203.58.01%20PM%20(2).jpeg',
  },
];

const formatCurrency = (value) => `Rs ${value}`;

export const CertificatePreview = () => {
  const navigate = useNavigate();
  const {
    selectedIndustry,
    selectedPermission,
    selectedVerifications,
    selectedHumanTemplate,
    setSelectedHumanTemplate,
    batchData,
    setBatchData,
  } = useApp();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!batchData?.file || !batchData?.recordCount || !batchData?.costConfirmed) {
      toast.error('Complete the costing step first');
      navigate('/org/costing', { replace: true });
    }
  }, [batchData?.costConfirmed, batchData?.file, batchData?.recordCount, navigate]);

  const selectedChecks = useMemo(
    () =>
      selectedVerifications
        .map((id) => verificationTypes.find((item) => item.id === id))
        .filter(Boolean),
    [selectedVerifications]
  );

  const recordCount = batchData?.recordCount || 0;
  const totalCost = selectedChecks.reduce((sum, item) => sum + ((item.price || 0) * recordCount), 0);
  const activeTemplate = selectedHumanTemplate || CERTIFICATE_TEMPLATES[0].id;
  const uploadResult = batchData?.uploadResponse || null;

  const industryName = Array.isArray(selectedIndustry)
    ? (selectedIndustry[0]?.name || 'All')
    : (selectedIndustry?.name || 'All');

  const handleCreateBatch = async () => {
    if (!batchData?.file) {
      toast.error('Upload the completed Excel file again');
      navigate('/org/template');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await verificationAPI.bulkUpload(
        batchData.file,
        batchData.batchName.trim(),
        batchData.description || '',
        {
          industryType: getIndustryTypeList(selectedIndustry),
          verificationTypes: selectedVerifications.join(','),
          credentialVisibility: selectedPermission || 'private',
        }
      );

      setBatchData((current) => ({
        ...(current || {}),
        selectedHumanTemplate: activeTemplate,
        uploadResponse: data,
      }));

      toast.success('Batch created successfully');
    } catch (error) {
      toast.error(getApiError(error, 'Failed to create batch'));
    } finally {
      setSubmitting(false);
    }
  };

  if (uploadResult) {
    return (
      <AuthLayout title="Certificate Preview">
        <div className="mx-auto w-full max-w-[1380px]">
          <StepWizard
            steps={HUMAN_VERIFICATION_STEPS}
            currentStep={HUMAN_VERIFICATION_STEP_META.batch.currentStep}
            stepRoutes={HUMAN_VERIFICATION_STEP_ROUTES}
          />

          <section className="mt-4">
            <PageHeader
              title="Batch created"
              subtitle="Bulk upload submitted successfully."
            />
          </section>

          <Card className="mt-5 border border-blue-100 p-6 shadow-[0_16px_40px_-36px_rgba(37,99,235,0.28)]">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle size={18} />
                </div>
                <div>
                  <h3 className="font-sora text-lg font-semibold text-slate-950">Batch Created Successfully</h3>
                  <p className="mt-1 text-sm text-slate-500">ID: {uploadResult.batch_id}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[420px]">
                {[
                  { label: 'Uploaded', value: uploadResult.total_uploaded },
                  { label: 'Skipped', value: uploadResult.total_skipped },
                  { label: 'Errors', value: uploadResult.errors?.length || 0 },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{item.label}</p>
                    <p className="mt-2 font-sora text-2xl font-semibold text-slate-950">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-blue-50 px-4 py-4">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-brand-blue">
                  {CERTIFICATE_TEMPLATES.find((item) => item.id === (batchData?.selectedHumanTemplate || activeTemplate))?.name}
                </span>
                <span className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-700">
                  {recordCount} Users
                </span>
              </div>

              <Button variant="primary" size="lg" onClick={() => navigate('/org/batch-status')} icon={ArrowRight}>
                View Batch Status
              </Button>
            </div>
          </Card>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Certificate Preview">
      <div className="mx-auto w-full max-w-[1380px]">
        <StepWizard
          steps={HUMAN_VERIFICATION_STEPS}
          currentStep={HUMAN_VERIFICATION_STEP_META.preview.currentStep}
          stepRoutes={HUMAN_VERIFICATION_STEP_ROUTES}
        />

        <section className="mt-4">
          <PageHeader
            title="Choose Identity Credential"
            subtitle="Pick the certificate design for this batch."
          />
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-3">
              {CERTIFICATE_TEMPLATES.map((template) => {
                const isSelected = activeTemplate === template.id;

                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setSelectedHumanTemplate(template.id)}
                    className={`overflow-hidden rounded-3xl border p-3 text-left transition-all ${
                      isSelected
                        ? 'border-brand-blue bg-blue-50/40 shadow-[0_18px_42px_-36px_rgba(37,99,235,0.42)]'
                        : 'border-slate-200 bg-white hover:border-blue-200'
                    }`}
                  >
                    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
                      <img
                        src={template.image}
                        alt={template.name}
                        className="h-[340px] w-full object-cover object-top"
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3 px-1">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{template.name}</p>
                        <p className="mt-1 text-xs text-slate-500">Human verification certificate</p>
                      </div>
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                        isSelected ? 'border-brand-blue bg-brand-blue text-white' : 'border-slate-200 text-transparent'
                      }`}>
                        <CheckCircle size={16} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border border-blue-100 p-4 shadow-none">
                <div className="flex items-center gap-2 text-slate-500">
                  <FileBadge2 size={16} className="text-brand-blue" />
                  <span className="text-xs font-semibold uppercase tracking-[0.14em]">Industry</span>
                </div>
                <p className="mt-3 text-base font-semibold text-slate-950">{industryName}</p>
              </Card>

              <Card className="border border-blue-100 p-4 shadow-none">
                <div className="flex items-center gap-2 text-slate-500">
                  <Eye size={16} className="text-brand-blue" />
                  <span className="text-xs font-semibold uppercase tracking-[0.14em]">Visibility</span>
                </div>
                <p className="mt-3 text-base font-semibold text-slate-950">
                  {selectedPermission === 'public' ? 'Open Search' : 'Permission Required'}
                </p>
              </Card>

              <Card className="border border-blue-100 p-4 shadow-none">
                <div className="flex items-center gap-2 text-slate-500">
                  <ShieldCheck size={16} className="text-brand-blue" />
                  <span className="text-xs font-semibold uppercase tracking-[0.14em]">Identity Type</span>
                </div>
                <p className="mt-3 text-base font-semibold text-slate-950">Individual</p>
              </Card>
            </div>

            <Card className="border border-blue-100 p-4 shadow-none">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-brand-blue">
                  <BadgeCheck size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-950">Security standard</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Final certificate uses the selected design while keeping the same verification data, visibility rule, and batch checks.
                  </p>
                </div>
              </div>
            </Card>
          </div>

          <Card className="h-fit border border-blue-100 p-5 shadow-[0_16px_40px_-36px_rgba(37,99,235,0.28)] xl:sticky xl:top-24">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Batch summary</p>
            <h3 className="mt-2 font-sora text-lg font-semibold text-slate-950">{batchData?.batchName || 'Human Verification Batch'}</h3>

            <div className="mt-4 space-y-2">
              {selectedChecks.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
                  <span className="text-sm text-slate-700">{item.name}</span>
                  <span className="text-sm font-medium text-slate-950">{formatCurrency(item.price * recordCount)}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl bg-blue-50 px-4 py-4">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-500">Selected checks</span>
                <span className="font-medium text-slate-950">{selectedChecks.length}</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-500">Users</span>
                <span className="font-medium text-slate-950">{recordCount}</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-500">Total cost</span>
                <span className="font-sora text-lg font-semibold text-brand-blue">{formatCurrency(totalCost)}</span>
              </div>
            </div>

            <div className="mt-5">
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleCreateBatch}
                icon={ArrowRight}
                disabled={submitting}
              >
                {submitting ? 'Creating Batch...' : 'Continue'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </AuthLayout>
  );
};

export default CertificatePreview;
