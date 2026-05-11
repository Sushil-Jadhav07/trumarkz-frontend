import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { mockBatches } from '@/data/mockData';
import { useAuth } from '@/context/AuthContext';
import {
  Layers, Award, BarChart2, Store, ArrowRight,
  Clock, CheckCircle, TrendingUp, Users, Shield, Globe, Zap, Lock
} from 'lucide-react';
import toast from 'react-hot-toast';

export const OrgDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const stats = [
    { label: 'Active Batches', value: 3, icon: Layers, color: 'blue', bg: 'bg-blue-50', text: 'text-blue-600' },
    { label: 'Pending Verifications', value: 80, icon: Clock, color: 'orange', bg: 'bg-orange-50', text: 'text-orange-600' },
    { label: 'Credentials Created', value: 220, icon: Award, color: 'green', bg: 'bg-green-50', text: 'text-green-600' }
  ];

  const quickActions = [
    { label: 'New Verification', icon: Shield, path: '/org/industry', color: 'bg-brand-blue text-white' },
    { label: 'Create Credential', icon: Award, path: '/credential/template', color: 'bg-brand-dark text-white' },
    { label: 'View Reports', icon: BarChart2, path: '/qr/reports', color: 'bg-green-500 text-white' },
    { label: 'Blockchain Registry', icon: Store, path: '/marketplace', color: 'bg-purple-500 text-white' }
  ];

  const recentActivity = [
    { action: 'Batch submitted', detail: 'Driver Verification - Apr 2024', time: '2 min ago', icon: Layers, color: 'blue' },
    { action: 'Credential generated', detail: 'VS-30008 for Ravi Kumar', time: '1 hour ago', icon: Award, color: 'green' },
    { action: 'Report viewed', detail: 'Address Verification Report', time: '3 hours ago', icon: BarChart2, color: 'purple' },
    { action: 'Wallet topped up', detail: 'INR 5,000 added', time: '1 day ago', icon: TrendingUp, color: 'orange' }
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
        {/* Stats Row */}
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

        {/* Quick Actions */}
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
                className={`${action.color} rounded-xl p-5 text-left transition-shadow hover:shadow-lg`}
              >
                <action.icon size={24} className="mb-3" />
                <p className="font-inter font-semibold text-sm">{action.label}</p>
                <ArrowRight size={16} className="mt-2 opacity-70" />
              </motion.button>
            ))}
          </div>
        </div>

        {/* Recent Activity + Batch Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-5">
            <h3 className="font-sora font-semibold text-lg text-brand-dark mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {recentActivity.map((activity, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className={`p-2 rounded-lg bg-${activity.color}-50 shrink-0`}>
                    <activity.icon size={16} className={`text-${activity.color}-500`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-brand-dark font-inter">{activity.action}</p>
                    <p className="text-xs text-gray-500 font-inter truncate">{activity.detail}</p>
                  </div>
                  <span className="text-xs text-gray-400 font-inter shrink-0">{activity.time}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-sora font-semibold text-lg text-brand-dark mb-4">Active Batch</h3>
            {mockBatches.map(batch => (
              <div key={batch.id} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-brand-dark font-inter text-sm">{batch.name}</p>
                    <p className="text-xs text-gray-500 font-inter">{batch.industry}</p>
                  </div>
                  <Badge status="in-progress">In Progress</Badge>
                </div>
                <ProgressBar progress={Math.round((batch.completed / batch.total) * 100)} />
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
          </Card>
        </div>

        {/* How It Works */}
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

        {/* Market Stats */}
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

