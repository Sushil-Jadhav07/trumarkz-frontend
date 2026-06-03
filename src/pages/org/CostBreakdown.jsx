import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ReceiptText } from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StepWizard } from '@/components/ui/StepWizard';
import { useApp } from '@/context/AppContext';
import { HUMAN_VERIFICATION_STEPS, HUMAN_VERIFICATION_STEP_META } from '@/data/humanVerificationFlow';
import { verificationTypes } from '@/data/mockData';
import { verificationAPI, getApiError } from '@/services/api';

export const CostBreakdown = () => {
  const navigate = useNavigate();
  const {
    selectedVerifications,
    batchData,
    credentialVisibility,
    selectedIndustry,
    setBatchData,
  } = useApp();
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { label, progress } = HUMAN_VERIFICATION_STEP_META.cost;

  const selectedChecks = useMemo(
    () => selectedVerifications
      .map((id) => verificationTypes.find((item) => item.id === id))
      .filter(Boolean),
    [selectedVerifications]
  );

  const recordCount = batchData?.recordCount || 0;
  const totalCost = selectedChecks.reduce((sum, item) => sum + (item.price * recordCount), 0);
  const canSubmit = agreed && recordCount > 0 && !!batchData?.file;

  const handleContinue = async () => {
    if (!agreed) {
      toast.error('Please agree to the total cost breakdown');
      return;
    }
    if (!batchData?.file) {
      toast.error('Upload the Excel file before confirming the batch');
      navigate('/org/template');
      return;
    }
    if (!batchData?.batchName?.trim()) {
      toast.error('Batch name is missing');
      navigate('/org/template');
      return;
    }

    setSubmitting(true);
    try {
      const industryType = Array.isArray(selectedIndustry)
        ? selectedIndustry[0]?.id
        : selectedIndustry?.id;

      const { data } = await verificationAPI.bulkUpload(
        batchData.file,
        batchData.batchName.trim(),
        batchData.description || '',
        {
          industry_type: industryType,
          verification_types: selectedVerifications.join(','),
          credential_visibility: credentialVisibility,
        }
      );

      setBatchData((current) => ({
        ...(current || {}),
        uploadResponse: data,
      }));

      toast.success('Batch created successfully');
      navigate('/org/batch-status', {
        state: {
          createdBatch: data,
          fromHumanFlow: true,
        },
      });
    } catch (error) {
      toast.error(getApiError(error, 'Failed to create batch'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Costing">
      <div className="mx-auto w-full max-w-[1380px]">
        <div className="mb-8 rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_-46px_rgba(15,23,42,0.22)]">
          <StepWizard steps={HUMAN_VERIFICATION_STEPS} currentStep={5} />
        </div>

        <section className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-blue/70">{label}</p>
          <div className="mt-4 h-2.5 max-w-xl overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand-blue" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-8">
            <PageHeader
              title="Total Cost Breakdown"
              subtitle="Determine the total verification cost for all users in the uploaded file."
            />
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <Card className="rounded-[24px] border border-slate-200 p-6 shadow-[0_18px_60px_-42px_rgba(15,23,42,0.25)]">
            <div className="flex items-start gap-4">
              <div className="mt-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-blue/[0.08] text-brand-blue">
                <ReceiptText size={22} />
              </div>
              <div>
                <h3 className="font-sora text-3xl font-semibold tracking-[-0.03em] text-slate-950">Cost Summary</h3>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {selectedChecks.map((item) => (
                <div key={item.id} className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <p className="text-lg font-medium text-slate-900">{item.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-400">Rs {item.price} x {recordCount}</p>
                    <p className="mt-1 font-sora text-3xl font-bold text-slate-950">Rs {item.price * recordCount}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Total cost</p>
                <p className="mt-3 font-sora text-5xl font-bold text-brand-blue">Rs {totalCost}</p>
              </div>
              <div className="space-y-2">
                <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-brand-blue">
                  {selectedChecks.length} Checks
                </div>
                <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                  {recordCount} Users
                </div>
              </div>
            </div>
          </Card>

          <div>
            <Card className="rounded-[24px] border border-slate-200 p-5 shadow-[0_18px_60px_-42px_rgba(15,23,42,0.25)]">
              <label className="flex items-start gap-3 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(event) => setAgreed(event.target.checked)}
                  className="mt-1 rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
                />
                <span className="text-sm leading-7 text-slate-700">
                  I agree to the total cost breakdown and the terms of service for these verification checks.
                </span>
              </label>

              {recordCount <= 0 && (
                <p className="mt-4 text-sm text-red-500">
                  Upload a valid Excel file with at least one user row before confirming.
                </p>
              )}

              {!batchData?.file && (
                <p className="mt-2 text-sm text-amber-600">
                  Re-select the Excel file if you refreshed the page. The browser does not persist file objects in local storage.
                </p>
              )}

              <div className="mt-6">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full py-4 text-lg shadow-[0_20px_42px_-24px_rgba(37,99,235,0.62)]"
                  onClick={handleContinue}
                  icon={ArrowRight}
                  disabled={submitting || !canSubmit}
                >
                  {submitting ? 'Submitting...' : 'Confirm'}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
};

export default CostBreakdown;
