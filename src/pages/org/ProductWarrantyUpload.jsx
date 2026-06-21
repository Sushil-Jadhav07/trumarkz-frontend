import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FileUpload } from '@/components/ui/FileUpload';
import { verificationAPI, triggerBlobDownload, getApiError } from '@/services/api';
import {
  Download, Upload, CheckCircle, XCircle, Clock,
  RefreshCw, Package, Search, ArrowRight, FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Status helpers ─────────────────────────────────────────────────────────────
const STATUS_META = {
  pending:  { label: 'Pending',  tone: 'bg-amber-50 text-amber-700 border-amber-200',      icon: Clock       },
  approved: { label: 'Approved', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle },
  rejected: { label: 'Rejected', tone: 'bg-red-50 text-red-600 border-red-200',            icon: XCircle     },
};

const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status] || STATUS_META.pending;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold font-inter ${meta.tone}`}>
      <Icon size={11} />
      {meta.label}
    </span>
  );
};

const formatDate = (v) => {
  if (!v) return '—';
  try { return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return v; }
};

// ── Summary tiles ──────────────────────────────────────────────────────────────
const SummaryTiles = ({ summary }) => {
  const tiles = [
    { label: 'Pending',  value: summary?.pending  ?? 0, cls: 'bg-amber-50 border-amber-200 text-amber-700' },
    { label: 'Approved', value: summary?.approved ?? 0, cls: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
    { label: 'Rejected', value: summary?.rejected ?? 0, cls: 'bg-red-50 border-red-200 text-red-600' },
  ];
  return (
    <div className="grid grid-cols-3 gap-3 mb-5">
      {tiles.map((t) => (
        <div key={t.label} className={`rounded-2xl border p-4 ${t.cls}`}>
          <p className="font-sora font-bold text-2xl leading-none">{t.value}</p>
          <p className="font-inter text-xs font-medium mt-1 opacity-80">{t.label}</p>
        </div>
      ))}
    </div>
  );
};

// ── Upload panel ───────────────────────────────────────────────────────────────
const UploadPanel = ({ onSuccess }) => {
  const [batchName, setBatchName] = useState(() => {
    const d = new Date();
    return `Warranty Batch ${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
  });
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadTemplate = async () => {
    setDownloading(true);
    try {
      const { data } = await verificationAPI.downloadWarrantyTemplate();
      triggerBlobDownload(data, 'warranty-template.xlsx');
      toast.success('Warranty template downloaded');
    } catch (err) {
      toast.error(getApiError(err, 'Failed to download template'));
    } finally {
      setDownloading(false);
    }
  };

  const handleUpload = async () => {
    if (!file) { toast.error('Please select the completed warranty file'); return; }
    if (!batchName.trim()) { toast.error('Batch name is required'); return; }
    setUploading(true);
    setProgress(0);
    try {
      const { data } = await verificationAPI.uploadWarrantyExcel(
        file, batchName.trim(), description.trim(), setProgress
      );
      toast.success('Warranty batch uploaded — pending admin review');
      onSuccess(data?.batch_id || data?.id || '');
    } catch (err) {
      toast.error(getApiError(err, 'Upload failed. Please check the file and try again.'));
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="space-y-5">
      {/* Template download */}
      <Card className="border border-blue-100 p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <Download size={16} className="text-brand-blue" />
            </div>
            <div>
              <p className="font-semibold text-brand-dark font-inter text-sm">Download Warranty Template</p>
              <p className="text-xs text-gray-400 font-inter mt-0.5 leading-5">
                Get the Excel template with the required columns: product_name, category, serial_number, purchase_date, warranty_start_date, warranty_end_date.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            icon={downloading ? RefreshCw : Download}
            onClick={handleDownloadTemplate}
            disabled={downloading}
            className="shrink-0"
          >
            {downloading ? 'Downloading…' : 'Download'}
          </Button>
        </div>
      </Card>

      {/* Upload section */}
      <Card className="border border-blue-100 p-5 space-y-4">
        <div className="flex items-center gap-3 pb-1 border-b border-gray-100">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <Upload size={16} className="text-brand-blue" />
          </div>
          <div>
            <p className="font-semibold text-brand-dark font-inter text-sm">Upload Completed Warranty File</p>
            <p className="text-xs text-gray-400 font-inter mt-0.5">Fill the template and upload it below</p>
          </div>
        </div>

        <Input
          label="Batch Name"
          value={batchName}
          onChange={(e) => setBatchName(e.target.value)}
          placeholder="e.g. Electronics Warranty June 2026"
        />

        <div>
          <label className="block text-sm font-medium text-brand-dark font-inter mb-1.5">
            Description <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a note about this batch"
            className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 font-inter text-sm text-brand-dark outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition-all"
          />
        </div>

        <FileUpload
          label="Completed Warranty Excel (.xlsx)"
          fileType="xlsx"
          accept={{ 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }}
          selectedFile={file}
          onFileSelect={setFile}
          onRemove={() => setFile(null)}
        />

        {uploading && (
          <div>
            <div className="flex justify-between text-xs font-inter text-blue-500 mb-1">
              <span>Uploading…</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-blue-100 overflow-hidden">
              <motion.div
                className="h-full bg-brand-blue rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}

        <Button
          variant="primary"
          size="lg"
          className="w-full"
          icon={uploading ? RefreshCw : Upload}
          onClick={handleUpload}
          disabled={uploading || !file}
        >
          {uploading ? 'Uploading…' : 'Upload Warranty Data'}
        </Button>

        <p className="text-xs text-gray-400 font-inter text-center leading-5">
          Each product will be created with <span className="font-medium">warranty_status = pending</span>.<br />
          A super admin will review and approve or reject individual claims.
        </p>
      </Card>
    </div>
  );
};

// ── Status viewer ──────────────────────────────────────────────────────────────
const StatusViewer = ({ batchId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetch = useCallback(async () => {
    if (!batchId) return;
    setLoading(true);
    try {
      const { data: resp } = await verificationAPI.getWarrantyStatus(batchId);
      setData(resp);
    } catch (err) {
      toast.error(getApiError(err, 'Failed to load warranty status'));
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  React.useEffect(() => { fetch(); }, [fetch]);

  const products = data?.products || [];
  const summary = data?.summary || null;

  const filtered = search.trim()
    ? products.filter((p) =>
        [p.product_name, p.serial_number, p.category]
          .filter(Boolean)
          .some((v) => v.toLowerCase().includes(search.toLowerCase()))
      )
    : products;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-dark font-inter">Warranty Status</p>
          <p className="text-xs text-gray-400 font-inter font-mono mt-0.5">{batchId}</p>
        </div>
        <button
          type="button"
          onClick={fetch}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors font-inter disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 gap-2 text-brand-blue">
          <RefreshCw size={18} className="animate-spin" />
          <span className="text-sm font-inter">Loading status…</span>
        </div>
      ) : (
        <>
          {summary && <SummaryTiles summary={summary} />}

          <div className="max-w-sm mb-4">
            <Input
              placeholder="Search product or serial…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={Search}
            />
          </div>

          <Card className="overflow-hidden border border-blue-100 p-0">
            {filtered.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-gray-400 font-inter">No products found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] font-inter">
                  <thead>
                    <tr className="border-b border-blue-100 bg-blue-50/80">
                      {['Product', 'Serial Number', 'Warranty Start', 'Warranty End', 'Status', 'Reason'].map((h) => (
                        <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-brand-blue/70">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((product, i) => (
                      <motion.tr
                        key={product.id || i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.04 }}
                        className="border-b border-blue-50 hover:bg-blue-50/30 transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-brand-blue/10 flex items-center justify-center shrink-0">
                              <Package size={13} className="text-brand-blue" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-brand-dark truncate">{product.product_name || '—'}</p>
                              <p className="text-xs text-gray-400 truncate">{product.category || '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-xs font-mono text-gray-500">{product.serial_number || '—'}</td>
                        <td className="px-5 py-3.5 text-xs text-gray-500">{formatDate(product.warranty_start_date)}</td>
                        <td className="px-5 py-3.5 text-xs text-gray-500">{formatDate(product.warranty_end_date)}</td>
                        <td className="px-5 py-3.5"><StatusBadge status={product.warranty_status || 'pending'} /></td>
                        <td className="px-5 py-3.5 text-xs text-gray-400 font-inter max-w-[160px]">
                          <span className="line-clamp-2">{product.reason || '—'}</span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'upload', label: 'Upload Warranty Data', icon: Upload },
  { id: 'status', label: 'View Warranty Status', icon: FileText },
];

export const ProductWarrantyUpload = () => {
  const [activeTab, setActiveTab] = useState('upload');
  const [uploadedBatchId, setUploadedBatchId] = useState('');
  const [statusBatchId, setStatusBatchId] = useState('');
  const [inputBatchId, setInputBatchId] = useState('');

  const handleUploadSuccess = (batchId) => {
    setUploadedBatchId(batchId);
    if (batchId) {
      setStatusBatchId(batchId);
      setInputBatchId(batchId);
      toast.success('Switching to status view…', { duration: 1500 });
      setTimeout(() => setActiveTab('status'), 1600);
    }
  };

  const handleLoadStatus = (e) => {
    e.preventDefault();
    setStatusBatchId(inputBatchId.trim());
  };

  return (
    <AuthLayout title="Product Warranty">
      <PageHeader
        title="Product Warranty"
        subtitle="Upload warranty data for your products and track approval status"
      />

      {/* Tabs */}
      <div className="flex gap-2 mb-6 p-1 bg-blue-50 border border-blue-100 rounded-2xl">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-inter text-sm font-medium transition-all ${isActive ? 'bg-brand-blue text-white shadow-sm' : 'text-brand-blue hover:bg-white'}`}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'upload' ? (
          <motion.div key="upload" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
            <UploadPanel onSuccess={handleUploadSuccess} />
            {uploadedBatchId && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-5"
              >
                <Card className="border border-emerald-100 bg-emerald-50/50 p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle size={18} className="text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-700 font-inter">Batch uploaded successfully</p>
                      <p className="text-xs text-emerald-600/70 font-mono mt-0.5">{uploadedBatchId}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={ArrowRight}
                    onClick={() => { setStatusBatchId(uploadedBatchId); setInputBatchId(uploadedBatchId); setActiveTab('status'); }}
                  >
                    View Status
                  </Button>
                </Card>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div key="status" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
            {/* Batch ID input */}
            {!statusBatchId && (
              <Card className="border border-blue-100 p-5 mb-5">
                <p className="font-inter text-sm font-semibold text-brand-dark mb-3">Enter Warranty Batch ID</p>
                <form onSubmit={handleLoadStatus} className="flex gap-3">
                  <div className="flex-1">
                    <Input
                      placeholder="Paste your warranty batch ID here…"
                      value={inputBatchId}
                      onChange={(e) => setInputBatchId(e.target.value)}
                    />
                  </div>
                  <Button type="submit" variant="primary" disabled={!inputBatchId.trim()}>
                    Load
                  </Button>
                </form>
              </Card>
            )}

            {statusBatchId ? (
              <StatusViewer batchId={statusBatchId} />
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-3">
                  <FileText size={20} className="text-brand-blue" />
                </div>
                <p className="font-sora font-semibold text-brand-dark">Enter a batch ID to load status</p>
                <p className="text-sm text-gray-400 font-inter mt-1">
                  You received the batch ID after uploading warranty data
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
};

export default ProductWarrantyUpload;
