import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { mockVerifications, mockBatches } from '@/data/mockData';
import { ArrowLeft, User, FileText } from 'lucide-react';

export const RecordDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const batch = mockBatches[0];

  return (
    <AuthLayout title="Record Detail">
      <div className="w-full mx-auto lg:max-w-none">
        <button
          onClick={() => navigate('/org/batch-status')}
          className="flex items-center gap-2 text-sm text-brand-blue font-inter mb-4 hover:underline"
        >
          <ArrowLeft size={16} /> Back to Batch
        </button>

        <PageHeader
          title="Ravi Kumar"
          subtitle={`ID: ${id || 'RK10293'}`}
        />

        <Card className="p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-brand-blue/10 flex items-center justify-center">
              <User size={32} className="text-brand-blue" />
            </div>
            <div>
              <h2 className="font-sora font-bold text-lg text-brand-dark">Ravi Kumar</h2>
              <p className="text-sm text-gray-500 font-inter">ID: {id || 'RK10293'}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Total', value: batch.total },
              { label: 'Completed', value: batch.completed },
              { label: 'Pending', value: batch.pending }
            ].map(stat => (
              <div key={stat.label} className="p-3 bg-gray-50 rounded-xl text-center">
                <p className="font-sora font-bold text-lg text-brand-dark">{stat.value}</p>
                <p className="text-xs text-gray-500 font-inter">{stat.label}</p>
              </div>
            ))}
          </div>

          <h3 className="font-sora font-semibold text-brand-dark mb-3">Verifications</h3>
          <div className="space-y-2">
            {mockVerifications.map((v, i) => (
              <motion.div
                key={v.type}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center justify-between p-3 rounded-xl bg-gray-50"
              >
                <span className="text-sm font-medium text-brand-dark font-inter">{v.type}</span>
                <Badge status={v.status === 'verified' ? 'verified' : 'pending'}>
                  {v.status === 'verified' ? 'Verified' : 'In Progress'}
                </Badge>
              </motion.div>
            ))}
          </div>
        </Card>

        <Button variant="primary" className="w-full" onClick={() => navigate('/qr/reports')} icon={FileText}>
          View Report
        </Button>
      </div>
    </AuthLayout>
  );
};

export default RecordDetail;

