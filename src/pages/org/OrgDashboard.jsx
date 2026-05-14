import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { verificationAPI, getApiError } from '@/services/api';
import {
  Layers, Award, BarChart2, Store, ArrowRight,
  Clock, CheckCircle, TrendingUp, Users, Shield, Globe, Lock, Zap
} from 'lucide-react';
import toast from 'react-hot-toast';

const activityStyles = {
  blue: 'bg-blue-50 text-blue-500',
  green: 'bg-green-50 text-green-500',
  orange: 'bg-orange-50 text-orange-500',
  red: 'bg-red-50 text-red-500',
};

const statusMeta = {
  verified: { action: 'Verification completed', color: 'green', icon: CheckCircle },
  failed: { action: 'Verification failed', color: 'red', icon: Clock },
  pending_verification: { action: 'Verification pending', color: 'orange', icon: Clock },
};

const formatDateTime = (value) => {
  if (!value) return 'Recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const buildBatchSummary = (users = []) => {
  const batches = users.reduce((acc, item) => {
    const batchId = item.batch_id || 'unbatched';

    if (!acc[batchId]) {
      acc[batchId] = {
        id: batchId,
        name: batchId === 'unbatched' ? 'Unbatched records' : `Batch ${batchId.slice(0, 8)}`,
        industry: 'Verification batch',
        total: 0,
        completed: 0,
        pending: 0,
        latestAt: item.updated_at || item.created_at,
      };
    }

    acc[batchId].total += 1;
    if (item.verification_status === 'pending_verification') acc[batchId].pending += 1;
    else acc[batchId].completed += 1;

    const currentLatest = new Date(acc[batchId].latestAt || 0).getTime();
    const itemLatest = new Date(item.updated_at || item.created_at || 0).getTime();
    if (itemLatest > currentLatest) acc[batchId].latestAt = item.updated_at || item.created_at;

    return acc;
  }, {});

  return Object.values(batches)
    .sort((a, b) => new Date(b.latestAt || 0) - new Date(a.latestAt || 0))
    .slice(0, 3);
};

