import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { StepWizard } from '@/components/ui/StepWizard';
import { FileUpload } from '@/components/ui/FileUpload';
import {
  ArrowRight,
  CircleCheck,
  Download,
  FileSpreadsheet,
  Plus,
  Trash2,
  Upload,
  User,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useApp } from '@/context/AppContext';
import { verificationTypes } from '@/data/mockData';
import { verificationAPI, triggerBlobDownload, getApiError } from '@/services/api';
import { getVerificationApiTypes } from '@/utils/verificationFlow';
import clsx from 'clsx';

const BASE_FIELDS = [
  { key: 'full_name', label: 'Full Name', description: 'Always included in every template', fixed: true },
  { key: 'email', label: 'Email', description: 'Used for invite delivery', fixed: false },
  { key: 'phone_number', label: 'Mobile', description: 'Optional base column', fixed: false },
  { key: 'dob', label: 'DOB', description: 'Optional base column', fixed: false },
];

const EXTRA_FIELDS = [
  { key: 'aadhar_number', label: 'Aadhaar Number' },
  { key: 'pan_number', label: 'PAN Number' },
  { key: 'address_line1', label: 'Address Line 1' },
  { key: 'address_line2', label: 'Address Line 2' },
  { key: 'address_line3', label: 'Address Line 3' },
  { key: 'pincode', label: 'Pincode' },
  { key: 'state', label: 'State' },
  { key: 'country', label: 'Country' },
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

const FieldCard = ({ field, enabled, onToggle }) => (
  <button
    type="button"
    onClick={field.fixed ? undefined : onToggle}
    className={clsx(
      'rounded-[20px] border p-4 text-left transition-all',
      field.fixed || enabled
        ? 'border-brand-blue/25 bg-brand-blue/[0.04]'
        : 'border-slate-200 bg-white hover:border-slate-300'
    )}
  >
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="font-sora text-base font-semibold text-slate-950">{field.label}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500 font-inter">{field.description}</p>
      </div>
      <span
        className={clsx(
          'inline-flex min-w-[54px] items-center justify-center rounded-full px-3 py-1 text-[11px] font-semibold',
          field.fixed
            ? 'bg-brand-blue/10 text-brand-blue'
            : enabled
              ? 'bg-brand-blue text-white'
              : 'bg-slate-100 text-slate-600'
        )}
      >
        {field.fixed ? 'Fixed' : enabled ? 'On' : 'Off'}
      </span>
    </div>
  </button>
);

export const DownloadTemplate = () => {
  const navigate = useNavigate();
  const { selectedVerifications } = useApp();

  const [mode, setMode] = useState('bulk');
  const [excelFile, setExcelFile] = useState(null);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [customFieldInput, setCustomFieldInput] = useState('');
  const [customFields, setCustomFields] = useState([]);
  const [fieldSelection, setFieldSelection] = useState(DEFAULT_FIELD_SELECTION);
  const [singleForm, setSingleForm] = useState({
    fullName: '',
    dob: '',
    mobile: '',
    photo: null,
  });

  const selectedVerificationNames = selectedVerifications
    .map((id) => verificationTypes.find((vt) => vt.id === id)?.name)
    .filter(Boolean);

  const selectedVerificationTypes = getVerificationApiTypes(selectedVerifications);

  const selectedBaseHeaders = useMemo(
    () =>
      BASE_FIELDS.filter((field) => field.fixed || fieldSelection[field.key])
        .map((field) => field.key),
    [fieldSelection]
  );

  const templateHeaders = useMemo(
    () => [...selectedBaseHeaders, ...customFields],
    [selectedBaseHeaders, customFields]
  );

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

    if (templateHeaders.includes(normalized) || EXTRA_FIELDS.some((field) => field.key === normalized)) {
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

  const handleContinueBulk = () => {
    if (!excelFile) {
      toast.error('Please upload the completed Excel file');
      return;
    }

    toast.success('Template setup captured');
    navigate('/org/create-batch', { state: { fromVerificationFlow: true } });
  };

  const handleContinueSingle = () => {
    if (!singleForm.fullName) { toast.error('Full Name is required'); return; }
    if (!singleForm.dob) { toast.error('Date of Birth is required'); return; }
    if (!singleForm.mobile) { toast.error('Mobile Number is required'); return; }
    toast.success('Single record submitted');
    navigate('/org/batch-status');
  };

  return (
    <AuthLayout title="Template setup">
      <div className="w-full mx-auto lg:max-w-none">
        <StepWizard steps={['Industry', 'Verifications', 'Permissions', 'Template', 'Batch']} currentStep={3} />
        <PageHeader
          title="Upload Verification Data"
          subtitle="Choose bulk upload or fill a single record"
        />

        <Card className="p-2 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { id: 'bulk', label: 'Bulk Upload', icon: FileSpreadsheet, hint: 'Excel flow' },
              { id: 'single', label: 'Single Record', icon: User, hint: 'Direct form entry' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setMode(tab.id)}
                className={clsx(
                  'rounded-2xl px-4 py-4 text-left transition-all border',
                  mode === tab.id
                    ? 'bg-brand-blue/[0.04] border-brand-blue/40 shadow-[0_12px_30px_-26px_rgba(37,99,235,0.45)]'
                    : 'bg-white border-transparent hover:bg-slate-50'
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <tab.icon size={16} className={mode === tab.id ? 'text-brand-blue' : 'text-slate-500'} />
                  <span className={clsx('font-sora font-semibold text-sm', mode === tab.id ? 'text-slate-950' : 'text-slate-700')}>
                    {tab.label}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-inter">{tab.hint}</p>
              </button>
            ))}
          </div>
        </Card>

        {mode === 'bulk' && (
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
            <div className="space-y-5">
              <Card className="rounded-[28px] border border-slate-200 p-5">
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-brand-blue/10 px-3 py-1 text-[11px] font-semibold text-brand-blue">
                      Step 1 • build template
                    </div>
                    <h3 className="mt-3 font-sora text-[30px] font-semibold tracking-[-0.04em] text-slate-950">
                      Download template
                    </h3>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 font-inter">
                      Pick the base fields you want, add extra columns if needed, and download a template aligned with your selected verification checks.
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-center min-w-[88px]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Columns</p>
                    <p className="mt-1 font-sora text-3xl font-semibold text-slate-950">{templateHeaders.length + 1}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_240px] gap-4">
                  <div className="rounded-[22px] border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-950">Base fields</p>
                    <p className="mt-1 text-xs text-slate-500 font-inter">
                      Only Full Name stays fixed. Turn the other base fields on or off as needed.
                    </p>
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {BASE_FIELDS.map((field) => (
                        <FieldCard
                          key={field.key}
                          field={field}
                          enabled={field.fixed || Boolean(fieldSelection[field.key])}
                          onToggle={() => toggleField(field.key)}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[22px] border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-950">Template summary</p>
                    <p className="mt-1 text-xs text-slate-500 font-inter">
                      What will be included in the file.
                    </p>
                    <div className="mt-4 space-y-3">
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Base</p>
                        <p className="mt-1 font-sora text-3xl text-slate-950">{selectedBaseHeaders.length}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Custom</p>
                        <p className="mt-1 font-sora text-3xl text-slate-950">{customFields.length}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Verification</p>
                        <p className="mt-1 font-sora text-3xl text-slate-950">{selectedVerificationNames.length}</p>
                      </div>
                      <p className="text-[11px] leading-5 text-brand-blue font-inter">
                        Includes Photo automatically in the downloaded template.
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="rounded-[28px] border border-slate-200 p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">Custom fields</p>
                    <p className="mt-1 text-xs text-slate-500 font-inter">
                      Add your own extra columns. They will be added to the Excel template and uploaded with the sheet.
                    </p>
                  </div>
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                    snake_case
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                  <Input
                    placeholder="e.g. employee_id or department"
                    value={customFieldInput}
                    onChange={(e) => setCustomFieldInput(e.target.value)}
                  />
                  <Button variant="outline" size="lg" icon={Plus} onClick={handleAddCustomField}>
                    Add field
                  </Button>
                </div>

                <div className="mt-4 rounded-[18px] bg-slate-50 p-4">
                  {customFields.length === 0 ? (
                    <p className="text-sm text-slate-500 font-inter">No custom fields added yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {customFields.map((field) => (
                        <div
                          key={field}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                        >
                          <span>{field}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomField(field)}
                            className="text-slate-400 transition-colors hover:text-red-500"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>

              <Card className="rounded-[28px] border border-slate-200 p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">Column preview</p>
                    <p className="mt-1 text-xs text-slate-500 font-inter">
                      This is the final structure sent to the template API.
                    </p>
                  </div>
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                    {templateHeaders.length + 1} columns
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {templateHeaders.map((header) => (
                    <span
                      key={header}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-medium text-slate-700"
                    >
                      {header}
                    </span>
                  ))}
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-medium text-emerald-700">
                    Photo
                  </span>
                </div>

                <div className="mt-5 flex items-center justify-between gap-4 rounded-[18px] bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-500 font-inter">
                    This screen controls only the editable base fields and your custom headers. The photo column stays locked.
                  </p>
                  <Button
                    variant="success"
                    size="md"
                    icon={Download}
                    onClick={handleDownloadTemplate}
                    loading={downloadingTemplate}
                    className="shrink-0"
                  >
                    Download template
                  </Button>
                </div>
              </Card>

              <Card className="rounded-[28px] border border-slate-200 p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-brand-blue/10 px-3 py-1 text-[11px] font-semibold text-brand-blue">
                      Step 2
                    </div>
                    <h3 className="mt-3 font-sora text-[28px] font-semibold tracking-[-0.04em] text-slate-950">
                      Upload filled file
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500 font-inter">
                      Upload the completed spreadsheet after you fill in the downloaded template.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <Input
                    label="Batch Name"
                    placeholder="Human Verification Batch 04-06-2026"
                    value="Human Verification Batch 04-06-2026"
                    readOnly
                  />
                  <FileUpload
                    label="Upload completed Excel file (.xlsx)"
                    fileType="xlsx"
                    accept={{ 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }}
                    selectedFile={excelFile}
                    onFileSelect={setExcelFile}
                    onRemove={() => setExcelFile(null)}
                  />
                </div>
              </Card>
            </div>

            <div>
              <Card className="sticky top-24 rounded-[28px] overflow-hidden border border-slate-200 p-0">
                <div className="bg-slate-950 px-5 py-5 text-white">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">Ready to submit</p>
                  <h3 className="mt-2 font-sora text-[28px] font-semibold tracking-[-0.04em]">
                    Upload checklist
                  </h3>
                  <p className="mt-2 text-xs leading-6 text-white/70 font-inter">
                    Download the file, fill it offline, then continue with the batch upload.
                  </p>
                </div>

                <div className="p-5">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 rounded-[18px] bg-slate-50 p-4">
                      <CircleCheck size={16} className="mt-0.5 text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-slate-950">Template builder ready</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500 font-inter">
                          Base fields, your custom fields, and selected verification fields are configured.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 rounded-[18px] bg-slate-50 p-4">
                      <Upload size={16} className={clsx('mt-0.5 shrink-0', excelFile ? 'text-emerald-600' : 'text-slate-300')} />
                      <div>
                        <p className="text-sm font-semibold text-slate-950">Excel upload</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500 font-inter">
                          {excelFile
                            ? `${excelFile.name} is attached`
                            : 'Upload the completed template file (.xlsx) to continue'}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-[18px] border border-slate-200 bg-white p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Current setup</p>
                      <div className="mt-3 space-y-2 text-xs font-inter text-slate-600">
                        <div className="flex items-center justify-between"><span>Base fields</span><span className="font-semibold text-slate-950">{selectedBaseHeaders.length}</span></div>
                        <div className="flex items-center justify-between"><span>Custom fields</span><span className="font-semibold text-slate-950">{customFields.length}</span></div>
                        <div className="flex items-center justify-between"><span>Verification fields</span><span className="font-semibold text-slate-950">{selectedVerificationNames.length}</span></div>
                        <div className="flex items-center justify-between"><span>Total columns</span><span className="font-semibold text-slate-950">{templateHeaders.length + 1}</span></div>
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 text-xs leading-5 text-slate-400 font-inter">
                    Once the spreadsheet is uploaded, continue to review and submit your batch.
                  </p>

                  <Button variant="primary" size="lg" className="w-full mt-5" onClick={handleContinueBulk} icon={ArrowRight}>
                    Continue
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        )}

        {mode === 'single' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-6 space-y-4">
              <h3 className="font-sora font-semibold text-brand-dark mb-1">Single record details</h3>
              <p className="text-sm text-gray-500 font-inter -mt-1 mb-3">
                Fill in this form to verify one individual record directly.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  placeholder="e.g. Ravi Kumar"
                  value={singleForm.fullName}
                  onChange={(e) => setSingleForm((p) => ({ ...p, fullName: e.target.value }))}
                />
                <Input
                  label="Date of Birth"
                  type="date"
                  value={singleForm.dob}
                  onChange={(e) => setSingleForm((p) => ({ ...p, dob: e.target.value }))}
                />
              </div>

              <Input
                label="Mobile Number"
                placeholder="+91 9876543210"
                value={singleForm.mobile}
                onChange={(e) => setSingleForm((p) => ({ ...p, mobile: e.target.value }))}
              />

              {selectedVerifications.includes('identity') && (
                <Input
                  label="Aadhaar Number"
                  placeholder="XXXX XXXX XXXX"
                  value={singleForm.aadhaar || ''}
                  onChange={(e) => setSingleForm((p) => ({ ...p, aadhaar: e.target.value }))}
                />
              )}
              {selectedVerifications.includes('pan') && (
                <Input
                  label="PAN Number"
                  placeholder="ABCDE1234F"
                  value={singleForm.pan || ''}
                  onChange={(e) => setSingleForm((p) => ({ ...p, pan: e.target.value }))}
                />
              )}

              <div>
                <label className="block text-sm font-medium text-brand-dark font-inter mb-1.5">Photo</label>
                <FileUpload
                  label="Upload Photo"
                  accept={{ 'image/*': ['.jpg', '.jpeg', '.png'] }}
                  selectedFile={singleForm.photo}
                  onFileSelect={(f) => setSingleForm((p) => ({ ...p, photo: f }))}
                  onRemove={() => setSingleForm((p) => ({ ...p, photo: null }))}
                />
              </div>

              <Button variant="primary" size="lg" className="w-full" onClick={handleContinueSingle} icon={ArrowRight}>
                Submit for verification
              </Button>
            </Card>
          </motion.div>
        )}
      </div>
    </AuthLayout>
  );
};

export default DownloadTemplate;
