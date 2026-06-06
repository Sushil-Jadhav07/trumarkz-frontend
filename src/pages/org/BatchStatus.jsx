import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Modal } from '@/components/ui/Modal';
import { verificationAPI, getApiError } from '@/services/api';
import {
  RefreshCw,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  Filter,
  ChevronLeft,
  ChevronRight,
  Package,
  Upload,
  User,
  QrCode,
} from 'lucide-react';
import toast from 'react-hot-toast';

const isProductRecord = (record) =>
  record?.entity_type === 'product' || !!record?.product_name || !!record?.category_name || !!record?.custom_fields;

const getRecordTitle = (record) =>
  record?.product_name || record?.full_name || record?.email || record?.id || 'Verification record';

const getRecordSubtitle = (record) => {
  if (isProductRecord(record)) {
    const cf = record.custom_fields && typeof record.custom_fields === 'object'
      ? Object.entries(record.custom_fields).slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(' · ')
      : '';

    return [record.category_name, cf].filter(Boolean).join(' · ') || 'Product verification';
  }

  return [record.email, record.phone_number].filter(Boolean).join(' · ') || 'Human verification';
};

const statusBadge = (status) => {
  if (status === 'verified') return { variant: 'success', label: 'Verified', icon: CheckCircle };
  if (status === 'failed') return { variant: 'error', label: 'Failed', icon: XCircle };
  return { variant: 'pending', label: 'Pending', icon: Clock };
};

const batchStatusMeta = {
  pending_verification: { label: 'Pending', badge: 'info', tone: 'bg-brand-blue/10 text-brand-blue border-brand-blue/15' },
  verified: { label: 'Verified', badge: 'info', tone: 'bg-blue-950 text-white border-blue-900' },
  failed: { label: 'Failed', badge: 'default', tone: 'bg-blue-100 text-blue-900 border-blue-200' },
};

const BATCH_STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'pending_verification', label: 'Pending' },
  { value: 'verified', label: 'Verified' },
  { value: 'failed', label: 'Failed' },
];

