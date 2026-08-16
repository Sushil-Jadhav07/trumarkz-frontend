import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { authAPI, verificationAPI, getApiError } from '@/services/api';
import {
  AlertTriangle, Building2, CheckCircle, Clock, Inbox,
  Layers, RefreshCw, ShieldCheck, UserPlus, XCircle,
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

// Batch-level `status` field vocabulary (from BatchMonitor.jsx's batchStatusMeta).
// There is no batch-level "failed/rejected" status in the backend — failure is
// only ever tracked per-record, which is why it isn't listed here.
const BATCH_STATUS_META = {
  pending:                   { label: 'Pending',       badge: 'pending' },
  processing:                { label: 'Processing',    badge: 'in-progress' },
  verification_in_progress:  { label: 'In Progress',   badge: 'in-progress' },
  verification_completed:    { label: 'Completed',     badge: 'verified' },
  sdc_generated:              { label: 'SDC Generated',  badge: 'verified' },
};
const getBatchStatusMeta = (status) => BATCH_STATUS_META[status] || BATCH_STATUS_META.pending;

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

// ── Small presentational pieces ────────────────────────────────────────────
const StatCard = ({ label, value, sub, icon: Icon, iconBg, iconColor, delay = 0 }) => (
  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.3 }}>
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg} ${iconColor}`}>
          <Icon size={19} />
        </div>
      </div>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-gray-400 font-inter">{label}</p>
      <p className="mt-1 font-sora font-bold text-3xl text-brand-dark leading-none">{value}</p>
      {sub && <p className="mt-1.5 text-xs text-gray-400 font-inter truncate">{sub}</p>}
    </Card>
  </motion.div>
);

const StatCardSkeleton = () => (
  <Card className="p-5">
    <SkeletonLoader width="44px" height="44px" className="rounded-xl" />
    <div className="mt-4 space-y-2">
      <SkeletonLoader width="70%" height="11px" />
      <SkeletonLoader width="45%" height="28px" />
      <SkeletonLoader width="60%" height="10px" />
    </div>
  </Card>
);

const SectionCard = ({ title, subtitle, action, children, className = '', bodyClassName = 'p-5' }) => (
  <Card className={`p-0 overflow-hidden h-full ${className}`}>
    <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
      <div className="min-w-0">
        <h3 className="font-sora font-semibold text-brand-dark text-[15px]">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 font-inter mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
    <div className={bodyClassName}>{children}</div>
  </Card>
);

const InlineEmpty = ({ icon: Icon = Inbox, text }) => (
  <div className="flex flex-col items-center justify-center py-10 text-center">
    <div className="p-3 bg-gray-100 rounded-full mb-3">
      <Icon size={22} className="text-gray-400" />
    </div>
    <p className="text-sm text-gray-500 font-inter">{text}</p>
  </div>
);

const TableSkeletonRows = ({ cols, rows = 5 }) => (
  <>
    {Array.from({ length: rows }).map((_, i) => (
      <tr key={i} className="border-b border-gray-100 last:border-0">
        {Array.from({ length: cols }).map((__, j) => (
          <td key={j} className="px-4 py-3.5">
            <SkeletonLoader height="14px" width={j === 0 ? '85%' : '60%'} />
          </td>
        ))}
      </tr>
    ))}
  </>
);

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

  const todayLabel = useMemo(() => new Date().toLocaleDateString('en-US', {
    day: '2-digit', month: 'short', year: 'numeric',
  }), []);

  const kpis = [
    { label: 'Total Organizations', value: orgCount === null ? '—' : orgCount, sub: orgCount === null ? 'Unavailable' : 'Active organizations', icon: Building2, iconBg: 'bg-purple-100', iconColor: 'text-purple-600' },
    { label: 'Total Batches', value: batches.length, sub: 'All verification batches', icon: Layers, iconBg: 'bg-blue-100', iconColor: 'text-brand-blue' },
    { label: 'Pending', value: stats.pending, sub: 'Awaiting verification', icon: Clock, iconBg: 'bg-orange-100', iconColor: 'text-orange-600' },
    { label: 'Verified', value: stats.verified, sub: 'Completed', icon: CheckCircle, iconBg: 'bg-green-100', iconColor: 'text-green-600' },
    { label: 'Failed', value: stats.failed, sub: 'Require attention', icon: XCircle, iconBg: 'bg-red-100', iconColor: 'text-red-600' },
  ];

  const donutData = [
    { name: 'Pending', value: stats.pending, color: '#f97316' },
    { name: 'Verified', value: stats.verified, color: '#22c55e' },
    { name: 'Failed', value: stats.failed, color: '#ef4444' },
  ];

  const attentionMetrics = [
    { label: 'Pending verifications', value: stats.pending, tone: 'bg-orange-50 text-orange-700 hover:bg-orange-100/70' },
    { label: 'Failed / rejected', value: stats.failed, tone: 'bg-red-50 text-red-700 hover:bg-red-100/70' },
    { label: 'Processing batches', value: processingBatchCount, tone: 'bg-purple-50 text-purple-700 hover:bg-purple-100/70' },
  ];
  const hasAttentionItems = attentionMetrics.some((m) => m.value > 0);

  const headerAction = (
    <div className="flex items-center gap-3">
      <span className="hidden sm:inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500 font-inter">
        {todayLabel}
      </span>
      <Button variant="primary" size="sm" icon={RefreshCw} loading={refreshing} onClick={() => loadDashboard(true)}>
        Refresh
      </Button>
    </div>
  );

  return (
    <AuthLayout title="Admin Dashboard">
      <div className="space-y-6">
        <PageHeader
          title="Super Admin Dashboard"
          subtitle="Monitor platform activity, organizations and verification performance."
          action={headerAction}
        />

        {error && (
          <Card className="p-5 border-red-100 bg-red-50">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-red-500 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-red-700 font-inter">Couldn't load dashboard data</p>
                <p className="text-xs text-red-500 font-inter mt-0.5">{error}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => loadDashboard(true)}>Retry</Button>
            </div>
          </Card>
        )}

        {/* KPI row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
            : kpis.map((k, i) => <StatCard key={k.label} {...k} delay={i * 0.04} />)}
        </div>

        {/* Verification Overview + Needs Attention + Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <SectionCard title="Verification Overview" subtitle="Live verification distribution">
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <SkeletonLoader width="180px" height="180px" circle />
                </div>
              ) : stats.totalRecords === 0 ? (
                <InlineEmpty text="No verification data yet. This will populate once batches are created." />
              ) : (
                <div className="flex items-center gap-4">
                  <div className="relative w-[150px] h-[150px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={70} strokeWidth={0} paddingAngle={2}>
                          {donutData.map((d) => <Cell key={d.name} fill={d.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="font-sora font-bold text-2xl text-brand-dark leading-none">{stats.totalRecords}</span>
                      <span className="text-[11px] text-gray-400 font-inter mt-0.5">records</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 space-y-3">
                    {donutData.map((d) => (
                      <div key={d.name} className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 text-sm text-brand-dark font-inter">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                          {d.name}
                        </span>
                        <span className="font-sora font-semibold text-brand-dark">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </SectionCard>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
            <SectionCard title="Needs Attention" subtitle="Items requiring admin action">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <SkeletonLoader key={i} height="52px" />)}
                </div>
              ) : !hasAttentionItems ? (
                <p className="text-sm text-gray-400 font-inter text-center py-8">No items currently require attention.</p>
              ) : (
                <div className="space-y-2.5">
                  {attentionMetrics.filter((m) => m.value > 0).map((m) => (
                    <button
                      key={m.label}
                      onClick={() => navigate('/admin/batch-monitor')}
                      className={`w-full flex items-center justify-between gap-3 rounded-xl px-4 py-3.5 text-left transition-colors ${m.tone}`}
                    >
                      <span className="text-sm font-medium font-inter">{m.label}</span>
                      <span className="font-sora font-bold text-lg">{m.value}</span>
                    </button>
                  ))}
                </div>
              )}
            </SectionCard>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
            <SectionCard title="Recent Activity" subtitle="Latest platform events">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => <SkeletonLoader key={i} height="16px" />)}
                </div>
              ) : recentActivity.length === 0 ? (
                <p className="text-sm text-gray-400 font-inter text-center py-8">No recent activity yet.</p>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map((a) => (
                    <div key={a.id} className="flex items-start gap-3">
                      <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${a.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-brand-dark font-inter truncate">{a.label}</p>
                        <p className="text-xs text-gray-400 font-inter truncate">{a.orgName}</p>
                      </div>
                      <span className="text-xs text-gray-400 font-inter whitespace-nowrap">{timeAgo(a.time)}</span>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </motion.div>
        </div>

        {/* Recent Batches + Top Organizations */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
            <SectionCard
              title="Recent Batches"
              subtitle="Latest batch activity"
              action={<Button variant="ghost" size="sm" onClick={() => navigate('/admin/batch-monitor')}>View All</Button>}
              bodyClassName="p-0"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      <th className="px-4 py-3 font-inter font-medium text-gray-400 text-xs uppercase tracking-wide whitespace-nowrap">Batch Name</th>
                      <th className="px-4 py-3 font-inter font-medium text-gray-400 text-xs uppercase tracking-wide whitespace-nowrap">Organization</th>
                      <th className="px-4 py-3 font-inter font-medium text-gray-400 text-xs uppercase tracking-wide whitespace-nowrap">Type</th>
                      <th className="px-4 py-3 font-inter font-medium text-gray-400 text-xs uppercase tracking-wide whitespace-nowrap">Records</th>
                      <th className="px-4 py-3 font-inter font-medium text-gray-400 text-xs uppercase tracking-wide whitespace-nowrap">Status</th>
                      <th className="px-4 py-3 font-inter font-medium text-gray-400 text-xs uppercase tracking-wide whitespace-nowrap">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <TableSkeletonRows cols={6} rows={5} />
                    ) : recentBatches.length === 0 ? (
                      <tr>
                        <td colSpan={6}>
                          <InlineEmpty text="No verification batches found. Verification activity will appear here once batches are created." />
                        </td>
                      </tr>
                    ) : (
                      recentBatches.map((b) => {
                        const meta = getBatchStatusMeta(b.status);
                        return (
                          <tr key={b.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                            <td className="px-4 py-3.5 font-inter text-brand-dark font-medium whitespace-nowrap max-w-[220px] truncate">{b.name}</td>
                            <td className="px-4 py-3.5 font-inter text-gray-600 whitespace-nowrap max-w-[160px] truncate">{b.orgName}</td>
                            <td className="px-4 py-3.5 font-inter text-gray-500 whitespace-nowrap">{b.type || '—'}</td>
                            <td className="px-4 py-3.5 font-inter text-gray-600 whitespace-nowrap">{b.total}</td>
                            <td className="px-4 py-3.5 whitespace-nowrap"><Badge status={meta.badge}>{meta.label}</Badge></td>
                            <td className="px-4 py-3.5 font-inter text-gray-500 whitespace-nowrap">{formatDate(b.createdAt)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}>
            <SectionCard title="Top Organizations" subtitle="Most active by batches">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => <SkeletonLoader key={i} height="38px" />)}
                </div>
              ) : topOrganizations.length === 0 ? (
                <InlineEmpty icon={Building2} text="No organization activity found yet." />
              ) : (
                <div className="space-y-4">
                  {topOrganizations.map((o) => (
                    <div key={o.key}>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-sm font-medium text-brand-dark font-inter truncate">{o.orgName}</span>
                        <span className="text-xs text-gray-400 font-inter whitespace-nowrap">{o.totalBatches} {o.totalBatches === 1 ? 'batch' : 'batches'}</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-2 bg-brand-blue rounded-full"
                          style={{ width: `${Math.max(6, Math.round((o.totalBatches / maxOrgBatches) * 100))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <SectionCard title="Quick Actions">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => navigate('/admin/promote-super-admin')}
                className="flex items-center gap-3 rounded-xl border border-gray-100 hover:border-brand-blue/30 hover:bg-brand-blue/5 px-4 py-3.5 text-left transition-colors"
              >
                <ShieldCheck size={16} className="text-brand-blue shrink-0" />
                <span className="text-sm font-medium text-brand-dark font-inter">Promote Existing User</span>
              </button>
              <button
                onClick={() => navigate('/admin/create-super-admin')}
                className="flex items-center gap-3 rounded-xl border border-gray-100 hover:border-brand-blue/30 hover:bg-brand-blue/5 px-4 py-3.5 text-left transition-colors"
              >
                <UserPlus size={16} className="text-brand-blue shrink-0" />
                <span className="text-sm font-medium text-brand-dark font-inter">Create New Super Admin</span>
              </button>
            </div>
          </SectionCard>
        </motion.div>
      </div>
    </AuthLayout>
  );
};

export default AdminDashboard;
