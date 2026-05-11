import React from 'react';
import { motion } from 'framer-motion';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { mockAdminBatches } from '@/data/mockData';
import { Clock, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

const statusText = {
  on_track: 'On Track',
  at_risk: 'SLA at Risk',
  overdue: 'Overdue',
};

const statusType = {
  on_track: 'in-progress',
  at_risk: 'warning',
  overdue: 'error',
};

const BatchActions = ({ batch }) => (
  <div className="flex flex-col sm:flex-row gap-2">
    <Button
      variant="primary"
      size="sm"
      onClick={() => toast.success(`Project activated — ${batch.orgName} has been notified`)}
    >
      Activate Project
    </Button>
    {(batch.status === 'at_risk' || batch.status === 'overdue') && (
      <Button
        variant="outline"
        size="sm"
        icon={Mail}
        onClick={() => toast.success(`Reminder email sent to assigned agency`)}
      >
        Send Reminder to Agency
      </Button>
    )}
  </div>
);

const BatchProgress = ({ batch }) => {
  const verifyProgress = Math.round((batch.completed / batch.totalRecords) * 100);
  const slaProgress = Math.round((batch.daysUsed / batch.slaDays) * 100);

  return (
    <>
      <div>
        <p className="text-xs text-gray-500 font-inter mb-1">Verification</p>
        <ProgressBar progress={verifyProgress} />
        <p className="text-xs text-gray-500 font-inter mt-1">{batch.completed}/{batch.totalRecords} ({verifyProgress}%)</p>
      </div>
      <div>
        <p className="text-xs text-gray-500 font-inter mb-1 flex items-center gap-1"><Clock size={11} />SLA Usage</p>
        <ProgressBar progress={slaProgress} />
        <p className="text-xs text-gray-500 font-inter mt-1">Day {batch.daysUsed} / {batch.slaDays}</p>
      </div>
    </>
  );
};

export const BatchMonitor = () => {
  const total = mockAdminBatches.length;
  const onTrack = mockAdminBatches.filter((b) => b.status === 'on_track').length;
  const risk = mockAdminBatches.filter((b) => b.status === 'at_risk').length;
  const overdue = mockAdminBatches.filter((b) => b.status === 'overdue').length;

  const groups = {
    on_track: mockAdminBatches.filter((b) => b.status === 'on_track'),
    at_risk: mockAdminBatches.filter((b) => b.status === 'at_risk'),
    overdue: mockAdminBatches.filter((b) => b.status === 'overdue'),
  };

  return (
    <AuthLayout title="Batch Monitor">
      <PageHeader title="Batch SLA Monitor" subtitle="Live status of all active verification batches" />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
        <Card className="p-4"><p className="text-xs text-gray-500 font-inter">Active</p><p className="font-sora font-bold text-2xl text-brand-dark">{total}</p></Card>
        <Card className="p-4"><p className="text-xs text-gray-500 font-inter">On Track</p><p className="font-sora font-bold text-2xl text-brand-dark">{onTrack}</p></Card>
        <Card className="p-4"><p className="text-xs text-gray-500 font-inter">At Risk</p><p className="font-sora font-bold text-2xl text-brand-dark">{risk}</p></Card>
        <Card className="p-4"><p className="text-xs text-gray-500 font-inter">Overdue</p><p className="font-sora font-bold text-2xl text-brand-dark">{overdue}</p></Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {Object.entries(groups).map(([status, list], i) => (
          <motion.div key={status} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Card className="p-4 h-full">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-sora font-semibold text-brand-dark text-sm">{statusText[status]}</h3>
                <Badge status={statusType[status]}>{list.length}</Badge>
              </div>

              <div className="space-y-3">
                {list.map((batch) => (
                  <div key={batch.id} className="p-3 rounded-xl bg-gray-50">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-inter font-semibold text-sm text-brand-dark">{batch.orgName}</p>
                      <Badge status={statusType[batch.status]}>{statusText[batch.status]}</Badge>
                    </div>
                    <p className="text-xs text-gray-500 font-inter mb-2">{batch.industry} · {batch.totalRecords} records</p>
                    <BatchProgress batch={batch} />
                    <div className="mt-3"><BatchActions batch={batch} /></div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </AuthLayout>
  );
};

export default BatchMonitor;

