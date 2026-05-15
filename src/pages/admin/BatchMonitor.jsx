import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { verificationAPI, getApiError } from '@/services/api';
import { CheckCircle, Clock, Eye, Filter, Package, RefreshCw, User, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'pending_verification', label: 'Pending' },
  { value: 'verified', label: 'Verified' },
  { value: 'failed', label: 'Failed' },
];

const statusBadge = (status) => {
  if (status === 'verified') return { variant: 'success', label: 'Verified', icon: CheckCircle };
  if (status === 'failed') return { variant: 'error', label: 'Failed', icon: XCircle };
  return { variant: 'pending', label: 'Pending', icon: Clock };
};

const isProductRecord = (record) =>
  record?.entity_type === 'product' ||
  !!record?.product_name ||
  !!record?.category_name ||
  !!record?.custom_fields;

const recordTitle = (record) =>
  record.product_name || record.full_name || record.email || record.id || 'Verification record';

const groupByBatch = (records) => {
  const batches = records.reduce((acc, record) => {
    const id = record.batch_id || 'single-records';
    if (!acc[id]) {
      acc[id] = {
        id,
        name: id === 'single-records' ? 'Single records' : `Batch ${id.slice(0, 8)}`,
        records: [],
        total: 0,
        pending: 0,
        verified: 0,
        failed: 0,
      };
    }

    acc[id].records.push(record);
    acc[id].total += 1;
    if (record.verification_status === 'verified') acc[id].verified += 1;
    else if (record.verification_status === 'failed') acc[id].failed += 1;
    else acc[id].pending += 1;
    return acc;
  }, {});

  return Object.values(batches).sort((a, b) => b.pending - a.pending || b.total - a.total);
};

export const BatchMonitor = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data: result } = await verificationAPI.getAllVerifications({
        status: statusFilter || undefined,
        limit: 200,
        offset: 0,
      });
      setData(result);
    } catch (err) {
      toast.error(getApiError(err, 'Failed to load verification batches'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const records = data?.users || [];
  const batches = groupByBatch(records);
  const total = data?.total || 0;
  const pending = data?.pending || 0;
  const verified = data?.verified || 0;
  const failed = data?.failed || 0;

  return (
    <AuthLayout title="Batch Monitor">
      <PageHeader
        title="Verification Batch Monitor"
        subtitle="Review live human and product verification records"
        action={
          <button
            onClick={() => fetchData(true)}
            className={`flex items-center gap-2 text-sm text-gray-500 font-inter hover:text-brand-blue transition-colors ${refreshing ? 'pointer-events-none' : ''}`}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Total', value: total, color: 'bg-brand-blue' },
          { label: 'Pending', value: pending, color: 'bg-orange-400' },
          { label: 'Verified', value: verified, color: 'bg-green-500' },
          { label: 'Failed', value: failed, color: 'bg-red-500' },
        ].map((stat) => (
          <Card key={stat.label} className="p-0 overflow-hidden">
            <div className={`${stat.color} text-white p-4`}>
              <p className="font-sora font-bold text-2xl">{stat.value}</p>
              <p className="text-xs opacity-85 font-inter">{stat.label}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Filter size={14} className="text-gray-400" />
        <div className="flex gap-2 flex-wrap">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setStatusFilter(option.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium font-inter transition-all ${
                statusFilter === option.value ? 'bg-brand-blue text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Card className="p-10 flex flex-col items-center justify-center gap-3">
          <RefreshCw size={24} className="animate-spin text-brand-blue" />
          <p className="text-sm text-gray-400 font-inter">Loading batches...</p>
        </Card>
      ) : batches.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-sm text-gray-400 font-inter">No verification records found</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {batches.map((batch, i) => {
            const complete = batch.total ? Math.round(((batch.verified + batch.failed) / batch.total) * 100) : 0;
            return (
              <motion.div
                key={batch.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <Card className="p-5 h-full">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h3 className="font-sora font-semibold text-brand-dark text-sm">{batch.name}</h3>
                      <p className="text-xs text-gray-500 font-inter">{batch.total} records</p>
                    </div>
                    <Badge status={batch.pending > 0 ? 'warning' : 'success'}>
                      {batch.pending > 0 ? `${batch.pending} Pending` : 'Complete'}
                    </Badge>
                  </div>

                  <ProgressBar progress={complete} />
                  <div className="grid grid-cols-3 gap-2 mt-3 mb-4 text-center">
                    <div className="rounded-lg bg-orange-50 p-2">
                      <p className="text-sm font-bold text-orange-600">{batch.pending}</p>
                      <p className="text-[11px] text-orange-500 font-inter">Pending</p>
                    </div>
                    <div className="rounded-lg bg-green-50 p-2">
                      <p className="text-sm font-bold text-green-600">{batch.verified}</p>
                      <p className="text-[11px] text-green-500 font-inter">Verified</p>
                    </div>
                    <div className="rounded-lg bg-red-50 p-2">
                      <p className="text-sm font-bold text-red-600">{batch.failed}</p>
                      <p className="text-[11px] text-red-500 font-inter">Failed</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {batch.records.slice(0, 5).map((record) => {
                      const product = isProductRecord(record);
                      const Icon = product ? Package : User;
                      const status = statusBadge(record.verification_status);
                      return (
                        <div key={record.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0">
                            <Icon size={15} className="text-brand-blue" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-brand-dark font-inter truncate">{recordTitle(record)}</p>
                            <p className="text-xs text-gray-400 font-inter truncate">{product ? record.category_name || 'Product' : record.email || 'Human'}</p>
                          </div>
                          <Badge status={status.variant}>{status.label}</Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={Eye}
                            onClick={() => navigate(`/org/record/${record.id}`)}
                          >
                            Review
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </AuthLayout>
  );
};

export default BatchMonitor;
