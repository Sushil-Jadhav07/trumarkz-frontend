import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { verificationAPI, getApiError } from '@/services/api';
import { mockDisputes } from '@/data/mockData';
import {
  CheckSquare, Layers, AlertTriangle, ArrowRight,
  Clock, Users, CheckCircle, XCircle, RefreshCw,
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
    .slice(0, 3);

  const statCards = [
    {
      label: 'Total Records',
      value: loading ? '…' : totalRecords,
      icon: Users,
      bg: 'bg-blue-50', text: 'text-brand-blue',
      path: '/admin/batch-monitor',
    },
    {
      label: 'Active Batches',
      value: loading ? '…' : activeBatches,
      icon: Layers,
      bg: 'bg-purple-50', text: 'text-purple-600',
      path: '/admin/batch-monitor',
    },
    {
      label: 'Pending Verifications',
      value: loading ? '…' : totalPending,
      icon: CheckSquare,
      bg: 'bg-orange-50', text: 'text-orange-600',
      path: '/admin/batch-monitor',
    },
    {
      label: 'Open Disputes',
      value: mockDisputes.length,
      icon: AlertTriangle,
      bg: 'bg-red-50', text: 'text-red-500',
      path: '/admin/disputes',
    },
  ];

  return (
    <AuthLayout title="Admin Dashboard">
      <div className="space-y-6">
        <PageHeader title="Super Admin Dashboard" subtitle="Full platform overview and control" />

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
            >
              <Card
                className="p-5 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(stat.path)}
              >
                <div className={`p-2.5 rounded-xl ${stat.bg} w-fit mb-3`}>
                  <stat.icon size={20} className={stat.text} />
                </div>
                <p className="font-sora font-bold text-2xl text-brand-dark">{stat.value}</p>
                <p className="text-xs text-gray-500 font-inter">{stat.label}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Verification summary */}
        {!loading && (
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-sora font-semibold text-brand-dark">Verification Summary</h3>
              <Button variant="ghost" size="sm" icon={ArrowRight} onClick={() => navigate('/admin/batch-monitor')}>
                View All
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: 'Verified', value: totalVerified, color: 'bg-green-500', icon: CheckCircle },
                { label: 'Pending', value: totalPending, color: 'bg-orange-400', icon: Clock },
                { label: 'Failed', value: totalFailed, color: 'bg-red-500', icon: XCircle },
              ].map((s) => (
                <div key={s.label} className={`${s.color} text-white rounded-xl p-4 text-center`}>
                  <p className="font-sora font-bold text-2xl">{s.value}</p>
                  <p className="text-xs opacity-80 font-inter">{s.label}</p>
                </div>
              ))}
            </div>
            {totalRecords > 0 && (
              <ProgressBar
                progress={Math.round(((totalVerified + totalFailed) / totalRecords) * 100)}
                color="blue"
              />
            )}
          </Card>
        )}

        {/* Recent batches from real API */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-sora font-semibold text-brand-dark">Recent Batches</h3>
            <Button variant="ghost" size="sm" icon={ArrowRight} onClick={() => navigate('/admin/batch-monitor')}>
              View All
            </Button>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-gray-400">
              <RefreshCw size={18} className="animate-spin" />
              <span className="text-sm font-inter">Loading batches…</span>
            </div>
          ) : recentBatches.length === 0 ? (
            <p className="text-sm text-gray-400 font-inter text-center py-6">No batch data found</p>
          ) : (
            <div className="space-y-4">
              {recentBatches.map((batch, i) => {
                const progress = batch.total > 0
                  ? Math.round(((batch.verified + batch.failed) / batch.total) * 100)
                  : 0;
                return (
                  <motion.div
                    key={batch.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="p-4 rounded-xl border border-gray-100 bg-gray-50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-brand-dark font-inter">
                          {batch.orgName}
                        </p>
                        <p className="text-xs text-gray-500 font-inter">
                          {batch.total} records · Batch {batch.id.slice(0, 8)}
                        </p>
                      </div>
                      <Badge status={batch.pending > 0 ? 'pending' : batch.failed > 0 ? 'error' : 'success'}>
                        {batch.pending > 0 ? 'In Progress' : batch.failed > 0 ? 'Has Failures' : 'Complete'}
                      </Badge>
                    </div>
                    <ProgressBar progress={progress} />
                    <p className="text-xs text-gray-400 font-inter mt-1.5">
                      {batch.verified} verified · {batch.pending} pending · {batch.failed} failed
                    </p>
                  </motion.div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Disputes — still mock (no disputes API in B-Smart docs) */}
        {mockDisputes.length > 0 && (
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-sora font-semibold text-brand-dark">Open Disputes</h3>
              <Button variant="ghost" size="sm" icon={ArrowRight} onClick={() => navigate('/admin/disputes')}>
                View All
              </Button>
            </div>
            <div className="space-y-3">
              {mockDisputes.slice(0, 3).map((d, i) => (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100"
                >
                  <div>
                    <p className="text-sm font-medium text-brand-dark font-inter">{d.orgName || `Dispute #${d.id}`}</p>
                    <p className="text-xs text-gray-500 font-inter">{d.issue || d.checkType || 'Pending review'}</p>
                  </div>
                  <Badge status="error">Open</Badge>
                </motion.div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </AuthLayout>
  );
};

export default AdminDashboard;
