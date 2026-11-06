import React, { useState, useEffect } from 'react';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Card } from '@/components/ui/Card';
import { KpiCard, KpiSkeleton } from '@/components/shared/KpiCard';
import { PageIntro, OutlineButton, SolidButton } from '@/components/shared/AdminPageParts';
import { useAuth } from '@/context/AuthContext';
import { authAPI, verificationAPI, getApiError } from '@/services/api';
import {
  Layers, Award, ArrowRight, Wallet, Calendar, RefreshCw, Plus, RotateCw, HelpCircle, FileText, Upload,
  Clock, CheckCircle, CheckCircle2, Users, AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

const activityStyles = {
  blue: 'bg-blue-50 text-blue-500',
  green: 'bg-green-50 text-green-500',
  orange: 'bg-orange-50 text-orange-500',
  red: 'bg-red-50 text-red-500',
};

const statusMeta = {
  verified: { action: 'Verification completed', color: 'green', icon: CheckCircle2 },
  approved: { action: 'Verification completed', color: 'green', icon: CheckCircle2 },
  partially_verified: { action: 'Verification partially completed', color: 'blue', icon: AlertCircle },
  rejected: { action: 'Verification failed', color: 'red', icon: Clock },
  pending: { action: 'Verification pending', color: 'orange', icon: Clock },
};

const normalizeIndustryValue = (value) => {
  if (Array.isArray(value)) return value.find(Boolean) || '';
  if (typeof value === 'string') return value.trim();
  return '';
};

const formatDateTime = (value) => {
  if (!value) return 'Recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatDay = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';
};

// GET /verification/batches returns [{ org_id, organization_name, batches: [...] }]
// — one entry per org, actual batch list nested under `.batches` (same shape
// BatchStatus.jsx's extractBatchList/normaliseBatch already handle).
const extractBatchList = (data) => {
  const groups = Array.isArray(data) ? data : [data];
  return groups.flatMap((g) => {
    if (Array.isArray(g?.batches)) return g.batches;
    if (Array.isArray(g?.items)) return g.items;
    if (Array.isArray(g)) return g;
    if (g && typeof g === 'object' && (g.batch_id || g.id)) return [g];
    return [];
  });
};

const normaliseBatchSummary = (b) => {
  if (!b || typeof b !== 'object') return null;
  const id = b.batch_id || b.id || '';
  const total = Number(b.total_users ?? b.total ?? 0);
  const verified = Number(b.approved ?? b.approved_count ?? 0);
  const failed = Number(b.rejected ?? b.rejected_count ?? 0);
  const pending = Math.max(0, total - verified - failed);
  const rawName = b.batch_name || b.name || `Batch ${String(id).slice(0, 8)}`;
  return {
    id,
    // The date is shown on its own line, so a trailing "02-11-2026" in the name is dropped.
    name: String(rawName).replace(/\s+\d{2}-\d{2}-\d{4}$/, ''),
    total,
    completed: verified + failed,
    pending,
    createdAt: b.created_at || b.createdAt,
  };
};

const buildBatchSummary = (rawBatches = []) =>
  rawBatches
    .map(normaliseBatchSummary)
    .filter(Boolean)
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 3);

// Supplied illustration asset (public/assets) — already includes its own
// soft blue backdrop and accent shapes, so this just sizes/contains it.
// Used only by the "under review" banner above.
const SetupIllustration = () => (
  <img
    src="/assets/Blue building with clock illustration.png"
    alt=""
    className="h-28 w-28 shrink-0 object-contain"
  />
);

// Tilted sheet with an upload arrow, drawn in code for the "Create your next batch" card.
const BatchArt = () => (
  <div aria-hidden="true" className="relative h-[104px] w-[112px] shrink-0">
    <span className="absolute inset-0 rotate-6 rounded-2xl bg-white/10 ring-1 ring-white/15" />
    <span className="absolute inset-1 -rotate-3 rounded-2xl bg-gradient-to-br from-[#5b8cff] to-[#2d5fe6] shadow-[0_14px_30px_-10px_rgba(0,0,0,0.5)] ring-1 ring-white/30">
      <span className="absolute left-4 right-4 top-5 space-y-1.5">
        <span className="block h-1.5 rounded-full bg-white/60" />
        <span className="block h-1.5 w-4/5 rounded-full bg-white/40" />
        <span className="block h-1.5 w-3/5 rounded-full bg-white/40" />
      </span>
      <Upload size={30} strokeWidth={1.75} className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white" />
    </span>
  </div>
);

