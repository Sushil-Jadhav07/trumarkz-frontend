import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, MotionConfig } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { KpiCard, KpiSkeleton } from '@/components/shared/KpiCard';
import { authAPI, verificationAPI, getApiError } from '@/services/api';
import {
  AlertTriangle, ArrowRight, Building2, CalendarDays, CheckCircle2, ChevronRight, CircleCheck,
  Clock, Inbox, Layers, RefreshCw, UserPlus, Users, XCircle,
} from 'lucide-react';

// ── Status vocabulary ──────────────────────────────────────────────────────
// Mirrors the exact classification already used in BatchMonitor.jsx /
// SDCVerification.jsx so counts stay consistent across the admin section.
const VERIFIED_RECORD_STATUSES = new Set(['approved', 'verified']);
const FAILED_RECORD_STATUSES = new Set(['rejected', 'failed']);
const PENDING_RECORD_STATUSES = new Set([
  'pending', 'pending_verification', 'processing',
  'verification_in_progress', 'doc_uploaded', 'awaiting_review',
]);

const classifyRecordStatus = (status) => {
  const value = String(status || '').trim().toLowerCase();
  if (VERIFIED_RECORD_STATUSES.has(value)) return 'verified';
  if (FAILED_RECORD_STATUSES.has(value)) return 'failed';
  return 'pending';
};

const PROCESSING_BATCH_STATUSES = new Set(['processing', 'verification_in_progress']);

const ACTIVITY_META = {
  pending:                   { label: 'New batch created',        dot: 'bg-blue-500' },
  processing:                { label: 'Verification in progress', dot: 'bg-orange-500' },
  verification_in_progress:  { label: 'Verification in progress', dot: 'bg-orange-500' },
  verification_completed:    { label: 'Verification completed',   dot: 'bg-green-500' },
  sdc_generated:              { label: 'SDC generated',            dot: 'bg-green-500' },
};

const summarizeRecordCounts = (records = []) => records.reduce((acc, r) => {
  acc[classifyRecordStatus(r?.verification_status ?? r?.status)] += 1;
  return acc;
}, { verified: 0, failed: 0, pending: 0 });

// Best-effort batch "type" — reuses the same product-vs-human heuristic
// already established in BatchMonitor.jsx's isProductRecord check. Only
// derivable when the batch response includes its record list; otherwise
// left null (rendered as "—") rather than guessed.
const deriveBatchType = (records) => {
  if (!records || records.length === 0) return null;
  const isProduct = records.some((r) => (
    r?.entity_type === 'product' || !!r?.product_name || !!r?.category_name || !!r?.custom_fields
  ));
  return isProduct ? 'Product' : 'Human';
};

// Normalizes one batch object from GET /verification/batches — mirrors
// BatchMonitor.jsx's normaliseApiBatch so figures match that page exactly.
const normalizeBatch = (b) => {
  const id = b.batch_id || b.id || '';
  const records = Array.isArray(b.users) ? b.users : [];
  const total = records.length > 0 ? records.length : Number(b.total_users ?? b.total ?? 0);
  const summaryVerified = Number(b.approved ?? b.approved_count ?? 0);
  const summaryFailed = Number(b.rejected ?? b.rejected_count ?? 0);
  const hasRecordStatuses = records.some((r) => r?.verification_status != null || r?.status != null);
  const counts = hasRecordStatuses ? summarizeRecordCounts(records) : null;
  const verified = counts ? counts.verified : summaryVerified;
  const failed = counts ? counts.failed : summaryFailed;
  const pending = counts ? counts.pending : Math.max(0, total - verified - failed);
  return {
    id,
    name: b.batch_name || b.name || `Batch ${String(id).slice(0, 8)}`,
    orgName: b.organization_name || b.org_name || 'Organization',
    orgId: b.org_id || null,
    type: deriveBatchType(records),
    total, verified, pending, failed,
    status: b.status || 'pending',
    createdAt: b.created_at || null,
  };
};

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const timeAgo = (value) => {
  if (!value) return '—';
  const diffMs = Date.now() - new Date(value).getTime();
  if (Number.isNaN(diffMs)) return '—';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
};

