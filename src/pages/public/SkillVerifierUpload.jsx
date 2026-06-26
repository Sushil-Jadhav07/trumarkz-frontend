import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Logo } from '@/components/ui/Logo';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { skillsAPI, getApiError } from '@/services/api';
import toast, { Toaster } from 'react-hot-toast';
import { Upload, CheckCircle, FileText, X, Loader2, ShieldCheck } from 'lucide-react';

export const SkillVerifierUpload = () => {
  const { token } = useParams();
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...selected]);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Please select at least one file');
      return;
    }
    setUploading(true);
    try {
      await skillsAPI.uploadVerifierReport(token, files);
      setUploaded(true);
      toast.success('Documents uploaded successfully!');
    } catch (err) {
      toast.error(getApiError(err, 'Upload failed. The link may have expired.'));
    } finally {
      setUploading(false);
    }
  };

  if (uploaded) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <Card className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h2 className="font-sora font-bold text-xl text-brand-dark mb-2">Upload Complete</h2>
            <p className="text-sm text-gray-500 font-inter">
              Your verification documents have been submitted successfully. The TruMarkZ team will review them shortly.
            </p>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
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
            Upload verification documents for the requested skill
          </p>
        </div>

        <Card className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-brand-dark font-inter mb-2">
              Upload Verification Documents
            </label>
            <div className="border-2 border-dashed border-brand-gray rounded-xl p-6 text-center hover:border-brand-blue transition-colors cursor-pointer">
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
                id="verifier-file-input"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              />
              <label htmlFor="verifier-file-input" className="cursor-pointer">
                <div className="p-3 bg-gray-100 rounded-full inline-flex mb-3">
                  <Upload size={24} className="text-gray-400" />
                </div>
                <p className="text-sm font-medium text-brand-dark font-inter">
                  Click to select files
                </p>
                <p className="text-xs text-gray-400 font-inter mt-1">
                  PDF, JPG, PNG, DOC — Multiple files allowed
                </p>
              </label>
            </div>
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 font-inter uppercase tracking-wide">
                Selected Files ({files.length})
              </p>
              {files.map((file, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                >
                  <FileText size={16} className="text-brand-blue shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-inter text-brand-dark truncate">{file.name}</p>
                    <p className="text-xs text-gray-400 font-inter">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    onClick={() => removeFile(i)}
                    className="p-1 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            icon={uploading ? Loader2 : Upload}
            onClick={handleUpload}
            disabled={uploading || files.length === 0}
          >
            {uploading ? 'Uploading…' : 'Submit Verification Documents'}
          </Button>

          <p className="text-xs text-gray-400 font-inter text-center">
            This is a secure upload link. No login required.
          </p>
        </Card>
      </motion.div>
    </div>
  );
};

export default SkillVerifierUpload;