const BatchStatusPill = ({ complete }) => (
  <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${
    complete ? 'border-green-200 bg-green-50 text-green-700' : 'border-blue-200 bg-blue-50 text-brand-blue'
  }`}>
    {complete ? <CheckCircle size={13} /> : <RotateCw size={13} />}{complete ? 'Complete' : 'In progress'}
  </span>
);

export const OrgDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [verificationData, setVerificationData] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [batchesLoading, setBatchesLoading] = useState(true);
  const [statsSummary, setStatsSummary] = useState({ total: 0, pending: 0, verified: 0, failed: 0 });
  const [organizationIndustry, setOrganizationIndustry] = useState(() => normalizeIndustryValue(user?.industryType));
  const [batchList, setBatchList] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    verificationAPI.getAllVerifications({ limit: 200, offset: 0 })
      .then(({ data }) => {
        if (!isMounted) return;
        setVerificationData(data);
        setStatsSummary({
          total: data?.total ?? 0,
          pending: data?.pending ?? 0,
          verified: data?.approved ?? 0,
          failed: data?.rejected ?? 0,
        });
      })
      .catch((err) => {
        if (isMounted) toast.error(getApiError(err, 'Failed to load dashboard data'));
      })
      .finally(() => { if (isMounted) setDataLoading(false); });

    return () => { isMounted = false; };
  }, [reloadKey]);

  useEffect(() => {
    let isMounted = true;

    verificationAPI.getBatches()
      .then(({ data }) => {
        if (!isMounted) return;
        setBatchList(extractBatchList(data));
      })
      .catch(() => {
        // The Recent batches card just shows its own empty state below.
      })
      .finally(() => { if (isMounted) setBatchesLoading(false); });

    return () => { isMounted = false; };
  }, [reloadKey]);

  useEffect(() => {
    let mounted = true;

    const loadOrganizationIndustry = async () => {
      const fallback = normalizeIndustryValue(user?.industryType);
      if (mounted) setOrganizationIndustry(fallback);

      if (!user?.organizationId) {
        return;
      }

      try {
        const { data } = await authAPI.getOrganizationIndustryType(user.organizationId);
        const next = normalizeIndustryValue(data);
        if (mounted) setOrganizationIndustry(next || '');
      } catch {
        if (mounted) setOrganizationIndustry(fallback || '');
      }
    };

    loadOrganizationIndustry();
    return () => { mounted = false; };
  }, [user?.industryType, user?.organizationId]);

  // Verification results are never pushed to the browser: re-read the dashboard every 45 s while it is open
  // and visible. The loading states are left alone, so the cards update in place.
  useEffect(() => {
    const timer = setInterval(() => { if (document.visibilityState === 'visible') setReloadKey((key) => key + 1); }, 45000);
    return () => clearInterval(timer);
  }, []);

  const refresh = () => {
    setDataLoading(true);
    setBatchesLoading(true);
    setReloadKey((key) => key + 1);
  };

  const usersList = verificationData?.users || [];
  const recentBatches = buildBatchSummary(batchList);
  const recentActivity = usersList
    .slice()
    .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))
    .slice(0, 4)
    .map((item) => {
      const meta = statusMeta[item.overall_status_label || item.verification_status] || statusMeta.pending;
      return {
        action: meta.action,
        detail: item.full_name || item.email || 'Verification record',
        time: formatDateTime(item.updated_at || item.created_at),
        icon: meta.icon,
        color: meta.color,
      };
    });

  const orgName = user?.organization || user?.name || 'Organization';
  const total = Number(statsSummary.total) || 0;
  const pct = (n) => (total ? Math.min(100, Math.round((Number(n) / total) * 100)) : 0);
  const todayLabel = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  // An org is only usable for SDC/certificate generation once Superadmin has
  // provisioned at least one Dhiway space (space_id) for it — see
  // dhiways_details on the org's own profile (AuthContext normalises it to
  // user.dhiwaysDetails). Freshly onboarded orgs have none yet, so surface
  // that as a plain "under review" status instead of letting them discover
  // it later as a confusing failure deep in batch/certificate generation.
  const hasDhiwaySpace = Array.isArray(user?.dhiwaysDetails) && user.dhiwaysDetails.some((row) => row?.space_id);
  // A space can also come from an active Schema Configuration — that counts as set up too.
  // null = still checking (or the check failed): the banner stays hidden rather than guessing.
  const [hasSchemaSpace, setHasSchemaSpace] = useState(null);
  useEffect(() => {
    if (hasDhiwaySpace || !user?.id) return undefined;
    let active = true;
    authAPI.getSchemaConfigs(user.id, { activeOnly: true })
      .then(({ data }) => {
        if (!active) return;
        const configs = Array.isArray(data?.configs) ? data.configs : [];
        setHasSchemaSpace(configs.some((c) => c.is_active !== false && c.space_id));
      })
      .catch(() => { if (active) setHasSchemaSpace(null); });
    return () => { active = false; };
  }, [hasDhiwaySpace, user?.id]);
  const needsSetup = !hasDhiwaySpace && hasSchemaSpace === false;

  const quickLinks = [
    { label: 'Certificates', icon: Award, path: '/qr/reports' },
    { label: 'Wallet', icon: Wallet, path: '/account/wallet' },
    { label: 'Support', icon: HelpCircle, path: '/account/support' },
  ];

  return (
    <AuthLayout title="Organization Dashboard" breadcrumb={['Workspace', 'Dashboard']}>
      <div className="w-full mx-auto lg:max-w-none">
        {needsSetup && (
          <Card className="mb-4 flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:gap-3 sm:p-4">
            <SetupIllustration />
            <div className="min-w-0 flex-1">
              <h3 className="font-sora text-base font-bold text-brand-dark">
                A little setup. Then you're ready.
              </h3>
              <p className="mt-0.5 font-inter text-xs leading-5 text-gray-500">
                We're preparing your organization's verification space.
                <br className="hidden sm:block" />
                Keep creating batches—we'll let you know when SDC certificate generation is ready.
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-blue-50 px-3 py-1.5 font-inter text-sm font-semibold text-brand-blue sm:self-center">
              <Clock size={15} /> Setup in progress
            </span>
          </Card>
        )}

        <PageIntro
          eyebrow={(
            <span className="flex flex-wrap items-center gap-3">
              Organization workspace
              {organizationIndustry && (
                <span className="rounded-full border border-[#bcd0f5] bg-[#eef4fe] px-3 py-0.5 text-xs font-medium normal-case tracking-normal text-brand-blue">{organizationIndustry}</span>
              )}
            </span>
          )}
          title="Verification dashboard"
          subtitle={`Welcome back, ${orgName}`}
          actions={(
            <>
              <span className="hidden h-9 items-center gap-2 rounded-lg border border-gray-100 bg-white px-3.5 text-sm text-brand-dark font-inter sm:inline-flex">
                <Calendar size={16} strokeWidth={1.75} className="text-gray-500" />{todayLabel}
              </span>
              <OutlineButton icon={RefreshCw} onClick={refresh} disabled={dataLoading || batchesLoading}>Refresh</OutlineButton>
              <SolidButton icon={Plus} onClick={() => navigate('/org/create-batch')}>Create batch</SolidButton>
            </>
          )}
        />

        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {dataLoading ? [0, 1, 2].map((i) => <KpiSkeleton key={i} />) : (
            <>
              <KpiCard label="Total users" value={statsSummary.total} sub="Across your verification batches" icon={Users} />
              <KpiCard label="Pending verifications" value={statsSummary.pending} sub="Awaiting verification" icon={Clock} delay={0.05} />
              <KpiCard label="Verified" value={statsSummary.verified} sub="Completed verification" icon={CheckCircle2} delay={0.1} />
            </>
          )}
        </div>

        <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          <section aria-label="Verification overview" className="rounded-xl border border-gray-100 bg-white p-6">
            <h2 className="flex items-center gap-3 font-sora text-lg font-semibold text-brand-dark">
              Verification overview
              <span className="rounded-full bg-[#e3ebf8] px-3 py-0.5 text-xs font-medium text-brand-blue font-inter">{orgName}</span>
            </h2>
            <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-0">
              {[
                { label: 'Pending verifications', value: statsSummary.pending, icon: Clock, tile: 'bg-orange-50 text-orange-500' },
                { label: 'Verified', value: statsSummary.verified, icon: CheckCircle2, tile: 'bg-green-50 text-green-600' },
              ].map((metric, i) => (
                <div key={metric.label} className={`flex items-start gap-4 ${i === 1 ? 'sm:border-l sm:border-gray-200 sm:pl-8' : 'sm:pr-8'}`}>
                  <span className={`flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl ${metric.tile}`}><metric.icon size={24} strokeWidth={1.75} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[#2f3b52] font-inter">{metric.label}</p>
                    <p className="mt-0.5 font-inter text-[34px] font-bold leading-none tracking-[-0.02em] text-brand-dark">{dataLoading ? '—' : metric.value}</p>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100" role="progressbar" aria-label={`${metric.label} share of total users`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct(metric.value)}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${dataLoading ? 0 : pct(metric.value)}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} className="h-full rounded-full bg-brand-blue" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 grid grid-cols-1 gap-4 border-t border-gray-100 pt-5 sm:grid-cols-2">
              <button type="button" onClick={() => navigate('/org/batch-status')} className="flex h-12 items-center gap-3.5 rounded-lg bg-orange-50 px-5 text-left text-[15px] text-brand-dark font-inter transition-colors hover:bg-orange-100">
                <Clock size={20} strokeWidth={1.75} className="text-orange-500" />Pending verifications
                <span className="font-semibold text-orange-500">{statsSummary.pending}</span><ArrowRight size={16} className="text-orange-500" />
              </button>
              <button type="button" onClick={() => navigate('/org/batch-status')} className="flex h-12 items-center gap-3.5 rounded-lg bg-[#e6eefb] px-5 text-left text-[15px] text-brand-dark font-inter transition-colors hover:bg-[#dbe6f8]">
                <CheckCircle2 size={20} strokeWidth={1.75} className="text-brand-blue" />Verified
                <span className="font-semibold text-brand-blue">{statsSummary.verified}</span><ArrowRight size={16} className="text-brand-blue" />
              </button>
            </div>
          </section>

          <section aria-label="Create a batch" className="relative flex flex-col overflow-hidden rounded-xl bg-gradient-to-br from-[#10244f] to-[#0e3a96] p-6 text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-sora text-lg font-semibold leading-tight">Create your next batch</h2>
                <p className="mt-1 text-[13px] text-white/85 font-inter">Upload records and start verification.</p>
                <button
                  type="button"
                  onClick={() => navigate('/org/create-batch')}
                  className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-white px-5 text-sm font-semibold text-brand-blue transition-colors hover:bg-blue-50 font-inter"
                >
                  Create batch <ArrowRight size={16} />
                </button>
              </div>
              <BatchArt />
            </div>
            <div className="h-5" />
            <div className="mt-auto grid grid-cols-3 divide-x divide-white/20 border-t border-white/20 pt-4">
              {quickLinks.map(({ label, icon: Icon, path }) => (
                <button key={label} type="button" onClick={() => navigate(path)} className="flex items-center justify-center gap-2 py-1 text-[13px] text-white/95 transition-colors hover:text-white font-inter">
                  <Icon size={18} strokeWidth={1.6} />{label}
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          <section aria-label="Recent batches" className="min-w-0 rounded-xl border border-gray-100 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-sora text-base font-semibold text-brand-dark">Recent batches</h2>
              <button type="button" onClick={() => navigate('/org/batch-status')} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-blue hover:underline font-inter">
                View all <ArrowRight size={15} />
              </button>
            </div>
            {batchesLoading ? <LoadingSkeleton variant="list" rows={3} label="Loading recent batches" /> : recentBatches.length === 0 ? (
              <div className="py-10 text-center">
                <p className="mb-3 text-sm text-gray-500 font-inter">No batches found</p>
                <OutlineButton onClick={() => navigate('/org/create-batch')} className="mx-auto">Create batch</OutlineButton>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto scrollbar-hidden">
                  <table className="w-full min-w-[620px] border-collapse text-left text-xs font-inter">
                    <thead>
                      <tr>
                        <th className="rounded-l-lg px-3 py-2.5">Batch</th>
                        <th className="px-3 py-2.5">Records</th>
                        <th className="px-3 py-2.5">Progress</th>
                        <th className="px-3 py-2.5">Status</th>
                        <th className="rounded-r-lg px-3 py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {recentBatches.map((batch) => {
                        const progress = batch.total ? Math.round((batch.completed / batch.total) * 100) : 0;
                        const complete = batch.total > 0 && batch.pending === 0;
                        return (
                          <tr key={batch.id} className="transition-colors hover:bg-blue-50/30">
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-3">
                                <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e8f0fe] text-brand-blue"><Layers size={17} strokeWidth={1.7} /></span>
                                <div className="min-w-0">
                                  <p className="truncate text-[13px] font-medium text-brand-dark">{batch.name}</p>
                                  <p className="text-[11px] text-gray-500">{formatDay(batch.createdAt)}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-[13px] text-brand-dark">{batch.total}</td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-2.5">
                                <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-200" role="progressbar" aria-label={`${batch.name} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
                                  <div className="h-full rounded-full bg-brand-blue" style={{ width: `${progress}%` }} />
                                </div>
                                <span className="text-[12px] tabular-nums text-[#2f3b52]">{progress}%</span>
                              </div>
                            </td>
                            <td className="px-3 py-2.5"><BatchStatusPill complete={complete} /></td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center justify-end gap-3">
                                <button type="button" onClick={() => navigate('/org/batch-status')} className="text-[13px] font-medium text-brand-blue hover:underline">Details</button>
                                <button type="button" onClick={() => navigate('/qr/reports')} aria-label={`View report for ${batch.name}`} title="View report" className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 hover:text-brand-dark">
                                  <FileText size={16} strokeWidth={1.6} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 border-t border-gray-100 pt-3 text-xs text-gray-600 font-inter">{recentBatches.length} recent {recentBatches.length === 1 ? 'batch' : 'batches'}</p>
              </>
            )}
          </section>

          <section aria-label="Recent activity" className="min-w-0 rounded-xl border border-gray-100 bg-white p-5">
            <h2 className="mb-4 font-sora text-base font-semibold text-brand-dark">Recent activity</h2>
            {dataLoading ? <LoadingSkeleton variant="list" label="Loading recent activity" /> : recentActivity.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-gray-500 font-inter">No verification activity yet</p>
              </div>
            ) : (
              <ol>
                {recentActivity.map((activity, i) => {
                  const style = activityStyles[activity.color] || activityStyles.blue;
                  return (
                    <li key={`${activity.detail}-${i}`} className="relative flex items-start gap-3 pb-4 last:pb-0">
                      {i < recentActivity.length - 1 && <span aria-hidden="true" className="absolute bottom-0 left-[17px] top-9 w-px bg-gray-200" />}
                      <span className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${style}`}>
                        <activity.icon size={18} strokeWidth={1.75} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-brand-dark font-inter">{activity.action}</p>
                        <p className="truncate text-xs text-gray-500 font-inter">{activity.detail}</p>
                      </div>
                      <span className="shrink-0 pt-0.5 text-xs text-[#2f3b52] font-inter">{activity.time}</span>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>
      </div>
    </AuthLayout>
  );
};

export default OrgDashboard;
