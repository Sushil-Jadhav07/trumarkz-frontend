import React, { useEffect, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CircleCheck,
  Download,
  FileSpreadsheet,
  Sparkles,
  UploadCloud,
  User,
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import clsx from 'clsx';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { StepWizard } from '@/components/ui/StepWizard';
import { FileUpload } from '@/components/ui/FileUpload';
import { useApp } from '@/context/AppContext';
import { HUMAN_VERIFICATION_STEPS } from '@/data/humanVerificationFlow';
import { verificationAPI, getApiError, triggerBlobDownload } from '@/services/api';

const BASE_FIELD_OPTIONS = [
  {
    id: 'full_name',
    label: 'Full Name',
    helper: 'Always included in every template',
    locked: true,
    defaultOn: true,
    badge: 'Fixed',
  },
  {
    id: 'email',
    label: 'Email',
    helper: 'Optional base column',
    defaultOn: true,
    badge: 'On',
  },
  {
    id: 'phone_number',
    label: 'Mobile',
    helper: 'Optional base column',
    defaultOn: true,
    badge: 'On',
  },
  {
    id: 'dob',
    label: 'DOB',
    helper: 'Optional base column',
    defaultOn: false,
    badge: 'Off',
  },
  {
    id: 'photo',
    label: 'Photo',
    helper: 'Added and locked by the backend automatically.',
    locked: true,
    auto: true,
    defaultOn: true,
    badge: 'Auto',
  },
];

const formatLabel = (value) =>
  value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const normalizeCustomField = (value = '') =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const REQUIRED_UPLOAD_COLUMNS = ['full_name', 'email', 'phone_number'];

const VERIFICATION_COLUMN_MAP = {
  police: ['police_station', 'city_of_residence'],
  police_verification: ['police_station', 'city_of_residence'],
  education: ['college_name', 'degree', 'graduation_year'],
  driving_license: ['driving_licence_number', 'dl_expiry_date'],
  address: ['address_line1', 'address_line2', 'address_line3', 'pincode', 'state', 'country'],
  experience: ['employer_name', 'employment_duration'],
  company: ['employer_name', 'employment_duration'],
};

const SelectedPill = ({ children, tone = 'default' }) => (
  <span
    className={clsx(
      'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium',
      tone === 'blue' && 'bg-brand-blue/10 text-brand-blue',
      tone === 'green' && 'bg-emerald-100 text-emerald-700',
      tone === 'default' && 'bg-slate-100 text-slate-700'
    )}
  >
    {children}
  </span>
);

export const DownloadTemplate = () => {
  const navigate = useNavigate();
  const {
    selectedFields,
    setSelectedFields,
    selectedVerifications,
    batchData,
    setBatchData,
  } = useApp();

  const [mode, setMode] = useState('bulk');
  const [excelFile, setExcelFile] = useState(batchData?.file || null);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [isContinuingBulk, setIsContinuingBulk] = useState(false);
  const [submittingSingle, setSubmittingSingle] = useState(false);
  const [customFieldInput, setCustomFieldInput] = useState('');
  const [batchName, setBatchName] = useState(
    batchData?.batchName || `Human Verification Batch ${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}`
  );
  const [customFields, setCustomFields] = useState(() => {
    const baseIds = BASE_FIELD_OPTIONS.map((field) => field.id);
    const verificationIds = Object.values(VERIFICATION_COLUMN_MAP).flat();
    return (selectedFields || []).filter(
      (field) => !baseIds.includes(field) && !verificationIds.includes(field) && field !== 'photo'
    );
  });
  const [selectedBaseFields, setSelectedBaseFields] = useState(() => {
    const enabled = BASE_FIELD_OPTIONS.filter((field) => field.defaultOn && field.id !== 'photo').map((field) => field.id);
    if (!selectedFields?.length) return enabled;
    return BASE_FIELD_OPTIONS
      .filter((field) => field.id !== 'photo' && (field.locked || selectedFields.includes(field.id)))
      .map((field) => field.id);
  });
  const [singleForm, setSingleForm] = useState({
    fullName: '',
    email: '',
    dob: '',
    mobile: '',
    photo: null,
  });

  const basePreviewColumns = useMemo(
    () => [...new Set(selectedBaseFields)],
    [selectedBaseFields]
  );

  const verificationPreviewColumns = useMemo(
    () => [
      ...new Set(
        selectedVerifications.flatMap((verificationId) => VERIFICATION_COLUMN_MAP[verificationId] || [])
      ),
    ],
    [selectedVerifications]
  );

  const finalColumns = useMemo(
    () => [...new Set([...basePreviewColumns, ...customFields, ...verificationPreviewColumns, 'photo'])],
    [basePreviewColumns, customFields, verificationPreviewColumns]
  );

  const templateHeaders = useMemo(
    () => [...new Set([...basePreviewColumns, ...verificationPreviewColumns].filter((column) => column !== 'photo'))],
    [basePreviewColumns, verificationPreviewColumns]
  );

  useEffect(() => {
    setSelectedFields(finalColumns);
  }, [finalColumns, setSelectedFields]);

  const toggleBaseField = (fieldId) => {
    const field = BASE_FIELD_OPTIONS.find((item) => item.id === fieldId);
    if (!field || field.locked || field.id === 'photo') return;
    setSelectedBaseFields((current) =>
      current.includes(fieldId)
        ? current.filter((item) => item !== fieldId)
        : [...current, fieldId]
    );
  };

  const addCustomField = () => {
    const normalized = normalizeCustomField(customFieldInput);
    if (!normalized) {
      toast.error('Enter a valid field name');
      return;
    }
    if (finalColumns.includes(normalized)) {
      toast.error('That field is already included');
      return;
    }
    setCustomFields((current) => [...current, normalized]);
    setCustomFieldInput('');
  };

  const removeCustomField = (field) => {
    setCustomFields((current) => current.filter((item) => item !== field));
  };

  const handleDownloadTemplate = async () => {
    if (templateHeaders.length === 0) {
      toast.error('Select at least one base field');
      return;
    }

    setIsDownloadingTemplate(true);
    try {
      const { data } = await verificationAPI.generateHumanTemplate(
        templateHeaders,
        selectedVerifications.join(',')
      );
      if (customFields.length > 0) {
        const buffer = await data.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });
        const existingHeaders = Array.isArray(rows[0]) ? rows[0] : [];
        const mergedHeaders = [...existingHeaders];
        customFields.forEach((field) => {
          if (!mergedHeaders.includes(field)) mergedHeaders.push(field);
        });
        const nextRows = [
          mergedHeaders,
          ...(rows.slice(1).map((row) => {
            const normalizedRow = Array.isArray(row) ? [...row] : [];
            while (normalizedRow.length < mergedHeaders.length) normalizedRow.push('');
            return normalizedRow;
          })),
        ];
        const nextSheet = XLSX.utils.aoa_to_sheet(nextRows);
        nextSheet['!cols'] = mergedHeaders.map((header) => ({ wch: Math.max(18, formatLabel(String(header)).length + 3) }));
        workbook.Sheets[sheetName] = nextSheet;
        XLSX.writeFile(workbook, 'trumarkz-human-verification-template.xlsx');
      } else {
        triggerBlobDownload(data, 'trumarkz-human-verification-template.xlsx');
      }
      toast.success('Template downloaded');
    } catch (error) {
      toast.error(getApiError(error, 'Failed to download template'));
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleContinueBulk = async () => {
    if (isContinuingBulk) return;
    if (!batchName.trim()) {
      toast.error('Enter a batch name');
      return;
    }
    if (!excelFile) {
      toast.error('Please upload the filled Excel file');
      return;
    }

    setIsContinuingBulk(true);
    try {
      const buffer = await excelFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });
      const normalizedHeaders = (rows?.[0] || [])
        .map((value) => normalizeCustomField(String(value || '')));
      const missingRequiredColumns = REQUIRED_UPLOAD_COLUMNS.filter(
        (column) => !normalizedHeaders.includes(column)
      );
      if (missingRequiredColumns.length > 0) {
        toast.error(`Missing required columns: ${missingRequiredColumns.join(', ')}`);
        return;
      }
      const recordCount = Math.max((rows?.length || 1) - 1, 0);
      if (recordCount <= 0) {
        toast.error('The uploaded sheet has no user rows');
        return;
      }

      flushSync(() => {
        setBatchData((current) => ({
          ...(current || {}),
          batchName: batchName.trim(),
          description: '',
          file: excelFile,
          fileName: excelFile.name,
          recordCount,
          totalColumns: finalColumns.length,
          baseFields: basePreviewColumns,
          customFields,
          verificationFields: verificationPreviewColumns,
        }));
      });

      toast.dismiss('human-file-upload-success');
      toast.success('File uploaded successfully', { id: 'human-file-upload-success' });
      navigate('/org/certificate-preview', { replace: false });
    } catch {
      toast.error('Unable to read the uploaded file');
    } finally {
      setIsContinuingBulk(false);
    }
  };

  const handleContinueSingle = async () => {
    if (!singleForm.fullName) {
      toast.error('Full Name is required');
      return;
    }
    if (!singleForm.dob) {
      toast.error('Date of Birth is required');
      return;
    }
    if (!singleForm.email) {
      toast.error('Email is required');
      return;
    }
    if (!singleForm.mobile) {
      toast.error('Mobile Number is required');
      return;
    }

    setSubmittingSingle(true);
    try {
      await verificationAPI.uploadSingleHuman({
        full_name: singleForm.fullName,
        email: singleForm.email,
        dob: singleForm.dob,
        phone_number: singleForm.mobile,
      });
      toast.success('Single record submitted');
      navigate('/org/batch-status');
    } catch (error) {
      toast.error(getApiError(error, 'Failed to submit single record'));
    } finally {
      setSubmittingSingle(false);
    }
  };

  return (
    <AuthLayout title="Upload Data">
      <div className="mx-auto w-full max-w-[1380px]">
        <div className="mb-8 rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_-46px_rgba(15,23,42,0.22)]">
          <StepWizard steps={HUMAN_VERIFICATION_STEPS} currentStep={2} />
        </div>

        <PageHeader
          title="Upload Verification Data"
          subtitle="Choose bulk upload or fill a single record"
        />

        <Card className="mb-6 rounded-[24px] border border-slate-200 p-2 shadow-[0_20px_60px_-46px_rgba(15,23,42,0.22)]">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[
              { id: 'bulk', label: 'Bulk Upload', icon: FileSpreadsheet, hint: 'Excel flow' },
              { id: 'single', label: 'Single Record', icon: User, hint: 'Direct form entry' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setMode(tab.id)}
                className={clsx(
                  'rounded-[18px] border px-4 py-4 text-left transition-all',
                  mode === tab.id
                    ? 'border-brand-blue bg-brand-blue/[0.04] shadow-[inset_0_0_0_1px_rgba(37,99,235,0.08)]'
                    : 'border-transparent bg-white hover:bg-slate-50'
                )}
              >
                <div className="mb-1 flex items-center gap-3">
                  <div className={clsx('flex h-9 w-9 items-center justify-center rounded-xl', mode === tab.id ? 'bg-brand-blue text-white' : 'bg-slate-100 text-slate-500')}>
                    <tab.icon size={18} />
                  </div>
                  <span className="font-sora text-lg font-semibold text-slate-950">{tab.label}</span>
                </div>
                <p className="pl-12 text-sm text-slate-500">{tab.hint}</p>
              </button>
            ))}
          </div>
        </Card>

        {mode === 'bulk' && (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="space-y-5">
              <Card className="overflow-hidden rounded-[26px] border border-slate-200 shadow-[0_24px_70px_-46px_rgba(15,23,42,0.22)]">
                <div className="flex flex-col gap-4 border-b border-slate-100 bg-[linear-gradient(180deg,#f6faff_0%,#ffffff_100%)] px-6 py-6 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex gap-4">
                    <div className="mt-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-blue text-white shadow-[0_18px_34px_-20px_rgba(37,99,235,0.7)]">
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <SelectedPill tone="blue">Step 1 - build template</SelectedPill>
                      <h3 className="mt-3 font-sora text-3xl font-semibold tracking-[-0.03em] text-slate-950">Download template</h3>
                      <p className="mt-2 max-w-2xl text-base leading-8 text-slate-500">
                        Pick the base fields you want, add extra columns if needed, and download a template aligned with your selected verification checks.
                      </p>
                    </div>
                  </div>
                  <div className="w-fit rounded-[22px] border border-slate-200 bg-white px-6 py-4 text-center shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Columns</p>
                    <p className="mt-2 font-sora text-4xl font-bold text-slate-950">{finalColumns.length}</p>
                  </div>
                </div>

                <div className="grid gap-5 px-6 py-6 xl:grid-cols-[minmax(0,1fr)_300px]">
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
                    <div className="mb-4">
                      <h4 className="font-sora text-xl font-semibold text-slate-950">Base fields</h4>
                      <p className="mt-1 text-sm text-slate-500">
                        Only Full Name stays fixed. Turn the other base fields on or off as needed.
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {BASE_FIELD_OPTIONS.map((field) => {
                        const selected = field.id === 'photo' || selectedBaseFields.includes(field.id);
                        const badgeLabel = field.locked || field.auto
                          ? field.badge
                          : selected
                            ? 'On'
                            : 'Off';
                        return (
                          <button
                            key={field.id}
                            type="button"
                            onClick={() => toggleBaseField(field.id)}
                            className={clsx(
                              'rounded-[18px] border bg-white px-4 py-4 text-left transition-all',
                              selected ? 'border-brand-blue/30 shadow-sm' : 'border-slate-200 hover:border-slate-300',
                              (field.locked || field.auto) && 'cursor-default'
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-sora text-lg font-semibold text-slate-950">{field.label}</p>
                                <p className="mt-1 text-sm leading-6 text-slate-500">{field.helper}</p>
                              </div>
                              <SelectedPill tone={selected ? 'blue' : 'default'}>{badgeLabel}</SelectedPill>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                    <h4 className="font-sora text-xl font-semibold text-slate-950">Template summary</h4>
                    <p className="mt-1 text-sm text-slate-500">What will be included in the file.</p>
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-[18px] bg-slate-50 px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Base</p>
                        <p className="mt-2 font-sora text-3xl font-bold text-slate-950">{basePreviewColumns.length}</p>
                      </div>
                      <div className="rounded-[18px] bg-slate-50 px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Custom</p>
                        <p className="mt-2 font-sora text-3xl font-bold text-slate-950">{customFields.length}</p>
                      </div>
                      <div className="rounded-[18px] bg-slate-50 px-4 py-4 col-span-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Verification</p>
                        <p className="mt-2 font-sora text-3xl font-bold text-slate-950">{verificationPreviewColumns.length}</p>
                      </div>
                    </div>
                    <div className="mt-4 rounded-[18px] bg-brand-blue/[0.06] px-4 py-4 text-sm leading-6 text-brand-blue">
                      Final order: required and selected base fields, your custom fields, backend-supported verification fields, then photo.
                    </div>
                  </div>
                </div>

                <div className="px-6 pb-6">
                  <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="font-sora text-xl font-semibold text-slate-950">Custom fields</h4>
                        <p className="mt-1 text-sm text-slate-500">
                          Add your own extra columns. They will be added to the Excel template and uploaded with the sheet.
                        </p>
                      </div>
                      <SelectedPill>snake_case</SelectedPill>
                    </div>

                    <div className="mt-5 flex flex-col gap-3 lg:flex-row">
                      <Input
                        placeholder="e.g. employee_id or department"
                        value={customFieldInput}
                        onChange={(event) => setCustomFieldInput(event.target.value)}
                        className="flex-1"
                      />
                      <Button variant="outline" size="lg" onClick={addCustomField} className="lg:min-w-[160px]">
                        Add field
                      </Button>
                    </div>

                    {customFields.length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {customFields.map((field) => (
                          <button
                            key={field}
                            type="button"
                            onClick={() => removeCustomField(field)}
                            className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200"
                          >
                            {field}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-4 rounded-[18px] bg-slate-50 px-4 py-4 text-sm text-slate-500">
                        No custom fields added yet.
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid gap-5 border-t border-slate-100 px-6 py-6">
                  <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="font-sora text-xl font-semibold text-slate-950">Column preview</h4>
                        <p className="mt-1 text-sm text-slate-500">This is the final structure sent to the template API.</p>
                      </div>
                      <SelectedPill>{finalColumns.length} columns</SelectedPill>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {finalColumns.map((column) => (
                        <SelectedPill
                          key={column}
                          tone={column === 'photo' ? 'green' : 'default'}
                        >
                          {formatLabel(column)}
                        </SelectedPill>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4 border-t border-slate-100 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
                  <p className="max-w-3xl text-sm leading-7 text-slate-500">
                    This screen controls only the editable base fields and your custom headers. The photo column stays locked.
                  </p>
                  <Button
                    variant="success"
                    size="lg"
                    icon={Download}
                    onClick={handleDownloadTemplate}
                    className="lg:min-w-[240px]"
                    disabled={isDownloadingTemplate}
                  >
                    {isDownloadingTemplate ? 'Downloading...' : 'Download template'}
                  </Button>
                </div>
              </Card>

              <Card className="rounded-[26px] border border-slate-200 p-6 shadow-[0_24px_70px_-46px_rgba(15,23,42,0.22)]">
                <div className="flex items-start gap-4">
                  <div className="mt-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-blue text-white shadow-[0_18px_34px_-20px_rgba(37,99,235,0.7)]">
                    <UploadCloud size={20} />
                  </div>
                  <div>
                    <h3 className="font-sora text-3xl font-semibold tracking-[-0.03em] text-slate-950">Upload filled file</h3>
                    <p className="mt-2 text-base leading-8 text-slate-500">
                      Upload the completed spreadsheet after you fill in the downloaded template.
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <Input
                    label="Batch Name"
                    placeholder="e.g. Security Staff Verification - June 2026"
                    value={batchName}
                    onChange={(event) => setBatchName(event.target.value)}
                  />
                  <FileUpload
                    label="Upload Excel File (.xlsx)"
                    fileType="xlsx"
                    accept={{
                      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
                      'application/vnd.ms-excel': ['.xls'],
                    }}
                    selectedFile={excelFile}
                    onFileSelect={setExcelFile}
                    onRemove={() => setExcelFile(null)}
                    maxSize={5 * 1024 * 1024}
                  />
                </div>
              </Card>
            </div>

            <div>
              <Card className="sticky top-24 overflow-hidden rounded-[26px] border border-slate-200 shadow-[0_24px_70px_-46px_rgba(15,23,42,0.22)]">
                <div className="bg-slate-900 px-5 py-5 text-white">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-200/80">Ready to submit</p>
                  <h4 className="mt-3 font-sora text-3xl font-semibold tracking-[-0.03em]">Upload checklist</h4>
                  <p className="mt-2 text-sm leading-7 text-slate-300">
                    Download the file, fill it offline, then continue with the batch upload.
                  </p>
                </div>

                <div className="space-y-4 p-5">
                  <div className="rounded-[20px] bg-slate-50 px-4 py-4">
                    <div className="flex items-start gap-3">
                      <CircleCheck size={16} className="mt-1 text-emerald-600" />
                      <div>
                        <p className="font-medium text-slate-950">Template builder ready</p>
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          Base fields, your custom fields, and backend-supported verification fields are configured for template generation.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[20px] bg-slate-50 px-4 py-4">
                    <div className="flex items-start gap-3">
                      <UploadCloud size={16} className={excelFile ? 'mt-1 text-emerald-600' : 'mt-1 text-slate-400'} />
                      <div>
                        <p className="font-medium text-slate-950">Excel upload</p>
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          {excelFile ? `${excelFile.name} is ready to submit.` : 'Upload is required to continue'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[20px] border border-brand-blue/10 bg-brand-blue/[0.04] px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-blue/70">Current setup</p>
                    <div className="mt-3 space-y-3 text-sm text-slate-700">
                      <div className="flex items-center justify-between">
                        <span>Base fields</span>
                        <span className="font-semibold text-slate-950">{basePreviewColumns.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Custom fields</span>
                        <span className="font-semibold text-slate-950">{customFields.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Verification fields</span>
                        <span className="font-semibold text-slate-950">{verificationPreviewColumns.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Total download columns</span>
                        <span className="font-semibold text-slate-950">{finalColumns.length}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm leading-7 text-slate-500">
                    Once the spreadsheet is uploaded, continue to review and submit your batch.
                  </p>

                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full py-4 text-lg shadow-[0_20px_42px_-24px_rgba(37,99,235,0.62)]"
                    onClick={handleContinueBulk}
                    icon={ArrowRight}
                    disabled={isContinuingBulk}
                  >
                    {isContinuingBulk ? 'Continuing...' : 'Continue'}
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        )}

        {mode === 'single' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="rounded-[26px] border border-slate-200 p-6 shadow-[0_24px_70px_-46px_rgba(15,23,42,0.22)]">
              <h3 className="font-sora text-3xl font-semibold tracking-[-0.03em] text-slate-950">Single Record Details</h3>
              <p className="mt-2 text-base leading-8 text-slate-500">
                Fill in this form to verify one individual record directly.
              </p>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Full Name"
                  placeholder="e.g. Ravi Kumar"
                  value={singleForm.fullName}
                  onChange={(event) => setSingleForm((current) => ({ ...current, fullName: event.target.value }))}
                />
                <Input
                  label="Email"
                  type="email"
                  placeholder="e.g. ravi@example.com"
                  value={singleForm.email}
                  onChange={(event) => setSingleForm((current) => ({ ...current, email: event.target.value }))}
                />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Date of Birth"
                  type="date"
                  value={singleForm.dob}
                  onChange={(event) => setSingleForm((current) => ({ ...current, dob: event.target.value }))}
                />
              </div>

              <div className="mt-4">
                <Input
                  label="Mobile Number"
                  placeholder="+91 9876543210"
                  value={singleForm.mobile}
                  onChange={(event) => setSingleForm((current) => ({ ...current, mobile: event.target.value }))}
                />
              </div>

              <div className="mt-4">
                <label className="mb-1.5 block text-sm font-medium text-brand-dark font-inter">Photo</label>
                <FileUpload
                  label="Upload Photo"
                  accept={{ 'image/*': ['.jpg', '.jpeg', '.png'] }}
                  selectedFile={singleForm.photo}
                  onFileSelect={(file) => setSingleForm((current) => ({ ...current, photo: file }))}
                  onRemove={() => setSingleForm((current) => ({ ...current, photo: null }))}
                />
              </div>

              <div className="mt-6">
                <Button variant="primary" size="lg" className="w-full" onClick={handleContinueSingle} icon={ArrowRight} disabled={submittingSingle}>
                  {submittingSingle ? 'Submitting...' : 'Submit for Verification'}
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </AuthLayout>
  );
};

export default DownloadTemplate;
