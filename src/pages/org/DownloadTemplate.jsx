import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { StepWizard } from '@/components/ui/StepWizard';
import { FileUpload } from '@/components/ui/FileUpload';
import { ArrowRight, Download, Plus, Trash2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { useApp } from '@/context/AppContext';
import { HUMAN_VERIFICATION_STEPS, HUMAN_VERIFICATION_STEP_META } from '@/data/humanVerificationFlow';
import { verificationTypes } from '@/data/mockData';
import { verificationAPI, triggerBlobDownload, getApiError } from '@/services/api';
import { getVerificationApiTypes } from '@/utils/verificationFlow';
import clsx from 'clsx';

const BASE_FIELDS = [
  { key: 'full_name', label: 'Full Name', description: 'Required', fixed: true },
  { key: 'email', label: 'Email', description: 'Invite delivery' },
  { key: 'phone_number', label: 'Mobile', description: 'Contact number' },
  { key: 'dob', label: 'DOB', description: 'Date of birth' },
];

const DEFAULT_FIELD_SELECTION = {
  email: true,
  phone_number: true,
  dob: false,
};

const sanitizeFieldKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const FieldChip = ({ field, enabled, onToggle }) => (
  <button
    type="button"
    onClick={field.fixed ? undefined : onToggle}
    className={clsx(
      'flex items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-all',
      field.fixed || enabled
        ? 'border-brand-blue/25 bg-brand-blue/[0.05]'
        : 'border-slate-200 bg-white hover:border-slate-300'
    )}
  >
    <div className="min-w-0 pr-3">
      <p className="font-inter text-[13px] font-medium text-slate-950">{field.label}</p>
      <p className="mt-0.5 truncate font-inter text-[10px] text-slate-500">{field.description}</p>
    </div>
    <span
      className={clsx(
        'shrink-0 rounded-full px-2 py-1 font-inter text-[10px] font-semibold uppercase ',
        field.fixed
          ? 'bg-brand-blue/10 text-brand-blue'
          : enabled
            ? 'bg-brand-blue text-white'
            : 'bg-slate-100 text-slate-600'
      )}
    >
      {field.fixed ? 'Fixed' : enabled ? 'On' : 'Off'}
    </span>
  </button>
);

export const DownloadTemplate = () => {
  const navigate = useNavigate();
  const { selectedVerifications, setBatchData, setSelectedHumanTemplate } = useApp();

  const [excelFile, setExcelFile] = useState(null);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [customFieldInput, setCustomFieldInput] = useState('');
  const [customFields, setCustomFields] = useState([]);
  const [fieldSelection, setFieldSelection] = useState(DEFAULT_FIELD_SELECTION);

  const selectedVerificationNames = selectedVerifications
    .map((id) => verificationTypes.find((item) => item.id === id)?.name)
    .filter(Boolean);

  const selectedVerificationTypes = getVerificationApiTypes(selectedVerifications);

  const selectedBaseHeaders = useMemo(
    () => BASE_FIELDS.filter((field) => field.fixed || fieldSelection[field.key]).map((field) => field.key),
    [fieldSelection]
  );

  const templateHeaders = useMemo(
    () => [...selectedBaseHeaders, ...customFields],
    [selectedBaseHeaders, customFields]
  );

  const batchName = useMemo(() => {
    const date = new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `Human Verification Batch ${day}-${month}-${year}`;
  }, []);

  const toggleField = (key) => {
    setFieldSelection((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const handleAddCustomField = () => {
    const normalized = sanitizeFieldKey(customFieldInput);

    if (!normalized) {
      toast.error('Enter a valid custom field name');
      return;
    }

    if (templateHeaders.includes(normalized)) {
      toast.error('That field already exists');
      return;
    }

    setCustomFields((current) => [...current, normalized]);
    setCustomFieldInput('');
  };

  const handleRemoveCustomField = (fieldKey) => {
    setCustomFields((current) => current.filter((item) => item !== fieldKey));
  };

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      const { data } = await verificationAPI.generateHumanTemplate(
        templateHeaders,
        selectedVerificationTypes
      );
      triggerBlobDownload(data, 'trumarkz-human-verification-template.xlsx');
      toast.success('Template downloaded');
    } catch (err) {
      toast.error(getApiError(err, 'Failed to download template'));
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleContinue = async () => {
    if (!excelFile) {
      toast.error('Please upload the completed Excel file');
      return;
    }

    try {
      const arrayBuffer = await excelFile.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      const recordCount = rows
        .slice(1)
        .filter((row) => Array.isArray(row) && row.some((cell) => String(cell ?? '').trim() !== ''))
        .length;

      if (recordCount <= 0) {
        toast.error('The uploaded Excel file does not contain any data rows');
        return;
      }

      setBatchData({
        file: excelFile,
        batchName,
        description: '',
        recordCount,
        templateHeaders,
        fileName: excelFile.name,
        costConfirmed: false,
        uploadResponse: null,
      });
      setSelectedHumanTemplate('classic-blue');

      navigate('/org/costing');
    } catch (err) {
      toast.error(getApiError(err, 'Failed to read the uploaded Excel file'));
    }
  };

  return (
    <AuthLayout title="Template setup">
      <div className="w-full mx-auto lg:max-w-none">
        <StepWizard
          steps={HUMAN_VERIFICATION_STEPS}
          currentStep={HUMAN_VERIFICATION_STEP_META.template.currentStep}
        />
        <PageHeader
          title="Upload Verification Data"
          subtitle="Bulk upload only"
        />

        <div className="mb-5 flex flex-wrap gap-2">
          {selectedVerificationNames.map((name) => (
            <span
              key={name}
              className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 font-inter text-xs font-medium text-brand-blue"
            >
              {name}
            </span>
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Card className="border border-blue-100 p-5 shadow-[0_18px_48px_-40px_rgba(37,99,235,0.28)]">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-sora text-base font-semibold text-slate-950">Template setup</h3>
                <p className="mt-1 font-inter text-xs text-slate-500">Choose fields, download the file, then upload the filled sheet.</p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="primary"
                  size="sm"
                  icon={Download}
                  onClick={handleDownloadTemplate}
                  loading={downloadingTemplate}
                >
                  Download
                </Button>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="font-inter text-xs font-semibold text-slate-950">Base fields</p>
                  <span className="font-inter text-[11px] text-slate-400">Photo stays included</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  {BASE_FIELDS.map((field) => (
                    <FieldChip
                      key={field.key}
                      field={field}
                      enabled={field.fixed || Boolean(fieldSelection[field.key])}
                      onToggle={() => toggleField(field.key)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="font-inter text-xs font-semibold text-slate-950">Custom fields</p>
                  <span className="font-inter text-[11px] text-slate-400">Use `snake_case`</span>
                </div>
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                  <Input
                    placeholder="employee_id"
                    value={customFieldInput}
                    onChange={(e) => setCustomFieldInput(e.target.value)}
                  />
                  <Button variant="outline" size="md" icon={Plus} onClick={handleAddCustomField}>
                    Add
                  </Button>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {customFields.length === 0 ? (
                    <span className="font-inter text-xs text-slate-400">No custom fields</span>
                  ) : (
                    customFields.map((field) => (
                      <div
                        key={field}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 font-inter text-sm text-slate-700"
                      >
                        <span>{field}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomField(field)}
                          className="text-slate-400 transition-colors hover:text-red-500"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="font-inter text-xs font-semibold text-slate-950">Final columns</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {templateHeaders.map((header) => (
                    <span
                      key={header}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-inter text-[11px] font-medium text-slate-700"
                    >
                      {header}
                    </span>
                  ))}
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 font-inter text-[11px] font-medium text-brand-blue">
                    photo
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="border border-blue-100 p-5 shadow-[0_18px_48px_-40px_rgba(37,99,235,0.28)]">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-brand-blue">
                <Upload size={18} />
              </div>
              <div>
                <h3 className="font-sora text-base font-semibold text-slate-950">Upload file</h3>
                <p className="font-inter text-xs text-slate-500">Attach the completed Excel sheet.</p>
              </div>
            </div>

            <div className="space-y-4">
              <Input
                label="Batch Name"
                placeholder="Human Verification Batch 04-06-2026"
                value={batchName}
                readOnly
              />

              <FileUpload
                label="Completed Excel file (.xlsx)"
                fileType="xlsx"
                accept={{ 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }}
                selectedFile={excelFile}
                onFileSelect={setExcelFile}
                onRemove={() => setExcelFile(null)}
              />

              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <div className="flex items-center justify-between gap-3 font-inter text-sm">
                  <span className="text-slate-500">Template</span>
                  <span className="font-medium text-slate-950">{templateHeaders.length + 1} columns</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 font-inter text-sm">
                  <span className="text-slate-500">Selected checks</span>
                  <span className="font-medium text-slate-950">{selectedVerificationNames.length}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 font-inter text-sm">
                  <span className="text-slate-500">File attached</span>
                  <span className={clsx('font-medium', excelFile ? 'text-brand-blue' : 'text-slate-400')}>
                    {excelFile ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>

              <Button variant="primary" size="lg" className="w-full" onClick={handleContinue} icon={ArrowRight}>
                Continue
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </AuthLayout>
  );
};

export default DownloadTemplate;
