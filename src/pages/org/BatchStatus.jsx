import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Modal } from '@/components/ui/Modal';
import { verificationAPI, getApiError } from '@/services/api';
import {
  ChevronLeft, ChevronRight, CheckCircle, Clock, Download,
  Eye, FileText, Filter, Package, QrCode, RefreshCw, Upload,
  User, XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Helpers ────────────────────────────────────────────────────────────────────
const isProductRecord = (r) =>
  r?.entity_type === 'product' || !!r?.product_name || !!r?.category_name;

const getRecordTitle = (r) =>
  r?.product_name || r?.full_name || r?.email || r?.id || 'Record';

const getRecordSubtitle = (r) =>
  isProductRecord(r)
    ? r?.category_name || 'Product verification'
    : [r?.email, r?.phone_number].filter(Boolean).join(' · ') || 'Human verification';

const statusBadge = (status) => {
  if (status === 'verified') return { variant: 'success', label: 'Verified', icon: CheckCircle };
  if (status === 'failed')   return { variant: 'error',   label: 'Failed',   icon: XCircle };
  return                            { variant: 'pending',  label: 'Pending',  icon: Clock };
};

const batchStatusMeta = {
  pending_verification: { label: 'Pending',  badge: 'info',    tone: 'bg-brand-blue/10 text-brand-blue border-brand-blue/15' },
  verified:             { label: 'Verified', badge: 'success', tone: 'bg-blue-950 text-white border-blue-900' },
  failed:               { label: 'Failed',   badge: 'default', tone: 'bg-blue-100 text-blue-900 border-blue-200' },
};

const BATCH_STATUS_OPTIONS = [
  { value: '',                   label: 'All' },
  { value: 'pending_verification', label: 'Pending' },
  { value: 'verified',           label: 'Verified' },
  { value: 'failed',             label: 'Failed' },
];

const PAGE_SIZE = 10;

// Normalise API batch → internal shape
const normaliseBatch = (b) => {
  const total   = b.total_users || 0;
  const verified= b.verified    || 0;
  const failed  = b.failed      || 0;
  const pending = Math.max(0, total - verified - failed);
  const status  = pending > 0 ? 'pending_verification' : failed > 0 ? 'failed' : 'verified';
  return {
    id:          b.batch_id,
    name:        b.batch_name || `Batch ${String(b.batch_id).slice(0, 8)}`,
    total,
    verified,
    failed,
    pending,
    status,
    statusMeta:  batchStatusMeta[status] || batchStatusMeta.pending_verification,
    createdAt:   b.created_at,
    excelPath:   b.excel_storage_path || null,
    reportPaths: b.report_storage_paths || [],
    // detail fields populated later
    description:         b.description || '',
    industryType:        b.industry_type || [],
    verificationTypes:   b.verification_types || [],
    credentialVisibility: b.credential_visibility || '',
    verificationProgress: b.verification_progress || {},
    records:     b.users || [],
  };
};

const formatDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

// ── Batch Detail Modal ─────────────────────────────────────────────────────────
const BatchDetailModal = ({ batchId, batchName, onClose }) => {
  const [detail,   setDetail]   = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!batchId) return;
    setLoading(true);
    verificationAPI.getBatchDetails(batchId)
      .then(({ data }) => setDetail(normaliseBatch(data)))
      .catch((err) => toast.error(getApiError(err, 'Failed to load batch details')))
      .finally(() => setLoading(false));
  }, [batchId]);

  const handleGenerateQR = async (userId) => {
    try {
      const { data } = await verificationAPI.generateQRAndCertificate(userId);
      if (data?.pdf_url) window.open(data.pdf_url, '_blank');
      else toast.success('QR generated');
    } catch (err) {
      toast.error(getApiError(err, 'Failed to generate QR'));
    }
  };

  const meta = detail ? detail.statusMeta : batchStatusMeta.pending_verification;

  return (
    <Modal isOpen={!!batchId} onClose={onClose} title={`${batchName} — Details`} size="4xl">
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3 text-brand-blue">
          <RefreshCw size={22} className="animate-spin" />
          <span className="font-inter text-sm">Loading batch details…</span>
        </div>
      ) : !detail ? (
        <p className="py-10 text-center font-inter text-sm text-gray-400">Failed to load details.</p>
      ) : (
        <div className="space-y-5">

          {/* Status header */}
          <div
            className="rounded-2xl p-5 text-white"
            style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)' }}
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
              <div>
                <p className="font-inter text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-200">Batch Status</p>
                <h3 className="mt-2 font-sora text-2xl font-bold text-white">{meta.label}</h3>
                <p className="mt-1 font-mono text-[11px] text-blue-300">{detail.id}</p>
                {detail.description && (
                  <p className="mt-2 font-inter text-xs text-blue-100 max-w-sm leading-5">{detail.description}</p>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center shrink-0">
                {[
                  { label: 'Total',    value: detail.total    },
                  { label: 'Verified', value: detail.verified },
                  { label: 'Pending',  value: detail.pending  },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl bg-white/15 border border-white/10 px-4 py-3">
                    <p className="font-sora text-2xl font-bold text-white">{s.value}</p>
                    <p className="font-inter text-[10px] text-white/60 mt-0.5 uppercase tracking-wide">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Meta info row */}
          {(detail.industryType.length > 0 || detail.verificationTypes.length > 0 || detail.credentialVisibility) && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {detail.industryType.length > 0 && (
                <div className="rounded-xl border border-brand-blue/15 bg-brand-blue/5 px-4 py-3">
                  <p className="font-inter text-[10px] font-bold uppercase tracking-[0.16em] text-brand-blue mb-2">Industries</p>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.industryType.map((t) => (
                      <span key={t} className="rounded-full bg-brand-blue text-white px-2.5 py-0.5 font-inter text-[11px] font-medium">{t}</span>
                    ))}
                  </div>
                </div>
              )}
              {detail.verificationTypes.length > 0 && (
                <div className="rounded-xl border border-blue-950/10 bg-blue-950/[0.04] px-4 py-3">
                  <p className="font-inter text-[10px] font-bold uppercase tracking-[0.16em] text-blue-900 mb-2">Verification Types</p>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.verificationTypes.map((t) => (
                      <span key={t} className="rounded-full bg-blue-950 text-blue-100 px-2.5 py-0.5 font-inter text-[11px] font-medium capitalize">{t}</span>
                    ))}
                  </div>
                </div>
              )}
              {detail.credentialVisibility && (
                <div className="rounded-xl border border-blue-100/60 bg-blue-50/50 px-4 py-3">
                  <p className="font-inter text-[10px] font-bold uppercase tracking-[0.16em] text-blue-500 mb-2">Visibility</p>
                  <span className="rounded-full bg-brand-blue/10 border border-brand-blue/20 px-2.5 py-0.5 font-inter text-[11px] font-semibold text-brand-blue capitalize">
                    {detail.credentialVisibility}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Report downloads */}
          {detail.reportPaths.length > 0 && (
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-3">
              <p className="font-inter text-xs font-semibold uppercase tracking-wider text-brand-blue mb-2">Uploaded Reports</p>
              <div className="flex flex-wrap gap-2">
                {detail.reportPaths.map((path, i) => (
                  <a
                    key={i}
                    href={path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-blue-200 px-3 py-1.5 font-inter text-xs font-semibold text-brand-blue hover:bg-blue-50 transition-colors"
                  >
                    <Download size={12} />
                    Report {i + 1}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Excel download */}
          {detail.excelPath && (
            <a
              href={detail.excelPath}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 font-inter text-sm font-semibold text-green-700 hover:bg-green-100 transition-colors"
            >
              <FileText size={14} />
              Download Excel Template
            </a>
          )}

          {/* Records table */}
          {detail.records.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
              <div className="flex items-center justify-between border-b border-gray-100 bg-blue-50/70 px-5 py-4">
                <p className="font-sora text-sm font-semibold text-brand-dark">Records</p>
                <Badge status="default">{detail.records.length}</Badge>
              </div>
              <div className="max-h-64 overflow-y-auto scrollbar-hidden">
                <table className="w-full min-w-[560px]">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-inter text-[11px] font-semibold uppercase text-gray-500">Record</th>
                      <th className="px-4 py-2 text-left font-inter text-[11px] font-semibold uppercase text-gray-500">Status</th>
                      <th className="px-4 py-2 text-left font-inter text-[11px] font-semibold uppercase text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {detail.records.map((record) => {
                      const Icon = isProductRecord(record) ? Package : User;
                      const sb   = statusBadge(record.verification_status);
                      return (
                        <tr key={record.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-blue/10">
                                <Icon size={14} className="text-brand-blue" />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate font-inter text-sm font-medium text-brand-dark">{getRecordTitle(record)}</p>
                                <p className="truncate font-inter text-xs text-gray-400">{getRecordSubtitle(record)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge status={sb.variant}>{sb.label}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Button variant="ghost" size="sm" icon={QrCode} onClick={() => handleGenerateQR(record.id)}>
                              QR
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────────
export const BatchStatus = () => {
  const navigate = useNavigate();
  const [batches,      setBatches]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [page,         setPage]         = useState(0);
  const [selectedId,   setSelectedId]   = useState(null);
  const [selectedName, setSelectedName] = useState('');

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data } = await verificationAPI.getBatches();
      const list = Array.isArray(data) ? data : (data?.batches || data?.items || []);
      setBatches(list.map(normaliseBatch));
    } catch (err) {
      toast.error(getApiError(err, 'Failed to fetch batches'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const t = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(t);
  }, [fetchData]);

  const filtered   = statusFilter ? batches.filter((b) => b.status === statusFilter) : batches;
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged      = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const totalRecords  = batches.reduce((s, b) => s + b.total,    0);
  const totalPending  = batches.reduce((s, b) => s + b.pending,  0);
  const totalVerified = batches.reduce((s, b) => s + b.verified, 0);
  const totalFailed   = batches.reduce((s, b) => s + b.failed,   0);
  const progress = totalRecords > 0
    ? Math.round(((totalVerified + totalFailed) / totalRecords) * 100)
    : 0;

  const summaryCards = [
    { label: 'Total',    value: totalRecords,  surface: 'bg-brand-blue text-white border-brand-blue/70', valueTone: 'text-white',      labelTone: 'text-white/70' },
    { label: 'Pending',  value: totalPending,  surface: 'bg-white border-blue-100',                     valueTone: 'text-brand-dark', labelTone: 'text-brand-blue/70' },
    { label: 'Verified', value: totalVerified, surface: 'bg-blue-50 border-blue-100',                   valueTone: 'text-brand-dark', labelTone: 'text-brand-blue/70' },
    { label: 'Failed',   value: totalFailed,   surface: 'bg-blue-100/70 border-blue-200',               valueTone: 'text-brand-dark', labelTone: 'text-brand-blue/70' },
  ];

  return (
    <AuthLayout title="Batch Status">
      <div className="mx-auto w-full lg:max-w-none">
        <PageHeader
          title="Verification Batch Status"
          subtitle="Monitor all your verification batches"
          action={
            <div className="flex items-center gap-3">
              <Button variant="primary" size="sm" icon={Upload} onClick={() => navigate('/org/create-batch')}>
                New Batch
              </Button>
              <button
                onClick={() => fetchData(true)}
                className={`inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 font-inter text-sm text-brand-blue hover:bg-blue-100 transition-colors ${refreshing ? 'pointer-events-none' : ''}`}
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          }
        />

        {/* Summary */}
        {!loading && batches.length > 0 && (
          <Card className="mb-5 overflow-hidden border border-blue-100 bg-blue-50/40 p-5">
            <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
              <div>
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-inter text-xs font-medium uppercase tracking-[0.14em] text-brand-blue/70">Pipeline overview</p>
                    <h3 className="mt-1 font-sora text-lg font-semibold text-brand-dark">Current verification load</h3>
                  </div>
                  <div className="rounded-xl border border-blue-100 bg-white px-3 py-2 text-right">
                    <p className="font-inter text-[11px] uppercase tracking-[0.14em] text-brand-blue/60">Completion</p>
                    <p className="font-sora text-xl font-semibold text-brand-dark">{progress}%</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {summaryCards.map((s, i) => (
                    <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                      className={`rounded-2xl border p-4 ${s.surface}`}>
                      <p className={`font-sora text-3xl font-semibold leading-none ${s.valueTone}`}>{s.value}</p>
                      <p className={`mt-2 font-inter text-xs font-medium uppercase tracking-[0.12em] ${s.labelTone}`}>{s.label}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="font-sora text-sm font-semibold text-brand-dark">Overall progress</h3>
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 font-inter text-xs font-medium text-brand-blue">
                    {totalVerified + totalFailed} / {totalRecords} processed
                  </span>
                </div>
                <ProgressBar progress={progress} color="blue" height="h-2.5" showLabel={false} />
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[
                    { label: 'Pending',  value: totalPending },
                    { label: 'Verified', value: totalVerified },
                    { label: 'Failed',   value: totalFailed },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl bg-blue-50 px-3 py-2">
                      <p className="font-sora text-lg font-semibold text-brand-dark">{s.value}</p>
                      <p className="font-inter text-[11px] uppercase tracking-[0.12em] text-brand-blue/70">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Filter */}
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50/70 p-3">
          <Filter size={14} className="shrink-0 text-brand-blue" />
          <div className="flex flex-wrap gap-2">
            {BATCH_STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setStatusFilter(opt.value); setPage(0); }}
                className={`rounded-lg px-3 py-1.5 font-inter text-xs font-medium transition-all ${
                  statusFilter === opt.value ? 'bg-brand-blue text-white shadow-sm' : 'bg-white text-brand-blue hover:bg-blue-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <Card className="mb-4 overflow-hidden border border-blue-100 p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 p-10">
              <RefreshCw size={24} className="animate-spin text-brand-blue" />
              <p className="font-inter text-sm text-gray-400">Loading batches…</p>
            </div>
          ) : paged.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-inter text-sm text-gray-400">No batches found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] font-inter text-sm">
                <thead>
                  <tr className="border-b border-blue-100 bg-blue-50/80">
                    <th className="p-4 text-left text-xs font-medium text-brand-blue/75">Batch</th>
                    <th className="hidden p-4 text-left text-xs font-medium text-brand-blue/75 sm:table-cell">Progress</th>
                    <th className="p-4 text-center text-xs font-medium text-brand-blue/75">Records</th>
                    <th className="p-4 text-left text-xs font-medium text-brand-blue/75">Status</th>
                    <th className="p-4 text-right text-xs font-medium text-brand-blue/75">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((batch, index) => {
                    const pct = batch.total > 0
                      ? Math.round(((batch.verified + batch.failed) / batch.total) * 100)
                      : 0;
                    return (
                      <motion.tr
                        key={batch.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.04 }}
                        className="border-b border-blue-50 transition-colors hover:bg-blue-50/40"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-blue/10">
                              <Package size={16} className="text-brand-blue" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-brand-dark">{batch.name}</p>
                              <p className="truncate text-xs text-gray-400">{formatDate(batch.createdAt)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="hidden w-44 p-4 sm:table-cell">
                          <ProgressBar progress={pct} height="h-1.5" />
                          <p className="mt-1.5 text-[11px] text-brand-blue/65">
                            {pct}% · {batch.verified}/{batch.total} verified
                          </p>
                        </td>
                        <td className="p-4 text-center">
                          <span className="inline-flex min-w-9 justify-center rounded-lg bg-blue-50 px-2.5 py-1 text-sm font-bold text-brand-dark">
                            {batch.total}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className={`inline-flex rounded-xl border px-3 py-1.5 ${batch.statusMeta.tone}`}>
                            <span className="font-inter text-xs font-semibold">{batch.statusMeta.label}</span>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => { setSelectedId(batch.id); setSelectedName(batch.name); }}
                            className="ml-auto inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-brand-blue transition-colors hover:bg-blue-100"
                          >
                            <Eye size={12} />
                            View Details
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mb-4 flex items-center justify-between">
            <p className="font-inter text-xs text-brand-blue/65">
              Page {page + 1} of {totalPages} · {filtered.length} batches
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" icon={ChevronLeft}
                onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                Prev
              </Button>
              <Button variant="outline" size="sm" icon={ChevronRight}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <BatchDetailModal
        batchId={selectedId}
        batchName={selectedName}
        onClose={() => { setSelectedId(null); setSelectedName(''); }}
      />
    </AuthLayout>
  );
};

export default BatchStatus;
