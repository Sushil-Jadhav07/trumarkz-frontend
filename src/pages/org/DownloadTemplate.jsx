import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { StepWizard } from '@/components/ui/StepWizard';
import { FileUpload } from '@/components/ui/FileUpload';
import { Download, ArrowRight, FileSpreadsheet, User, FileArchive, CircleCheck, UploadCloud } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { useApp } from '@/context/AppContext';
import { verificationTypes } from '@/data/mockData';
import clsx from 'clsx';

export const DownloadTemplate = () => {
  const navigate = useNavigate();
  const { selectedVerifications } = useApp();
  const [mode, setMode] = useState('bulk');
  const [excelFile, setExcelFile] = useState(null);
  const [zipFile, setZipFile] = useState(null);
  const [singleForm, setSingleForm] = useState({
    fullName: '', dob: '', mobile: '', photo: null,
  });

  const selectedVerificationNames = selectedVerifications
    .map((id) => verificationTypes.find((vt) => vt.id === id)?.name)
    .filter(Boolean);

  const handleDownloadTemplate = () => {
    const baseFields = {
      'Full Name': '', 'Date of Birth': '', 'Mobile Number': '', 'Photo File Name': '',
    };
    const extraFields = {};
    selectedVerifications.forEach(id => {
      if (id === 'identity') { extraFields['Aadhaar Number'] = ''; }
      if (id === 'pan') { extraFields['PAN Number'] = ''; }
      if (id === 'driving') { extraFields['Driving Licence Number'] = ''; extraFields['DL Expiry Date'] = ''; }
      if (id === 'education') { extraFields['College / University Name'] = ''; extraFields['Degree'] = ''; extraFields['Graduation Year'] = ''; }
      if (id === 'employment') { extraFields['Employer Name'] = ''; extraFields['Employment Duration'] = ''; extraFields['EPFO UAN'] = ''; }
      if (id === 'address') { extraFields['Full Address'] = ''; extraFields['City'] = ''; extraFields['PIN Code'] = ''; }
      if (id === 'police') { extraFields['Police Station'] = ''; extraFields['City of Residence'] = ''; }
      if (id === 'compliance') { extraFields['Product Name'] = ''; extraFields['Batch Number'] = ''; extraFields['Compliance Standard'] = ''; }
    });
    const templateRows = [{ ...baseFields, ...extraFields }];
    const worksheet = XLSX.utils.json_to_sheet(templateRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'VerificationTemplate');
    XLSX.writeFile(workbook, 'trumarkz-verification-template.xlsx');
    toast.success('Template downloaded with your selected fields');
  };

  const handleContinueBulk = () => {
    if (!excelFile) { toast.error('Please upload the filled Excel file'); return; }
    toast.success('Files uploaded successfully');
    navigate('/org/create-batch');
  };

  const handleContinueSingle = () => {
    if (!singleForm.fullName) { toast.error('Full Name is required'); return; }
    if (!singleForm.dob) { toast.error('Date of Birth is required'); return; }
    if (!singleForm.mobile) { toast.error('Mobile Number is required'); return; }
    toast.success('Single record submitted');
    navigate('/org/batch-status');
  };

  return (
    <AuthLayout title="Upload Data">
      <div className="w-full mx-auto lg:max-w-none">
        <StepWizard steps={['Industry', 'Verifications', 'Permissions', 'Template', 'Batch']} currentStep={3} />
        <PageHeader title="Upload Verification Data" subtitle="Choose bulk upload or fill a single record" />

        <Card className="p-2 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { id: 'bulk', label: 'Bulk Upload', icon: FileSpreadsheet, hint: 'Excel + ZIP flow' },
              { id: 'single', label: 'Single Record', icon: User, hint: 'Direct form entry' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setMode(tab.id)}
                className={clsx(
                  'rounded-lg px-4 py-3 text-left transition-all border',
                  mode === tab.id
                    ? 'bg-brand-blue/5 border-brand-blue/30'
                    : 'bg-white border-transparent hover:bg-gray-50'
                )}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <tab.icon size={16} className={mode === tab.id ? 'text-brand-blue' : 'text-gray-500'} />
                  <span className={clsx('font-sora font-semibold text-sm', mode === tab.id ? 'text-brand-dark' : 'text-gray-700')}>
                    {tab.label}
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-inter">{tab.hint}</p>
              </button>
            ))}
          </div>
        </Card>

        {mode === 'bulk' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="xl:col-span-2 space-y-5">
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-full bg-brand-blue text-white flex items-center justify-center font-sora font-bold shrink-0">1</div>
                  <div>
                    <h3 className="font-sora font-semibold text-brand-dark">Download Template</h3>
                    <p className="text-sm text-gray-500 font-inter">Generate an Excel template based on selected verifications</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-100">
                  <p className="text-xs text-gray-500 font-inter mb-2">Included base fields</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {['Full Name', 'DOB', 'Mobile', 'Photo'].map((f) => (
                      <span key={f} className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-inter">{f}</span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 font-inter mb-2">Selected verification fields</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedVerificationNames.length > 0 ? selectedVerificationNames.map((name) => (
                      <span key={name} className="text-xs bg-brand-blue/10 text-brand-blue px-2 py-0.5 rounded-full font-inter">+ {name}</span>
                    )) : (
                      <span className="text-xs text-gray-400 font-inter">No verification fields selected</span>
                    )}
                  </div>
                </div>

                <Button variant="success" size="md" icon={Download} onClick={handleDownloadTemplate}>
                  Download Template
                </Button>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-full bg-brand-blue text-white flex items-center justify-center font-sora font-bold shrink-0">2</div>
                  <div>
                    <h3 className="font-sora font-semibold text-brand-dark">Upload Filled Files</h3>
                    <p className="text-sm text-gray-500 font-inter">Upload your completed spreadsheet and optional photo ZIP</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <FileUpload
                    label="Upload Excel File (.xlsx)"
                    fileType="xlsx"
                    accept={{ 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }}
                    selectedFile={excelFile}
                    onFileSelect={setExcelFile}
                    onRemove={() => setExcelFile(null)}
                  />
                  <FileUpload
                    label="Upload Photos ZIP (optional)"
                    fileType="zip"
                    accept={{ 'application/zip': ['.zip'] }}
                    selectedFile={zipFile}
                    onFileSelect={setZipFile}
                    onRemove={() => setZipFile(null)}
                  />
                </div>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
              <Card className="p-5 sticky top-24">
                <h4 className="font-sora font-semibold text-brand-dark mb-3">Upload Checklist</h4>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm font-inter text-gray-600">
                    <CircleCheck size={15} className="text-green-600" />
                    Template downloaded
                  </div>
                  <div className="flex items-center gap-2 text-sm font-inter text-gray-600">
                    <UploadCloud size={15} className={excelFile ? 'text-green-600' : 'text-gray-400'} />
                    Excel uploaded {excelFile ? '(ready)' : '(required)'}
                  </div>
                  <div className="flex items-center gap-2 text-sm font-inter text-gray-600">
                    <FileArchive size={15} className={zipFile ? 'text-green-600' : 'text-gray-400'} />
                    Photos ZIP {zipFile ? '(attached)' : '(optional)'}
                  </div>
                </div>

                <div className="p-3 bg-brand-blue/5 border border-brand-blue/20 rounded-lg mb-4">
                  <p className="text-xs text-brand-blue font-inter">Once uploaded, proceed to review and submit your batch.</p>
                </div>

                <Button variant="primary" size="lg" className="w-full" onClick={handleContinueBulk} icon={ArrowRight}>
                  Continue
                </Button>
              </Card>
            </motion.div>
          </div>
        )}

        {mode === 'single' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-6 space-y-4">
              <h3 className="font-sora font-semibold text-brand-dark mb-1">Single Record Details</h3>
              <p className="text-sm text-gray-500 font-inter -mt-1 mb-3">
                Fill in this form to verify one individual or product record directly.
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
                <Input label="Aadhaar Number" placeholder="XXXX XXXX XXXX" value={singleForm.aadhaar || ''} onChange={(e) => setSingleForm((p) => ({ ...p, aadhaar: e.target.value }))} />
              )}
              {selectedVerifications.includes('pan') && (
                <Input label="PAN Number" placeholder="ABCDE1234F" value={singleForm.pan || ''} onChange={(e) => setSingleForm((p) => ({ ...p, pan: e.target.value }))} />
              )}
              {selectedVerifications.includes('driving') && (
                <Input label="Driving Licence Number" placeholder="KA0892200X" value={singleForm.dl || ''} onChange={(e) => setSingleForm((p) => ({ ...p, dl: e.target.value }))} />
              )}
              {selectedVerifications.includes('education') && (
                <Input label="College / University Name" placeholder="e.g. Mumbai University" value={singleForm.college || ''} onChange={(e) => setSingleForm((p) => ({ ...p, college: e.target.value }))} />
              )}
              {selectedVerifications.includes('address') && (
                <Input label="Full Address" placeholder="House No, Street, City, PIN" value={singleForm.address || ''} onChange={(e) => setSingleForm((p) => ({ ...p, address: e.target.value }))} />
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
                Submit for Verification
              </Button>
            </Card>
          </motion.div>
        )}
      </div>
    </AuthLayout>
  );
};

export default DownloadTemplate;
