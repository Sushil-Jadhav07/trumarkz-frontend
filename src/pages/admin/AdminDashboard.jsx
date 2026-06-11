import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { verificationAPI, getApiError } from '@/services/api';
import { mockDisputes } from '@/data/mockData';
import {
  AlertTriangle, ArrowRight, CheckCircle, CheckSquare,
  Clock, Layers, RefreshCw, ShieldCheck, UserPlus, Users, XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

const groupByBatch = (users = []) => {
  const batches = users.reduce((acc, item) => {
    const id = item.batch_id || 'single';
    if (!acc[id]) {
      acc[id] = {
        id,
        orgName: item.organization_name || item.org_name || 'Organization',
        total: 0, verified: 0, pending: 0, failed: 0,
        createdAt: item.created_at,
      };
    }
    acc[id].total += 1;
    if (item.verification_status === 'verified') acc[id].verified += 1;
    else if (item.verification_status === 'failed') acc[id].failed += 1;
    else acc[id].pending += 1;
    return acc;
  }, {});
  return Object.values(batches);
};

const Stat = ({ label, value, icon: Icon, tone, delay, onClick }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    onClick={onClick}
    className={`relative overflow-hidden rounded-[22px] border p-5 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-24px_rgba(37,99,235,0.35)] ${tone.card}`}
  >
    <div className="absolute inset-x-0 top-0 h-[3px] bg-brand-blue/70 rounded-t-[22px]" />
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className={`text-[10px] font-semibold uppercase tracking-[0.16em] font-inter ${tone.label}`}>{label}</p>
        <p className={`mt-3 font-sora font-bold text-[42px] leading-none ${tone.value}`}>{value}</p>
      </div>
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm ${tone.icon}`}>
        <Icon size={19} />
      </div>
    </div>
  </motion.div>
);

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const [verData, setVerData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    verificationAPI.getAllVerifications({ limit: 500, offset: 0 })
      .then(({ data }) => { if (mounted) setVerData(data); })
      .catch((err) => { if (mounted) toast.error(getApiError(err, 'Failed to load dashboard data')); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const users = verData?.users || [];
  const totalRecords = verData?.total ?? users.length;
  const totalPending = verData?.pending ?? users.filter((u) => u.verification_status === 'pending_verification').length;
  const totalVerified = verData?.verified ?? users.filter((u) => u.verification_status === 'verified').length;
  const totalFailed = verData?.failed ?? users.filter((u) => u.verification_status === 'failed').length;

  const batches = groupByBatch(users);
  const activeBatches = batches.filter((b) => b.pending > 0).length;
  const recentBatches = batches
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 4);

  const statCards = [
    {
      label: 'Total Records', value: loading ? '...' : totalRecords, icon: Users,
      path: '/admin/batch-monitor', delay: 0,
      tone: { card: 'bg-blue-50 border-blue-200', label: 'text-blue-600', value: 'text-blue-950', icon: 'bg-white text-brand-blue' },
    },
    {
      label: 'Active Batches', value: loading ? '...' : activeBatches, icon: Layers,
      path: '/admin/batch-monitor', delay: 0.06,
      tone: { card: 'bg-blue-50 border-blue-200', label: 'text-blue-600', value: 'text-blue-950', icon: 'bg-white text-brand-blue' },
    },
    {
      label: 'Pending Verifications', value: loading ? '...' : totalPending, icon: CheckSquare,
      path: '/admin/batch-monitor', delay: 0.12,
      tone: { card: 'bg-blue-50 border-blue-200', label: 'text-blue-600', value: 'text-blue-950', icon: 'bg-white text-brand-blue' },
    },
    {
      label: 'Open Disputes', value: mockDisputes.length, icon: AlertTriangle,
      path: '/admin/disputes', delay: 0.18,
      tone: { card: 'bg-blue-50 border-blue-200', label: 'text-blue-600', value: 'text-blue-950', icon: 'bg-white text-brand-blue' },
    },
  ];

  const adminActions = [
    { title: 'Promote Existing User', description: 'Grant super-admin access to an existing verified account.', path: '/admin/promote-super-admin', icon: ShieldCheck },
    { title: 'Create New Super Admin', description: 'Create a brand-new privileged account with full platform control.', path: '/admin/create-super-admin', icon: UserPlus },
  ];

  return (
    <AuthLayout title="Admin Dashboard">
      <div className="space-y-6">
        <div
          className="relative overflow-hidden rounded-[28px] border border-blue-400/30 px-6 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          style={{ background: 'linear-gradient(135deg, #2563eb 0%, #2f6af0 52%, #3b82f6 100%)', boxShadow: '0 24px 50px -30px rgba(37,99,235,0.65)' }}
        >
<div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-10 left-10 h-32 w-32 rounded-full bg-blue-200/20 blur-3xl" />
          <div className="relative z-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-100/80 font-inter">TruMarkZ</p>
            <h1 className="mt-2 font-sora text-[38px] font-bold leading-none text-white">Super Admin Dashboard</h1>
            <p className="mt-2 text-sm text-white font-inter">Full platform overview and control</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="relative z-10 flex items-center gap-2 rounded-2xl border border-white/15 bg-white/12 hover:bg-white/18 transition-colors px-4 py-2.5 text-sm font-semibold text-white font-inter self-start sm:self-auto backdrop-blur-sm"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {statCards.map((s) => (
            <Stat key={s.label} {...s} onClick={() => navigate(s.path)} />
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
          <Card className="relative p-0 overflow-hidden border border-blue-100 bg-white shadow-[0_20px_44px_-34px_rgba(37,99,235,0.25)]">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-brand-blue/60" />
            <div className="flex items-center justify-between px-6 py-4 border-b border-blue-100 bg-blue-50">
              <div>
                <h3 className="font-sora font-semibold text-blue-950">Verification Summary</h3>
                <p className="text-xs text-blue-500 font-inter mt-0.5">Live counts from the platform</p>
              </div>
              <Button variant="ghost" size="sm" icon={ArrowRight} onClick={() => navigate('/admin/batch-monitor')}>
                View All
              </Button>
            </div>
            <div className="p-5 space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8 gap-2 text-blue-400">
                  <RefreshCw size={18} className="animate-spin" />
                  <span className="text-sm font-inter">Loading...</span>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Verified', value: totalVerified, icon: CheckCircle, tone: 'bg-blue-100 border-blue-200', text: 'text-blue-950', sub: 'text-blue-500' },
                      { label: 'Pending', value: totalPending, icon: Clock, tone: 'bg-blue-100 border-blue-200', text: 'text-blue-950', sub: 'text-blue-500' },
                      { label: 'Failed', value: totalFailed, icon: XCircle, tone: 'bg-blue-100 border-blue-200', text: 'text-blue-950', sub: 'text-blue-500' },
                    ].map((s) => (
                      <div key={s.label} className={`relative overflow-hidden rounded-[18px] border p-4 text-center shadow-[0_12px_28px_-24px_rgba(37,99,235,0.3)] ${s.tone}`}>
                        <div className="absolute inset-x-0 top-0 h-[3px] bg-brand-blue/60" />
                        <s.icon size={18} className={`mx-auto mb-1.5 ${s.text} opacity-80`} />
                        <p className={`font-sora font-bold text-2xl ${s.text}`}>{s.value}</p>
                        <p className={`text-xs font-inter mt-0.5 ${s.sub}`}>{s.label}</p>
                      </div>
                    ))}
                  </div>
                  {totalRecords > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-inter text-blue-500">
                        <span>Overall completion</span>
                        <span className="text-brand-blue font-semibold">
                          {Math.round(((totalVerified + totalFailed) / totalRecords) * 100)}%
                        </span>
                      </div>
                      <ProgressBar progress={Math.round(((totalVerified + totalFailed) / totalRecords) * 100)} color="blue" />
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>
        </motion.div>

        <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
            <Card className="p-0 overflow-hidden border border-blue-100 h-full bg-white shadow-[0_20px_44px_-34px_rgba(37,99,235,0.25)]">
              <div className="flex items-center justify-between px-6 py-4 border-b border-blue-100 bg-blue-50">
                <div>
                  <h3 className="font-sora font-semibold text-blue-950">Recent Batches</h3>
                  <p className="text-xs text-blue-500 font-inter mt-0.5">Latest activity across all organisations</p>
                </div>
                <Button variant="ghost" size="sm" icon={ArrowRight} onClick={() => navigate('/admin/batch-monitor')}>
                  View All
                </Button>
              </div>
              <div className="p-5 space-y-3">
                {loading ? (
                  <div className="flex items-center justify-center py-10 gap-2 text-blue-400">
                    <RefreshCw size={18} className="animate-spin" />
                    <span className="text-sm font-inter">Loading batches...</span>
                  </div>
                ) : recentBatches.length === 0 ? (
                  <p className="text-sm text-blue-400 font-inter text-center py-10">No batch data found</p>
                ) : (
                  recentBatches.map((batch, i) => {
                    const progress = batch.total > 0
                      ? Math.round(((batch.verified + batch.failed) / batch.total) * 100)
                      : 0;
                    const statusTone = batch.pending > 0
                      ? 'bg-brand-blue/[0.06] border-brand-blue/15'
                      : batch.failed > 0
                        ? 'bg-blue-100 border-blue-200'
                        : 'bg-blue-50 border-blue-200';

                    return (
                      <motion.div
                        key={batch.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className={`rounded-[18px] border p-4 shadow-[0_12px_26px_-24px_rgba(37,99,235,0.28)] ${statusTone}`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-blue-950 font-inter truncate">{batch.orgName}</p>
                            <p className="text-xs text-blue-500 font-inter mt-0.5 font-mono">
                              Batch {batch.id.slice(0, 8)} · {batch.total} records
                            </p>
                          </div>
                          <Badge status={batch.pending > 0 ? 'info' : batch.failed > 0 ? 'default' : 'success'}>
                            {batch.pending > 0 ? 'In Progress' : batch.failed > 0 ? 'Has Failures' : 'Complete'}
                          </Badge>
                        </div>
                        <ProgressBar progress={progress} color="blue" />
                        <div className="flex gap-4 mt-2.5">
                          {[
                            { label: 'Verified', val: batch.verified, cls: 'text-blue-950 font-semibold' },
                            { label: 'Pending', val: batch.pending, cls: 'text-brand-blue font-semibold' },
                            { label: 'Failed', val: batch.failed, cls: 'text-blue-500' },
                          ].map((s) => (
                            <span key={s.label} className="text-[11px] font-inter">
                              <span className={s.cls}>{s.val}</span>
                              <span className="text-blue-400 ml-1">{s.label}</span>
                            </span>
                          ))}
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </Card>
          </motion.div>

          <div className="space-y-4">
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="p-0 overflow-hidden border border-blue-100 bg-white shadow-[0_20px_44px_-34px_rgba(37,99,235,0.25)]">
                <div className="px-6 py-4 border-b border-blue-100 bg-blue-50">
                  <h3 className="font-sora font-semibold text-blue-950">Quick Actions</h3>
                  <p className="text-xs text-blue-500 font-inter mt-0.5">Admin management shortcuts</p>
                </div>
                <div className="p-4 space-y-3">
                  {adminActions.map((action, i) => (
                    <motion.button
                      key={action.title}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.32 + i * 0.07 }}
                      onClick={() => navigate(action.path)}
                      className="w-full flex items-center gap-4 rounded-[18px] border border-blue-200 bg-blue-50 hover:bg-brand-blue hover:border-brand-blue p-4 text-left transition-all group"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white group-hover:bg-white/20 shrink-0">
                        <action.icon size={18} className="text-brand-blue group-hover:text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-blue-950 group-hover:text-white font-inter">{action.title}</p>
                        <p className="text-xs text-blue-500 group-hover:text-blue-100 font-inter mt-0.5 leading-4">{action.description}</p>
                      </div>
                      <ArrowRight size={15} className="text-blue-400 group-hover:text-white shrink-0" />
                    </motion.button>
                  ))}
                </div>
              </Card>
            </motion.div>

            {mockDisputes.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}>
                <Card className="p-0 overflow-hidden border border-blue-100 bg-white shadow-[0_20px_44px_-34px_rgba(37,99,235,0.25)]">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-blue-100 bg-blue-50">
                    <div>
                      <h3 className="font-sora font-semibold text-blue-950">Open Disputes</h3>
                      <p className="text-xs text-blue-500 font-inter mt-0.5">{mockDisputes.length} awaiting review</p>
                    </div>
                    <Button variant="ghost" size="sm" icon={ArrowRight} onClick={() => navigate('/admin/disputes')}>
                      View All
                    </Button>
                  </div>
                  <div className="p-4 space-y-2">
                    {mockDisputes.slice(0, 3).map((d, i) => (
                      <motion.div
                        key={d.id}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + i * 0.06 }}
                        className="flex items-center justify-between rounded-[18px] border border-blue-200 bg-blue-50 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-blue-950 font-inter truncate">
                            {d.orgName || `Dispute #${d.id}`}
                          </p>
                          <p className="text-xs text-blue-500 font-inter mt-0.5">
                            {d.issue || d.checkType || 'Pending review'}
                          </p>
                        </div>
                        <span className="ml-3 shrink-0 rounded-full bg-white border border-blue-200 px-2.5 py-1 text-[11px] font-semibold font-inter text-brand-blue">
                          Open
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </AuthLayout>
  );
};

export default AdminDashboard;
