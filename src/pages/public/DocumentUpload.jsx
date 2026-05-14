/**
 * DocumentUpload.jsx
 * Public page for invited users to upload their photo and documents.
 * Accessed via: /upload?token=<invite_token>
 * No authentication required — uses the invite token from the URL.
 */
import React, { useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { verificationAPI, getApiError } from '@/services/api';
import { Logo } from '@/components/ui/Logo';
import {
  Camera, FileText, Upload, CheckCircle, XCircle,
  AlertTriangle, RefreshCw, X
} from 'lucide-react';
import toast from 'react-hot-toast';

const DOCUMENT_TYPES = [
  { label: 'Aadhar Card',          value: 'aadhar',             accept: '.pdf,.jpg,.jpeg,.png' },
  { label: 'PAN Card',             value: 'pan',                accept: '.pdf,.jpg,.jpeg,.png' },
  { label: 'Degree Certificate',   value: 'degree_certificate', accept: '.pdf,.jpg,.jpeg,.png' },
  { label: 'Driving License',      value: 'driving_license',    accept: '.pdf,.jpg,.jpeg,.png' },
];

const UploadItem = ({ label, accept, onUpload, result, loading }) => {
  const fileRef = useRef(null);

  return (
    <div className="p-4 border border-gray-100 rounded-xl bg-gray-50 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-brand-dark font-inter">{label}</p>
        {result?.success && <CheckCircle size={16} className="text-green-500" />}
        {result?.error && <XCircle size={16} className="text-red-500" />}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
        }}
      />
      {result?.success ? (
        <div className="text-xs text-green-600 font-inter truncate">
          ✓ Uploaded — <a href={result.url} target="_blank" rel="noopener noreferrer" className="underline">View</a>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          className="flex items-center gap-2 text-xs text-brand-blue font-inter hover:underline disabled:opacity-50"
        >
          {loading ? <RefreshCw size={12} className="animate-spin" /> : <Upload size={12} />}
          {loading ? 'Uploading…' : result?.error ? 'Retry upload' : 'Choose file'}
        </button>
      )}
      {result?.error && (
        <p className="text-xs text-red-500 font-inter">{result.error}</p>
      )}
    </div>
  );
};

