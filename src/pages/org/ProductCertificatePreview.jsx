import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle,
  Eye,
  FileBadge2,
  Package,
  ShieldCheck,
} from 'lucide-react';
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
  PRODUCT_CERTIFICATE_TEMPLATES,
} from '@/data/productVerificationFlow';
import { verificationAPI, getApiError } from '@/services/api';
import { getProductVerificationTypes } from '@/utils/verificationFlow';

const formatCurrency = (v) => `₹${Number(v).toLocaleString('en-IN')}`;

export const ProductCertificatePreview = () => {
  const navigate = useNavigate();
  const {
    selectedProductSector,
    selectedProductVerifications,
    selectedProductService,
    selectedProductTemplate,
    setSelectedProductTemplate,
    productBatchData,
    setProductBatchData,
  } = useApp();

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!productBatchData?.file || !productBatchData?.recordCount || !productBatchData?.costConfirmed) {
      toast.error('Complete the costing step first');
      navigate('/org/product/costing', { replace: true });
    }
  }, [productBatchData, navigate]);

  const activeTemplate = selectedProductTemplate || PRODUCT_CERTIFICATE_TEMPLATES[0].id;
  const uploadResult = productBatchData?.uploadResponse || null;

  const recordCount = productBatchData?.recordCount || 0;
  const sectorName = selectedProductSector?.title || 'Product';
  const serviceName = selectedProductService?.title || '';
  const credentialVisibility = selectedProductService?.id === 'verification' ? 'public' : 'private';

  const handleCreateBatch = async () => {
    if (!productBatchData?.file) {
      toast.error('Upload the completed Excel file again');
      navigate('/org/product/template');
      return;
    }
    if (!selectedProductSector?.categoryId) {
      toast.error('Sector category not found — go back and re-select sector');
      navigate('/org/product/sector');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await verificationAPI.bulkUploadProducts(
        productBatchData.file,
        productBatchData.batchName.trim(),
        selectedProductSector.categoryId,
        productBatchData.description || '',
        {
          verificationTypes: getProductVerificationTypes(selectedProductService),
          credentialVisibility,
          templateId: activeTemplate,
        }
      );

      setProductBatchData((current) => ({
        ...(current || {}),
        selectedProductTemplate: activeTemplate,
        uploadResponse: data,
      }));

      toast.success('Product batch created successfully');
    } catch (error) {
      toast.error(getApiError(error, 'Failed to create product batch'));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success state ──────────────────────────────────────────────────────────
  if (uploadResult) {
    return (
      <AuthLayout title="Product Certificate Preview">
        <div className="mx-auto w-full max-w-[1380px]">
          <StepWizard
            steps={PRODUCT_VERIFICATION_STEPS}
            currentStep={PRODUCT_VERIFICATION_STEP_META.batch.currentStep}
            stepRoutes={PRODUCT_VERIFICATION_STEP_ROUTES}
          />

          <section className="mt-4">
            <PageHeader title="Batch created" subtitle="Product batch submitted successfully." />
          </section>

          <Card className="mt-5 border border-blue-100 p-6 shadow-[0_16px_40px_-36px_rgba(37,99,235,0.28)]">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle size={18} />
                </div>
                <div>
                  <h3 className="font-sora text-lg font-semibold text-slate-950">
                    Product Batch Created Successfully
                  </h3>
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
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {item.label}
                    </p>
                    <p className="mt-2 font-sora text-2xl font-semibold text-slate-950">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-blue-50 px-4 py-4">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-brand-blue">
                  {PRODUCT_CERTIFICATE_TEMPLATES.find((t) => t.id === activeTemplate)?.name || 'Classic'}
                </span>
                <span className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-700">
                  {sectorName}
                </span>
                <span className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-700">
                  {recordCount} Products
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

  // ── Preview + selection state ──────────────────────────────────────────────
  return (
    <AuthLayout title="Product Certificate Preview">
      <div className="mx-auto w-full max-w-[1380px]">
        <StepWizard
          steps={PRODUCT_VERIFICATION_STEPS}
          currentStep={PRODUCT_VERIFICATION_STEP_META.preview.currentStep}
          stepRoutes={PRODUCT_VERIFICATION_STEP_ROUTES}
        />

        <section className="mt-4">
          <PageHeader
            title="Choose Product Certificate"
            subtitle="Pick the certificate design for this product batch."
          />
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          {/* Certificate template grid */}
          <div className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-3">
              {PRODUCT_CERTIFICATE_TEMPLATES.map((template) => {
                const isSelected = activeTemplate === template.id;
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setSelectedProductTemplate(template.id)}
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
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.style.background = '#f1f5f9';
                          e.target.parentElement.style.height = '340px';
                          e.target.parentElement.style.display = 'flex';
                          e.target.parentElement.style.alignItems = 'center';
                          e.target.parentElement.style.justifyContent = 'center';
                          e.target.parentElement.innerHTML = `<span style="font-size:12px;color:#94a3b8;font-family:Inter,sans-serif">${template.name}</span>`;
                        }}
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 px-1">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{template.name}</p>
                        <p className="mt-1 text-xs text-slate-500">Product verification certificate</p>
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

            {/* Info cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border border-blue-100 p-4 shadow-none">
                <div className="flex items-center gap-2 text-slate-500">
                  <FileBadge2 size={16} className="text-brand-blue" />
                  <span className="text-xs font-semibold uppercase tracking-[0.14em]">Sector</span>
                </div>
                <p className="mt-3 text-base font-semibold text-slate-950">{sectorName}</p>
              </Card>

              <Card className="border border-blue-100 p-4 shadow-none">
                <div className="flex items-center gap-2 text-slate-500">
                  <Eye size={16} className="text-brand-blue" />
                  <span className="text-xs font-semibold uppercase tracking-[0.14em]">Visibility</span>
                </div>
                <p className="mt-3 text-base font-semibold text-slate-950 capitalize">
                  {credentialVisibility}
                </p>
              </Card>

              <Card className="border border-blue-100 p-4 shadow-none">
                <div className="flex items-center gap-2 text-slate-500">
                  <Package size={16} className="text-brand-blue" />
                  <span className="text-xs font-semibold uppercase tracking-[0.14em]">Service</span>
                </div>
                <p className="mt-3 text-base font-semibold text-slate-950">{serviceName}</p>
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
                    The final certificate uses the selected design while preserving verification data, visibility rule, and batch checks.
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Sticky summary sidebar */}
          <Card className="h-fit border border-blue-100 p-5 shadow-[0_16px_40px_-36px_rgba(37,99,235,0.28)] xl:sticky xl:top-24">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Batch summary
            </p>
            <h3 className="mt-2 font-sora text-lg font-semibold text-slate-950">
              {productBatchData?.batchName || 'Product Verification Batch'}
            </h3>

            <div className="mt-4 rounded-2xl bg-blue-50 px-4 py-4 space-y-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-500">Sector</span>
                <span className="font-medium text-slate-950">{sectorName}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-500">Service</span>
                <span className="font-medium text-slate-950">{serviceName}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-500">Products</span>
                <span className="font-medium text-slate-950">{recordCount}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-500">Visibility</span>
                <span className="font-medium text-slate-950 capitalize">{credentialVisibility}</span>
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
                {submitting ? 'Creating Batch…' : 'Create Batch'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </AuthLayout>
  );
};

export default ProductCertificatePreview;
