import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Modal } from '@/components/ui/Modal';
import { verificationAPI, getApiError } from '@/services/api';
import {
  ChevronLeft, ChevronRight, CheckCircle, Clock, Download,
  Eye, FileText, Layers, Package, QrCode, RefreshCw, Upload,
  User, XCircle, Play, BarChart3, Building2, ShieldCheck, Globe,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Helpers ───────────────────────────────────────────────────────────────────
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const formatVerifType = (t) => {
  if (UUID_RE.test(t)) return t.slice(0, 8).toUpperCase() + '…';
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

const isUUID = (t) => UUID_RE.test(t);

const isProductRecord = (r) =>
  r?.entity_type === 'product' || !!r?.product_name || !!r?.category_name;

const getRecordTitle = (r) =>
  r?.product_name || r?.full_name || r?.email || r?.id || 'Record';

const getRecordSubtitle = (r) =>
  isProductRecord(r)
    ? r?.category_name || 'Product verification'
    : [r?.email, r?.phone_number].filter(Boolean).join(' · ') || 'Human verification';

const recordStatusBadge = (status) => {
  if (status === 'verified') return { variant: 'success', label: 'Verified' };
  if (status === 'failed')   return { variant: 'error',   label: 'Failed' };
  return                            { variant: 'pending',  label: 'Pending' };
};

const BATCH_STATUS_META = {
  pending_verification: {
    label:      'Pending',
    dot:        'bg-amber-400',
    tone:       'bg-amber-50 text-amber-700 border-amber-200',
    headerBg:   'bg-amber-50 border-amber-100',
    iconBg:     'bg-amber-100',
    iconColor:  'text-amber-600',
    icon:       Clock,
  },
  verified: {
    label:      'Verified',
    dot:        'bg-green-500',
    tone:       'bg-green-50 text-green-700 border-green-200',
    headerBg:   'bg-green-50 border-green-100',
    iconBg:     'bg-green-100',
    iconColor:  'text-green-600',
    icon:       CheckCircle,
  },
  failed: {
    label:      'Failed',
    dot:        'bg-red-500',
    tone:       'bg-red-50 text-red-600 border-red-200',
    headerBg:   'bg-red-50 border-red-100',
    iconBg:     'bg-red-100',
    iconColor:  'text-red-500',
    icon:       XCircle,
  },
};

const FILTER_OPTIONS = [
  { value: '',                     label: 'All',      icon: Layers },
  { value: 'pending_verification', label: 'Pending',  icon: Clock },
  { value: 'verified',             label: 'Verified', icon: CheckCircle },
  { value: 'failed',               label: 'Failed',   icon: XCircle },
];

const PAGE_SIZE = 10;

const normaliseBatch = (b) => {
  if (!b || typeof b !== 'object') return null;
  const id       = b.batch_id || b.id || '';
  const total    = Number(b.total_users ?? b.total ?? 0);
  const verified = Number(b.verified ?? b.verified_count ?? 0);
  const failed   = Number(b.failed ?? b.failed_count ?? 0);
  const pending  = Math.max(0, total - verified - failed);
  const status   = pending > 0 ? 'pending_verification' : failed > 0 ? 'failed' : 'verified';
  // Normalise verificationTypes — API may return strings or objects
  const rawTypes = b.verification_types || [];
  const verificationTypes = rawTypes.map((t) =>
    typeof t === 'string' ? t : (t?.name || t?.label || t?.id || String(t))
  );
  return {
    id,
    name:                 b.batch_name || b.name || `Batch ${String(id).slice(0, 8)}`,
    total, verified, failed, pending, status,
    statusMeta:           BATCH_STATUS_META[status] || BATCH_STATUS_META.pending_verification,
    createdAt:            b.created_at || b.createdAt,
    excelPath:            b.excel_storage_path || null,
    reportPaths:          Array.isArray(b.report_storage_paths) ? b.report_storage_paths : [],
    description:          b.description || '',
    industryType:         Array.isArray(b.industry_type) ? b.industry_type : [],
    verificationTypes,
    credentialVisibility: b.credential_visibility || '',
    verificationProgress: b.verification_progress || {},
    records:              Array.isArray(b.users) ? b.users : [],
  };
};

const formatDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? v
    : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

// ── Stagger variants ──────────────────────────────────────────────────────────
const listContainer = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.07 } },
};
const listItem = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' } },
};

