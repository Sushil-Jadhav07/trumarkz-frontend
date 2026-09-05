import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { StepWizard } from '@/components/ui/StepWizard';
import { FileUpload } from '@/components/ui/FileUpload';
import { ArrowRight, CheckCircle, Download, FileText, Plus, RefreshCw, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useApp } from '@/context/AppContext';
import {
  PRODUCT_VERIFICATION_STEPS,
  PRODUCT_VERIFICATION_STEP_META,
  PRODUCT_VERIFICATION_STEP_ROUTES,
  WARRANTY_VERIFICATION_STEPS,
  WARRANTY_VERIFICATION_STEP_META,
  WARRANTY_VERIFICATION_STEP_ROUTES,
  WARRANTY_SERVICE_HEADERS,
  VERIFICATION_SERVICE_HEADERS,
  VERIFICATION_REQUIRED_HEADERS,
} from '@/data/productVerificationFlow';
import { verificationAPI, triggerBlobDownload, getApiError } from '@/services/api';

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
    // third+party+qr1/qr2 must always download blank — backend-populated
    // only, via the verifier-report qr_slot workflow, never filled by hand.
    if (k.includes('qr')) return '';
    if (k.includes('customer')) return 'Aniket Jha';
    if (k.includes('sku')) return 'SKU-1001';
    if (k.includes('product')) return 'Example Product';
    if (k === 'category') return 'Electronics';
    if (k.includes('model')) return 'Model A';
    if (k.includes('brand')) return 'Acme Corp';
    if (k.includes('purchase_date')) return '2026-05-16';
    if (k.includes('expiration_date')) return '2027-05-16';
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

