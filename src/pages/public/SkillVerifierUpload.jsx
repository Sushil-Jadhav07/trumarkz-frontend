import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Logo } from '@/components/ui/Logo';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { skillsAPI, getApiError } from '@/services/api';
import toast, { Toaster } from 'react-hot-toast';
import { Upload, CheckCircle, XCircle, FileText, X, Loader2, ShieldCheck, AlignLeft } from 'lucide-react';

export const SkillVerifierUpload = () => {
  const { token } = useParams();
  const [files,     setFiles]     = useState([]);
  const [status,    setStatus]    = useState('');       // "verified" | "rejected"
  const [reason,    setReason]    = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploaded,  setUploaded]  = useState(false);
  const [result,    setResult]    = useState(null);

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...selected]);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!status) {
      toast.error('Please select a verification decision (Verified or Rejected)');
      return;
    }
    if (files.length === 0) {
      toast.error('Please attach at least one report file');
      return;
    }
    if (status === 'rejected' && !reason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    setUploading(true);
    try {
      const { data } = await skillsAPI.uploadVerifierReport(token, files, status, reason);
      setResult(data);
      setUploaded(true);
    } catch (err) {
      toast.error(getApiError(err, 'Upload failed. The link may have expired or already been used.'));
    } finally {
      setUploading(false);
    }
  };

  if (uploaded) {
    const isVerified = (result?.status || status) === 'verified';
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
        <Toaster position="top-right" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <Card className="p-8 text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isVerified ? 'bg-green-100' : 'bg-red-100'}`}>
              {isVerified
                ? <CheckCircle size={32} className="text-green-600" />
                : <XCircle   size={32} className="text-red-500" />}
            </div>
            <h2 className="font-sora font-bold text-xl text-brand-dark mb-2">
              {isVerified ? 'Verification Submitted' : 'Rejection Submitted'}
            </h2>
            <p className="text-sm text-gray-500 font-inter">
              {result?.message || (isVerified
                ? 'The skill has been marked as verified. TruMarkZ will notify the individual.'
                : 'The skill has been marked as rejected. TruMarkZ will notify the individual.')}
            </p>
            {result?.files_uploaded != null && (
              <p className="text-xs text-gray-400 font-inter mt-3">
                {result.files_uploaded} file{result.files_uploaded !== 1 ? 's' : ''} uploaded
              </p>
            )}
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
      <Toaster position="top-right" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-6">
          <Logo size="md" />
          <div className="flex items-center justify-center gap-2 mt-4">
            <ShieldCheck size={20} className="text-brand-blue" />
            <h1 className="font-sora font-bold text-xl text-brand-dark">Skill Verification</h1>
          </div>
          <p className="text-sm text-gray-500 font-inter mt-1">
            Review the skill and submit your verification report
          </p>
        </div>

        <Card className="p-6 space-y-5">

          {/* ── Step 1: Decision ──────────────────────────────────────────── */}
          <div>
            <p className="text-sm font-semibold text-brand-dark font-inter mb-1">
              Verification Decision <span className="text-red-500">*</span>
            </p>
            <p className="text-xs text-gray-400 font-inter mb-3">
              Select whether this skill is verified or rejected based on your review.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStatus('verified')}
                className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-semibold font-inter transition-all ${
                  status === 'verified'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 text-gray-500 hover:border-green-300 hover:bg-green-50/50'
                }`}
              >
                <CheckCircle size={16} className={status === 'verified' ? 'text-green-600' : 'text-gray-400'} />
                Verified
              </button>
              <button
                type="button"
                onClick={() => setStatus('rejected')}
                className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-semibold font-inter transition-all ${
                  status === 'rejected'
                    ? 'border-red-500 bg-red-50 text-red-600'
                    : 'border-gray-200 text-gray-500 hover:border-red-300 hover:bg-red-50/50'
                }`}
              >
                <XCircle size={16} className={status === 'rejected' ? 'text-red-500' : 'text-gray-400'} />
                Rejected
              </button>
            </div>
          </div>

          {/* ── Step 2: Reason ───────────────────────────────────────────── */}
          <div>
            <label className="block text-sm font-semibold text-brand-dark font-inter mb-1">
              Reason
              {status === 'rejected' && <span className="text-red-500"> *</span>}
              {status === 'verified' && <span className="text-gray-400 font-normal"> (optional)</span>}
            </label>
            <div className="relative">
              <AlignLeft size={14} className="absolute left-3 top-3 text-gray-400" />
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder={
                  status === 'rejected'
                    ? 'Explain why this skill is being rejected…'
                    : 'Add any notes about this verification (optional)…'
                }
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 pl-9 text-sm font-inter resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue/30 bg-white"
              />
            </div>
          </div>

          {/* ── Step 3: Upload Report Files ───────────────────────────────── */}
          <div>
            <label className="block text-sm font-semibold text-brand-dark font-inter mb-1">
              Report Files <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-400 font-inter mb-2">
              Attach the verification report or supporting documents.
            </p>
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center hover:border-brand-blue transition-colors">
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
                id="verifier-file-input"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              />
              <label htmlFor="verifier-file-input" className="cursor-pointer block">
                <div className="p-3 bg-gray-100 rounded-full inline-flex mb-2">
                  <Upload size={22} className="text-gray-400" />
                </div>
                <p className="text-sm font-medium text-brand-dark font-inter">Click to select files</p>
                <p className="text-xs text-gray-400 font-inter mt-0.5">PDF, JPG, PNG, DOC — multiple files allowed</p>
              </label>
            </div>
          </div>

          {/* Selected files list */}
          {files.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 font-inter uppercase tracking-wide">
                Selected Files ({files.length})
              </p>
              {files.map((file, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <FileText size={16} className="text-brand-blue shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-inter text-brand-dark truncate">{file.name}</p>
                    <p className="text-xs text-gray-400 font-inter">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="p-1 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Submit */}
          <Button
            variant={status === 'rejected' ? 'danger' : 'primary'}
            size="lg"
            className="w-full"
            icon={uploading ? Loader2 : Upload}
            onClick={handleUpload}
            disabled={uploading || !status || files.length === 0}
          >
            {uploading
              ? 'Submitting…'
              : status === 'rejected'
                ? 'Submit Rejection Report'
                : status === 'verified'
                  ? 'Submit Verified Report'
                  : 'Submit Report'}
          </Button>

          <p className="text-xs text-gray-400 font-inter text-center">
            This is a secure, one-time upload link. No login required.
          </p>
        </Card>
      </motion.div>
    </div>
  );
};

export default SkillVerifierUpload;