export const OrgDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [verificationData, setVerificationData] = useState(null);

  useEffect(() => {
    let isMounted = true;

    verificationAPI.getAllVerifications({ limit: 100, offset: 0 })
      .then(({ data }) => {
        if (isMounted) setVerificationData(data);
      })
      .catch((err) => {
        if (isMounted) toast.error(getApiError(err, 'Failed to load dashboard data'));
      });

    return () => { isMounted = false; };
  }, []);

  const usersList = verificationData?.users || [];
  const activeBatches = buildBatchSummary(usersList);
  const recentActivity = usersList
    .slice()
    .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))
    .slice(0, 4)
    .map((item) => {
      const meta = statusMeta[item.verification_status] || statusMeta.pending_verification;
      return {
        action: meta.action,
        detail: item.full_name || item.email || 'Verification record',
        time: formatDateTime(item.updated_at || item.created_at),
        icon: meta.icon,
        color: meta.color,
      };
    });

  const stats = [
    {
      label: 'Total Users',
      value: verificationData ? verificationData.total : '-',
      icon: Layers, color: 'blue', bg: 'bg-blue-50', text: 'text-blue-600'
    },
    {
      label: 'Pending Verifications',
      value: verificationData ? verificationData.pending : '-',
      icon: Clock, color: 'orange', bg: 'bg-orange-50', text: 'text-orange-600'
    },
    {
      label: 'Verified',
      value: verificationData ? verificationData.verified : '-',
      icon: CheckCircle, color: 'green', bg: 'bg-green-50', text: 'text-green-600'
    },
  ];

  const quickActions = [
    { label: 'New Verification', icon: Shield, path: '/org/industry', color: 'bg-brand-blue text-white' },
    { label: 'Create Credential', icon: Award, path: '/credential/template', color: 'bg-brand-dark text-white' },
    { label: 'View Reports', icon: BarChart2, path: '/qr/reports', color: 'bg-green-500 text-white' },
    { label: 'Blockchain Registry', icon: Store, path: '/marketplace', color: 'bg-purple-500 text-white' }
  ];

  const howItWorks = [
    { step: 1, title: 'Organizations', desc: 'Upload members -> API checks -> Choose batch', icon: Users },
    { step: 2, title: 'Verification Engine', desc: 'AI + API checks -> Agencies -> Evidence', icon: Shield },
    { step: 3, title: 'Blockchain Registry', desc: 'Hash and timestamp -> Immutable record -> Global', icon: Lock },
    { step: 4, title: 'Digital Credentials', desc: 'Auto-generate -> QR code -> Share instantly', icon: Award },
    { step: 5, title: 'Global Marketplace', desc: 'Search verified records -> Download proofs', icon: Globe }
  ];

  const handleAction = (path) => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate(path);
    }, 300);
  };

  return (
    <AuthLayout title="Organization Dashboard">
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                    <stat.icon size={20} className={stat.text} />
                  </div>
                  <Badge status={stat.color === 'green' ? 'verified' : stat.color === 'orange' ? 'pending' : 'info'}>
                    {stat.color === 'green' ? 'Live' : stat.color === 'orange' ? 'Active' : 'Running'}
                  </Badge>
                </div>
                <p className="font-sora font-bold text-2xl text-brand-dark">{stat.value}</p>
                <p className="text-sm text-gray-500 font-inter">{stat.label}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        <div>
          <h3 className="font-sora font-semibold text-lg text-brand-dark mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, i) => (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleAction(action.path)}
                disabled={loading}
                className={`${action.color} rounded-xl p-5 text-left transition-shadow hover:shadow-lg disabled:opacity-70`}
              >
                <action.icon size={24} className="mb-3" />
                <p className="font-inter font-semibold text-sm">{action.label}</p>
                <ArrowRight size={16} className="mt-2 opacity-70" />
              </motion.button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-5">
            <h3 className="font-sora font-semibold text-lg text-brand-dark mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {recentActivity.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-gray-400 font-inter">No verification activity yet</p>
                </div>
              ) : recentActivity.map((activity, i) => {
                const style = activityStyles[activity.color] || activityStyles.blue;
                return (
                  <div key={`${activity.detail}-${i}`} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className={`p-2 rounded-lg shrink-0 ${style}`}>
                      <activity.icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-brand-dark font-inter">{activity.action}</p>
                      <p className="text-xs text-gray-500 font-inter truncate">{activity.detail}</p>
                    </div>
                    <span className="text-xs text-gray-400 font-inter shrink-0">{activity.time}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-sora font-semibold text-lg text-brand-dark mb-4">Active Batches</h3>
            {activeBatches.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-gray-400 font-inter mb-3">No batches found</p>
                <Button variant="outline" size="sm" onClick={() => navigate('/org/create-batch')}>
                  Create Batch
                </Button>
              </div>
            ) : (
              <div className="space-y-5">
                {activeBatches.map((batch) => (
                  <div key={batch.id} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-brand-dark font-inter text-sm">{batch.name}</p>
                        <p className="text-xs text-gray-500 font-inter">{batch.industry}</p>
                      </div>
                      <Badge status={batch.pending > 0 ? 'in-progress' : 'verified'}>
                        {batch.pending > 0 ? 'In Progress' : 'Complete'}
                      </Badge>
                    </div>
                    <ProgressBar progress={batch.total ? Math.round((batch.completed / batch.total) * 100) : 0} />
                    <div className="flex items-center justify-between text-xs font-inter text-gray-500">
                      <span>Total: {batch.total}</span>
                      <span>Completed: {batch.completed}</span>
                      <span>Pending: {batch.pending}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate('/org/batch-status')}>
                        View Details
                      </Button>
                      <Button variant="secondary" size="sm" className="flex-1" onClick={() => navigate('/qr/reports')}>
                        View Report
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="font-sora font-semibold text-xl text-brand-dark mb-6 text-center">How TruMarkZ Works</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {howItWorks.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="text-center p-4 rounded-xl bg-brand-bg hover:bg-blue-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-brand-blue text-white flex items-center justify-center mx-auto mb-3 font-sora font-bold text-sm">
                  {step.step}
                </div>
                <step.icon size={20} className="mx-auto mb-2 text-brand-blue" />
                <p className="font-sora font-semibold text-sm text-brand-dark mb-1">{step.title}</p>
                <p className="text-xs text-gray-500 font-inter leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: '$25B', desc: 'Global BGV Market (2024)', icon: TrendingUp },
            { label: '22%', desc: 'CAGR 2024-2030', icon: Zap },
            { label: '$3.5T', desc: 'Identity Economy by 2030', icon: Globe },
            { label: '10X', desc: 'Faster Verifications', icon: CheckCircle }
          ].map((stat, i) => (
            <Card key={i} className="p-4 text-center">
              <stat.icon size={20} className="mx-auto mb-2 text-brand-blue" />
              <p className="font-sora font-bold text-xl text-brand-dark">{stat.label}</p>
              <p className="text-xs text-gray-500 font-inter">{stat.desc}</p>
            </Card>
          ))}
        </div>
      </div>
    </AuthLayout>
  );
};

export default OrgDashboard;