// ── Presentational pieces ─────────────────────────────────────────────────
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.35, ease: 'easeOut' },
});

const Panel = ({ children, className = '' }) => (
  <div className={`rounded-2xl border border-gray-100 bg-white ${className}`}>{children}</div>
);

const InlineEmpty = ({ icon: Icon = Inbox, text }) => (
  <div className="flex flex-col items-center justify-center py-10 text-center">
    <div className="mb-3 rounded-full bg-gray-100 p-3">
      <Icon size={22} className="text-gray-400" />
    </div>
    <p className="text-sm text-gray-500 font-inter">{text}</p>
  </div>
);

const STATUS_PILL = {
  sdc_generated:            { label: 'SDC generated', className: 'bg-green-50 text-green-700', icon: CircleCheck, iconClass: 'fill-green-500 text-white' },
  verification_completed:   { label: 'Completed',     className: 'bg-green-50 text-green-700', icon: CircleCheck, iconClass: 'fill-green-500 text-white' },
  processing:               { label: 'Processing',    className: 'bg-blue-50 text-brand-blue', icon: Layers,      iconClass: 'text-brand-blue' },
  verification_in_progress: { label: 'In progress',   className: 'bg-blue-50 text-brand-blue', icon: Layers,      iconClass: 'text-brand-blue' },
  pending:                  { label: 'Pending',       className: 'bg-orange-50 text-orange-600', icon: Clock,     iconClass: 'text-orange-500' },
};

