import React, { useMemo, useRef, useState } from 'react';
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
import { HUMAN_VERIFICATION_STEPS, HUMAN_VERIFICATION_STEP_META, HUMAN_VERIFICATION_STEP_ROUTES } from '@/data/humanVerificationFlow';
import { verificationAPI, triggerBlobDownload, getApiError } from '@/services/api';
import { getVerificationApiTypes } from '@/utils/verificationFlow';

// photo is appended automatically by the API — never pass it in headers
const BASE_FIELDS = [
  { key: 'full_name',    label: 'Full Name',    fixed: true  },
  { key: 'email',        label: 'Email',        fixed: false },
  { key: 'phone_number', label: 'Phone Number', fixed: false },
];

const sanitizeKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

export const DownloadTemplate = () => {
  const navigate  = useNavigate();
  const inputRef  = useRef(null);
  const { selectedVerifications, setBatchData, setSelectedHumanTemplate } = useApp();

  const [excelFile,      setExcelFile]      = useState(null);
  const [customFields,   setCustomFields]   = useState([]);
  const [fieldInput,     setFieldInput]     = useState('');
  const [modalOpen,      setModalOpen]      = useState(false);
  const [downloading,    setDownloading]    = useState(false);
  const [baseToggles,    setBaseToggles]    = useState({ email: true, phone_number: true });
  const [batchNameValue, setBatchNameValue] = useState(() => {
    const d = new Date();
    return `Human Verification Batch ${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
  });

  const toggleBase = (key) => setBaseToggles((prev) => ({ ...prev, [key]: !prev[key] }));

  const selectedVerificationTypes = getVerificationApiTypes(selectedVerifications);
  const templateHeaders = useMemo(
    () => [
      ...BASE_FIELDS.filter((f) => f.fixed || baseToggles[f.key]).map((f) => f.key),
      ...customFields,
    ],
    [baseToggles, customFields]
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
      const { data } = await verificationAPI.generateHumanTemplate(templateHeaders, selectedVerificationTypes);
      triggerBlobDownload(data, 'trumarkz-human-template.xlsx');
      toast.success('Template downloaded');
    } catch (err) {
      toast.error(getApiError(err, 'Failed to download template'));
    } finally {
      setDownloading(false);
    }
  };

  const handleContinue = async () => {
    if (!excelFile) { toast.error('Please upload the completed Excel file'); return; }
    try {
      const arrayBuffer = await excelFile.arrayBuffer();
      const workbook   = XLSX.read(arrayBuffer, { type: 'array' });
      const worksheet  = workbook.Sheets[workbook.SheetNames[0]];
      const rows       = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      const recordCount = rows
        .slice(1)
        .filter((row) => Array.isArray(row) && row.some((cell) => String(cell ?? '').trim() !== ''))
        .length;
      if (recordCount <= 0) { toast.error('The uploaded file has no data rows'); return; }
      setBatchData({
        file: excelFile, batchName: batchNameValue,
        description: '', recordCount, templateHeaders,
        fileName: excelFile.name, costConfirmed: false, uploadResponse: null,
      });
      setSelectedHumanTemplate('classic-blue');
      navigate('/org/costing');
    } catch (err) {
      toast.error(getApiError(err, 'Failed to read the uploaded file'));
    }
  };

  return (
    <AuthLayout title="Upload Batch">
      <div className="w-full mx-auto lg:max-w-none">
        <StepWizard
          steps={HUMAN_VERIFICATION_STEPS}
          currentStep={HUMAN_VERIFICATION_STEP_META.template.currentStep}
          stepRoutes={HUMAN_VERIFICATION_STEP_ROUTES}
        />
        <PageHeader
          title="Upload Verification Data"
          subtitle="Download the template, fill it in, then upload the completed file."
          action={
            <Button variant="outline" size="sm" icon={Download} onClick={() => setModalOpen(true)}>
              Download Template
            </Button>
          }
        />

        {/* ── Main upload card ───────────────────────────────────────────────── */}
        <div>
          <Card className="p-6 border border-blue-100 shadow-[0_18px_48px_-40px_rgba(37,99,235,0.28)] space-y-5">

            {/* Card header */}
            <div className="flex items-center gap-3 pb-1 border-b border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-brand-blue flex items-center justify-center shrink-0">
                <Upload size={18} />
              </div>
              <div>
                <h3 className="font-sora text-base font-semibold text-slate-950">Upload Batch File</h3>
                <p className="font-inter text-xs text-slate-500 mt-0.5">Attach the completed Excel sheet</p>
              </div>
            </div>

            {/* Batch name */}
            <div>
              <label className="block font-inter text-sm font-medium text-slate-800 mb-1.5">
                Batch Name
              </label>
              <input
                value={batchNameValue}
                onChange={(e) => setBatchNameValue(e.target.value)}
                className="w-full rounded-xl border-2 border-slate-200 px-4 py-2.5 font-inter text-sm text-slate-950 outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition-all"
                placeholder="e.g. Healthcare Batch June 2026"
              />
            </div>

            {/* File upload */}
            <FileUpload
              label="Completed Excel file (.xlsx)"
              fileType="xlsx"
              accept={{ 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }}
              selectedFile={excelFile}
              onFileSelect={setExcelFile}
              onRemove={() => setExcelFile(null)}
            />

            {/* Summary */}
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

            {/* Continue */}
            <Button variant="primary" size="lg" className="w-full" onClick={handleContinue} icon={ArrowRight}>
              Continue
            </Button>
          </Card>
        </div>
      </div>

      {/* ── Download Template Modal ─────────────────────────────────────────── */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Setup Template" size="2xl">
        <div className="space-y-5">

          {/* Intro */}
          <p className="font-inter text-sm text-slate-500">
            Add any custom columns you need. Base fields are always included. Click Download when ready.
          </p>

          {/* Base fields — full_name fixed, rest toggleable */}
          <div>
            <p className="font-inter text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Base Fields
            </p>
            <div className="space-y-2">
              {BASE_FIELDS.map((field) => (
                <div
                  key={field.key}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5"
                >
                  <div>
                    <p className="font-inter text-sm font-medium text-slate-800">{field.label}</p>
                    <p className="font-mono text-[11px] text-slate-400">{field.key}</p>
                  </div>
                  {field.fixed ? (
                    <span className="rounded-full bg-brand-blue/10 px-2.5 py-1 font-inter text-[10px] font-semibold uppercase text-brand-blue">
                      Fixed
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleBase(field.key)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        baseToggles[field.key] ? 'bg-brand-blue' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          baseToggles[field.key] ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Add custom field input */}
          <div>
            <p className="font-inter text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Custom fields
            </p>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={fieldInput}
                onChange={(e) => setFieldInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. employee_id"
                className="flex-1 rounded-xl border-2 border-slate-200 px-4 py-2.5 font-inter text-sm outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition-all"
              />
              <Button variant="primary" size="sm" icon={Plus} onClick={handleAddField}>
                Add
              </Button>
            </div>
            <p className="font-inter text-[11px] text-slate-400 mt-1.5">
              Use snake_case — press Enter or click Add.
            </p>
          </div>

          {/* Added custom fields */}
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

          {/* Final columns summary */}
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

          {/* Actions */}
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

export default DownloadTemplate;
