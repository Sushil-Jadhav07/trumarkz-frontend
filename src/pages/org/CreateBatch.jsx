import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StepWizard } from '@/components/ui/StepWizard';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { verificationAPI, getApiError } from '@/services/api';
import {
  ArrowRight, FileSpreadsheet, Layers, Eye, Upload,
  CheckCircle, AlertTriangle, XCircle, Users, X
} from 'lucide-react';
import toast from 'react-hot-toast';

export const CreateBatch = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [batchName, setBatchName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Result state after successful upload
  const [uploadResult, setUploadResult] = useState(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls'].includes(ext)) {
      toast.error('Only .xlsx or .xls files are accepted');
      return;
    }
    setSelectedFile(file);
    setUploadResult(null);
  };

  const handleSubmit = async () => {
    if (!batchName.trim()) { toast.error('Please enter a batch name'); return; }
    if (!selectedFile) { toast.error('Please select an Excel file'); return; }

    setLoading(true);
    setUploadProgress(0);

    try {
      const { data } = await verificationAPI.bulkUpload(
        selectedFile,
        batchName.trim(),
        description.trim(),
        setUploadProgress
      );
      setUploadResult(data);
      toast.success(`Batch created! ${data.total_uploaded} users uploaded.`);
    } catch (err) {
      toast.error(getApiError(err, 'Batch upload failed. Please try again.'));
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const handleDone = () => navigate('/org/batch-status');

  return (
    <AuthLayout title="Create Batch">
      <div className="w-full mx-auto lg:max-w-none">
        <StepWizard
          steps={['Industry', 'Verifications', 'Permissions', 'Template', 'Batch']}
          currentStep={4}
        />
        <PageHeader
          title="Create Verification Batch"
          subtitle="Upload an Excel file to create a batch of users for verification"
        />

        {!uploadResult ? (
          <Card className="p-6 space-y-5">
            {/* Batch Name */}
            <Input
              label="Batch Name *"
              placeholder="e.g. Driver Verification - May 2026"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              icon={Layers}
            />

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 font-inter mb-1">
                Description (optional)
              </label>
              <textarea
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-inter
                           focus:outline-none focus:ring-2 focus:ring-brand-blue/30 resize-none"
                rows={2}
                placeholder="Add a short description for this batch…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Excel Format hint */}
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-xs font-semibold text-blue-700 font-inter mb-1">
                Required Excel columns
              </p>
              <p className="text-xs text-blue-600 font-inter">
                <span className="font-semibold">full_name</span>,{' '}
                <span className="font-semibold">email</span>,{' '}
                <span className="font-semibold">phone_number</span>
                {' '}— plus optional: dob, aadhar_number, pan_number, address_line1–3, pincode, state, country
              </p>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 font-inter mb-2">
                Excel File (.xlsx / .xls) *
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
              {selectedFile ? (
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
                  <FileSpreadsheet size={22} className="text-green-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-brand-dark font-inter truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-gray-500 font-inter">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    onClick={() => { setSelectedFile(null); fileInputRef.current.value = ''; }}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X size={16} />
                  </button>
                  <Badge status="success">Ready</Badge>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-2 p-8
                             border-2 border-dashed border-gray-200 rounded-xl
                             hover:border-brand-blue hover:bg-blue-50/40 transition-all"
                >
                  <Upload size={24} className="text-gray-400" />
                  <span className="text-sm text-gray-500 font-inter">
                    Click to select your Excel file
                  </span>
                  <span className="text-xs text-gray-400 font-inter">.xlsx or .xls</span>
                </button>
              )}
            </div>

            {/* Upload Progress */}
            {loading && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-500 font-inter">
                  <span>Uploading…</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <motion.div
                    className="bg-brand-blue h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ ease: 'easeOut', duration: 0.3 }}
                  />
                </div>
              </div>
            )}

            <div className="pt-2">
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleSubmit}
                icon={ArrowRight}
                disabled={loading || !selectedFile || !batchName.trim()}
              >
                {loading ? 'Uploading…' : 'Submit Batch'}
              </Button>
            </div>
          </Card>
        ) : (
          /* ── Upload Result ── */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Summary Card */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 rounded-xl bg-green-50">
                  <CheckCircle size={22} className="text-green-600" />
                </div>
                <div>
                  <h3 className="font-sora font-semibold text-brand-dark">
                    Batch Created Successfully
                  </h3>
                  <p className="text-xs text-gray-500 font-inter truncate">
                    ID: {uploadResult.batch_id}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: 'Uploaded', value: uploadResult.total_uploaded, color: 'bg-green-500' },
                  { label: 'Skipped', value: uploadResult.total_skipped, color: 'bg-orange-400' },
                  { label: 'Errors', value: uploadResult.errors?.length || 0, color: 'bg-red-500' },
                ].map((s) => (
                  <div key={s.label} className={`${s.color} text-white rounded-xl p-4 text-center`}>
                    <p className="font-sora font-bold text-2xl">{s.value}</p>
                    <p className="text-xs opacity-85 font-inter">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Successful users with invite links */}
              {uploadResult.successful_users?.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-brand-dark font-inter flex items-center gap-2">
                      <Users size={14} className="text-green-600" />
                      Uploaded Users &amp; Invite Links
                    </h4>
                    <button
                      onClick={() => setShowPreview(!showPreview)}
                      className="text-xs text-brand-blue font-inter hover:underline flex items-center gap-1"
                    >
                      <Eye size={12} />
                      {showPreview ? 'Hide' : 'Show all'}
                    </button>
                  </div>

                  <AnimatePresence>
                    {showPreview && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="overflow-x-auto rounded-xl border border-gray-100">
                          <table className="w-full text-xs font-inter">
                            <thead>
                              <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="text-left p-3 text-gray-500 font-medium">#</th>
                                <th className="text-left p-3 text-gray-500 font-medium">Name</th>
                                <th className="text-left p-3 text-gray-500 font-medium">Email</th>
                                <th className="text-left p-3 text-gray-500 font-medium">Invite Link</th>
                              </tr>
                            </thead>
                            <tbody>
                              {uploadResult.successful_users.map((u, i) => (
                                <tr key={u.user_id} className="border-b border-gray-50">
                                  <td className="p-3 text-gray-400">{i + 1}</td>
                                  <td className="p-3 font-medium text-brand-dark">{u.full_name}</td>
                                  <td className="p-3 text-gray-600">{u.email}</td>
                                  <td className="p-3">
                                    <a
                                      href={u.invite_link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-brand-blue hover:underline truncate block max-w-[180px]"
                                    >
                                      {u.invite_link}
                                    </a>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </Card>

            {/* Skipped users */}
            {uploadResult.skipped_users?.length > 0 && (
              <Card className="p-5">
                <h4 className="text-sm font-semibold text-orange-600 font-inter flex items-center gap-2 mb-3">
                  <AlertTriangle size={14} />
                  Skipped Rows ({uploadResult.skipped_users.length})
                </h4>
                <div className="space-y-2">
                  {uploadResult.skipped_users.map((s, i) => (
                    <div key={i} className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                      <p className="text-xs font-medium text-orange-800 font-inter">
                        Row {s.row}: {s.reason}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Errors */}
            {uploadResult.errors?.length > 0 && (
              <Card className="p-5">
                <h4 className="text-sm font-semibold text-red-600 font-inter flex items-center gap-2 mb-3">
                  <XCircle size={14} />
                  Errors ({uploadResult.errors.length})
                </h4>
                <div className="space-y-2">
                  {uploadResult.errors.map((e, i) => (
                    <div key={i} className="p-3 bg-red-50 rounded-lg border border-red-100">
                      <p className="text-xs font-medium text-red-800 font-inter">
                        Row {e.row} — {e.field}: {e.error}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Button variant="primary" size="lg" className="w-full" onClick={handleDone} icon={ArrowRight}>
              View Batch Status
            </Button>
          </motion.div>
        )}
      </div>
    </AuthLayout>
  );
};

export default CreateBatch;