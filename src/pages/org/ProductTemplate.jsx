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
import { ArrowRight, CheckCircle, ChevronDown, Download, FileText, Plus, RefreshCw, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useApp } from '@/context/AppContext';
import {
  PRODUCT_VERIFICATION_STEPS,
  PRODUCT_VERIFICATION_STEP_META,
  PRODUCT_VERIFICATION_STEP_ROUTES,
  WARRANTY_SERVICE_HEADERS,
  VERIFICATION_SERVICE_HEADERS,
} from '@/data/productVerificationFlow';
import { verificationAPI, triggerBlobDownload } from '@/services/api';

const sanitizeKey = (v) =>
  String(v || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

// product_name is always the first fixed column
const BASE_FIELD = { key: 'product_name', label: 'Product Name', fixed: true };

const downloadLocalFallback = (headers, fileName = 'product-template') => {
  const buildExample = (h) => {
    const k = h.toLowerCase();
    if (k.includes('product')) return 'Example Product';
    if (k === 'category') return 'Electronics';
    if (k.includes('serial')) return 'SN-001';
    if (k.includes('purchase_date')) return '2026-05-16';
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

  // Document attachments — labels differ by warranty vs product flow
  const _isWarrantyFlow = selectedProductService?.id === 'warranty';
  const DOC_LABEL_OPTIONS = _isWarrantyFlow
    ? [
        { value: 'warranty_card',        label: 'Warranty Card' },
        { value: 'warranty_certificate', label: 'Warranty Certificate' },
      ]
    : [
        { value: 'certificate',    label: 'Certificate' },
        { value: 'warranty_card',  label: 'Warranty Card' },
        { value: 'compliance_doc', label: 'Compliance Doc' },
      ];
  const docFileInputRef = useRef(null);
  const [docEntries, setDocEntries] = useState([]);
  const [activeDocIdx, setActiveDocIdx] = useState(null);

  const addDocEntry = () =>
    setDocEntries((prev) => [
      ...prev,
      { id: Date.now(), productName: '', label: '', file: null },
    ]);

  const removeDocEntry = (id) =>
    setDocEntries((prev) => prev.filter((e) => e.id !== id));

  const updateDocEntry = (id, patch) =>
    setDocEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  const openDocFilePicker = (idx) => {
    setActiveDocIdx(idx);
    docFileInputRef.current?.click();
  };

  const handleDocFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file || activeDocIdx === null) return;
    setDocEntries((prev) =>
      prev.map((entry, i) => (i === activeDocIdx ? { ...entry, file } : entry))
    );
    e.target.value = '';
    setActiveDocIdx(null);
  };

  // Product names parsed from the uploaded Excel — drives the product name dropdown
  const [excelProductNames, setExcelProductNames] = useState([]);
  const [openProductDropdownId, setOpenProductDropdownId] = useState(null);

  useEffect(() => {
    if (!excelFile) { setExcelProductNames([]); return; }
    const read = async () => {
      try {
        const buf = await excelFile.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const headers = (rows[0] || []).map((h) => sanitizeKey(h));
        const nameIdx = headers.indexOf('product_name');
        if (nameIdx === -1) { setExcelProductNames([]); return; }
        const names = rows.slice(1)
          .map((row) => String(row[nameIdx] ?? '').trim())
          .filter(Boolean);
        setExcelProductNames([...new Set(names)]);
      } catch { setExcelProductNames([]); }
    };
    read();
  }, [excelFile]);

  const isWarranty = selectedProductService?.id === 'warranty';
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
    setDownloading(true);
    try {
      if (isWarranty) {
        const { data } = await verificationAPI.downloadWarrantyTemplate();
        triggerBlobDownload(data, `${batchNameValue || 'warranty-template'}.xlsx`);
        toast.success('Template downloaded');
      } else {
        const normalised = templateHeaders.map((h) =>
          h.trim().toLowerCase().replace(/\s+/g, '_')
        );
        const { data } = await verificationAPI.generateProductTemplate(normalised);
        triggerBlobDownload(data, `${batchNameValue || 'product-template'}.xlsx`);
        toast.success('Template downloaded');
      }
    } catch {
      downloadLocalFallback(templateHeaders, batchNameValue || 'product-template');
      toast.success('Template downloaded (local fallback)');
    } finally {
      setDownloading(false);
    }
  };

  const handleContinue = async () => {
    if (!excelFile) { toast.error('Please upload the completed Excel file'); return; }

    // Validate doc entries — reject partial ones before proceeding
    const incompleteDocs = docEntries.filter(
      (e) =>
        (e.productName.trim() || e.label?.trim() || e.file) &&
        !(e.productName.trim() && e.label?.trim() && e.file)
    );
    if (incompleteDocs.length > 0) {
      toast.error(`${incompleteDocs.length} document attachment(s) are incomplete — fill product name and file or remove them.`);
      return;
    }

    try {
      const arrayBuffer = await excelFile.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      const uploadedHeaders = (rows[0] || []).map((h) => sanitizeKey(h)).filter(Boolean);

      if (!isWarranty) {
        const missingHeaders = VERIFICATION_SERVICE_HEADERS.filter((h) => !uploadedHeaders.includes(h));
        if (missingHeaders.length > 0) {
          toast.error(`Missing required columns: ${missingHeaders.join(', ')}`);
          return;
        }
      }

      const recordCount = rows
        .slice(1)
        .filter((row) => Array.isArray(row) && row.some((cell) => String(cell ?? '').trim() !== ''))
        .length;
      if (recordCount <= 0) { toast.error('The uploaded file has no data rows'); return; }

      const validDocs = docEntries.filter((e) => e.productName.trim() && e.label?.trim() && e.file);

      setProductBatchData({
        file: excelFile,
        batchName: batchNameValue,
        description: '',
        recordCount,
        templateHeaders,
        fileName: excelFile.name,
        costConfirmed: false,
        uploadResponse: null,
        docEntries: validDocs,
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
          <Card className="overflow-hidden border border-gray-100 p-0">

            {/* ══ TOP — Context + Batch Name (full width) ══════════════════ */}
            <div className="border-b border-gray-100 bg-gray-50/60 px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded-lg border border-brand-blue/20 bg-brand-blue/10 px-2.5 py-1 font-inter text-xs font-semibold text-brand-blue">
                    {selectedProductSector?.title}
                  </span>
                  <span className="font-inter text-xs text-gray-300">→</span>
                  <span className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 font-inter text-xs font-semibold text-gray-500">
                    {selectedProductService?.title}
                  </span>
                </div>
              </div>
              <div className="mt-5">
                <label className="mb-1.5 block font-inter text-xs font-semibold uppercase tracking-widest text-gray-400">
                  Batch Name
                </label>
                <input
                  value={batchNameValue}
                  onChange={(e) => setBatchNameValue(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 font-inter text-sm font-medium text-brand-dark outline-none transition-all placeholder:text-gray-300 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
                  placeholder="e.g. Electronics Batch June 2026"
                />
              </div>
            </div>

            {/* ══ BODY — Two columns ══════════════════════════════════════ */}
            <div className="flex min-h-0 flex-col lg:flex-row">

              {/* ── LEFT — Upload Data File + Summary ─────────────────── */}
              <div className="flex w-1/2 shrink-0 flex-col border-b border-gray-100 bg-gray-50/30 lg:border-b-0 lg:border-r">

                {/* Section header */}
                <div className="flex items-center gap-2.5 border-b border-gray-100 bg-gray-50/60 px-6 py-4">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${excelFile ? 'bg-green-100' : 'bg-blue-50'}`}>
                    <Upload size={13} className={excelFile ? 'text-green-600' : 'text-brand-blue'} />
                  </div>
                  <div>
                    <p className="font-inter text-sm font-semibold text-brand-dark">Upload Data File</p>
                    <p className="font-inter text-[11px] text-gray-400">.xlsx · Max 5 MB</p>
                  </div>
                  {excelFile && (
                    <span className="ml-auto flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 font-inter text-[10px] font-bold text-green-700">
                      <CheckCircle size={10} /> Ready
                    </span>
                  )}
                </div>

                {/* File upload zone */}
                <div className="border-b border-gray-100 p-6">
                  <FileUpload
                    label="Completed Excel file (.xlsx)"
                    fileType="xlsx"
                    accept={{ 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }}
                    selectedFile={excelFile}
                    onFileSelect={setExcelFile}
                    onRemove={() => setExcelFile(null)}
                  />
                </div>

                {/* Stats */}
                <div className="flex-1 space-y-3 p-6">

                  {/* Columns + Custom tiles */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
                      <p className="font-sora text-2xl font-bold text-brand-dark">{templateHeaders.length}</p>
                      <p className="mt-0.5 font-inter text-[11px] text-gray-400">Columns</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
                      <p className="font-sora text-2xl font-bold text-brand-dark">{customFields.length}</p>
                      <p className="mt-0.5 font-inter text-[11px] text-gray-400">Custom Fields</p>
                    </div>
                  </div>

                  {/* Docs stat */}
                  <div className={`rounded-xl border p-4 transition-colors ${docEntries.length > 0 ? 'border-blue-100 bg-blue-50/40' : 'border-gray-200 bg-white'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-inter text-[10px] font-bold uppercase tracking-widest text-gray-400">Documents</p>
                        <p className={`mt-0.5 font-inter text-sm font-semibold ${docEntries.length > 0 ? 'text-brand-dark' : 'text-gray-300'}`}>
                          {docEntries.length > 0
                            ? `${docEntries.filter((e) => e.file).length} / ${docEntries.length} attached`
                            : 'None attached'}
                        </p>
                      </div>
                      {docEntries.length > 0 && docEntries.every((e) => e.file && e.productName.trim() && e.label?.trim()) && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 font-inter text-[10px] font-bold text-green-700">All ready</span>
                      )}
                    </div>
                  </div>

                  {/* Checklist */}
                  <div className="rounded-xl border border-gray-100 bg-white p-4">
                    <p className="mb-3 font-inter text-[10px] font-bold uppercase tracking-widest text-gray-400">Checklist</p>
                    <div className="space-y-2.5">
                      {[
                        { label: 'Batch name set',          done: Boolean(batchNameValue.trim()) },
                        { label: 'Excel file uploaded',     done: Boolean(excelFile) },
                        { label: 'Docs ready (or skipped)', done: docEntries.length === 0 || docEntries.every((e) => e.file && e.productName.trim() && e.label?.trim()) },
                      ].map(({ label, done }) => (
                        <div key={label} className="flex items-center gap-2.5">
                          <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-colors ${done ? 'bg-green-100' : 'bg-gray-100'}`}>
                            {done
                              ? <CheckCircle size={10} className="text-green-600" />
                              : <div className="h-1.5 w-1.5 rounded-full bg-gray-300" />}
                          </div>
                          <span className={`font-inter text-xs ${done ? 'text-brand-dark' : 'text-gray-400'}`}>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>{/* end LEFT — Upload Data File */}

              {/* ── RIGHT — Product Documents ─────────────────────────── */}
              <div className="flex-1 bg-gray-50">

                {/* Section header */}
                <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
                  <div className="flex items-center gap-2.5">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${docEntries.length > 0 && docEntries.every((e) => e.file && e.productName.trim() && e.label?.trim()) ? 'bg-green-100' : 'bg-blue-100'}`}>
                      <FileText size={13} className={docEntries.length > 0 && docEntries.every((e) => e.file && e.productName.trim() && e.label?.trim()) ? 'text-green-600' : 'text-brand-blue'} />
                    </div>
                    <div>
                      <p className="font-inter text-sm font-semibold text-brand-dark">Product Documents</p>
                      <p className="font-inter text-[11px] text-gray-500">Attach warranty cards or certificates to products</p>
                    </div>
                    <span className="rounded-md bg-gray-200 px-2 py-0.5 font-inter text-[10px] font-semibold text-gray-500">Optional</span>
                  </div>
                  <button
                    type="button"
                    onClick={addDocEntry}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-brand-blue/30 bg-brand-blue/10 px-3 py-1.5 font-inter text-xs font-semibold text-brand-blue transition-colors hover:bg-brand-blue hover:text-white"
                  >
                    <Plus size={12} />
                    {docEntries.length === 0 ? 'Add Document' : 'Add More'}
                  </button>
                </div>

                {/* ── Document entries ── */}
                <div className="bg-gray-50">

              {/* Empty state */}
              {docEntries.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white">
                    <FileText size={17} className="text-gray-400" />
                  </div>
                  <p className="max-w-xs font-inter text-xs text-gray-500">
                    Optionally attach warranty cards, certificates, or compliance docs to individual products in your sheet.
                  </p>
                </div>
              ) : (
                <>
                  {/* Entry cards */}
                  <div className="space-y-2 p-4">
                    {docEntries.map((entry, idx) => {
                      const isComplete = entry.productName.trim() && entry.label?.trim() && entry.file;
                      return (
                        <div
                          key={entry.id}
                          className={`rounded-xl border p-3 transition-colors ${
                            isComplete
                              ? 'border-green-200 bg-green-50'
                              : 'border-gray-200 bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {/* Index / done indicator */}
                            <div
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-inter text-[11px] font-bold transition-colors ${
                                isComplete
                                  ? 'bg-green-100 text-green-600'
                                  : 'bg-gray-100 border border-gray-300 text-gray-500'
                              }`}
                            >
                              {isComplete
                                ? <CheckCircle size={14} />
                                : String(idx + 1).padStart(2, '0')}
                            </div>

                            {/* Product name dropdown */}
                            <div className="relative min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenProductDropdownId(
                                    openProductDropdownId === entry.id ? null : entry.id
                                  )
                                }
                                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 font-inter text-sm transition-colors focus:outline-none ${
                                  openProductDropdownId === entry.id
                                    ? 'border-brand-blue bg-white ring-2 ring-brand-blue/15'
                                    : isComplete
                                    ? 'border-green-200 bg-white text-brand-dark'
                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                }`}
                              >
                                <span className={`truncate text-sm ${entry.productName ? 'text-brand-dark' : 'text-gray-400'}`}>
                                  {entry.productName || 'Select product…'}
                                </span>
                                <ChevronDown
                                  size={13}
                                  className={`ml-2 shrink-0 text-gray-400 transition-transform duration-200 ${
                                    openProductDropdownId === entry.id ? 'rotate-180' : ''
                                  }`}
                                />
                              </button>

                              {openProductDropdownId === entry.id && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={() => setOpenProductDropdownId(null)} />
                                  <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-full rounded-xl border border-gray-200 bg-white">
                                    {excelProductNames.length === 0 ? (
                                      <div className="px-4 py-5 text-center">
                                        <p className="font-inter text-xs text-gray-400">
                                          {excelFile ? 'No product_name column found in the file' : 'Upload your Excel file first to see products'}
                                        </p>
                                      </div>
                                    ) : (
                                      <div className="max-h-40 overflow-y-auto rounded-xl">
                                        {excelProductNames.map((name) => (
                                          <div
                                            key={name}
                                            role="button"
                                            onClick={() => {
                                              updateDocEntry(entry.id, { productName: name });
                                              setOpenProductDropdownId(null);
                                            }}
                                            className={`cursor-pointer px-3 py-2.5 font-inter text-sm transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-blue-50 hover:text-brand-blue ${
                                              entry.productName === name
                                                ? 'bg-blue-50 font-semibold text-brand-blue'
                                                : 'text-brand-dark'
                                            }`}
                                          >
                                            {name}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Doc type */}
                            <input
                              type="text"
                              value={entry.label}
                              onChange={(e) => updateDocEntry(entry.id, { label: e.target.value })}
                              placeholder="Doc type"
                              className={`w-32 shrink-0 rounded-xl border px-3 py-2 font-inter text-sm placeholder-gray-400 focus:border-brand-blue focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/15 ${
                                isComplete ? 'border-green-200 bg-white text-brand-dark' : 'border-gray-300 bg-white text-brand-dark'
                              }`}
                            />

                            {/* File */}
                            {entry.file ? (
                              <div className="flex w-44 shrink-0 items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2">
                                <CheckCircle size={13} className="shrink-0 text-green-600" />
                                <span className="min-w-0 flex-1 truncate font-inter text-xs font-medium text-green-700">
                                  {entry.file.name}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateDocEntry(entry.id, { file: null })}
                                  className="shrink-0 text-green-400 transition-colors hover:text-red-500"
                                >
                                  <X size={11} />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openDocFilePicker(idx)}
                                className="flex w-44 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-400 py-2 font-inter text-xs text-gray-500 transition-colors hover:border-brand-blue hover:bg-blue-50/40 hover:text-brand-blue"
                              >
                                <Upload size={12} />
                                Pick file
                              </button>
                            )}

                            {/* Remove */}
                            <button
                              type="button"
                              onClick={() => removeDocEntry(entry.id)}
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer strip when entries exist */}
                  {docEntries.length > 0 && (
                    <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-2.5">
                      <span className="font-inter text-[11px] text-gray-500">
                        {docEntries.filter((e) => e.file && e.productName.trim() && e.label?.trim()).length} of {docEntries.length} complete
                      </span>
                      {docEntries.every((e) => e.file && e.productName.trim() && e.label?.trim()) && (
                        <span className="flex items-center gap-1 font-inter text-[11px] font-semibold text-green-600">
                          <CheckCircle size={11} /> All ready
                        </span>
                      )}
                    </div>
                  )}

                  <input
                    ref={docFileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx"
                    onChange={handleDocFileChange}
                    className="hidden"
                  />
                </>
              )}
              </div>{/* end doc entries container */}

              </div>{/* end RIGHT — Product Documents */}

            </div>{/* end body flex row */}

            {/* ══ BOTTOM — Continue button (full width) ══════════════════ */}
            <div className="border-t border-gray-100 bg-white px-8 py-5">
              <Button variant="primary" size="lg" className="w-full" onClick={handleContinue} icon={ArrowRight}>
                Continue
              </Button>
            </div>

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
