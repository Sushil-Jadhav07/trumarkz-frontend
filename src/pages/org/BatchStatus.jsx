import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { mockBatches, mockVerifications } from '@/data/mockData';
import { RefreshCw, ArrowRight, Eye } from 'lucide-react';

export const BatchStatus = () => {
  const navigate = useNavigate();
  const batch = mockBatches[0];
  const progress = Math.round((batch.completed / batch.total) * 100);

  return (
    <AuthLayout title="Batch Status">
      <div className="w-full mx-auto lg:max-w-none">
        <PageHeader
          title={batch.name}
          subtitle={`${batch.industry} • Created ${batch.createdAt}`}
          action={
            <div className="flex items-center gap-2 text-sm text-gray-500 font-inter">
              <RefreshCw size={14} className="animate-spin" />
              Auto-refreshing...
            </div>
          }
        />

        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total', value: batch.total, color: 'bg-brand-blue text-white' },
            { label: 'Completed', value: batch.completed, color: 'bg-green-500 text-white' },
            { label: 'Pending', value: batch.pending, color: 'bg-orange-500 text-white' }
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`${stat.color} rounded-xl p-4 text-center`}
            >
              <p className="font-sora font-bold text-2xl">{stat.value}</p>
              <p className="text-xs opacity-80 font-inter">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        <Card className="p-6 mb-6">
          <h3 className="font-sora font-semibold text-brand-dark mb-4">Overall Progress</h3>
          <ProgressBar progress={progress} color="blue" height="h-4" />
        </Card>

        <Card className="p-6 mb-6">
          <h3 className="font-sora font-semibold text-brand-dark mb-4">Verification Breakdown</h3>
          <div className="space-y-3">
            {mockVerifications.map((v, i) => (
              <motion.div
                key={v.type}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50"
              >
                <span className="text-sm font-medium text-brand-dark font-inter">{v.type}</span>
                <Badge status={v.status === 'verified' ? 'verified' : 'pending'}>
                  {v.status === 'verified' ? 'Verified' : 'In Progress'}
                </Badge>
              </motion.div>
            ))}
          </div>
        </Card>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => navigate('/org/record/RK10293')} icon={Eye}>
            View Details
          </Button>
          <Button variant="primary" className="flex-1" onClick={() => navigate('/qr/reports')} icon={ArrowRight}>
            View Report
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
};

export default BatchStatus;

