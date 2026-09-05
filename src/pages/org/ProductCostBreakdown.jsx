import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle, CheckSquare, Package, ReceiptText, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StepWizard } from '@/components/ui/StepWizard';
import { WarrantyDocumentCell } from '@/components/shared/WarrantyDocumentCell';
import { useApp } from '@/context/AppContext';
import {
  PRODUCT_VERIFICATION_STEPS,
  PRODUCT_VERIFICATION_STEP_META,
  PRODUCT_VERIFICATION_STEP_ROUTES,
  WARRANTY_VERIFICATION_STEPS,
  WARRANTY_VERIFICATION_STEP_META,
  WARRANTY_VERIFICATION_STEP_ROUTES,
  PRODUCT_CERTIFICATE_TEMPLATES,
} from '@/data/productVerificationFlow';
import { verificationAPI, getApiError } from '@/services/api';

const formatCurrency = (value) => `₹${Number(value).toLocaleString('en-IN')}`;

export const ProductCostBreakdown = () => {
  const navigate = useNavigate();
  const {
    selectedProductSector,
    selectedProductVerifications,
    selectedProductService,
    selectedProductTemplate,
    productBatchData,
    setProductBatchData,
  } = useApp();

  const [agreed, setAgreed] = useState(Boolean(productBatchData?.costConfirmed));
  const [allTypes, setAllTypes] = useState([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Set once the warranty batch is created and the upload response already
  // includes the created BatchUsers — lets the org attach documents right
  // here (keyed by the real batch_user_id) instead of navigating away first.
  const [warrantyUpload, setWarrantyUpload] = useState(null);

  const isWarranty = selectedProductService?.id === 'warranty';
  const activeTemplate = selectedProductTemplate || PRODUCT_CERTIFICATE_TEMPLATES[0].id;
  const credentialVisibility = isWarranty ? 'private' : 'public';

  useEffect(() => {
    if (!productBatchData?.file || !productBatchData?.recordCount) {
      toast.error('Upload the template file first');
      navigate('/org/product/template', { replace: true });
    }
  }, [productBatchData, navigate]);

  const sectorKey = [
    selectedProductSector?.categoryName,
    selectedProductSector?.title,
  ]
    .filter(Boolean)
    .join(',');

  const fetchTypes = useCallback(async () => {
    setTypesLoading(true);
    try {
      const names = sectorKey ? sectorKey.split(',').filter(Boolean) : [];
      const readList = (data) =>
        Array.isArray(data)
          ? data
          : data?.verification_types || data?.types || data?.items || [];

      const { data } = await verificationAPI.getVerificationTypes({
        category: 'product',
        industry_type: names.length > 0 ? names : undefined,
      });
      let list = readList(data);

      // Fallback to a broader query when the sector alias filter returns no rows,
      // otherwise costing loses the selected checks even though step 2 stored them.
      if (list.length === 0 && names.length > 0) {
        const { data: fallbackData } = await verificationAPI.getVerificationTypes({
          category: 'product',
        });
        list = readList(fallbackData);
      }

      setAllTypes(list);
    } catch (err) {
      toast.error(getApiError(err, 'Failed to load verification type details'));
    } finally {
      setTypesLoading(false);
    }
  }, [sectorKey]);

  useEffect(() => { fetchTypes(); }, [fetchTypes]);

  const selectedChecks = useMemo(() => {
    const typeMap = new Map(
      allTypes.flatMap((type) => {
        const keys = [type?.id, type?.uuid, type?.slug]
          .filter(Boolean)
          .map((value) => [String(value), type]);
        return keys;
      })
    );

    return selectedProductVerifications
      .map((item) => (typeof item === 'object' ? item?.id || item?.uuid || item?.slug : item))
      .map((id) => typeMap.get(String(id)))
      .filter(Boolean);
  }, [selectedProductVerifications, allTypes]);

  const recordCount = productBatchData?.recordCount || 0;
  const totalCost = selectedChecks.reduce((sum, item) => sum + ((item.price || 0) * recordCount), 0);

  const reloadWarrantyProducts = useCallback(async () => {
    if (!warrantyUpload?.batchId) return;
    try {
      // GET /verification/products/warranty/{batch_id} — the existing-batch
      // shape (products[] with product_id), distinct from the upload
      // response's successful_users[] (id) but carrying the same identifier
      // relationship; the row rendering below already accepts either shape.
      const { data } = await verificationAPI.getWarrantyStatus(warrantyUpload.batchId);
      setWarrantyUpload((current) => (current ? { ...current, users: data?.products || [] } : current));
    } catch (err) {
      toast.error(getApiError(err, 'Failed to refresh warranty documents'));
    }
  }, [warrantyUpload?.batchId]);

  const handleContinue = async () => {
    if (!agreed) {
      toast.error('Confirm the total cost before continuing');
      return;
    }
    setProductBatchData((current) => ({ ...(current || {}), costConfirmed: true }));

    if (!productBatchData?.file) {
      toast.error('Upload the completed Excel file again');
      navigate('/org/product/template');
      return;
    }

    setSubmitting(true);
    try {
      if (isWarranty) {
        // Documents staged on the Template step (per record, keyed to its
        // reserved serial number) are sent together with the Excel + the
        // reserved serials in this single call — see
        // productBatchData.documents, built there right after each file was
        // attached. The backend maps each by its serial number onto the
        // BatchUser it creates for that row.
        const reservedSerialNos = productBatchData.reservedSerialNos || [];
        const documents = productBatchData.documents || [];
        const { data } = await verificationAPI.uploadWarrantyExcel(
          productBatchData.file,
          productBatchData.batchName.trim(),
          productBatchData.description || '',
          reservedSerialNos,
          documents,
        );
        setProductBatchData((current) => ({
          ...(current || {}),
          uploadResponse: data,
          isWarranty: true,
        }));
        toast.success('Warranty batch uploaded and approved');

        // successful_users[] is the authoritative source of the real
        // batch_user_id per created BatchUser (successful_users[].id) —
        // duplicate product/customer names are expected and each still gets
        // its own id. Fall back to a products/batch_users shape only for
        // safety, in case an older backend response omits successful_users.
        const batchId = data?.batch_id || data?.id || '';
        const createdUsers = data?.successful_users || data?.products || data?.batch_users || [];
        if (batchId && createdUsers.length > 0) {
          setWarrantyUpload({ batchId, batchName: data?.batch_name || productBatchData.batchName, users: createdUsers });
        } else {
          navigate('/org/batch-status');
        }
        return;
      }

      // No document attachment here at all — Product Excel upload no longer
      // supports row-level documents. QR1/QR2 come exclusively from the
      // verifier-report workflow (backend-assigned qr_slot); any internal-
      // only product document goes through a separate, standalone flow.
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
      navigate('/org/batch-status');
    } catch (error) {
      toast.error(getApiError(error, isWarranty ? 'Failed to submit warranty batch' : 'Failed to create product batch'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Product Costing">
      <div className="mx-auto w-full max-w-[1380px]">
        <StepWizard
          steps={isWarranty ? WARRANTY_VERIFICATION_STEPS : PRODUCT_VERIFICATION_STEPS}
          currentStep={isWarranty ? WARRANTY_VERIFICATION_STEP_META.costing.currentStep : PRODUCT_VERIFICATION_STEP_META.costing.currentStep}
          stepRoutes={isWarranty ? WARRANTY_VERIFICATION_STEP_ROUTES : PRODUCT_VERIFICATION_STEP_ROUTES}
        />

        <section className="mt-4">
          <PageHeader
            title="Total Cost Breakdown"
            subtitle="Cost based on the uploaded products and selected checks."
          />
        </section>

        {/* Sector / Service context bar */}
        <div className="mt-4 mb-2 flex flex-wrap items-center gap-2">
          {selectedProductSector && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 font-inter text-xs font-medium text-brand-blue">
              <Package size={12} />
              {selectedProductSector.title}
            </span>
          )}
          {selectedProductService && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 font-inter text-xs font-medium text-slate-700">
              {selectedProductService.title}
            </span>
          )}
        </div>

        {warrantyUpload ? (
        <div className="mt-3">
          <Card className="border border-blue-100 p-5 shadow-[0_16px_40px_-36px_rgba(37,99,235,0.28)]">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle size={18} />
              </div>
              <div>
                <h3 className="font-sora text-lg font-semibold text-slate-950">Warranty Batch Created</h3>
                <p className="font-inter text-xs text-slate-500">
                  {warrantyUpload.users.length} {warrantyUpload.users.length === 1 ? 'record' : 'records'} — optionally attach a
                  Warranty Report and/or Product Details document to each person below, or skip and do it later from Batch Status.
                </p>
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-100">
              <div className="max-h-[50vh] overflow-y-auto">
                <table className="w-full font-inter">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr className="border-b border-slate-100">
                      {['Product', 'Serial Number', 'Warranty Report', 'Product Details'].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {warrantyUpload.users.map((user, i) => {
                      // successful_users[].id is the real batch_user_id — never
                      // derive it from product_name/customer_name, which can repeat.
                      const batchUserId = user.id || user.product_id;
                      return (
                        <tr key={batchUserId || i} className="border-b border-slate-50 last:border-0">
                          <td className="px-4 py-3 text-sm font-medium text-slate-900">{user.product_name || user.customer_name || '—'}</td>
                          <td className="px-4 py-3 text-xs font-mono text-slate-400">{user.serial_no || user.serial_number || '—'}</td>
                          <td className="px-4 py-3">
                            <WarrantyDocumentCell
                              batchId={warrantyUpload.batchId}
                              batchUserId={batchUserId}
                              label="Warranty Report"
                              url={user.custom_fields?.warrenty_report || user.custom_fields?.warranty_report || null}
                              onDeleted={reloadWarrantyProducts}
                            />
                          </td>
                          <td className="px-4 py-3">
                            {/* Two independent slots — replacing/deleting Product
                                Details never touches Warranty Report, and vice versa. */}
                            <WarrantyDocumentCell
                              batchId={warrantyUpload.batchId}
                              batchUserId={batchUserId}
                              label="Product Details"
                              url={user.custom_fields?.product_details || null}
                              onDeleted={reloadWarrantyProducts}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <p className="font-inter text-xs text-slate-400">You can also manage these documents later from Batch Status.</p>
              <Button variant="primary" size="lg" onClick={() => navigate('/org/batch-status')} icon={ArrowRight}>
                Continue to Batch Status
              </Button>
            </div>
          </Card>
        </div>
        ) : (
        <div className="mt-3 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
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
                        {formatCurrency(item.price)} × {recordCount}{' '}
                        {recordCount === 1 ? 'product' : 'products'}
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
                  {recordCount} Products
                </span>
              </div>
            </div>
          </Card>

          <Card className="border border-blue-100 p-5 shadow-[0_16px_40px_-36px_rgba(37,99,235,0.28)]">
            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
              />
              <span className="text-sm leading-6 text-slate-700">
                I agree to this verification cost.
              </span>
            </label>

            <div className="mt-4 rounded-2xl bg-blue-50 px-4 py-4">
              <div className="flex items-center gap-2 text-sm text-brand-blue">
                <CheckSquare size={16} />
                <span className="font-medium">Ready to create batch</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Continuing creates the batch using the default certificate design.
              </p>
            </div>

            <div className="mt-5">
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleContinue}
                icon={submitting ? RefreshCw : ArrowRight}
                disabled={!agreed || recordCount <= 0 || submitting}
              >
                {submitting ? 'Creating Batch...' : isWarranty ? 'Submit Warranty Batch' : 'Continue'}
              </Button>
            </div>
          </Card>
        </div>
        )}
      </div>
    </AuthLayout>
  );
};

export default ProductCostBreakdown;