// One local (in-memory only) upload slot for a single warranty record's
// Warranty Report or Product Details file — nothing is sent anywhere until
// the final warranty-upload submit; this only stages a File object.
const WarrantyDocSlot = ({ label, file, onChange, onClear }) => {
  const inputRef = useRef(null);
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50/60 px-3 py-2">
      <input
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        className="hidden"
        ref={inputRef}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) onChange(f);
        }}
      />
      <div className="min-w-0 flex-1">
        <p className="font-inter text-[11px] font-semibold text-gray-500">{label}</p>
        <p className={`truncate font-inter text-[11px] ${file ? 'text-brand-dark' : 'text-gray-300'}`}>
          {file ? file.name : 'Not attached'}
        </p>
      </div>
      {file ? (
        <button
          type="button"
          onClick={onClear}
          title="Remove"
          className="shrink-0 text-gray-400 transition-colors hover:text-red-500"
        >
          <X size={13} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-dashed border-gray-300 px-2 py-1 font-inter text-[11px] font-semibold text-gray-500 transition-colors hover:border-brand-blue hover:text-brand-blue"
        >
          <Upload size={11} /> Attach
        </button>
      )}
    </div>
  );
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

  const isWarranty = selectedProductService?.id === 'warranty';

  // Pre-batch serial reservation — the backend parses the uploaded Excel and
  // reserves a globally-unique TMZ-W-XXXXXXXX serial per valid row from a
  // central registry, before any Batch/BatchUser exists. Response:
  // { total_reserved, reserved_serial_nos }. These are sent back verbatim,
  // in the same order, to /warranty-upload as reserved_serial_nos — never
  // reordered, split, or generated client-side. This is purely an internal
  // workflow detail: the reservation call and its TMZ-W serials are NEVER
  // shown to the org user (see excelRows/docSelections below) — the user
  // only ever sees their own Excel's record names and a document-upload UI
  // per record.
  const [warrantyReservation, setWarrantyReservation] = useState(null);
  const [warrantyReserving, setWarrantyReserving] = useState(false);

  const runWarrantyReservation = useCallback((file) => {
    if (!file) return;
    setWarrantyReserving(true);
    setWarrantyReservation(null);
    verificationAPI.reserveWarrantySerials(file)
      .then(({ data }) => setWarrantyReservation(data))
      .catch((err) => toast.error(getApiError(err, 'Failed to process the uploaded file')))
      .finally(() => setWarrantyReserving(false));
  }, []);

  // "Same Excel Rule": re-picking or replacing the Excel file must clear any
  // prior reservation — a stale reservation's serials belong to a different
  // file's rows and must never be reused.
  useEffect(() => {
    if (!isWarranty) return;
    if (!excelFile) { setWarrantyReservation(null); return; }
    runWarrantyReservation(excelFile);
  }, [isWarranty, excelFile, runWarrantyReservation]);

  // Excel record labels (customer_name per row), parsed client-side purely
  // for display — index-aligned with warrantyReservation.reserved_serial_nos
  // (row i's label pairs with reserved_serial_nos[i]), same non-empty-row
  // filter used everywhere else on this page for warranty rows. The backend
  // never returns names alongside reserved serials, so this ordering
  // assumption is the only link available between a record and its serial.
  const [excelRows, setExcelRows] = useState([]);

  useEffect(() => {
    if (!isWarranty || !excelFile) { setExcelRows([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const buf = await excelFile.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const headers = (rows[0] || []).map((h) => sanitizeKey(h));
        const nameIdx = headers.indexOf('customer_name');
        const dataRows = rows.slice(1).filter((row) => Array.isArray(row) && row.some((cell) => String(cell ?? '').trim() !== ''));
        const labels = dataRows.map((row, i) => {
          const name = nameIdx >= 0 ? String(row[nameIdx] ?? '').trim() : '';
          return name || `Record ${i + 1}`;
        });
        if (!cancelled) setExcelRows(labels);
      } catch {
        if (!cancelled) setExcelRows([]);
      }
    })();
    return () => { cancelled = true; };
  }, [isWarranty, excelFile]);

  // Per-record document staging — { [rowIndex]: { warrantyReport: File|null,
  // productDetails: File|null } }. Files stay in memory only; nothing is
  // uploaded until the final POST /products/warranty-upload call in
  // ProductCostBreakdown.jsx, which maps each staged file to its row's
  // reserved serial number via doc_files/doc_serial_nos/doc_labels.
  const [docSelections, setDocSelections] = useState({});

  useEffect(() => {
    if (!excelFile) setDocSelections({});
  }, [excelFile]);

  const setDocFile = (rowIndex, slot, file) => {
    setDocSelections((prev) => ({
      ...prev,
      [rowIndex]: { ...prev[rowIndex], [slot]: file },
    }));
  };

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

    if (isWarranty) {
      if (warrantyReserving) { toast.error('Still processing the uploaded file — please wait a moment'); return; }
      if (!warrantyReservation) { toast.error('Failed to process the uploaded file — re-select it to retry'); return; }
      if (!warrantyReservation.total_reserved || warrantyReservation.total_reserved <= 0) {
        toast.error('No valid rows were found in this file');
        return;
      }
    }

    try {
      const arrayBuffer = await excelFile.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      const uploadedHeaders = (rows[0] || []).map((h) => sanitizeKey(h)).filter(Boolean);

      if (!isWarranty) {
        // product_name and sku_no are required for the normal Product flow —
        // the rest of VERIFICATION_SERVICE_HEADERS (model_no, brand, and the
        // two QR columns) are optional and must never block Continue.
        // third+party+qr1/qr2 are only ever downloaded blank for column-
        // structure parity with the backend template — even if present (or
        // manually filled) in the uploaded sheet, they're never read as
        // authoritative here. Both are populated exclusively by the
        // backend's own qr_slot verifier-report workflow, assigned
        // automatically by request-creation order once manual verifications
        // are sent.
        const missingHeaders = VERIFICATION_REQUIRED_HEADERS.filter((h) => !uploadedHeaders.includes(h));
        if (missingHeaders.length > 0) {
          toast.error(`Missing required columns: ${missingHeaders.join(', ')}`);
          return;
        }
      }

      // Warranty's authoritative record count is however many rows the
      // reservation step actually accepted — not a raw non-empty-row scan of
      // the sheet, which would also count rows the backend already skipped
      // and overstate cost/billing.
      const recordCount = isWarranty
        ? warrantyReservation.total_reserved
        : rows.slice(1).filter((row) => Array.isArray(row) && row.some((cell) => String(cell ?? '').trim() !== '')).length;
      if (recordCount <= 0) { toast.error('The uploaded file has no data rows'); return; }

      // Flatten per-row doc selections into the doc_files/doc_serial_nos/
      // doc_labels triplet the final warranty-upload call needs — mapping
      // by row index into reserved_serial_nos, never by array position of
      // the documents themselves (a row may contribute 0, 1, or 2 files).
      const documents = isWarranty
        ? excelRows.flatMap((_, i) => {
            const serial = warrantyReservation.reserved_serial_nos?.[i];
            const sel = docSelections[i];
            if (!serial || !sel) return [];
            const out = [];
            if (sel.warrantyReport) out.push({ file: sel.warrantyReport, serialNo: serial, label: 'Warranty Report' });
            if (sel.productDetails) out.push({ file: sel.productDetails, serialNo: serial, label: 'Product Details' });
            return out;
          })
        : [];

      setProductBatchData({
        file: excelFile,
        batchName: batchNameValue,
        description: '',
        recordCount,
        templateHeaders,
        fileName: excelFile.name,
        costConfirmed: false,
        uploadResponse: null,
        // Sent back verbatim to POST /products/warranty-upload as
        // reserved_serial_nos — never reordered or regenerated.
        ...(isWarranty ? { reservedSerialNos: warrantyReservation.reserved_serial_nos || [], documents } : {}),
      });
      navigate('/org/product/costing');
    } catch {
      toast.error('Failed to read the uploaded file');
    }
  };

  const checklistItems = [
    { label: 'Batch name set',      done: Boolean(batchNameValue.trim()) },
    { label: 'Excel file uploaded', done: Boolean(excelFile) },
    ...(isWarranty
      ? [{ label: 'Records processed', done: !!warrantyReservation && warrantyReservation.total_reserved > 0 }]
      : []),
  ];

  return (
    <AuthLayout title="Upload Product Data">
      <div className="w-full mx-auto lg:max-w-none">
        <StepWizard
          steps={isWarranty ? WARRANTY_VERIFICATION_STEPS : PRODUCT_VERIFICATION_STEPS}
          currentStep={isWarranty ? WARRANTY_VERIFICATION_STEP_META.template.currentStep : PRODUCT_VERIFICATION_STEP_META.template.currentStep}
          stepRoutes={isWarranty ? WARRANTY_VERIFICATION_STEP_ROUTES : PRODUCT_VERIFICATION_STEP_ROUTES}
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

                  {/* Checklist */}
                  <div className="rounded-xl border border-gray-100 bg-white p-4">
                    <p className="mb-3 font-inter text-[10px] font-bold uppercase tracking-widest text-gray-400">Checklist</p>
                    <div className="space-y-2.5">
                      {checklistItems.map(({ label, done }) => (
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

              {/* ── RIGHT — Warranty: per-record document upload, shown right
                  beside the Excel records themselves. Reservation of the
                  underlying TMZ-W serial numbers still happens (hidden) so
                  each staged file can be mapped to the right row at final
                  submit — but neither the reservation step nor any serial
                  number is ever shown to the org user. Product: no per-row
                  document UI at all — QR1/QR2 come exclusively from the
                  verifier-report workflow. ── */}
              {isWarranty ? (
                <div className="flex min-w-0 flex-1 flex-col bg-gray-50">
                  <div className="flex min-w-0 items-center gap-2.5 border-b border-gray-200 bg-white px-6 py-4">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${warrantyReservation ? 'bg-green-100' : 'bg-blue-100'}`}>
                      <FileText size={13} className={warrantyReservation ? 'text-green-600' : 'text-brand-blue'} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-inter text-sm font-semibold text-brand-dark">Warranty Document Upload</p>
                      <p className="truncate font-inter text-[11px] text-gray-500">Attach a Warranty Report and/or Product Details for each record</p>
                    </div>
                  </div>

                  <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-6">
                    {!excelFile ? (
                      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white">
                          <Upload size={17} className="text-gray-400" />
                        </div>
                        <p className="max-w-xs font-inter text-xs text-gray-500">
                          Upload your warranty Excel on the left to enable document upload for each record.
                        </p>
                      </div>
                    ) : excelRows.length === 0 ? (
                      <div className="flex flex-1 items-center justify-center gap-2 text-brand-blue">
                        <RefreshCw size={18} className="animate-spin" />
                        <span className="font-inter text-sm">Loading records…</span>
                      </div>
                    ) : (
                      <>
                        {!warrantyReserving && !warrantyReservation && (
                          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                            <p className="font-inter text-xs text-red-600">Couldn't process this file — documents can't be submitted yet.</p>
                            <button
                              type="button"
                              onClick={() => runWarrantyReservation(excelFile)}
                              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-red-300 bg-white px-3 py-1.5 font-inter text-xs font-semibold text-red-600 transition-colors hover:bg-red-100"
                            >
                              <RefreshCw size={12} /> Retry
                            </button>
                          </div>
                        )}
                        <div className="space-y-3">
                          {excelRows.map((label, i) => {
                            const sel = docSelections[i] || {};
                            return (
                              <div key={i} className="rounded-xl border border-gray-200 bg-white p-3">
                                <p className="mb-2 truncate font-inter text-xs font-semibold text-brand-dark">{label}</p>
                                <div className="space-y-2">
                                  <WarrantyDocSlot
                                    label="Warranty Report"
                                    file={sel.warrantyReport}
                                    onChange={(f) => setDocFile(i, 'warrantyReport', f)}
                                    onClear={() => setDocFile(i, 'warrantyReport', null)}
                                  />
                                  <WarrantyDocSlot
                                    label="Product Details"
                                    file={sel.productDetails}
                                    onChange={(f) => setDocFile(i, 'productDetails', f)}
                                    onClear={() => setDocFile(i, 'productDetails', null)}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 bg-gray-50 flex flex-col justify-center px-8 py-10">
                  <p className="mb-4 font-inter text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    About Product Documents
                  </p>
                  <p className="max-w-sm font-inter text-sm text-gray-600">
                    Products are created directly from this Excel file — there's no per-product document attachment at this step.
                  </p>
                  <div className="mt-4 max-w-sm rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3">
                    <p className="font-inter text-[11px] text-brand-blue">
                      Product certificates' QR1/QR2 codes are populated automatically once verifier reports are submitted during the manual verification step — never from this Excel file or any upload here.
                    </p>
                  </div>
                </div>
              )}{/* end RIGHT */}

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
                  ) : key.includes('qr') ? (
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 font-inter text-[10px] font-semibold uppercase text-amber-600">
                      Leave Empty
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
