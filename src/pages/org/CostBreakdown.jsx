import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckSquare, ReceiptText, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StepWizard } from '@/components/ui/StepWizard';
import { useApp } from '@/context/AppContext';
import { HUMAN_VERIFICATION_STEPS, HUMAN_VERIFICATION_STEP_META, HUMAN_VERIFICATION_STEP_ROUTES } from '@/data/humanVerificationFlow';
import { verificationAPI, getApiError } from '@/services/api';

const formatCurrency = (value) => `₹${Number(value).toLocaleString('en-IN')}`;

export const CostBreakdown = () => {
  const navigate = useNavigate();
  const {
    batchEntityType,
    selectedIndustry,
    selectedVerifications,
    batchData,
    setBatchData,
  } = useApp();
  const [agreed,      setAgreed]      = useState(Boolean(batchData?.costConfirmed));
  const [allTypes,    setAllTypes]    = useState([]);
  const [typesLoading, setTypesLoading] = useState(true);

  useEffect(() => {
    if (!batchData?.file || !batchData?.recordCount) {
      toast.error('Upload the template file first');
      navigate('/org/template', { replace: true });
    }
  }, [batchData?.file, batchData?.recordCount, navigate]);

  // Stable string key to avoid infinite refetch from object reference changes
  const industryKey = (() => {
    if (!selectedIndustry) return '';
    const list = Array.isArray(selectedIndustry) ? selectedIndustry : [selectedIndustry];
    return list.map((ind) => ind?.name).filter(Boolean).sort().join(',');
  })();

  // Fetch verification types to look up name + price by UUID
  const fetchTypes = useCallback(async () => {
    setTypesLoading(true);
    try {
      const names = industryKey ? industryKey.split(',') : [];
      const { data } = await verificationAPI.getVerificationTypes({
        category:      batchEntityType || 'human',
        industry_type: names.length > 0 ? names : undefined,
      });
      const list = Array.isArray(data) ? data : (data?.verification_types || data?.types || data?.items || []);
      setAllTypes(list);
    } catch (err) {
      toast.error(getApiError(err, 'Failed to load verification type details'));
    } finally {
      setTypesLoading(false);
    }
  }, [batchEntityType, industryKey]);

  useEffect(() => { fetchTypes(); }, [fetchTypes]);

  const selectedChecks = useMemo(
    () => selectedVerifications.map((id) => allTypes.find((t) => t.id === id)).filter(Boolean),
    [selectedVerifications, allTypes]
  );

  const recordCount = batchData?.recordCount || 0;
  const totalCost   = selectedChecks.reduce((sum, item) => sum + ((item.price || 0) * recordCount), 0);

  const handleContinue = () => {
    if (!agreed) {
      toast.error('Confirm the total cost before continuing');
      return;
    }

    setBatchData((current) => ({
      ...(current || {}),
      costConfirmed: true,
    }));

    navigate('/org/certificate-preview');
  };

  return (
    <AuthLayout title="Costing">
      <div className="mx-auto w-full max-w-[1380px]">
        <StepWizard
          steps={HUMAN_VERIFICATION_STEPS}
          currentStep={HUMAN_VERIFICATION_STEP_META.cost.currentStep}
          stepRoutes={HUMAN_VERIFICATION_STEP_ROUTES}
        />

        <section className="mt-4">
          <PageHeader
            title="Total Cost Breakdown"
            subtitle="Cost based on the uploaded users and selected checks."
          />
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="border border-blue-100 p-5 shadow-[0_16px_40px_-36px_rgba(37,99,235,0.28)]">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-brand-blue">
                <ReceiptText size={18} />
              </div>
              <h3 className="font-sora text-lg font-semibold text-slate-950">Cost Summary</h3>
            </div>

            <div className="mt-5 space-y-3">
              {typesLoading ? (
                <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
                  <RefreshCw size={16} className="animate-spin" />
                  <span className="text-sm font-inter">Loading cost details…</span>
                </div>
              ) : selectedChecks.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400 font-inter">
                  No verification checks selected. Go back and select checks.
                </p>
              ) : (
                selectedChecks.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{item.name}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {formatCurrency(item.price)} × {recordCount} {recordCount === 1 ? 'user' : 'users'}
                      </p>
                    </div>
                    <p className="font-sora text-xl font-semibold text-slate-950">
                      {formatCurrency((item.price || 0) * recordCount)}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-end justify-between gap-4 rounded-2xl bg-blue-50 px-4 py-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-500/70">Total cost</p>
                <p className="mt-2 font-sora text-3xl font-semibold text-brand-blue">{formatCurrency(totalCost)}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-brand-blue">
                  {selectedChecks.length} Checks
                </span>
                <span className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-700">
                  {recordCount} Users
                </span>
              </div>
            </div>
          </Card>

          <Card className="border border-blue-100 p-5 shadow-[0_16px_40px_-36px_rgba(37,99,235,0.28)]">
            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(event) => setAgreed(event.target.checked)}
                className="mt-1 rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
              />
              <span className="text-sm leading-6 text-slate-700">
                I agree to this verification cost.
              </span>
            </label>

            <div className="mt-4 rounded-2xl bg-blue-50 px-4 py-4">
              <div className="flex items-center gap-2 text-sm text-brand-blue">
                <CheckSquare size={16} />
                <span className="font-medium">Ready for template preview</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Next step lets you choose the certificate design before the batch is created.
              </p>
            </div>

            <div className="mt-5">
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleContinue}
                icon={ArrowRight}
                disabled={!agreed || recordCount <= 0}
              >
                Continue
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </AuthLayout>
  );
};

export default CostBreakdown;
