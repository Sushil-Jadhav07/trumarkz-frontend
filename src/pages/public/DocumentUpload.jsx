import React, { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { verificationAPI, getApiError } from '@/services/api';
import { Logo } from '@/components/ui/Logo';
import {
  CheckCircle, FileText, RefreshCw, ShieldCheck, Trash2, Upload,
} from 'lucide-react';
import toast from 'react-hot-toast';

const formatBytes = (bytes) => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const DocumentUpload = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const batchName = searchParams.get('batch') || 'Verification Batch';
  const fileInputRef = useRef(null);

  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [successMessage, setSuccessMessage] = useState('Report submitted successfully for');

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-sm rounded-2xl bg-white p-10 shadow-sm border border-gray-100"
        >
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-500" />
          </div>
          <h2 className="font-sora font-bold text-xl text-brand-dark mb-2">Report Submitted</h2>
          <p className="text-sm text-gray-500 font-inter">
            {successMessage} <span className="font-semibold text-brand-dark">{batchName}</span>. The admin will review it shortly.
          </p>
        </motion.div>
      </div>
    );
  }

  const addFiles = (incoming) => {
    const newFiles = Array.from(incoming).filter(
      (f) => !files.some((e) => e.name === f.name && e.size === f.size)
    );
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const handleSubmit = async () => {
    if (!token) { toast.error('Missing verification token. Use the link from the Batch Monitor.'); return; }
    if (files.length === 0) { toast.error('Attach at least one file'); return; }
    setSubmitting(true);
    try {
      const { data } = await verificationAPI.uploadManualReport(token, files);
      if (typeof data === 'string' && data.trim()) {
        setSuccessMessage(data.trim());
      }
      setSubmitted(true);
    } catch (err) {
      toast.error(getApiError(err, 'Submission failed. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f6fa]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 font-inter">
            <ShieldCheck size={13} />
            Secure Upload
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-8">

        {/* No-token warning */}
        {!token && (
          <div className="mb-5 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700 font-inter flex items-start gap-2">
            <span className="shrink-0 mt-0.5">⚠</span>
            <span><strong>Preview mode</strong> — submission is disabled without a valid token.</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">

          {/* ── Left: Batch info + File list ────────────────────────── */}
          <div className="space-y-4">

            {/* Batch header */}
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm px-6 py-5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-blue font-inter">TruMarkZ · Batch Verification</p>
              <h1 className="font-sora font-bold text-2xl text-brand-dark mt-1.5">{batchName}</h1>
              <p className="text-xs text-gray-400 font-inter mt-1">Upload your verification report and supporting documents below.</p>
            </div>

            {/* Drop zone */}
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
              <p className="text-sm font-semibold text-brand-dark font-inter mb-3">Attach Files</p>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-all py-8 ${
                  dragOver ? 'border-brand-blue bg-blue-50' : 'border-gray-200 hover:border-brand-blue/50 hover:bg-gray-50'
                }`}
              >
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${dragOver ? 'bg-brand-blue/10' : 'bg-gray-100'}`}>
                  <Upload size={18} className={dragOver ? 'text-brand-blue' : 'text-gray-400'} />
                </div>
                <p className="text-sm font-medium text-brand-dark font-inter">Drop files or click to browse</p>
                <p className="text-xs text-gray-400 font-inter">PDF, Excel, Word, images · Max 50 MB each</p>
              </div>

              {/* File list */}
              <AnimatePresence initial={false}>
                {files.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {files.map((file, i) => (
                      <motion.div
                        key={`${file.name}-${file.size}`}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 16 }}
                        transition={{ duration: 0.15 }}
                        className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5"
                      >
                        <div className="w-8 h-8 rounded-lg bg-brand-blue/10 text-brand-blue flex items-center justify-center shrink-0">
                          <FileText size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-brand-dark font-inter truncate">{file.name}</p>
                          <p className="text-[10px] text-gray-400 font-inter">{formatBytes(file.size)}</p>
                        </div>
                        <button type="button" onClick={() => setFiles((p) => p.filter((_, idx) => idx !== i))}
                          className="text-gray-300 hover:text-red-400 transition-colors p-1">
                          <Trash2 size={13} />
                        </button>
                      </motion.div>
                    ))}
                    <p className="text-[11px] text-gray-400 font-inter text-right pt-1">{files.length} file{files.length !== 1 ? 's' : ''} selected</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ── Right: Submit ────────────────────────────────────────── */}
          <div className="space-y-4 lg:sticky lg:top-6">
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5 space-y-4">
              <div>
                <p className="text-sm font-semibold text-brand-dark font-inter">Upload summary</p>
                <p className="text-xs text-gray-400 font-inter mt-0.5">This endpoint accepts the token in the URL path and the selected files in multipart form data.</p>
              </div>

              {/* Summary row */}
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2.5 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-inter">
                  <span className="text-gray-400">Files attached</span>
                  <span className="font-semibold text-brand-dark">{files.length}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-inter">
                  <span className="text-gray-400">Token</span>
                  <span className={`font-semibold ${token ? 'text-green-600' : 'text-orange-500'}`}>
                    {token ? 'Valid' : 'Missing'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-inter">
                  <span className="text-gray-400">Request body</span>
                  <span className="font-semibold text-brand-dark">`files[]` only</span>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting || files.length === 0 || !token}
                className="w-full rounded-xl bg-brand-blue py-3 text-sm font-semibold font-inter text-white transition-all hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <><RefreshCw size={14} className="animate-spin" /> Submitting…</>
                ) : (
                  <><Upload size={14} /> Submit Report</>
                )}
              </button>

              <p className="text-[10px] text-gray-300 font-inter text-center leading-4">
                Stored securely on TruMarkZ Cloud using a one-time tokenized link.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DocumentUpload;