const groupByBatch = (records) => {
  const batches = records.reduce((acc, record) => {
    const id = record.batch_id || 'single-records';

    if (!acc[id]) {
      acc[id] = {
        id,
        name: id === 'single-records' ? 'Single records' : `Batch ${id.slice(0, 8)}`,
        orgName: record.organization_name || record.org_name || 'Organization',
        records: [],
        total: 0,
        pending: 0,
        verified: 0,
        failed: 0,
        createdAt: record.created_at,
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

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const PAGE_SIZE = 10;

const BatchDetailModal = ({ batch, onClose, onRefresh }) => {
  if (!batch) return null;

  const handleGenerateQR = async (userId) => {
    try {
      const { data } = await verificationAPI.generateQRAndCertificate(userId);
      if (data?.pdf_url) window.open(data.pdf_url, '_blank');
      else toast.success('QR generated successfully');
    } catch (err) {
      toast.error(getApiError(err, 'Failed to generate QR/certificate'));
    }
  };

  const handleUpdateStatus = async (userId, status) => {
    try {
      await verificationAPI.updateVerificationStatus(userId, status);
      toast.success(`Marked as ${status}`);
      await onRefresh?.();
    } catch (err) {
      toast.error(getApiError(err, 'Failed to update status'));
    }
  };

  const meta = batchStatusMeta[batch.status] || batchStatusMeta.pending_verification;

  return (
    <Modal isOpen={!!batch} onClose={onClose} title={`${batch.name} - Details`} size="4xl">
      <div className="space-y-5">
        <div className={`rounded-2xl border p-5 ${meta.tone}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-inter text-xs font-semibold uppercase tracking-wide opacity-70">Batch status</p>
              <h3 className="mt-1 font-sora text-xl font-bold">{meta.label}</h3>
              <p className="mt-1 font-inter text-xs opacity-70">{batch.id}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'Total', value: batch.total, color: 'text-brand-dark' },
                { label: 'Verified', value: batch.verified, color: 'text-brand-dark' },
                { label: 'Pending', value: batch.pending, color: 'text-brand-dark' },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-white/80 px-3 py-2">
                  <p className={`font-sora text-lg font-bold ${item.color}`}>{item.value}</p>
                  <p className="font-inter text-[11px] opacity-70">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 bg-blue-50/70 px-5 py-4">
            <p className="font-sora text-sm font-semibold text-brand-dark">Records</p>
            <Badge status="default">{batch.records.length}</Badge>
          </div>
          <div className="max-h-72 overflow-y-auto scrollbar-hidden">
            <table className="w-full min-w-[560px]">
              <thead className="sticky top-0 bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-inter text-[11px] font-semibold uppercase text-gray-500">Record</th>
                  <th className="px-4 py-2 text-left font-inter text-[11px] font-semibold uppercase text-gray-500">Status</th>
                  <th className="px-4 py-2 text-left font-inter text-[11px] font-semibold uppercase text-gray-500">Assets</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {batch.records.map((record) => {
                  const Icon = isProductRecord(record) ? Package : User;
                  const sb = statusBadge(record.verification_status);

                  return (
                    <tr key={record.id} className="transition-colors hover:bg-gray-50/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-blue/10">
                            <Icon size={14} className="text-brand-blue" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-inter text-sm font-medium text-brand-dark">{getRecordTitle(record)}</p>
                            <p className="truncate font-inter text-xs text-gray-400">{getRecordSubtitle(record)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge status={sb.variant}>{sb.label}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <Button variant="ghost" size="sm" icon={QrCode} onClick={() => handleGenerateQR(record.id)}>
                            Generate QR
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleUpdateStatus(record.id, 'verified')}>
                            Verify
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleUpdateStatus(record.id, 'failed')}>
                            Fail
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export const BatchStatus = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [selectedBatch, setSelectedBatch] = useState(null);

  const fetchData = useCallback(async (showRefreshSpinner = false) => {
    if (showRefreshSpinner) setRefreshing(true);
    else setLoading(true);

    try {
      const { data: result } = await verificationAPI.getAllVerifications({ limit: 200, offset: 0 });
      setData(result);
    } catch (err) {
      toast.error(getApiError(err, 'Failed to fetch verifications'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const timer = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(timer);
  }, [fetchData]);

  const allRecords = data?.users || [];
  const rawBatches = groupByBatch(allRecords).map((batch) => {
    const status = batch.pending > 0 ? 'pending_verification' : (batch.failed > 0 ? 'failed' : 'verified');
    return {
      ...batch,
      status,
      statusMeta: batchStatusMeta[status] || batchStatusMeta.pending_verification,
    };
  });

  const filteredBatches = statusFilter
    ? rawBatches.filter((batch) => batch.status === statusFilter)
    : rawBatches;

  const totalPages = Math.ceil(filteredBatches.length / PAGE_SIZE);
  const pagedBatches = filteredBatches.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const totalRecords = rawBatches.reduce((sum, batch) => sum + batch.total, 0);
  const totalPending = rawBatches.reduce((sum, batch) => sum + batch.pending, 0);
  const totalVerified = rawBatches.reduce((sum, batch) => sum + batch.verified, 0);
  const totalFailed = rawBatches.reduce((sum, batch) => sum + batch.failed, 0);
  const progress = totalRecords > 0
    ? Math.round(((totalVerified + totalFailed) / totalRecords) * 100)
    : 0;

  const summaryCards = [
    {
      label: 'Total',
      value: totalRecords,
      surface: 'bg-brand-blue text-white border-brand-blue/70',
      valueTone: 'text-white',
      labelTone: 'text-white/72',
    },
    {
      label: 'Pending',
      value: totalPending,
      surface: 'bg-white border-blue-100',
      valueTone: 'text-brand-dark',
      labelTone: 'text-brand-blue/70',
    },
    {
      label: 'Verified',
      value: totalVerified,
      surface: 'bg-blue-50 border-blue-100',
      valueTone: 'text-brand-dark',
      labelTone: 'text-brand-blue/70',
    },
    {
      label: 'Failed',
      value: totalFailed,
      surface: 'bg-blue-100/70 border-blue-200',
      valueTone: 'text-brand-dark',
      labelTone: 'text-brand-blue/70',
    },
  ];

  return (
    <AuthLayout title="Batch Status">
      <div className="mx-auto w-full lg:max-w-none">
        <PageHeader
          title="Verification Batch Status"
          subtitle="Monitor your batches across the full verification pipeline"
          action={
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/org/create-batch')}
                icon={Upload}
                className="shadow-[0_12px_28px_-18px_rgba(37,99,235,0.9)]"
              >
                New Batch Upload
              </Button>
              <button
                onClick={() => fetchData(true)}
                className={`inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 font-inter text-sm text-brand-blue transition-colors hover:bg-blue-100 ${refreshing ? 'pointer-events-none' : ''}`}
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          }
        />

        {data && (
          <Card className="mb-6 overflow-hidden border border-blue-100 bg-[linear-gradient(180deg,_rgba(239,246,255,0.95),_rgba(255,255,255,1))] p-5 shadow-[0_24px_60px_-48px_rgba(37,99,235,0.45)]">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
              <div>
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-inter text-xs font-medium uppercase tracking-[0.14em] text-brand-blue/70">Pipeline overview</p>
                    <h3 className="mt-1 font-sora text-lg font-semibold text-brand-dark">Current verification load</h3>
                  </div>
                  <div className="rounded-xl border border-blue-100 bg-white/90 px-3 py-2 text-right shadow-sm">
                    <p className="font-inter text-[11px] uppercase tracking-[0.14em] text-brand-blue/60">Completion</p>
                    <p className="font-sora text-xl font-semibold text-brand-dark">{progress}%</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {summaryCards.map((stat, index) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.06 }}
                      className={`rounded-2xl border p-4 ${stat.surface}`}
                    >
                      <p className={`font-sora text-3xl font-semibold leading-none ${stat.valueTone}`}>{stat.value}</p>
                      <p className={`mt-2 font-inter text-xs font-medium uppercase tracking-[0.12em] ${stat.labelTone}`}>{stat.label}</p>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-white/90 p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="font-sora text-sm font-semibold text-brand-dark">Overall progress</h3>
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 font-inter text-xs font-medium text-brand-blue">
                    {totalVerified + totalFailed} of {totalRecords} processed
                  </span>
                </div>
                <ProgressBar progress={progress} color="blue" height="h-2.5" showLabel={false} />
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[
                    { label: 'Pending', value: totalPending },
                    { label: 'Verified', value: totalVerified },
                    { label: 'Failed', value: totalFailed },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl bg-blue-50 px-3 py-2">
                      <p className="font-sora text-lg font-semibold text-brand-dark">{item.value}</p>
                      <p className="font-inter text-[11px] uppercase tracking-[0.12em] text-brand-blue/70">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50/70 p-3">
          <Filter size={14} className="shrink-0 text-brand-blue" />
          <div className="flex flex-wrap gap-2">
            {BATCH_STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setStatusFilter(opt.value);
                  setPage(0);
                }}
                className={`rounded-lg px-3 py-1.5 font-inter text-xs font-medium transition-all ${
                  statusFilter === opt.value
                    ? 'bg-brand-blue text-white shadow-sm'
                    : 'bg-white text-brand-blue hover:bg-blue-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <Card className="mb-4 overflow-hidden border border-blue-100 p-0 shadow-[0_18px_48px_-42px_rgba(37,99,235,0.5)]">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 p-10">
              <RefreshCw size={24} className="animate-spin text-brand-blue" />
              <p className="font-inter text-sm text-gray-400">Loading batches...</p>
            </div>
          ) : pagedBatches.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-inter text-sm text-gray-400">No batches found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] font-inter text-sm">
                <thead>
                  <tr className="border-b border-blue-100 bg-blue-50/80">
                    <th className="p-4 text-left text-xs font-medium text-brand-blue/75">Batch</th>
                    <th className="hidden p-4 text-left text-xs font-medium text-brand-blue/75 sm:table-cell">Progress</th>
                    <th className="p-4 text-center text-xs font-medium text-brand-blue/75">Records</th>
                    <th className="p-4 text-left text-xs font-medium text-brand-blue/75">Status</th>
                    <th className="p-4 text-right text-xs font-medium text-brand-blue/75">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedBatches.map((batch, index) => {
                    const pct = batch.total > 0
                      ? Math.round(((batch.verified + batch.failed) / batch.total) * 100)
                      : 0;
                    const meta = batch.statusMeta;

                    return (
                      <motion.tr
                        key={batch.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.04 }}
                        className="border-b border-blue-50 transition-colors hover:bg-blue-50/40"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-blue/10">
                              <Package size={16} className="text-brand-blue" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-brand-dark">{batch.name}</p>
                              <p className="truncate text-xs text-gray-400">{formatDate(batch.createdAt)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="hidden w-44 p-4 sm:table-cell">
                          <ProgressBar progress={pct} height="h-1.5" />
                          <p className="mt-1.5 text-[11px] text-brand-blue/65">{pct}% · {batch.verified}/{batch.total} verified</p>
                        </td>
                        <td className="p-4 text-center">
                          <span className="inline-flex min-w-9 justify-center rounded-lg bg-blue-50 px-2.5 py-1 text-sm font-bold text-brand-dark">
                            {batch.total}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className={`inline-flex rounded-xl border px-3 py-1.5 ${meta.tone}`}>
                            <span className="font-inter text-xs font-semibold">{meta.label}</span>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => setSelectedBatch(batch)}
                            className="ml-auto inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-brand-blue transition-colors hover:bg-blue-100"
                          >
                            <Eye size={12} />
                            View Details
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {totalPages > 1 && (
          <div className="mb-4 flex items-center justify-between">
            <p className="font-inter text-xs text-brand-blue/65">
              Page {page + 1} of {totalPages} · {filteredBatches.length} batches
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => Math.max(0, current - 1))}
                disabled={page === 0}
                icon={ChevronLeft}
              >
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
                disabled={page >= totalPages - 1}
                icon={ChevronRight}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <BatchDetailModal batch={selectedBatch} onClose={() => setSelectedBatch(null)} onRefresh={fetchData} />
    </AuthLayout>
  );
};

export default BatchStatus;
