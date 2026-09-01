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
import { ArrowRight, CheckCircle, ChevronDown, Download, FileText, Plus, RefreshCw, Upload, Users, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useApp } from '@/context/AppContext';
import {
  PRODUCT_VERIFICATION_STEPS,
  PRODUCT_VERIFICATION_STEP_META,
  PRODUCT_VERIFICATION_STEP_ROUTES,
  WARRANTY_SERVICE_HEADERS,
  VERIFICATION_SERVICE_HEADERS,
  VERIFICATION_REQUIRED_HEADERS,
} from '@/data/productVerificationFlow';
import { verificationAPI, triggerBlobDownload } from '@/services/api';

// "+" is preserved (not stripped to "_") since it's canonical to backend
// field names like third+party+qr1/third+party+qr2 — sanitizing it away
// would make those columns permanently unrecognizable against the canonical
// header list.
const sanitizeKey = (v) =>
  String(v || '').trim().toLowerCase().replace(/[^a-z0-9+]+/g, '_').replace(/^_+|_+$/g, '');

// product_name is always the first fixed column
const BASE_FIELD = { key: 'product_name', label: 'Product Name', fixed: true };

const downloadLocalFallback = (headers, fileName = 'product-template') => {
  const buildExample = (h) => {
    const k = h.toLowerCase();
    if (k.includes('customer')) return 'Aniket Jha';
    if (k.includes('sku')) return 'SKU-1001';
    if (k.includes('product')) return 'Example Product';
    if (k === 'category') return 'Electronics';
    if (k.includes('model')) return 'Model A';
    if (k.includes('brand')) return 'Acme Corp';
    if (k.includes('qr')) return 'https://example.com/qr/CODE123';
    if (k.includes('warrenty_report') || k.includes('warranty_report')) return 'report.pdf';
    if (k.includes('product_details')) return 'Premium electronics warranty pack';
    if (k.includes('serial')) return 'SN-1234';
    if (k.includes('purchase_date')) return '2026-05-16';
    if (k.includes('expiration_date')) return '2027-05-16';
    if (k.includes('created_time')) return '2026-05-16';
    if (k.includes('warranty_start')) return '2026-05-16';
    if (k.includes('warranty_end')) return '2027-05-16';
    if (k.includes('invoice')) return 'INV-001';
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

  // Warranty's fixed-field list is read straight from the backend's own
  // generated template (see the effect below) instead of trusting the
  // hardcoded WARRANTY_SERVICE_HEADERS to still match it — that constant
  // already drifted out of sync with the real backend once before.
  const [warrantyHeaders, setWarrantyHeaders] = useState(null);

  const serviceHeaders = selectedProductService?.id === 'warranty'
    ? (warrantyHeaders || WARRANTY_SERVICE_HEADERS)
    : VERIFICATION_SERVICE_HEADERS;

  // custom extra headers (excluding product_name which is fixed)
  const [customFields, setCustomFields] = useState([]);
  const [fieldInput, setFieldInput] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [excelFile, setExcelFile] = useState(null);

  // Document attachments — labels differ by warranty vs product flow.
  // "Warranty Report" is matched case/spacing-insensitively by the backend
  // (warranty_report / warrenty_report / "warranty report" / "warrenty
  // report" all work) and gets copied into custom_fields.warrenty_report —
  // the exact label text sent here doesn't have to match those variants
  // exactly, the backend normalises it.
  const _isWarrantyFlow = selectedProductService?.id === 'warranty';
  const DOC_LABEL_OPTIONS = _isWarrantyFlow
    ? [
        { value: 'Warranty Report',      label: 'Warranty Report' },
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
      { id: Date.now(), productName: '', sku: '', label: '', file: null },
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

  // Product+SKU rows parsed from the uploaded Excel — drives the product
  // picker dropdown. sku_no is now the mandatory, collision-proof matching
  // key the backend uses to attach a document to the right BatchUser (see
  // PART 5 of the SKU/document-association architecture): product_name alone
  // can repeat across rows, and the backend now explicitly rejects an
  // ambiguous doc_product_names match instead of guessing. So rows are
  // deduped and selected by sku_no, with product_name shown alongside purely
  // for readability (e.g. "Lakme Absolute Matte Lipstick (SKU: LAKME-001)").
  const [excelProducts, setExcelProducts] = useState([]); // [{ name, sku }]
  const [openProductDropdownId, setOpenProductDropdownId] = useState(null);

  useEffect(() => {
    if (!excelFile) { setExcelProducts([]); return; }
    const read = async () => {
      try {
        const buf = await excelFile.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const headers = (rows[0] || []).map((h) => sanitizeKey(h));
        // Warranty sheets can identify each row as either `product_name`
        // (the standard download-template column) or `customer_name` (seen
        // live in warranty sample/export data) — check both rather than
        // assuming one, so the product picker still works either way. (The
        // doc panel that uses this list only renders for the Product flow —
        // warranty sheets have no sku_no column, and skuIdx below just comes
        // back -1 for them, which is handled below.)
        const nameIdx = ['product_name', 'customer_name']
          .map((key) => headers.indexOf(key))
          .find((idx) => idx !== -1) ?? -1;
        if (nameIdx === -1) { setExcelProducts([]); return; }
        const skuIdx = headers.indexOf('sku_no');
        const seenKeys = new Set();
        const products = [];
        rows.slice(1).forEach((row) => {
          const name = String(row[nameIdx] ?? '').trim();
          if (!name) return;
          const sku = skuIdx !== -1 ? String(row[skuIdx] ?? '').trim() : '';
          // Dedupe by sku_no — the real unique identity per row. Falling
          // back to name only covers sheets with no sku_no column at all
          // (pre-migration files, or warranty, which doesn't render this
          // picker anyway); once sku_no is present it's authoritative, so
          // two rows with the same name but different SKUs both show up.
          const dedupeKey = sku || name;
          if (seenKeys.has(dedupeKey)) return;
          seenKeys.add(dedupeKey);
          products.push({ name, sku });
        });
        setExcelProducts(products);
      } catch { setExcelProducts([]); }
    };
    read();
  }, [excelFile]);

  const isWarranty = selectedProductService?.id === 'warranty';

  // Pulls the real column list out of the backend's own warranty-template
  // .xlsx (same file "Download Template" fetches) instead of trusting the
  // hardcoded WARRANTY_SERVICE_HEADERS to still match it. Falls back to that
  // constant silently on failure — nothing here blocks the flow.
  useEffect(() => {
    if (!isWarranty) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await verificationAPI.downloadWarrantyTemplate();
        const buf = await data.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const headers = (rows[0] || []).map((h) => sanitizeKey(h)).filter(Boolean);
        if (!cancelled && headers.length > 0) setWarrantyHeaders(headers);
      } catch {
        // silent — serviceHeaders already falls back to WARRANTY_SERVICE_HEADERS
      }
    })();
    return () => { cancelled = true; };
  }, [isWarranty]);

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

    // Validate doc entries — reject partial ones before proceeding. sku is
    // required alongside productName/label/file: it's set automatically by
    // picking a product from the dropdown (never typed), so a missing sku
    // here means the dropdown's Excel-parsed product list is stale relative
    // to the picked entry — surface that rather than sending an unsafe,
    // name-only match to the backend.
    const incompleteDocs = docEntries.filter(
      (e) =>
        (e.productName.trim() || e.label?.trim() || e.file) &&
        !(e.productName.trim() && e.sku?.trim() && e.label?.trim() && e.file)
    );
    if (incompleteDocs.length > 0) {
      toast.error(`${incompleteDocs.length} document attachment(s) are incomplete — pick a product and file, or remove them.`);
      return;
    }

    try {
      const arrayBuffer = await excelFile.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      const uploadedHeaders = (rows[0] || []).map((h) => sanitizeKey(h)).filter(Boolean);

      if (!isWarranty) {
        // product_name and sku_no are required for the normal Product flow
        // (sku_no is the mandatory, collision-proof document-matching key —
        // see VERIFICATION_REQUIRED_HEADERS) — the rest of
        // VERIFICATION_SERVICE_HEADERS (model_no, brand, third+party+qr2)
        // are optional and must never block Continue. third+party+qr1 is
        // intentionally absent from this list — the backend populates it
        // automatically when a Product document is uploaded, so it must
        // never be required or expected from the uploaded sheet.
        const missingHeaders = VERIFICATION_REQUIRED_HEADERS.filter((h) => !uploadedHeaders.includes(h));
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

      const validDocs = docEntries.filter((e) => e.productName.trim() && e.sku?.trim() && e.label?.trim() && e.file);

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

            {/* ══ TOP — Batch Name (full width) ══════════════════ */}
            <div className="border-b border-gray-100 bg-gray-50/60 px-8 py-6">
              <div>
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

                  {/* Columns + Custom tiles (warranty fields are fixed — no custom fields) */}
                  <div className={`grid gap-3 ${isWarranty ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
                      <p className="font-sora text-2xl font-bold text-brand-dark">{templateHeaders.length}</p>
                      <p className="mt-0.5 font-inter text-[11px] text-gray-400">Columns</p>
                    </div>
                    {!isWarranty && (
                      <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
                        <p className="font-sora text-2xl font-bold text-brand-dark">{customFields.length}</p>
                        <p className="mt-0.5 font-inter text-[11px] text-gray-400">Custom Fields</p>
                      </div>
                    )}
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
                      {docEntries.length > 0 && docEntries.every((e) => e.file && e.productName.trim() && e.sku?.trim() && e.label?.trim()) && (
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
                        { label: 'Docs ready (or skipped)', done: docEntries.length === 0 || docEntries.every((e) => e.file && e.productName.trim() && e.sku?.trim() && e.label?.trim()) },
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

              {/* ── RIGHT — Product Documents (Warranty Report label included
                  for warranty — backend maps it into custom_fields.warrenty_report) ──
                  Warranty now uses a post-upload, per-BatchUser document flow (keyed by
                  batch_user_id — see BatchStatus.jsx / ProductWarrantyUpload.jsx), since
                  this panel's pre-upload, name-matched attachment can't key by a
                  batch_user_id that doesn't exist yet. Kept unchanged for the Product flow. ── */}
              {isWarranty ? (
                <div className="flex-1 bg-gray-50 flex flex-col justify-center px-8 py-10">
                  <p className="mb-6 font-inter text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    How Warranty Documents work
                  </p>
                  {[
                    { icon: Upload, title: 'Upload the Excel', desc: 'Finish the steps on the left — this file becomes the batch.' },
                    { icon: Users, title: 'Batch is created', desc: 'Each row becomes a person record with its own ID.' },
                    { icon: FileText, title: 'Attach documents per person', desc: "From Batch Status, upload, view, replace, or delete each person's Warranty Document." },
                  ].map((step, i, arr) => {
                    const Icon = step.icon;
                    const isLast = i === arr.length - 1;
                    return (
                      <div key={step.title} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${isLast ? 'border-brand-blue/30 bg-brand-blue/10' : 'border-gray-200 bg-white'}`}>
                            <Icon size={15} className={isLast ? 'text-brand-blue' : 'text-gray-400'} />
                          </div>
                          {!isLast && <div className="my-1 w-px flex-1 bg-gray-200" style={{ minHeight: '18px' }} />}
                        </div>
                        <div className={isLast ? 'pb-0' : 'pb-6'}>
                          <p className="font-inter text-sm font-semibold text-brand-dark">{step.title}</p>
                          <p className="mt-0.5 max-w-[220px] font-inter text-xs text-gray-500">{step.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                  <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3">
                    <p className="font-inter text-[11px] text-brand-blue">
                      Once this batch is created, open it from <span className="font-semibold">Batch Status</span> to manage each person's Warranty Document.
                    </p>
                  </div>
                </div>
              ) : (
              <div className="flex min-w-0 flex-1 flex-col bg-gray-50">

                {/* Section header */}
                <div className="flex min-w-0 items-center justify-between gap-2 border-b border-gray-200 bg-white px-6 py-4">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${docEntries.length > 0 && docEntries.every((e) => e.file && e.productName.trim() && e.sku?.trim() && e.label?.trim()) ? 'bg-green-100' : 'bg-blue-100'}`}>
                      <FileText size={13} className={docEntries.length > 0 && docEntries.every((e) => e.file && e.productName.trim() && e.sku?.trim() && e.label?.trim()) ? 'text-green-600' : 'text-brand-blue'} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-inter text-sm font-semibold text-brand-dark">{isWarranty ? 'Warranty Documents' : 'Product Documents'}</p>
                      <p className="truncate font-inter text-[11px] text-gray-500">
                        {isWarranty ? 'Attach a Warranty Report or card to individual products' : 'Attach warranty cards or certificates to products'}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-md bg-gray-200 px-2 py-0.5 font-inter text-[10px] font-semibold text-gray-500">Optional</span>
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
                <div className="min-w-0 flex-1 overflow-x-auto bg-gray-50">

              {/* Empty state */}
              {docEntries.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white">
                    <FileText size={17} className="text-gray-400" />
                  </div>
                  <p className="max-w-xs font-inter text-xs text-gray-500">
                    {isWarranty
                      ? 'Optionally attach a Warranty Report, card, or certificate to individual products in your sheet.'
                      : 'Optionally attach warranty cards, certificates, or compliance docs to individual products in your sheet.'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Entry cards — min-w-max keeps each row's controls at a legible
                      width; the overflow-x-auto ancestor scrolls this instead of
                      blowing out the page when the panel is narrower than that. */}
                  <div className="min-w-max space-y-2 p-4">
                    {docEntries.map((entry, idx) => {
                      const isComplete = entry.productName.trim() && entry.sku?.trim() && entry.label?.trim() && entry.file;
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
                                  {entry.productName
                                    ? (entry.sku ? `${entry.productName} (SKU: ${entry.sku})` : entry.productName)
                                    : 'Select product…'}
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
                                    {excelProducts.length === 0 ? (
                                      <div className="px-4 py-5 text-center">
                                        <p className="font-inter text-xs text-gray-400">
                                          {excelFile ? 'No product_name column found in the file' : 'Upload your Excel file first to see products'}
                                        </p>
                                      </div>
                                    ) : (() => {
                                      // One product → one document only: a product already
                                      // picked in another row is hidden here so it can't be
                                      // selected twice. Keyed by sku_no — the real unique
                                      // identity per the backend contract — never by name,
                                      // which duplicate product names would break. The
                                      // current entry keeps its own pick visible so it still
                                      // shows as selected/changeable.
                                      const takenElsewhere = new Set(
                                        docEntries
                                          .filter((e) => e.id !== entry.id && e.sku?.trim())
                                          .map((e) => e.sku)
                                      );
                                      const availableProducts = excelProducts.filter(
                                        (p) => p.sku === entry.sku || !takenElsewhere.has(p.sku)
                                      );
                                      return availableProducts.length === 0 ? (
                                        <div className="px-4 py-5 text-center">
                                          <p className="font-inter text-xs text-gray-400">
                                            Every product already has a document assigned
                                          </p>
                                        </div>
                                      ) : (
                                      <div className="max-h-40 overflow-y-auto rounded-xl">
                                        {availableProducts.map((p) => (
                                          <div
                                            key={p.sku || p.name}
                                            role="button"
                                            onClick={() => {
                                              updateDocEntry(entry.id, { productName: p.name, sku: p.sku });
                                              setOpenProductDropdownId(null);
                                            }}
                                            className={`cursor-pointer px-3 py-2.5 font-inter text-sm transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-blue-50 hover:text-brand-blue ${
                                              entry.sku === p.sku
                                                ? 'bg-blue-50 font-semibold text-brand-blue'
                                                : 'text-brand-dark'
                                            }`}
                                          >
                                            {p.name}
                                            {p.sku && <span className="ml-1.5 font-mono text-[11px] text-gray-400">SKU: {p.sku}</span>}
                                          </div>
                                        ))}
                                      </div>
                                      );
                                    })()}
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Doc type — a dropdown of exact backend-recognised labels
                                rather than free text, so "Warranty Report" always matches
                                what the backend looks for (it maps that label into
                                custom_fields.warrenty_report — a typo left free text
                                could easily miss). */}
                            <select
                              value={entry.label}
                              onChange={(e) => updateDocEntry(entry.id, { label: e.target.value })}
                              className={`w-32 shrink-0 rounded-xl border px-3 py-2 font-inter text-sm focus:border-brand-blue focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/15 ${
                                isComplete ? 'border-green-200 bg-white text-brand-dark' : 'border-gray-300 bg-white text-brand-dark'
                              } ${entry.label ? '' : 'text-gray-400'}`}
                            >
                              <option value="" disabled>Doc type</option>
                              {DOC_LABEL_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>

                            {/* File */}
                            {entry.file ? (
                              <div className="flex w-40 shrink-0 items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2">
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
                                className="flex w-40 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-400 py-2 font-inter text-xs text-gray-500 transition-colors hover:border-brand-blue hover:bg-blue-50/40 hover:text-brand-blue"
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
                        {docEntries.filter((e) => e.file && e.productName.trim() && e.sku?.trim() && e.label?.trim()).length} of {docEntries.length} complete
                      </span>
                      {docEntries.every((e) => e.file && e.productName.trim() && e.sku?.trim() && e.label?.trim()) && (
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

              </div>
              )}{/* end RIGHT — Product Documents */}

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
            {isWarranty ? (
              <>Warranty columns for{' '}
                <span className="font-semibold text-brand-dark">{selectedProductService?.title}</span>{' '}
                are fixed — download the template as-is.</>
            ) : (
              <>Default columns for{' '}
                <span className="font-semibold text-brand-dark">{selectedProductService?.title}</span>{' '}
                are pre-filled. Add any extra columns you need, then download.</>
            )}
          </p>

          {/* Service default fields */}
          <div>
            <p className="font-inter text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              {isWarranty ? 'Fixed Fields' : 'Default Fields'} ({selectedProductService?.title})
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
                  {isWarranty ? (
                    <span className="rounded-full bg-brand-blue/10 px-2.5 py-1 font-inter text-[10px] font-semibold uppercase text-brand-blue">
                      Fixed
                    </span>
                  ) : VERIFICATION_REQUIRED_HEADERS.includes(key) && (
                    <span className="rounded-full bg-red-50 px-2.5 py-1 font-inter text-[10px] font-semibold uppercase text-red-500">
                      Required
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Add custom field — not applicable to warranty (fields are fixed) */}
          {!isWarranty && (
            <>
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
            </>
          )}

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
