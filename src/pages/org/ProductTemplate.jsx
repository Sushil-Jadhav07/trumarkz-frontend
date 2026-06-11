import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { StepWizard } from '@/components/ui/StepWizard';
import { FileUpload } from '@/components/ui/FileUpload';
import { ArrowRight, Download, Plus, RefreshCw, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useApp } from '@/context/AppContext';
import {
  PRODUCT_VERIFICATION_STEPS,
  PRODUCT_VERIFICATION_STEP_META,
  PRODUCT_VERIFICATION_STEP_ROUTES,
  WARRANTY_SERVICE_HEADERS,
  VERIFICATION_SERVICE_HEADERS,
} from '@/data/productVerificationFlow';
import { verificationAPI, triggerBlobDownload, getApiError } from '@/services/api';

const sanitizeKey = (v) =>
  String(v || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

// product_name is always the first fixed column
const BASE_FIELD = { key: 'product_name', label: 'Product Name', fixed: true };

const downloadLocalFallback = (headers, fileName = 'product-template') => {
  const buildExample = (h) => {
    const k = h.toLowerCase();
    if (k.includes('product')) return 'Example Product';
    if (k.includes('serial')) return 'SN-001';
    if (k.includes('warranty_start')) return '2026-05-16';
    if (k.includes('warranty_end')) return '2027-05-16';
    if (k.includes('invoice')) return 'INV-001';
    if (k.includes('model')) return 'Model A';
    if (k.includes('batch')) return 'BATCH-001';
    if (k.includes('certificate')) return 'CERT-001';
    return `Example ${h}`;
  };
  const ws = XLSX.utils.aoa_to_sheet([headers, headers.map(buildExample)]);
  ws['!cols'] = headers.map((h) => ({ wch: Math.max(18, h.length + 4) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Products');
  XLSX.writeFile(wb, `${fileName}.xlsx`);
};

export const ProductTemplate = () => {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const {
    selectedProductSector,
    selectedProductService,
    selectedProductTemplate,
    setProductBatchData,
  } = useApp();

  const serviceHeaders = selectedProductService?.id === 'warranty'
    ? WARRANTY_SERVICE_HEADERS
    : VERIFICATION_SERVICE_HEADERS;

  // custom extra headers (excluding product_name which is fixed)
  const [customFields, setCustomFields] = useState([]);
  const [fieldInput, setFieldInput] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [batchNameValue, setBatchNameValue] = useState(() => {
    const d = new Date();
    const sector = selectedProductSector?.title || 'Product';
    return `${sector} Batch ${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
  });

  useEffect(() => {
    if (!selectedProductSector || !selectedProductService) {
      navigate('/org/product/sector', { replace: true });
    }
  }, [selectedProductSector, selectedProductService, navigate]);

  const templateHeaders = useMemo(
    () => [
      ...serviceHeaders,
      ...customFields.filter((f) => !serviceHeaders.includes(f)),
    ],
    [serviceHeaders, customFields]
  );

  const handleAddField = () => {
    const key = sanitizeKey(fieldInput);
    if (!key) { toast.error('Enter a valid field name'); return; }
    if (templateHeaders.includes(key)) { toast.error('Field already exists'); return; }
    setCustomFields((prev) => [...prev, key]);
    setFieldInput('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddField(); } };
  const handleRemoveField = (key) => setCustomFields((prev) => prev.filter((f) => f !== key));

  const handleDownload = async () => {
    if (!selectedProductSector?.categoryId) {
      toast.error('Sector category not found — please go back and re-select');
      return;
    }
    setDownloading(true);
    try {
      const normalised = templateHeaders.map((h) =>
        h.trim().toLowerCase().replace(/\s+/g, '_')
      );
      const { data } = await verificationAPI.generateProductTemplate(
        selectedProductSector.categoryId,
        normalised
      );
      triggerBlobDownload(data, `${batchNameValue || 'product-template'}.xlsx`);
      toast.success('Template downloaded');
    } catch {
      downloadLocalFallback(templateHeaders, batchNameValue || 'product-template');
      toast.success('Template downloaded (local fallback)');
    } finally {
      setDownloading(false);
    }
  };

  const handleContinue = async () => {
    if (!excelFile) { toast.error('Please upload the completed Excel file'); return; }
    try {
      const arrayBuffer = await excelFile.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      const recordCount = rows
        .slice(1)
        .filter((row) => Array.isArray(row) && row.some((cell) => String(cell ?? '').trim() !== ''))
        .length;
      if (recordCount <= 0) { toast.error('The uploaded file has no data rows'); return; }

      setProductBatchData({
        file: excelFile,
        batchName: batchNameValue,
        description: '',
        recordCount,
        templateHeaders,
        fileName: excelFile.name,
        costConfirmed: false,
        uploadResponse: null,
      });
      navigate('/org/product/costing');
    } catch {
      toast.error('Failed to read the uploaded file');
    }
  };

  return (
    <AuthLayout title="Upload Product Data">
      <div className="w-full mx-auto lg:max-w-none">
        <StepWizard
          steps={PRODUCT_VERIFICATION_STEPS}
          currentStep={PRODUCT_VERIFICATION_STEP_META.template.currentStep}
          stepRoutes={PRODUCT_VERIFICATION_STEP_ROUTES}
        />

        <PageHeader
          title="Upload Product Data"
          subtitle="Download the template, fill it in, then upload the completed file."
          action={
            <Button variant="outline" size="sm" icon={Download} onClick={() => setModalOpen(true)}>
              Download Template
            </Button>
          }
        />

        <div>
          <Card className="p-6 border border-blue-100 shadow-[0_18px_48px_-40px_rgba(37,99,235,0.28)] space-y-5">
            <div className="flex items-center gap-3 pb-1 border-b border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-brand-blue flex items-center justify-center shrink-0">
                <Upload size={18} />
              </div>
              <div>
                <h3 className="font-sora text-base font-semibold text-slate-950">Upload Batch File</h3>
                <p className="font-inter text-xs text-slate-500 mt-0.5">
                  {selectedProductSector?.title} · {selectedProductService?.title}
                </p>
              </div>
            </div>

            <div>
              <label className="block font-inter text-sm font-medium text-slate-800 mb-1.5">
                Batch Name
              </label>
              <input
                value={batchNameValue}
                onChange={(e) => setBatchNameValue(e.target.value)}
                className="w-full rounded-xl border-2 border-slate-200 px-4 py-2.5 font-inter text-sm text-slate-950 outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition-all"
                placeholder="e.g. Electronics Batch June 2026"
              />
            </div>

            <FileUpload
              label="Completed Excel file (.xlsx)"
              fileType="xlsx"
              accept={{ 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }}
              selectedFile={excelFile}
              onFileSelect={setExcelFile}
              onRemove={() => setExcelFile(null)}
            />

            <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 space-y-2">
              <div className="flex items-center justify-between font-inter text-sm">
                <span className="text-slate-500">Template columns</span>
                <span className="font-semibold text-slate-900">{templateHeaders.length}</span>
              </div>
              <div className="flex items-center justify-between font-inter text-sm">
                <span className="text-slate-500">Custom fields added</span>
                <span className="font-semibold text-slate-900">{customFields.length}</span>
              </div>
              <div className="flex items-center justify-between font-inter text-sm">
                <span className="text-slate-500">File attached</span>
                <span className={`font-semibold ${excelFile ? 'text-brand-blue' : 'text-slate-400'}`}>
                  {excelFile ? excelFile.name : 'None'}
                </span>
              </div>
            </div>

            <Button variant="primary" size="lg" className="w-full" onClick={handleContinue} icon={ArrowRight}>
              Continue
            </Button>
          </Card>
        </div>
      </div>

      {/* Download Template Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Setup Product Template" size="2xl">
        <div className="space-y-5">
          <p className="font-inter text-sm text-slate-500">
            Default columns for{' '}
            <span className="font-semibold text-brand-dark">{selectedProductService?.title}</span>{' '}
            are pre-filled. Add any extra columns you need, then download.
          </p>

          {/* Service default fields */}
          <div>
            <p className="font-inter text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Default Fields ({selectedProductService?.title})
            </p>
            <div className="space-y-2">
              {serviceHeaders.map((key) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5"
                >
                  <div>
                    <p className="font-inter text-sm font-medium text-slate-800 capitalize">
                      {key.replace(/_/g, ' ')}
                    </p>
                    <p className="font-mono text-[11px] text-slate-400">{key}</p>
                  </div>
                  {key === BASE_FIELD.key && (
                    <span className="rounded-full bg-brand-blue/10 px-2.5 py-1 font-inter text-[10px] font-semibold uppercase text-brand-blue">
                      Fixed
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Add custom field */}
          <div>
            <p className="font-inter text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Custom Fields
            </p>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={fieldInput}
                onChange={(e) => setFieldInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. purchase_date"
                className="flex-1 rounded-xl border-2 border-slate-200 px-4 py-2.5 font-inter text-sm outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition-all"
              />
              <Button variant="primary" size="sm" icon={Plus} onClick={handleAddField}>
                Add
              </Button>
            </div>
            <p className="font-inter text-[11px] text-slate-400 mt-1.5">Use snake_case — press Enter or click Add.</p>
          </div>

          {customFields.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {customFields.map((field) => (
                <span
                  key={field}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 font-inter text-sm text-slate-700"
                >
                  {field}
                  <button
                    type="button"
                    onClick={() => handleRemoveField(field)}
                    className="text-slate-400 hover:text-red-500 transition-colors ml-0.5"
                  >
                    <X size={13} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Final columns preview */}
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
            <p className="font-inter text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Final columns ({templateHeaders.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {templateHeaders.map((col) => (
                <span
                  key={col}
                  className="rounded-full border border-slate-200 bg-white px-2.5 py-1 font-inter text-[11px] font-medium text-slate-600"
                >
                  {col}
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="ghost" className="flex-1" onClick={() => setModalOpen(false)}>
              Close
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              icon={downloading ? RefreshCw : Download}
              disabled={downloading}
              onClick={handleDownload}
            >
              {downloading ? 'Downloading…' : 'Download Template'}
            </Button>
          </div>
        </div>
      </Modal>
    </AuthLayout>
  );
};

export default ProductTemplate;
