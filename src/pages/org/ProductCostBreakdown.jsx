import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckSquare, Package, ReceiptText, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StepWizard } from '@/components/ui/StepWizard';
import { useApp } from '@/context/AppContext';
import {
  PRODUCT_VERIFICATION_STEPS,
  PRODUCT_VERIFICATION_STEP_META,
  PRODUCT_VERIFICATION_STEP_ROUTES,
} from '@/data/productVerificationFlow';
import { verificationAPI, getApiError } from '@/services/api';
import { getProductVerificationTypes } from '@/utils/verificationFlow';

const formatCurrency = (v) => `₹${Number(v).toLocaleString('en-IN')}`;

const FALLBACK_PRICES = { authenticity: 150, warranty: 120, verification: 150 };

export const ProductCostBreakdown = () => {
  const navigate = useNavigate();
  const {
    selectedProductSector,
    selectedProductService,
    productBatchData,
    setProductBatchData,
  } = useApp();

  const [agreed, setAgreed] = useState(Boolean(productBatchData?.costConfirmed));
  const [serviceDetails, setServiceDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!productBatchData?.file || !productBatchData?.recordCount) {
      toast.error('Upload the template file first');
      navigate('/org/product/template', { replace: true });
    }
  }, [productBatchData?.file, productBatchData?.recordCount, navigate]);

  const fetchPricing = useCallback(async () => {
    setLoading(true);
    try {
      const verificationTypes = getProductVerificationTypes(selectedProductService);
      const { data } = await verificationAPI.getVerificationTypes({ category: 'product' });
      const list = Array.isArray(data)
        ? data
        : data?.verification_types || data?.types || data?.items || [];

      const matched = list.find(
        (t) =>
          verificationTypes.includes(t.name?.toLowerCase()) ||
          verificationTypes.includes(t.type?.toLowerCase()) ||
          verificationTypes.includes(t.id?.toLowerCase())
      );

      if (matched) {
        setServiceDetails({ name: matched.name, price: matched.price || 0, id: matched.id });
      } else {
        const type = verificationTypes[0] || 'verification';
        setServiceDetails({
          name: selectedProductService?.title || 'Product Verification',
          price: FALLBACK_PRICES[type] || 150,
          id: type,
        });
      }
    } catch {
      const type = getProductVerificationTypes(selectedProductService)[0] || 'verification';
      setServiceDetails({
        name: selectedProductService?.title || 'Product Verification',
        price: FALLBACK_PRICES[type] || 150,
        id: type,
      });
    } finally {
      setLoading(false);
    }
  }, [selectedProductService]);

  useEffect(() => { fetchPricing(); }, [fetchPricing]);

  if (!selectedProductSector || !selectedProductService) {
    navigate('/org/product/sector', { replace: true });
    return null;
  }

  const recordCount = productBatchData?.recordCount || 0;
  const totalCost = serviceDetails ? (serviceDetails.price || 0) * recordCount : 0;

  const handleContinue = () => {
    if (!agreed) { toast.error('Confirm the total cost before continuing'); return; }
    setProductBatchData((curr) => ({ ...(curr || {}), costConfirmed: true }));
    navigate('/org/product/certificate-preview');
  };

  return (
    <AuthLayout title="Product Costing">
      <div className="mx-auto w-full max-w-[1380px]">
        <StepWizard
          steps={PRODUCT_VERIFICATION_STEPS}
          currentStep={PRODUCT_VERIFICATION_STEP_META.costing.currentStep}
          stepRoutes={PRODUCT_VERIFICATION_STEP_ROUTES}
        />

        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => navigate('/org/product/template')}
            className="text-sm text-gray-400 hover:text-brand-blue font-inter transition-colors"
          >
            ← Back
          </button>
        </div>

        <section className="mt-2">
          <PageHeader
            title="Total Cost Breakdown"
            subtitle="Cost based on the uploaded products and selected service."
          />
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          {/* Cost card */}
          <Card className="border border-blue-100 p-5 shadow-[0_16px_40px_-36px_rgba(37,99,235,0.28)]">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-brand-blue">
                <ReceiptText size={18} />
              </div>
              <h3 className="font-sora text-lg font-semibold text-slate-950">Cost Summary</h3>
            </div>

            <div className="mt-5 space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
                  <RefreshCw size={16} className="animate-spin" />
                  <span className="text-sm font-inter">Loading cost details…</span>
                </div>
              ) : serviceDetails ? (
                <div className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-brand-blue">
                      <Package size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{serviceDetails.name}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {formatCurrency(serviceDetails.price)} × {recordCount}{' '}
                        {recordCount === 1 ? 'product' : 'products'}
                      </p>
                    </div>
                  </div>
                  <p className="font-sora text-xl font-semibold text-slate-950">
                    {formatCurrency(totalCost)}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="mt-5 flex flex-wrap items-end justify-between gap-4 rounded-2xl bg-blue-50 px-4 py-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-500/70">
                  Total cost
                </p>
                <p className="mt-2 font-sora text-3xl font-semibold text-brand-blue">
                  {formatCurrency(totalCost)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-brand-blue">
                  {selectedProductService.title}
                </span>
                <span className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-700">
                  {recordCount} Products
                </span>
              </div>
            </div>

            {/* Batch details summary */}
            <div className="mt-4 rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 space-y-2">
              <div className="flex items-center justify-between font-inter text-sm">
                <span className="text-slate-500">Sector</span>
                <span className="font-medium text-slate-900">
                  {selectedProductSector.categoryName}
                </span>
              </div>
              <div className="flex items-center justify-between font-inter text-sm">
                <span className="text-slate-500">Batch name</span>
                <span className="font-medium text-slate-900 truncate max-w-[200px]">
                  {productBatchData?.batchName}
                </span>
              </div>
              <div className="flex items-center justify-between font-inter text-sm">
                <span className="text-slate-500">File</span>
                <span className="font-medium text-brand-blue truncate max-w-[200px]">
                  {productBatchData?.fileName}
                </span>
              </div>
            </div>
          </Card>

          {/* Agree + continue card */}
          <Card className="border border-blue-100 p-5 shadow-[0_16px_40px_-36px_rgba(37,99,235,0.28)]">
            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
              />
              <span className="text-sm leading-6 text-slate-700">
                I agree to this product verification cost.
              </span>
            </label>

            <div className="mt-4 rounded-2xl bg-blue-50 px-4 py-4">
              <div className="flex items-center gap-2 text-sm text-brand-blue">
                <CheckSquare size={16} />
                <span className="font-medium">Ready for certificate preview</span>
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
                disabled={!agreed || recordCount <= 0 || loading}
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

export default ProductCostBreakdown;