// ── Segmented progress bar ────────────────────────────────────────────────────
const SegmentedBar = ({ total, verified, failed, pending }) => {
  const vPct = total > 0 ? (verified / total) * 100 : 0;
  const fPct = total > 0 ? (failed   / total) * 100 : 0;
  const pPct = total > 0 ? (pending  / total) * 100 : 0;
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${vPct}%` }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
        className="h-full bg-green-500"
      />
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${fPct}%` }}
        transition={{ duration: 0.9, ease: 'easeOut', delay: 0.1 }}
        className="h-full bg-red-400"
      />
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pPct}%` }}
        transition={{ duration: 0.9, ease: 'easeOut', delay: 0.2 }}
        className="h-full bg-amber-300"
      />
    </div>
  );
};

// ── Batch Detail Modal ────────────────────────────────────────────────────────
const BatchDetailModal = ({ batchId, batchName, onClose }) => {
  const [detail,  setDetail]  = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!batchId) return;
    setLoading(true);
    setDetail(null);
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

  const handleAutoVerify = async (record) => {
    const typeToRun = record.verification_types?.[0] || 'authenticity';
    try {
      await verificationAPI.runAutoVerification(typeToRun, record.id);
      toast.success('Automatic verification triggered');
      verificationAPI.getBatchDetails(batchId)
        .then(({ data }) => setDetail(normaliseBatch(data)))
        .catch(() => {});
    } catch (err) {
      toast.error(getApiError(err, 'Failed to run automatic verification'));
    }
  };

  const meta = detail?.statusMeta || BATCH_STATUS_META.pending_verification;
  const StatusIcon = meta.icon;
  const pct = detail && detail.total > 0
    ? Math.round(((detail.verified + detail.failed) / detail.total) * 100)
    : 0;

  const hasDownloads = detail?.excelPath || detail?.reportPaths?.length > 0;
  const hasMeta      = detail &&
    (detail.industryType.length > 0 || detail.verificationTypes.length > 0 || detail.credentialVisibility);

  return (
    <Modal isOpen={!!batchId} onClose={onClose} title={`${batchName} — Details`} size="4xl">
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-brand-blue/10 bg-brand-blue/5">
            <RefreshCw size={20} className="animate-spin text-brand-blue" />
          </div>
          <p className="font-inter text-sm text-gray-400">Loading batch details…</p>
        </div>
      ) : !detail ? (
        <div className="flex flex-col items-center justify-center gap-3 py-12">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-red-100 bg-red-50">
            <XCircle size={22} className="text-red-500" />
          </div>
          <p className="font-inter text-sm text-gray-500">Failed to load details.</p>
        </div>
      ) : (
        <div className="space-y-3">

          {/* ── Status banner ─────────────────────────────────────────────── */}
          <div className={`rounded-2xl border p-5 ${meta.headerBg}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${meta.iconBg}`}>
                  <StatusIcon size={22} className={meta.iconColor} />
                </div>
                <div className="min-w-0">
                  <p className="font-inter text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
                    Batch Status
                  </p>
                  <h3 className="mt-1 font-sora text-2xl font-bold text-brand-dark">{meta.label}</h3>
                  {detail.id && (
                    <p className="mt-1 font-mono text-[11px] text-gray-400 break-all">{detail.id}</p>
                  )}
                  {detail.description && (
                    <p className="mt-2 font-inter text-xs leading-5 text-gray-500 max-w-md">
                      {detail.description}
                    </p>
                  )}
                </div>
              </div>
              <div className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 ${meta.tone}`}>
                <div className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                <span className="font-inter text-xs font-semibold">{meta.label}</span>
              </div>
            </div>
          </div>

          {/* ── Stats row ─────────────────────────────────────────────────── */}
          <motion.div
            variants={listContainer}
            initial="hidden"
            animate="show"
            className="grid grid-cols-4 gap-2.5"
          >
            {[
              {
                label:   'Total',
                value:   detail.total,
                icon:    Layers,
                surface: 'bg-brand-blue/5 border-brand-blue/10',
                num:     'text-brand-blue',
                ico:     'text-brand-blue',
              },
              {
                label:   'Verified',
                value:   detail.verified,
                icon:    CheckCircle,
                surface: 'bg-green-50 border-green-100',
                num:     'text-green-600',
                ico:     'text-green-500',
              },
              {
                label:   'Pending',
                value:   detail.pending,
                icon:    Clock,
                surface: 'bg-amber-50 border-amber-100',
                num:     'text-amber-600',
                ico:     'text-amber-500',
              },
              {
                label:   'Failed',
                value:   detail.failed,
                icon:    XCircle,
                surface: 'bg-red-50 border-red-100',
                num:     'text-red-500',
                ico:     'text-red-400',
              },
            ].map((s) => (
              <motion.div
                key={s.label}
                variants={listItem}
                className={`rounded-xl border p-4 ${s.surface}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-inter text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                    {s.label}
                  </p>
                  <s.icon size={13} className={s.ico} />
                </div>
                <p className={`mt-2 font-sora text-3xl font-bold leading-none ${s.num}`}>
                  {s.value}
                </p>
              </motion.div>
            ))}
          </motion.div>

          {/* ── Segmented progress ────────────────────────────────────────── */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5">
            <div className="mb-3 flex items-center justify-between gap-4">
              <p className="font-sora text-sm font-semibold text-brand-dark">Verification Progress</p>
              <div className="flex items-baseline gap-1.5">
                <span className="font-sora text-xl font-bold text-brand-dark">{pct}%</span>
                <span className="font-inter text-xs text-gray-400">
                  · {detail.verified + detail.failed} of {detail.total} processed
                </span>
              </div>
            </div>
            <SegmentedBar
              total={detail.total}
              verified={detail.verified}
              failed={detail.failed}
              pending={detail.pending}
            />
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1.5">
              {[
                { color: 'bg-green-500', label: 'Verified', count: detail.verified },
                { color: 'bg-amber-300', label: 'Pending',  count: detail.pending },
                { color: 'bg-red-400',   label: 'Failed',   count: detail.failed },
              ].map((leg) => (
                <div key={leg.label} className="flex items-center gap-1.5">
                  <div className={`h-2.5 w-2.5 rounded-sm ${leg.color}`} />
                  <span className="font-inter text-xs text-gray-500">
                    {leg.label}{' '}
                    <span className="font-semibold text-brand-dark">{leg.count}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Meta info ─────────────────────────────────────────────────── */}
          {hasMeta && (
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
              <div className="flex divide-x divide-gray-100">
                {detail.industryType.length > 0 && (
                  <div className="flex-1 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Building2 size={13} className="text-gray-400" />
                      <p className="font-inter text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">
                        Industries
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {detail.industryType.map((t) => (
                        <span
                          key={t}
                          className="rounded-lg border border-brand-blue/15 bg-brand-blue/8 px-2.5 py-1 font-inter text-[11px] font-semibold text-brand-blue"
                          style={{ backgroundColor: 'rgb(37 99 235 / 0.07)' }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {detail.verificationTypes.length > 0 && (
                  <div className="flex-1 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <ShieldCheck size={13} className="text-gray-400" />
                      <p className="font-inter text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">
                        Verification Types
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {detail.verificationTypes.map((t) => (
                        <span
                          key={t}
                          title={t}
                          className={`rounded-lg px-2.5 py-1 font-inter text-[11px] font-semibold ${
                            isUUID(t)
                              ? 'border border-gray-200 bg-gray-50 font-mono text-gray-500'
                              : 'border border-gray-200 bg-gray-50 text-brand-dark'
                          }`}
                        >
                          {formatVerifType(t)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {detail.credentialVisibility && (
                  <div className="min-w-[120px] p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Globe size={13} className="text-gray-400" />
                      <p className="font-inter text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">
                        Visibility
                      </p>
                    </div>
                    <span className="rounded-lg border border-brand-blue/20 bg-brand-blue/5 px-2.5 py-1.5 font-inter text-[11px] font-semibold text-brand-blue capitalize">
                      {detail.credentialVisibility}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Downloads ─────────────────────────────────────────────────── */}
          {hasDownloads && (
            <div className="rounded-2xl border border-gray-100 bg-white p-4">
              <p className="mb-3 font-inter text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">
                Downloads
              </p>
              <div className="flex flex-wrap gap-2">
                {detail.excelPath && (
                  <a
                    href={detail.excelPath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 font-inter text-xs font-semibold text-green-700 transition-colors hover:bg-green-100"
                  >
                    <FileText size={12} />
                    Excel Template
                  </a>
                )}
                {detail.reportPaths.map((path, i) => (
                  <a
                    key={i}
                    href={path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-brand-blue/15 bg-brand-blue/5 px-3 py-2 font-inter text-xs font-semibold text-brand-blue transition-colors hover:bg-brand-blue/10"
                  >
                    <Download size={12} />
                    Report {i + 1}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* ── Records table ─────────────────────────────────────────────── */}
          {detail.records.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-gray-100">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
                <p className="font-sora text-sm font-semibold text-brand-dark">Records</p>
                <span className="rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1 font-inter text-[11px] font-medium text-gray-500">
                  {detail.records.length} total
                </span>
              </div>
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full min-w-[500px]">
                  <thead className="sticky top-0 z-10 border-b border-gray-100 bg-white">
                    <tr>
                      <th className="px-5 py-3 text-left font-inter text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
                        Record
                      </th>
                      <th className="px-5 py-3 text-left font-inter text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
                        Status
                      </th>
                      <th className="px-5 py-3 text-right font-inter text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.records.map((record, i) => {
                      const Icon = isProductRecord(record) ? Package : User;
                      const sb   = recordStatusBadge(record.verification_status);
                      return (
                        <motion.tr
                          key={record.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.04 }}
                          className="border-b border-gray-50 transition-colors last:border-0 hover:bg-gray-50/60"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-brand-blue/10 bg-brand-blue/5">
                                <Icon size={14} className="text-brand-blue" />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate font-inter text-sm font-semibold text-brand-dark">
                                  {getRecordTitle(record)}
                                </p>
                                <p className="truncate font-inter text-xs text-gray-400">
                                  {getRecordSubtitle(record)}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <Badge status={sb.variant}>{sb.label}</Badge>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center justify-end gap-1.5">
                              {record.verification_status === 'pending_verification' && (
                                <Button variant="ghost" size="sm" icon={Play} onClick={() => handleAutoVerify(record)}>
                                  Auto
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" icon={QrCode} onClick={() => handleGenerateQR(record.id)}>
                                QR
                              </Button>
                            </div>
                          </td>
                        </motion.tr>
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

// ── Main Page ─────────────────────────────────────────────────────────────────
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
      setBatches(list.map(normaliseBatch).filter(Boolean));
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
  const overallPct    = totalRecords > 0
    ? Math.round(((totalVerified + totalFailed) / totalRecords) * 100)
    : 0;

  const filterCounts = {
    '':                   batches.length,
    pending_verification: batches.filter((b) => b.status === 'pending_verification').length,
    verified:             batches.filter((b) => b.status === 'verified').length,
    failed:               batches.filter((b) => b.status === 'failed').length,
  };

  const statCards = [
    {
      label:      'Total Records',
      value:      totalRecords,
      sub:        `across ${batches.length} batch${batches.length !== 1 ? 'es' : ''}`,
      icon:       Layers,
      surface:    'bg-brand-blue border-brand-blue',
      iconBg:     'bg-white/15',
      iconColor:  'text-white',
      labelColor: 'text-white/65',
      valueColor: 'text-white',
      subColor:   'text-white/55',
    },
    {
      label:      'Verified',
      value:      totalVerified,
      sub:        totalRecords > 0 ? `${Math.round((totalVerified / totalRecords) * 100)}% of total` : '—',
      icon:       CheckCircle,
      surface:    'bg-white border-gray-100',
      iconBg:     'bg-green-50',
      iconColor:  'text-green-600',
      labelColor: 'text-gray-400',
      valueColor: 'text-brand-dark',
      subColor:   'text-green-600',
    },
    {
      label:      'Pending',
      value:      totalPending,
      sub:        totalRecords > 0 ? `${Math.round((totalPending / totalRecords) * 100)}% of total` : '—',
      icon:       Clock,
      surface:    'bg-white border-gray-100',
      iconBg:     'bg-amber-50',
      iconColor:  'text-amber-600',
      labelColor: 'text-gray-400',
      valueColor: 'text-brand-dark',
      subColor:   'text-amber-600',
    },
    {
      label:      'Failed',
      value:      totalFailed,
      sub:        totalRecords > 0 ? `${Math.round((totalFailed / totalRecords) * 100)}% of total` : '—',
      icon:       XCircle,
      surface:    'bg-white border-gray-100',
      iconBg:     'bg-red-50',
      iconColor:  'text-red-500',
      labelColor: 'text-gray-400',
      valueColor: 'text-brand-dark',
      subColor:   'text-red-500',
    },
  ];

  return (
    <AuthLayout title="Batch Status">
      <div className="mx-auto w-full space-y-5 lg:max-w-none">

        {/* ── Page header ── */}
        <PageHeader
          title="Verification Batches"
          subtitle="Monitor verification status across all your batches in real time"
          action={
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchData(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 font-inter text-sm font-medium text-brand-dark transition-colors hover:bg-gray-50 disabled:opacity-60"
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </button>
              <Button variant="primary" size="sm" icon={Upload} onClick={() => navigate('/org/create-batch')}>
                New Batch
              </Button>
            </div>
          }
        />

        {/* ── Stat cards ── */}
        {!loading && batches.length > 0 && (
          <motion.div
            variants={listContainer}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 gap-4 lg:grid-cols-4"
          >
            {statCards.map((s) => (
              <motion.div
                key={s.label}
                variants={listItem}
                className={`rounded-2xl border p-5 ${s.surface}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`font-inter text-[10px] font-semibold uppercase tracking-[0.14em] ${s.labelColor}`}>
                      {s.label}
                    </p>
                    <p className={`mt-2 font-sora text-3xl font-bold leading-none ${s.valueColor}`}>
                      {s.value.toLocaleString()}
                    </p>
                    <p className={`mt-2 font-inter text-xs ${s.subColor}`}>{s.sub}</p>
                  </div>
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.iconBg}`}>
                    <s.icon size={18} className={s.iconColor} />
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* ── Overall progress ── */}
        {!loading && batches.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3, ease: 'easeOut' }}
            className="rounded-2xl border border-gray-100 bg-white p-5"
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-brand-blue/10 bg-brand-blue/5">
                  <BarChart3 size={16} className="text-brand-blue" />
                </div>
                <div>
                  <p className="font-inter text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                    Pipeline Overview
                  </p>
                  <p className="font-sora text-sm font-semibold text-brand-dark">
                    Overall Verification Progress
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-sora text-2xl font-bold text-brand-dark">{overallPct}%</p>
                <p className="font-inter text-[11px] text-gray-400">
                  {totalVerified + totalFailed} / {totalRecords} processed
                </p>
              </div>
            </div>
            <SegmentedBar
              total={totalRecords}
              verified={totalVerified}
              failed={totalFailed}
              pending={totalPending}
            />
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
              {[
                { color: 'bg-green-500', label: 'Verified', count: totalVerified },
                { color: 'bg-amber-300', label: 'Pending',  count: totalPending },
                { color: 'bg-red-400',   label: 'Failed',   count: totalFailed },
              ].map((leg) => (
                <div key={leg.label} className="flex items-center gap-1.5">
                  <div className={`h-2.5 w-2.5 rounded-sm ${leg.color}`} />
                  <span className="font-inter text-xs text-gray-500">
                    {leg.label} —{' '}
                    <span className="font-medium text-brand-dark">{leg.count}</span>
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Filter tabs ── */}
        <div className="flex items-center gap-1 rounded-xl border border-gray-100 bg-white p-1.5">
          {FILTER_OPTIONS.map((opt) => {
            const isActive = statusFilter === opt.value;
            const count    = filterCounts[opt.value] ?? 0;
            return (
              <button
                key={opt.value}
                onClick={() => { setStatusFilter(opt.value); setPage(0); }}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 font-inter text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-brand-blue text-white'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-brand-dark'
                }`}
              >
                <opt.icon size={12} />
                {opt.label}
                <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                  isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Batch table ── */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/70 px-5 py-3.5">
            <p className="font-sora text-sm font-semibold text-brand-dark">
              Batches
              {statusFilter && (
                <span className="ml-2 font-inter text-xs font-normal text-gray-400">
                  · {FILTER_OPTIONS.find((o) => o.value === statusFilter)?.label}
                </span>
              )}
            </p>
            {!loading && (
              <span className="font-inter text-xs text-gray-400">
                {filtered.length} batch{filtered.length !== 1 ? 'es' : ''}
              </span>
            )}
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 p-16">
              <RefreshCw size={24} className="animate-spin text-brand-blue" />
              <p className="font-inter text-sm text-gray-400">Loading batches…</p>
            </div>
          )}

          {!loading && paged.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-4 p-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-100 bg-gray-50">
                <Layers size={20} className="text-gray-400" />
              </div>
              <div>
                <p className="font-sora text-sm font-semibold text-brand-dark">No batches found</p>
                <p className="mt-1 font-inter text-xs text-gray-400">
                  {statusFilter
                    ? 'Try a different filter or create a new batch.'
                    : 'Create your first verification batch to get started.'}
                </p>
              </div>
              <Button variant="primary" size="sm" icon={Upload} onClick={() => navigate('/org/create-batch')}>
                New Batch
              </Button>
            </div>
          )}

          {!loading && paged.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-5 py-3 text-left font-inter text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400">
                      Batch
                    </th>
                    <th className="hidden px-5 py-3 text-left font-inter text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400 sm:table-cell">
                      Progress
                    </th>
                    <th className="px-5 py-3 text-center font-inter text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400">
                      Records
                    </th>
                    <th className="px-5 py-3 text-left font-inter text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400">
                      Status
                    </th>
                    <th className="px-5 py-3 text-right font-inter text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="sync">
                    {paged.map((batch, index) => {
                      const pct  = batch.total > 0
                        ? Math.round(((batch.verified + batch.failed) / batch.total) * 100)
                        : 0;
                      const bm = batch.statusMeta;
                      return (
                        <motion.tr
                          key={batch.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ delay: index * 0.04, duration: 0.22, ease: 'easeOut' }}
                          className="border-b border-gray-50 transition-colors last:border-0 hover:bg-gray-50/60"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-blue/10 bg-brand-blue/5">
                                <Package size={16} className="text-brand-blue" />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate font-inter text-sm font-semibold text-brand-dark">
                                  {batch.name}
                                </p>
                                <p className="truncate font-inter text-xs text-gray-400">
                                  {formatDate(batch.createdAt)}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="hidden w-48 px-5 py-4 sm:table-cell">
                            <ProgressBar progress={pct} height="h-1.5" showLabel={false} />
                            <p className="mt-1.5 font-inter text-[11px] text-gray-400">
                              {pct}% · {batch.verified}/{batch.total} verified
                            </p>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <div className="inline-flex min-w-[2.5rem] items-center justify-center rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1">
                              <span className="font-sora text-sm font-bold text-brand-dark">{batch.total}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 ${bm.tone}`}>
                              <div className={`h-1.5 w-1.5 rounded-full ${bm.dot}`} />
                              <span className="font-inter text-xs font-semibold">{bm.label}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button
                              onClick={() => { setSelectedId(batch.id); setSelectedName(batch.name); }}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-brand-blue/20 bg-brand-blue/5 px-3 py-1.5 font-inter text-xs font-semibold text-brand-blue transition-all hover:bg-brand-blue hover:text-white"
                            >
                              <Eye size={12} />
                              View Details
                            </button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3"
          >
            <p className="font-inter text-xs text-gray-400">
              Page <span className="font-semibold text-brand-dark">{page + 1}</span> of {totalPages}
              <span className="mx-2 text-gray-200">·</span>
              {filtered.length} batches
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-brand-dark transition-colors hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = totalPages <= 5
                  ? i
                  : Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`h-8 w-8 rounded-lg font-inter text-xs font-medium transition-colors ${
                      page === p
                        ? 'bg-brand-blue text-white'
                        : 'border border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {p + 1}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-brand-dark transition-colors hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </motion.div>
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
