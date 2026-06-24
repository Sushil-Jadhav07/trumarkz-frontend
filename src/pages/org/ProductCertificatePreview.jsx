import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, BadgeCheck, CheckCircle, Eye, FileBadge2,
  Package, ShieldCheck, RefreshCw,
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

  const isWarranty = selectedProductService?.id === 'warranty';

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
  const credentialVisibility = isWarranty ? 'private' : 'public';

  const handleCreateBatch = async () => {
    if (!productBatchData?.file) {
      toast.error('Upload the completed Excel file again');
      navigate('/org/product/template');
      return;
    }

    if (isWarranty) {
      // Warranty: use the dedicated warranty upload endpoint
      setSubmitting(true);
      try {
        const { data } = await verificationAPI.uploadWarrantyExcel(
          productBatchData.file,
          productBatchData.batchName.trim(),
          productBatchData.description || ''
        );
        setProductBatchData((current) => ({
          ...(current || {}),
          uploadResponse: data,
          isWarranty: true,
        }));
        toast.success('Warranty batch submitted — pending admin review');
      } catch (error) {
        toast.error(getApiError(error, 'Failed to submit warranty batch'));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Product verification: standard bulk upload
    setSubmitting(true);
    try {
      const { data } = await verificationAPI.bulkUploadProducts(
        productBatchData.file,
        productBatchData.batchName.trim(),
        selectedProductSector.title,
        productBatchData.description || '',
        {
          verificationTypes: selectedProductVerifications,
          credentialVisibility,
          templateId: activeTemplate,
        }
      );

      setProductBatchData((current) => ({
        ...(current || {}),
        selectedProductTemplate: activeTemplate,
        uploadResponse: data,
        isWarranty: false,
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
    const batchId = uploadResult.batch_id || uploadResult.id || '';

    if (isWarranty || productBatchData?.isWarranty) {
      // Warranty success view
      return (
        <AuthLayout title="Warranty Submitted">
          <div className="mx-auto w-full max-w-[1380px]">
            <StepWizard
              steps={PRODUCT_VERIFICATION_STEPS}
              currentStep={PRODUCT_VERIFICATION_STEP_META.batch.currentStep}
              stepRoutes={PRODUCT_VERIFICATION_STEP_ROUTES}
            />

            <section className="mt-4">
              <PageHeader title="Warranty Batch Submitted" subtitle="Your warranty data is under admin review." />
            </section>

            <Card className="mt-5 border border-amber-100 bg-amber-50/30 p-6">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 shrink-0">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h3 className="font-sora text-lg font-semibold text-slate-950">
                      Warranty Batch Submitted
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      A super admin will review and approve or reject each product individually.
                    </p>
                    {batchId && (
                      <p className="mt-1 text-xs text-gray-400 font-mono">Batch ID: {batchId}</p>
                    )}
                  </div>
                </div>

                {uploadResult.total_uploaded != null && (
                  <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[360px]">
                    {[
                      { label: 'Uploaded', value: uploadResult.total_uploaded },
                      { label: 'Skipped',  value: uploadResult.total_skipped  ?? 0 },
                      { label: 'Errors',   value: uploadResult.errors?.length ?? 0 },
                    ].map((item) => (
                      <div key={item.label} className="rounded-2xl border border-slate-100 bg-white px-4 py-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{item.label}</p>
                        <p className="mt-2 font-sora text-2xl font-semibold text-slate-950">{item.value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white border border-amber-100 px-4 py-4">
                <p className="text-sm text-slate-500 font-inter">
                  Track approval status in the{' '}
                  <span className="font-semibold text-brand-dark">Product Warranty</span> section.
                </p>
                <div className="flex flex-wrap gap-3">
                  {batchId && (
                    <Button
                      variant="outline"
                      size="sm"
                      icon={ShieldCheck}
                      onClick={() => navigate(`/org/product/warranty?batch_id=${batchId}`)}
                    >
                      View Warranty Status
                    </Button>
                  )}
                  <Button variant="primary" size="lg" onClick={() => navigate('/org/batch-status')} icon={ArrowRight}>
                    View All Batches
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </AuthLayout>
      );
    }

    // Verification success view
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
                  <p className="mt-1 text-sm text-slate-500">ID: {batchId}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[420px]">
                {[
                  { label: 'Uploaded', value: uploadResult.total_uploaded },
                  { label: 'Skipped',  value: uploadResult.total_skipped  },
                  { label: 'Errors',   value: uploadResult.errors?.length || 0 },
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
                  {PRODUCT_CERTIFICATE_TEMPLATES.find((t) => t.id === activeTemplate)?.name || 'Classic'}
                </span>
                <span className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-700">{sectorName}</span>
                <span className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-700">{recordCount} Products</span>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary" size="lg" onClick={() => navigate('/org/batch-status')} icon={ArrowRight}>
                  View Batch Status
                </Button>
              </div>
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
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 px-1">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{template.name}</p>
                        <p className="mt-1 text-xs text-slate-500">Product certificate</p>
                      </div>
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full border ${isSelected ? 'border-brand-blue bg-brand-blue text-white' : 'border-slate-200 text-transparent'}`}>
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
                <p className="mt-3 text-base font-semibold text-slate-950 capitalize">{credentialVisibility}</p>
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
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Batch summary</p>
            <h3 className="mt-2 font-sora text-lg font-semibold text-slate-950">
              {productBatchData?.batchName || 'Product Batch'}
            </h3>

            <div className="mt-4 rounded-2xl bg-blue-50 px-4 py-4 space-y-2">
              {[
                { label: 'Sector',     value: sectorName },
                { label: 'Service',    value: serviceName },
                { label: 'Products',   value: recordCount },
                { label: 'Visibility', value: credentialVisibility },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-500">{item.label}</span>
                  <span className="font-medium text-slate-950 capitalize">{item.value}</span>
                </div>
              ))}
            </div>

            <div className="mt-5">
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleCreateBatch}
                icon={submitting ? RefreshCw : ArrowRight}
                disabled={submitting}
              >
                {submitting ? 'Submitting…' : isWarranty ? 'Submit Warranty Batch' : 'Create Batch'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </AuthLayout>
  );
};

export default ProductCertificatePreview;
