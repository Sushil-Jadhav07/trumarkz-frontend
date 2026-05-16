import React, { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { verificationAPI, getApiError } from '@/services/api';
import { Logo } from '@/components/ui/Logo';
import {
  AlertTriangle,
  Camera,
  CheckCircle,
  FileText,
  RefreshCw,
  ShieldCheck,
  Upload,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

const DOCUMENT_TYPES = [
  { label: 'Aadhar Card', value: 'aadhar', accept: '.pdf,.jpg,.jpeg,.png' },
  { label: 'PAN Card', value: 'pan', accept: '.pdf,.jpg,.jpeg,.png' },
  { label: 'Degree Certificate', value: 'degree_certificate', accept: '.pdf,.jpg,.jpeg,.png' },
  { label: 'Driving License', value: 'driving_license', accept: '.pdf,.jpg,.jpeg,.png' },
];

const UploadTile = ({ label, description, accept, icon: Icon = FileText, onUpload, result, loading }) => {
  const fileRef = useRef(null);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:border-brand-blue/30 hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${result?.success ? 'bg-green-50 text-green-600' : result?.error ? 'bg-red-50 text-red-500' : 'bg-brand-blue/10 text-brand-blue'}`}>
          {loading ? <RefreshCw size={20} className="animate-spin" /> : result?.success ? <CheckCircle size={20} /> : result?.error ? <XCircle size={20} /> : <Icon size={20} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-brand-dark font-inter">{label}</p>
              <p className="text-xs text-gray-400 font-inter mt-1">{description}</p>
            </div>
            {result?.success && <span className="text-[11px] rounded-full bg-green-100 text-green-700 px-2 py-1 font-inter">Uploaded</span>}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
              e.target.value = '';
            }}
          />

          <div className="mt-4">
            {result?.success ? (
              <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-blue font-semibold font-inter hover:underline">
                View uploaded file
              </a>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs font-semibold text-brand-blue font-inter hover:bg-brand-blue/10 disabled:opacity-50"
              >
                <Upload size={13} />
                {loading ? 'Uploading...' : result?.error ? 'Retry upload' : 'Choose file'}
              </button>
            )}
          </div>

          {result?.error && <p className="mt-2 text-xs text-red-500 font-inter">{result.error}</p>}
        </div>
      </div>
    </div>
  );
};

export const DocumentUpload = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const photoRef = useRef(null);
  const customDocRef = useRef(null);

  const [photoResult, setPhotoResult] = useState(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [docResults, setDocResults] = useState({});
  const [docLoading, setDocLoading] = useState({});
  const [customDocLabel, setCustomDocLabel] = useState('');
  const [allDone, setAllDone] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="text-center max-w-sm rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
          <AlertTriangle size={40} className="text-orange-400 mx-auto mb-3" />
          <h2 className="font-sora font-bold text-xl text-brand-dark mb-2">Invalid Link</h2>
          <p className="text-sm text-gray-500 font-inter">This upload link is invalid or has expired. Please contact your organization.</p>
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

  const uploadedCount = (photoResult?.success ? 1 : 0) + Object.values(docResults).filter((item) => item?.success).length;
  const totalRequired = 1 + DOCUMENT_TYPES.length;
  const progress = Math.round((uploadedCount / totalRequired) * 100);

  if (allDone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={40} className="text-green-500" />
          </div>
          <h2 className="font-sora font-bold text-2xl text-brand-dark mb-2">Uploads Complete</h2>
          <p className="text-sm text-gray-500 font-inter">Your documents have been submitted for verification. You will be notified once the review is complete.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Logo />
          <div className="hidden sm:flex items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 font-inter">
            <ShieldCheck size={14} />
            Secure Upload
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-8 lg:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] gap-6 items-start">
          <aside className="lg:sticky lg:top-6 space-y-4">
            <div className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-blue font-inter">TruMarkZ Verification</p>
              <h1 className="font-sora font-bold text-2xl text-brand-dark mt-2">Upload Your Documents</h1>
              <p className="text-sm text-gray-500 font-inter mt-2">Submit your photo and supporting files for verification.</p>
            </div>

            <div className="rounded-2xl border border-brand-blue/10 bg-brand-blue/5 p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-brand-dark font-inter">Upload Progress</p>
                <span className="text-sm font-bold text-brand-blue font-inter">{uploadedCount} / {totalRequired}</span>
              </div>
              <div className="h-2 rounded-full bg-white overflow-hidden">
                <div className="h-full rounded-full bg-brand-blue transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-gray-500 font-inter mt-3">{progress}% complete</p>
            </div>

            <button
              onClick={() => setAllDone(true)}
              disabled={uploadedCount === 0}
              className="w-full rounded-xl bg-brand-dark py-4 text-sm font-sora font-semibold text-white transition-colors hover:bg-brand-blue disabled:cursor-not-allowed disabled:opacity-40"
            >
              Submit Documents
            </button>
          </aside>

          <section className="space-y-5">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="font-sora font-semibold text-lg text-brand-dark flex items-center gap-2">
                    <Camera size={18} className="text-brand-blue" />
                    Profile Photo
                  </h2>
                  <p className="text-xs text-gray-400 font-inter mt-1">JPG or PNG image, preferably a clear front-facing photo.</p>
                </div>
                {photoResult?.success && <span className="text-xs rounded-full bg-green-100 text-green-700 px-3 py-1 font-inter">Uploaded</span>}
              </div>

              <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handlePhotoUpload(file); e.target.value = ''; }} />
              {photoResult?.success ? (
                <div className="flex items-center gap-4 rounded-xl border border-green-100 bg-green-50 p-4">
                  <img src={photoResult.url} alt="Profile" className="w-16 h-16 rounded-2xl object-cover border border-white" />
                  <div>
                    <p className="text-sm font-semibold text-green-700 font-inter">Photo uploaded successfully</p>
                    <a href={photoResult.url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-blue font-inter hover:underline">View photo</a>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => photoRef.current?.click()}
                  disabled={photoLoading}
                  className="w-full min-h-40 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/30 flex flex-col items-center justify-center gap-2 transition-all hover:border-brand-blue hover:bg-blue-50 disabled:opacity-50"
                >
                  {photoLoading ? <RefreshCw size={26} className="text-brand-blue animate-spin" /> : <Camera size={28} className="text-brand-blue" />}
                  <span className="text-sm font-semibold text-brand-dark font-inter">{photoLoading ? 'Uploading...' : 'Click to upload photo'}</span>
                  <span className="text-xs text-gray-400 font-inter">Image files only</span>
                </button>
              )}
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="font-sora font-semibold text-lg text-brand-dark flex items-center gap-2">
                  <FileText size={18} className="text-brand-blue" />
                  Identity Documents
                </h2>
                <p className="text-xs text-gray-400 font-inter mt-1">Upload each requested document. Re-uploading creates a new version.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {DOCUMENT_TYPES.map((doc) => (
                  <UploadTile
                    key={doc.value}
                    label={doc.label}
                    description="PDF, JPG, or PNG"
                    accept={doc.accept}
                    icon={FileText}
                    onUpload={(file) => handleDocUpload(doc.value, file)}
                    result={docResults[doc.value]}
                    loading={!!docLoading[doc.value]}
                  />
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="font-sora font-semibold text-lg text-brand-dark flex items-center gap-2">
                <Upload size={18} className="text-brand-blue" />
                Additional Document
              </h2>
              <p className="text-xs text-gray-400 font-inter mt-1">Add invoices, warranty cards, serial proofs, or any other requested evidence.</p>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 mt-4">
                <input
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-inter focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                  value={customDocLabel}
                  onChange={(e) => setCustomDocLabel(e.target.value)}
                  placeholder="Document label, e.g. purchase_invoice"
                />
                <input
                  ref={customDocRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    const label = customDocLabel.trim().toLowerCase().replace(/\s+/g, '_');
                    if (!file) return;
                    if (!label) {
                      toast.error('Enter a document label first');
                      return;
                    }
                    handleDocUpload(label, file);
                    setCustomDocLabel('');
                    e.target.value = '';
                  }}
                />
                <button
                  onClick={() => {
                    if (!customDocLabel.trim()) {
                      toast.error('Enter a document label first');
                      return;
                    }
                    customDocRef.current?.click();
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-brand-blue px-4 py-3 text-sm font-semibold text-brand-blue font-inter transition-colors hover:bg-brand-blue hover:text-white"
                >
                  <Upload size={16} />
                  Choose File
                </button>
              </div>
            </div>

            <p className="text-center text-xs text-gray-400 font-inter">
              Files are stored securely on Google Cloud Storage. Versions are preserved when you re-upload.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default DocumentUpload;