export const DocumentUpload = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [photoResult, setPhotoResult]     = useState(null);
  const [photoLoading, setPhotoLoading]   = useState(false);
  const [docResults, setDocResults]       = useState({});
  const [docLoading, setDocLoading]       = useState({});
  const [allDone, setAllDone]             = useState(false);

  const photoRef = useRef(null);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="text-center max-w-sm">
          <AlertTriangle size={40} className="text-orange-400 mx-auto mb-3" />
          <h2 className="font-sora font-bold text-xl text-brand-dark mb-2">Invalid Link</h2>
          <p className="text-sm text-gray-500 font-inter">
            This upload link is invalid or has expired. Please contact your organization.
          </p>
        </div>
      </div>
    );
  }

  const handlePhotoUpload = async (file) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed for photo upload');
      return;
    }
    setPhotoLoading(true);
    try {
      const { data } = await verificationAPI.uploadPhoto(token, file);
      setPhotoResult({ success: true, url: data.photo_url });
      toast.success('Photo uploaded!');
    } catch (err) {
      const msg = getApiError(err, 'Photo upload failed');
      setPhotoResult({ success: false, error: msg });
      toast.error(msg);
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleDocUpload = async (docType, file) => {
    setDocLoading((prev) => ({ ...prev, [docType]: true }));
    try {
      const { data } = await verificationAPI.uploadDocument(token, docType, file);
      setDocResults((prev) => ({
        ...prev,
        [docType]: { success: true, url: data.document_url, version: data.version },
      }));
      toast.success(`${docType.replace(/_/g, ' ')} uploaded!`);
    } catch (err) {
      const msg = getApiError(err, 'Upload failed');
      setDocResults((prev) => ({ ...prev, [docType]: { success: false, error: msg } }));
      toast.error(msg);
    } finally {
      setDocLoading((prev) => ({ ...prev, [docType]: false }));
    }
  };

  const handleDone = () => setAllDone(true);

  const uploadedCount =
    (photoResult?.success ? 1 : 0) +
    Object.values(docResults).filter((r) => r?.success).length;

  if (allDone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-sm"
        >
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={40} className="text-green-500" />
          </div>
          <h2 className="font-sora font-bold text-2xl text-brand-dark mb-2">
            Uploads Complete!
          </h2>
          <p className="text-sm text-gray-500 font-inter">
            Your documents have been submitted for verification. You will be notified once the review is complete.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <Logo />
      </div>

      <div className="max-w-lg mx-auto px-5 py-8 space-y-6">
        <div>
          <h1 className="font-sora font-bold text-2xl text-brand-dark">Upload Your Documents</h1>
          <p className="text-sm text-gray-500 font-inter mt-1">
            Please upload your photo and identity documents for verification.
          </p>
        </div>

        {/* Progress */}
        <div className="p-4 bg-brand-blue/5 rounded-xl border border-brand-blue/10">
          <div className="flex justify-between text-xs font-inter text-gray-500 mb-2">
            <span>Uploads completed</span>
            <span className="font-semibold text-brand-blue">{uploadedCount} / {1 + DOCUMENT_TYPES.length}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-brand-blue h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${(uploadedCount / (1 + DOCUMENT_TYPES.length)) * 100}%` }}
            />
          </div>
        </div>

        {/* Photo Upload */}
        <div>
          <h2 className="font-sora font-semibold text-brand-dark mb-3 flex items-center gap-2">
            <Camera size={16} className="text-brand-blue" />
            Profile Photo
          </h2>
          <input
            ref={photoRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); }}
          />
          {photoResult?.success ? (
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
              <img
                src={photoResult.url}
                alt="Profile"
                className="w-12 h-12 rounded-full object-cover"
              />
              <div>
                <p className="text-sm font-medium text-green-700 font-inter">Photo uploaded!</p>
                <a href={photoResult.url} target="_blank" rel="noopener noreferrer"
                   className="text-xs text-brand-blue font-inter hover:underline">View photo</a>
              </div>
            </div>
          ) : (
            <button
              onClick={() => photoRef.current?.click()}
              disabled={photoLoading}
              className="w-full flex flex-col items-center justify-center gap-2 p-8
                         border-2 border-dashed border-gray-200 rounded-xl
                         hover:border-brand-blue hover:bg-blue-50/40 transition-all
                         disabled:opacity-50"
            >
              {photoLoading
                ? <RefreshCw size={24} className="text-brand-blue animate-spin" />
                : <Camera size={24} className="text-gray-400" />
              }
              <span className="text-sm text-gray-500 font-inter">
                {photoLoading ? 'Uploading…' : 'Click to upload your photo'}
              </span>
              <span className="text-xs text-gray-400 font-inter">JPG or PNG</span>
            </button>
          )}
        </div>

        {/* Documents */}
        <div>
          <h2 className="font-sora font-semibold text-brand-dark mb-3 flex items-center gap-2">
            <FileText size={16} className="text-brand-blue" />
            Identity Documents
          </h2>
          <div className="space-y-3">
            {DOCUMENT_TYPES.map((doc) => (
              <UploadItem
                key={doc.value}
                label={doc.label}
                accept={doc.accept}
                onUpload={(file) => handleDocUpload(doc.value, file)}
                result={docResults[doc.value]}
                loading={!!docLoading[doc.value]}
              />
            ))}
          </div>
        </div>

        {/* Done button */}
        <button
          onClick={handleDone}
          disabled={uploadedCount === 0}
          className="w-full py-4 rounded-xl font-sora font-semibold text-base
                     bg-brand-dark text-white disabled:opacity-40
                     hover:bg-brand-blue transition-colors"
        >
          Submit Documents
        </button>

        <p className="text-center text-xs text-gray-400 font-inter">
          All files are stored securely on Google Cloud Storage.
          You may re-upload documents if needed — versions are preserved.
        </p>
      </div>
    </div>
  );
};

export default DocumentUpload;