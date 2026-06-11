import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle,
  Eye,
  Package,
  ShieldCheck,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
    selectedProductService,
    selectedProductTemplate,
    setSelectedProductTemplate,
    productBatchData,
    setProductBatchData,
  } = useApp();

  const [submitting, setSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  if (!selectedProductSector || !selectedProductService) {
    navigate('/org/product/sector', { replace: true });
    return null;
  }
  if (!productBatchData?.file || !productBatchData?.costConfirmed) {
    toast.error('Complete the costing step first');
    navigate('/org/product/costing', { replace: true });
    return null;
  }

  const activeTemplate = selectedProductTemplate || PRODUCT_CERTIFICATE_TEMPLATES[0].id;
  const uploadResult = productBatchData?.uploadResponse || null;
  const recordCount = productBatchData?.recordCount || 0;

  const handleCreateBatch = async () => {
    if (!productBatchData?.file) {
      toast.error('Upload the completed Excel file again');
      navigate('/org/product/template');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await verificationAPI.bulkUploadProducts(
        productBatchData.file,
        productBatchData.batchName,
        selectedProductSector.categoryId,
        productBatchData.description || '',
        {
          verificationTypes: getProductVerificationTypes(selectedProductService),
          credentialVisibility:
            selectedProductService?.id === 'verification' ? 'public' : 'private',
          templateId: activeTemplate,
        }
      );
      setProductBatchData((curr) => ({
        ...(curr || {}),
        uploadResponse: data,
        selectedTemplate: activeTemplate,
      }));
      toast.success('Product batch created successfully!');
    } catch (err) {
      toast.error(getApiError(err, 'Failed to create product batch'));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success state ──────────────────────────────────────────────────────────
  if (uploadResult) {
    return (
      <AuthLayout title="Batch Created">
        <div className="mx-auto w-full max-w-[1380px]">
          <StepWizard
            steps={PRODUCT_VERIFICATION_STEPS}
            currentStep={PRODUCT_VERIFICATION_STEP_META.batch.currentStep}
            stepRoutes={PRODUCT_VERIFICATION_STEP_ROUTES}
          />

          <section className="mt-4">
            <PageHeader title="Product Batch Created" subtitle="Bulk upload submitted successfully." />
          </section>

          <Card className="mt-5 border border-blue-100 p-6 shadow-[0_16px_40px_-36px_rgba(37,99,235,0.28)]">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle size={18} />
                </div>
                <div>
                  <h3 className="font-sora text-lg font-semibold text-slate-950">
                    Batch Created Successfully
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">ID: {uploadResult.batch_id}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[420px]">
                {[
                  { label: 'Uploaded', value: uploadResult.total_uploaded, color: 'bg-brand-blue' },
                  { label: 'Skipped', value: uploadResult.total_skipped, color: 'bg-orange-400' },
                  { label: 'Errors', value: uploadResult.errors?.length || 0, color: 'bg-red-500' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`${item.color} text-white rounded-2xl px-4 py-4 text-center`}
                  >
                    <p className="font-sora font-bold text-2xl">{item.value}</p>
                    <p className="text-xs opacity-85 font-inter">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Uploaded products table */}
            {uploadResult.successful_users?.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-slate-950 font-inter flex items-center gap-2">
                    <Package size={14} className="text-brand-blue" /> Uploaded Products & Invite Links
                  </h4>
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="text-xs text-brand-blue font-inter hover:underline flex items-center gap-1"
                  >
                    <Eye size={12} /> {showPreview ? 'Hide' : 'Show all'}
                  </button>
                </div>
                <AnimatePresence>
                  {showPreview && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="overflow-x-auto rounded-xl border border-gray-100">
                        <table className="w-full text-xs font-inter">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                              <th className="text-left p-3 text-gray-500 font-medium">#</th>
                              <th className="text-left p-3 text-gray-500 font-medium">Product</th>
                              <th className="text-left p-3 text-gray-500 font-medium">Invite Link</th>
                            </tr>
                          </thead>
                          <tbody>
                            {uploadResult.successful_users.map((u, i) => (
                              <tr key={u.entity_id || i} className="border-b border-gray-50">
                                <td className="p-3 text-gray-400">{i + 1}</td>
                                <td className="p-3 font-medium text-brand-dark">
                                  {u.product_name || u.full_name || `Product ${i + 1}`}
                                </td>
                                <td className="p-3">
                                  <a
                                    href={u.invite_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-brand-blue hover:underline truncate block max-w-[200px]"
                                  >
                                    {u.invite_link}
                                  </a>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Skipped */}
            {uploadResult.skipped_users?.length > 0 && (
              <div className="mt-4 rounded-xl bg-orange-50 border border-orange-100 p-4">
                <h4 className="text-sm font-semibold text-orange-700 font-inter flex items-center gap-2 mb-2">
                  <AlertTriangle size={14} /> Skipped ({uploadResult.skipped_users.length})
                </h4>
                <div className="space-y-1.5">
                  {uploadResult.skipped_users.map((s, i) => (
                    <p key={i} className="text-xs text-orange-800 font-inter">
                      Row {s.row}: {s.reason}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Errors */}
            {uploadResult.errors?.length > 0 && (
              <div className="mt-4 rounded-xl bg-red-50 border border-red-100 p-4">
                <h4 className="text-sm font-semibold text-red-700 font-inter flex items-center gap-2 mb-2">
                  <XCircle size={14} /> Errors ({uploadResult.errors.length})
                </h4>
                <div className="space-y-1.5">
                  {uploadResult.errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-800 font-inter">
                      Row {e.row} — {e.field}: {e.error}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-blue-50 px-4 py-4">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-brand-blue">
                  {PRODUCT_CERTIFICATE_TEMPLATES.find((t) => t.id === activeTemplate)?.name || 'Classic'}
                </span>
                <span className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-700">
                  {selectedProductService.title}
                </span>
                <span className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-700">
                  {recordCount} Products
                </span>
              </div>
              <Button
                variant="primary"
                size="lg"
                onClick={() => navigate('/org/batch-status')}
                icon={ArrowRight}
              >
                View Batch Status
              </Button>
            </div>
          </Card>
        </div>
      </AuthLayout>
    );
  }

  // ── Template selection state ───────────────────────────────────────────────
  return (
    <AuthLayout title="Certificate Preview">
      <div className="mx-auto w-full max-w-[1380px]">
        <StepWizard
          steps={PRODUCT_VERIFICATION_STEPS}
          currentStep={PRODUCT_VERIFICATION_STEP_META.preview.currentStep}
          stepRoutes={PRODUCT_VERIFICATION_STEP_ROUTES}
        />

        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => navigate('/org/product/costing')}
            className="text-sm text-gray-400 hover:text-brand-blue font-inter transition-colors"
          >
            ← Back
          </button>
        </div>

        <section className="mt-2">
          <PageHeader
            title="Choose Product Certificate"
            subtitle="Pick the certificate design for this product batch."
          />
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            {/* Template grid */}
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
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                          isSelected
                            ? 'border-brand-blue bg-brand-blue text-white'
                            : 'border-slate-200 text-transparent'
                        }`}
                      >
                        <CheckCircle size={16} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Info cards row */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border border-blue-100 p-4 shadow-none">
                <div className="flex items-center gap-2 text-slate-500">
                  <Package size={16} className="text-brand-blue" />
                  <span className="text-xs font-semibold uppercase tracking-[0.14em]">Sector</span>
                </div>
                <p className="mt-3 text-base font-semibold text-slate-950">
                  {selectedProductSector.categoryName}
                </p>
              </Card>

              <Card className="border border-blue-100 p-4 shadow-none">
                <div className="flex items-center gap-2 text-slate-500">
                  <BadgeCheck size={16} className="text-brand-blue" />
                  <span className="text-xs font-semibold uppercase tracking-[0.14em]">Service</span>
                </div>
                <p className="mt-3 text-base font-semibold text-slate-950">
                  {selectedProductService.title}
                </p>
              </Card>

              <Card className="border border-blue-100 p-4 shadow-none">
                <div className="flex items-center gap-2 text-slate-500">
                  <Eye size={16} className="text-brand-blue" />
                  <span className="text-xs font-semibold uppercase tracking-[0.14em]">Visibility</span>
                </div>
                <p className="mt-3 text-base font-semibold text-slate-950">
                  {selectedProductService?.id === 'verification' ? 'Public' : 'Private'}
                </p>
              </Card>
            </div>

            <Card className="border border-blue-100 p-4 shadow-none">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-brand-blue">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-950">Security standard</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Final certificate uses the selected design while preserving product verification
                    data and service type settings.
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

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
                <span className="text-sm text-slate-700">Sector</span>
                <span className="text-sm font-medium text-slate-950">
                  {selectedProductSector.categoryName}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
                <span className="text-sm text-slate-700">Service</span>
                <span className="text-sm font-medium text-slate-950">
                  {selectedProductService.title}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
                <span className="text-sm text-slate-700">Products</span>
                <span className="text-sm font-medium text-slate-950">{recordCount}</span>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-blue-50 px-4 py-4">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-500">Certificate</span>
                <span className="font-medium text-slate-950">
                  {PRODUCT_CERTIFICATE_TEMPLATES.find((t) => t.id === activeTemplate)?.name}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-500">File</span>
                <span className="font-medium text-brand-blue truncate max-w-[140px]">
                  {productBatchData?.fileName}
                </span>
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