const StatusPill = ({ status }) => {
  const meta = STATUS_PILL[status] || STATUS_PILL.pending;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium font-inter ${meta.className}`}>
      <Icon size={15} className={meta.iconClass} />
      {meta.label}
    </span>
  );
};

const AVATAR_TONES = [
  'bg-blue-50 text-brand-blue',
  'bg-purple-50 text-purple-600',
  'bg-red-50 text-red-500',
  'bg-gray-100 text-brand-dark',
];

const percent = (part, total) => (total > 0 ? `${((part / total) * 100).toFixed(1)}%` : '0%');

const formatHeaderDate = (date) =>
  `${date.getDate()} ${date.toLocaleDateString('en-US', { month: 'short' })}, ${date.getFullYear()}`;

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [orgCount, setOrgCount] = useState(null); // null = unknown/unavailable, not zero
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);

    // NOTE: There is no dedicated dashboard-summary/aggregate endpoint on the
    // backend yet. Every KPI below is derived client-side from the same two
    // endpoints the rest of the admin section already relies on:
    //   - GET /verification/batches  (source of truth for Batch Monitor)
    //   - GET /auth/users/grouped    (source of truth for org lists elsewhere)
    // Both calls are made once, in parallel, and reused for every section on
    // this page (no per-section refetching).
    // TODO(backend): once the platform has enough batches that
    // /verification/batches needs its own pagination, replace this
    // client-side aggregation with a real /admin/dashboard-summary endpoint.
    const [batchesResult, orgsResult] = await Promise.allSettled([
      verificationAPI.getBatches(),
      authAPI.getUsersGrouped(),
    ]);

    if (batchesResult.status === 'fulfilled') {
      const raw = Array.isArray(batchesResult.value?.data) ? batchesResult.value.data : [];
      const flat = raw.flatMap((entry) => (
        Array.isArray(entry.batches)
          ? entry.batches.map((b) => ({ ...b, organization_name: entry.organization_name, org_id: entry.org_id }))
          : [entry]
      ));
      setBatches(flat.map(normalizeBatch));
      setError(null);
    } else {
      console.error('[AdminDashboard] Failed to load batches:', batchesResult.reason?.response?.status, batchesResult.reason?.message);
      setBatches([]);
      setError(getApiError(batchesResult.reason, 'Failed to load verification batches.'));
    }

    if (orgsResult.status === 'fulfilled') {
      const data = orgsResult.value?.data;
      const orgs = Array.isArray(data) ? data : Array.isArray(data?.organizations) ? data.organizations : [];
      setOrgCount(orgs.length);
    } else {
      console.error('[AdminDashboard] Failed to load organizations:', orgsResult.reason?.response?.status, orgsResult.reason?.message);
      setOrgCount(null);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  // ── Derived stats (memoized — recomputed only when batches change) ──────
  const stats = useMemo(() => batches.reduce((acc, b) => {
    acc.totalRecords += b.total;
    acc.verified += b.verified;
    acc.pending += b.pending;
    acc.failed += b.failed;
    return acc;
  }, { totalRecords: 0, verified: 0, pending: 0, failed: 0 }), [batches]);

  const processingBatchCount = useMemo(() => (
    batches.filter((b) => PROCESSING_BATCH_STATUSES.has(b.status)).length
  ), [batches]);

  const recentBatches = useMemo(() => (
    [...batches].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 8)
  ), [batches]);

  const recentActivity = useMemo(() => (
    [...batches]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 6)
      .map((b) => {
        const meta = b.failed > 0
          ? { label: 'Records rejected', dot: 'bg-red-500' }
          : (ACTIVITY_META[b.status] || ACTIVITY_META.pending);
        return { id: b.id, label: meta.label, dot: meta.dot, orgName: b.orgName, time: b.createdAt };
      })
  ), [batches]);

  const topOrganizations = useMemo(() => {
    const map = new Map();
    batches.forEach((b) => {
      const key = b.orgId || b.orgName;
      if (!map.has(key)) map.set(key, { key, orgName: b.orgName, totalBatches: 0 });
      map.get(key).totalBatches += 1;
    });
    return [...map.values()].sort((a, b) => b.totalBatches - a.totalBatches).slice(0, 4);
  }, [batches]);
  const maxOrgBatches = topOrganizations[0]?.totalBatches || 1;

  const headerDate = useMemo(() => formatHeaderDate(new Date()), []);
  const shownBatches = recentBatches.slice(0, 4);
  const shownActivity = recentActivity.slice(0, 3);
  const total = stats.totalRecords;

  const kpis = [
    { label: 'Total batches', value: batches.length, sub: `${processingBatchCount} currently processing`, icon: Layers },
    { label: 'Organizations', value: orgCount === null ? '—' : orgCount, sub: orgCount === null ? 'Unavailable' : 'Active organizations', icon: Building2 },
    { label: 'Verified records', value: stats.verified, sub: 'Completed verification', icon: CheckCircle2 },
    { label: 'Pending records', value: stats.pending, sub: 'Awaiting verification', icon: Clock },
  ];

  const segments = [
    { key: 'pending', label: 'Pending', value: stats.pending, bar: 'bg-gray-400', dot: 'bg-gray-400' },
    { key: 'verified', label: 'Verified', value: stats.verified, bar: 'bg-brand-blue', dot: 'bg-brand-blue' },
    { key: 'failed', label: 'Failed', value: stats.failed, bar: 'bg-red-500', dot: 'bg-red-500' },
  ];

  const actionTiles = [
    { label: 'Pending review', value: stats.pending, icon: Clock, tile: 'bg-orange-50/70 hover:bg-orange-50', iconClass: 'text-orange-500', valueClass: 'text-orange-500' },
    { label: 'Failed / rejected', value: stats.failed, icon: XCircle, tile: 'bg-red-50/70 hover:bg-red-50', iconClass: 'text-red-500', valueClass: 'text-red-500' },
    { label: 'Processing batches', value: processingBatchCount, icon: Layers, tile: 'bg-blue-50/70 hover:bg-blue-50', iconClass: 'text-brand-blue', valueClass: 'text-brand-blue' },
  ];

  // Activity icon follows the event's own colour from ACTIVITY_META.
  const activityIcon = (dot) => {
    if (dot.includes('green')) return { icon: CircleCheck, wrap: 'bg-green-50', iconClass: 'fill-green-500 text-white', line: 'bg-green-500' };
    if (dot.includes('red')) return { icon: XCircle, wrap: 'bg-red-50', iconClass: 'text-red-500', line: 'bg-red-500' };
    if (dot.includes('orange')) return { icon: Clock, wrap: 'bg-orange-50', iconClass: 'text-orange-500', line: 'bg-orange-500' };
    return { icon: Layers, wrap: 'bg-blue-50', iconClass: 'text-brand-blue', line: 'bg-brand-blue' };
  };

  return (
    <AuthLayout title="Overview" breadcrumb={['Administration', 'Overview']}>
      <MotionConfig reducedMotion="user">
      <div className="space-y-5">
        {/* Header */}
        <motion.div {...fadeUp(0)} className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-blue font-inter">Admin workspace</p>
            <h1 className="mt-1.5 font-sora text-xl font-bold leading-tight text-brand-dark sm:text-2xl">Verification command center</h1>
            <p className="mt-1 text-sm text-gray-500 font-inter">A clear view of your platform&apos;s verification work.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-600 font-inter">
              <CalendarDays size={17} className="text-gray-400" /> {headerDate}
            </span>
            <button
              type="button"
              onClick={() => loadDashboard(true)}
              disabled={refreshing}
              className="inline-flex h-9 items-center gap-2 rounded-lg border-2 border-brand-blue/80 bg-white px-4 text-sm font-semibold text-brand-blue font-inter transition-colors hover:bg-blue-50 disabled:opacity-60"
            >
              <RefreshCw size={17} className={refreshing ? 'animate-spin motion-reduce:animate-none' : ''} /> {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </motion.div>

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-500" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-red-700 font-inter">Couldn&apos;t load dashboard data</p>
              <p className="mt-0.5 text-xs text-red-500 font-inter">{error}</p>
            </div>
            <button type="button" onClick={() => loadDashboard(true)} className="min-h-[40px] rounded-lg border border-red-200 bg-white px-4 text-xs font-semibold text-red-600 font-inter hover:bg-red-50">Retry</button>
          </div>
        )}

        {/* KPI tiles */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
            : kpis.map((k, i) => <KpiCard key={k.label} {...k} delay={0.05 + i * 0.05} />)}
        </div>

        {/* Verification overview + Top organizations */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)]">
          <motion.div {...fadeUp(0.15)}>
            <Panel className="h-full p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <h2 className="font-sora text-base font-semibold text-brand-dark">Verification overview</h2>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-brand-blue font-inter">{total} records</span>
                </div>
                <p className="text-xs text-gray-500 font-inter">Review reports before taking action.</p>
              </div>

              {loading ? (
                <div className="mt-6 space-y-4">
                  <SkeletonLoader height="8px" />
                  <div className="grid grid-cols-3 gap-4">{[1, 2, 3].map((i) => <SkeletonLoader key={i} height="44px" />)}</div>
                </div>
              ) : total === 0 ? (
                <InlineEmpty text="No verification data yet. This will populate once batches are created." />
              ) : (
                <>
                  <div
                    role="img"
                    aria-label={segments.map((s) => `${s.label} ${s.value} (${percent(s.value, total)})`).join(', ')}
                    className="mt-5 flex h-2 w-full gap-1 overflow-hidden rounded-full"
                  >
                    {segments.filter((s) => s.value > 0).map((s) => (
                      <div key={s.key} className={`${s.bar} h-full rounded-full`} style={{ width: `${(s.value / total) * 100}%` }} />
                    ))}
                  </div>
                  <div className="mt-5 grid grid-cols-3 divide-x divide-gray-100">
                    {segments.map((s) => (
                      <div key={s.key} className="px-1 first:pl-0 sm:px-6 sm:first:pl-0">
                        <p className="flex items-center gap-2 text-sm text-gray-500 font-inter">
                          <span className={`h-3 w-3 rounded-full ${s.dot}`} /> {s.label}
                        </p>
                        <p className="mt-1.5 flex items-baseline gap-2 pl-5">
                          <span className="font-sora text-xl font-bold tabular-nums text-brand-dark">{s.value}</span>
                          <span className="text-sm text-gray-500 font-inter">{percent(s.value, total)}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="mt-5 grid grid-cols-1 gap-3 border-t border-gray-100 pt-4 sm:grid-cols-3">
                {actionTiles.map((t) => (
                  <button
                    key={t.label}
                    type="button"
                    onClick={() => navigate('/admin/batch-monitor')}
                    className={`group flex items-center gap-3 rounded-xl px-4 py-3.5 text-left transition-colors ${t.tile}`}
                  >
                    <t.icon size={20} strokeWidth={1.75} className={`shrink-0 ${t.iconClass}`} />
                    <span className="flex-1 text-sm font-medium text-brand-dark font-inter">{t.label}</span>
                    <span className={`font-sora text-sm font-semibold ${t.valueClass}`}>{loading ? '…' : t.value}</span>
                    <ChevronRight size={16} className={`shrink-0 transition-transform group-hover:translate-x-0.5 ${t.iconClass}`} />
                  </button>
                ))}
              </div>
            </Panel>
          </motion.div>

          <motion.div {...fadeUp(0.2)}>
            <Panel className="h-full p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-sora text-base font-semibold text-brand-dark">Top organizations</h2>
                <span className="text-xs text-gray-500 font-inter">By total batches</span>
              </div>
              {loading ? (
                <div className="mt-5 space-y-4">{[1, 2, 3, 4].map((i) => <SkeletonLoader key={i} height="36px" />)}</div>
              ) : topOrganizations.length === 0 ? (
                <InlineEmpty icon={Building2} text="No organization activity found yet." />
              ) : (
                <ul className="mt-4 space-y-3.5">
                  {topOrganizations.map((o, i) => (
                    <li key={o.key} className="flex items-center gap-3">
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-sora text-base font-semibold ${AVATAR_TONES[i % AVATAR_TONES.length]}`}>
                        {(o.orgName || '?').trim()[0]?.toUpperCase() || '?'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium text-brand-dark font-inter">{o.orgName}</span>
                          <span className="shrink-0 text-xs text-gray-500 font-inter">{o.totalBatches} {o.totalBatches === 1 ? 'batch' : 'batches'}</span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                          <div className="h-full rounded-full bg-brand-blue" style={{ width: `${Math.max(6, Math.round((o.totalBatches / maxOrgBatches) * 100))}%` }} />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </motion.div>
        </div>

        {/* Recent batches + Recent activity */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)]">
          <motion.div {...fadeUp(0.25)}>
            <Panel className="h-full p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <h2 className="font-sora text-base font-semibold text-brand-dark">Recent batches</h2>
                  <span className="text-sm text-gray-500 font-inter">Latest {shownBatches.length} of {batches.length} batches</span>
                </div>
                <button type="button" onClick={() => navigate('/admin/batch-monitor')} className="-my-2 inline-flex min-h-[44px] items-center gap-1 rounded-lg px-2 text-sm font-medium text-brand-blue font-inter hover:underline">
                  View all <ArrowRight size={15} />
                </button>
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      {['Batch', 'Organization', 'Records', 'Status', 'Created'].map((h) => (
                        <th key={h} className="py-2.5 pr-4 text-xs font-medium text-gray-500 font-inter">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <tr key={i} className="border-b border-gray-50 last:border-0">
                          {Array.from({ length: 5 }).map((__, j) => (
                            <td key={j} className="py-3 pr-4"><SkeletonLoader height="14px" width={j === 0 ? '85%' : '60%'} /></td>
                          ))}
                        </tr>
                      ))
                    ) : shownBatches.length === 0 ? (
                      <tr><td colSpan={5}><InlineEmpty text="No verification batches yet." /></td></tr>
                    ) : (
                      shownBatches.map((b) => (
                        <tr
                          key={b.id}
                          tabIndex={0}
                          aria-label={`Open batch ${b.name}`}
                          onClick={() => navigate(`/admin/batch-monitor/${encodeURIComponent(b.id)}`)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              navigate(`/admin/batch-monitor/${encodeURIComponent(b.id)}`);
                            }
                          }}
                          className="cursor-pointer border-b border-gray-50 transition-colors last:border-0 hover:bg-gray-50/70 focus-visible:bg-blue-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-blue"
                        >
                          <td className="max-w-[220px] truncate py-3 pr-4 text-brand-dark font-inter">{b.name}</td>
                          <td className="max-w-[200px] truncate py-3 pr-4 text-gray-600 font-inter">{b.orgName}</td>
                          <td className="py-3 pr-4 text-gray-600 font-inter">{b.total}</td>
                          <td className="py-3 pr-4"><StatusPill status={b.status} /></td>
                          <td className="whitespace-nowrap py-3 text-gray-500 font-inter">{formatDate(b.createdAt)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>
          </motion.div>

          <motion.div {...fadeUp(0.3)}>
            <Panel className="h-full p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-sora text-base font-semibold text-brand-dark">Recent activity</h2>
                <span className="text-xs text-gray-500 font-inter">Latest platform events</span>
              </div>
              {loading ? (
                <div className="mt-5 space-y-4">{[1, 2, 3].map((i) => <SkeletonLoader key={i} height="40px" />)}</div>
              ) : shownActivity.length === 0 ? (
                <InlineEmpty text="No recent activity yet." />
              ) : (
                <ol className="relative mt-4 space-y-4">
                  <span aria-hidden="true" className="absolute bottom-3 left-[3px] top-3 w-px bg-gray-100" />
                  {shownActivity.map((a) => {
                    const meta = activityIcon(a.dot);
                    return (
                      <li key={a.id} className="relative flex items-start gap-3">
                        <span className={`relative z-10 mt-4 h-[7px] w-[7px] shrink-0 rounded-full ${meta.line}`} />
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${meta.wrap}`}>
                          <meta.icon size={20} strokeWidth={1.75} className={meta.iconClass} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-brand-dark font-inter">{a.label}</p>
                          <p className="text-xs text-gray-500 font-inter">{a.orgName}</p>
                        </div>
                        <span className="shrink-0 text-xs text-gray-500 font-inter">{timeAgo(a.time)}</span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </Panel>
          </motion.div>
        </div>

        {/* Admin access */}
        <motion.div {...fadeUp(0.35)}>
          <Panel className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="font-sora text-base font-semibold text-brand-dark">Admin access</h2>
              <p className="text-sm text-gray-500 font-inter">Manage administrative access and permissions.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => navigate('/admin/promote-super-admin')}
                className="inline-flex h-11 items-center justify-center gap-2.5 rounded-xl border border-brand-blue/70 bg-white px-6 text-sm font-semibold text-brand-blue font-inter transition-colors hover:bg-blue-50"
              >
                <UserPlus size={18} strokeWidth={1.75} /> Promote existing user
              </button>
              <button
                type="button"
                onClick={() => navigate('/admin/create-super-admin')}
                className="inline-flex h-11 items-center justify-center gap-2.5 rounded-xl border border-brand-blue/70 bg-white px-6 text-sm font-semibold text-brand-blue font-inter transition-colors hover:bg-blue-50"
              >
                <Users size={18} strokeWidth={1.75} /> Create Super Admin
              </button>
            </div>
          </Panel>
        </motion.div>
      </div>
      </MotionConfig>
    </AuthLayout>
  );
};

export default AdminDashboard;
