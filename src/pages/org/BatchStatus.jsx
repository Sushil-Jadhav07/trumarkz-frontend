import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Modal } from '@/components/ui/Modal';
import { StepWizard } from '@/components/ui/StepWizard';
import { HUMAN_VERIFICATION_STEPS, HUMAN_VERIFICATION_STEP_META } from '@/data/humanVerificationFlow';
import { verificationAPI, getApiError } from '@/services/api';
import {
  RefreshCw, Eye, CheckCircle, Clock, XCircle, Filter,
  ChevronLeft, ChevronRight, Package, User, QrCode,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Shared helpers ────────────────────────────────────────────────────────────
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
  if (status === 'verified') return { variant: 'success', label: 'Verified',  icon: CheckCircle };
  if (status === 'failed')   return { variant: 'error',   label: 'Failed',    icon: XCircle };
  return                            { variant: 'pending', label: 'Pending',   icon: Clock };
};

// Batch-level status meta
const batchStatusMeta = {
  pending_verification: { label: 'Pending',  badge: 'warning', tone: 'bg-orange-50 text-orange-700 border-orange-100' },
  verified:             { label: 'Verified', badge: 'success', tone: 'bg-green-50 text-green-700 border-green-100' },
  failed:               { label: 'Failed',   badge: 'error',   tone: 'bg-red-50 text-red-700 border-red-100' },
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
        records: [], total: 0, pending: 0, verified: 0, failed: 0,
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
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const PAGE_SIZE = 10;

// ── Batch Detail Modal (org view — read-only + download assets) ───────────────
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
    <Modal isOpen={!!batch} onClose={onClose} title={`${batch.name} — Details`} size="4xl">
      <div className="space-y-5">
        {/* Status banner */}
        <div className={`rounded-2xl border p-5 ${meta.tone}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide opacity-70 font-inter">Batch status</p>
              <h3 className="font-sora font-bold text-xl mt-1">{meta.label}</h3>
              <p className="text-xs opacity-70 font-inter mt-1">{batch.id}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'Total',    value: batch.total,    color: 'text-brand-dark' },
                { label: 'Verified', value: batch.verified, color: 'text-green-700' },
                { label: 'Pending',  value: batch.pending,  color: 'text-orange-600' },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-white/70 px-3 py-2">
                  <p className={`font-sora font-bold text-lg ${s.color}`}>{s.value}</p>
                  <p className="text-[11px] opacity-70 font-inter">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Records table */}
        <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <p className="font-sora font-semibold text-sm text-brand-dark">Records</p>
            <Badge status="default">{batch.records.length}</Badge>
          </div>
          <div className="max-h-72 overflow-y-auto scrollbar-hidden">
            <table className="w-full min-w-[560px]">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase text-gray-500 font-inter">Record</th>
                  <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase text-gray-500 font-inter">Status</th>
                  <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase text-gray-500 font-inter">Assets</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {batch.records.map((record) => {
                  const product = isProductRecord(record);
                  const Icon = product ? Package : User;
                  const sb = statusBadge(record.verification_status);
                  return (
                    <tr key={record.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-brand-blue/10 flex items-center justify-center shrink-0">
                            <Icon size={14} className="text-brand-blue" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-brand-dark font-inter truncate">{getRecordTitle(record)}</p>
                            <p className="text-xs text-gray-400 font-inter truncate">{getRecordSubtitle(record)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><Badge status={sb.variant}>{sb.label}</Badge></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5 flex-wrap">
                          <Button variant="ghost" size="sm" icon={QrCode} onClick={() => handleGenerateQR(record.id)}>Generate QR</Button>
                          <Button variant="ghost" size="sm" onClick={() => handleUpdateStatus(record.id, 'verified')}>Verify</Button>
                          <Button variant="ghost" size="sm" onClick={() => handleUpdateStatus(record.id, 'failed')}>Fail</Button>
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

// ── Main BatchStatus (Org view) ───────────────────────────────────────────────
export const BatchStatus = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const showHumanFlowStep = location.state?.fromHumanFlow;
  const { label, progress: flowProgress } = HUMAN_VERIFICATION_STEP_META.batch;

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

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(timer);
  }, [fetchData]);

  // Build batch list from raw records
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
    ? rawBatches.filter((b) => b.status === statusFilter)
    : rawBatches;

  const totalPages = Math.ceil(filteredBatches.length / PAGE_SIZE);
  const pagedBatches = filteredBatches.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const totalRecords  = rawBatches.reduce((s, b) => s + b.total,    0);
  const totalPending  = rawBatches.reduce((s, b) => s + b.pending,  0);
  const totalVerified = rawBatches.reduce((s, b) => s + b.verified, 0);
  const totalFailed   = rawBatches.reduce((s, b) => s + b.failed,   0);
  const progress = totalRecords > 0
    ? Math.round(((totalVerified + totalFailed) / totalRecords) * 100)
    : 0;

  return (
    <AuthLayout title="Batch Status">
      <div className="w-full mx-auto lg:max-w-none">
        {showHumanFlowStep && (
          <div className="mb-8 rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_-46px_rgba(15,23,42,0.22)]">
            <StepWizard steps={HUMAN_VERIFICATION_STEPS} currentStep={5} />
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-blue/70">{label}</p>
              <div className="mt-4 h-2.5 max-w-xl overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-brand-blue" style={{ width: `${flowProgress}%` }} />
              </div>
            </div>
          </div>
        )}

        <PageHeader
          title="Verification Batch Status"
          subtitle="Monitor your batches across the full verification pipeline"
          action={
            <button
              onClick={() => fetchData(true)}
              className={`flex items-center gap-2 text-sm text-gray-500 font-inter hover:text-brand-blue transition-colors ${refreshing ? 'pointer-events-none' : ''}`}
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          }
        />

        {/* Stats */}
        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Total',    value: totalRecords,  color: 'bg-brand-blue' },
              { label: 'Pending',  value: totalPending,  color: 'bg-orange-400' },
              { label: 'Verified', value: totalVerified, color: 'bg-green-500' },
              { label: 'Failed',   value: totalFailed,   color: 'bg-red-500' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                className={`${stat.color} text-white rounded-xl p-4 text-center`}
              >
                <p className="font-sora font-bold text-2xl">{stat.value}</p>
                <p className="text-xs opacity-80 font-inter">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        )}

        {/* Progress */}
        {data && (
          <Card className="p-5 mb-5">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-sora font-semibold text-brand-dark text-sm">Overall Progress</h3>
              <span className="text-xs text-gray-400 font-inter">{progress}% complete</span>
            </div>
            <ProgressBar progress={progress} color="blue" height="h-3" />
          </Card>
        )}

        {/* Filter */}
        <div className="flex items-center gap-2 mb-4">
          <Filter size={14} className="text-gray-400 shrink-0" />
          <div className="flex gap-2 flex-wrap">
            {BATCH_STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setStatusFilter(opt.value); setPage(0); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium font-inter transition-all
                  ${statusFilter === opt.value
                    ? 'bg-brand-blue text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Batch table */}
        <Card className="p-0 overflow-hidden mb-4">
          {loading ? (
            <div className="p-10 flex flex-col items-center justify-center gap-3">
              <RefreshCw size={24} className="animate-spin text-brand-blue" />
              <p className="text-sm text-gray-400 font-inter">Loading batches…</p>
            </div>
          ) : pagedBatches.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm text-gray-400 font-inter">No batches found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-inter min-w-[700px]">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left p-4 text-xs text-gray-500 font-medium">Batch</th>
                    <th className="text-left p-4 text-xs text-gray-500 font-medium hidden sm:table-cell">Progress</th>
                    <th className="text-center p-4 text-xs text-gray-500 font-medium">Records</th>
                    <th className="text-left p-4 text-xs text-gray-500 font-medium">Status</th>
                    <th className="text-right p-4 text-xs text-gray-500 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedBatches.map((batch, i) => {
                    const pct = batch.total > 0
                      ? Math.round(((batch.verified + batch.failed) / batch.total) * 100)
                      : 0;
                    const meta = batch.statusMeta;
                    return (
                      <motion.tr
                        key={batch.id}
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                        className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-brand-blue/10 flex items-center justify-center shrink-0">
                              <Package size={16} className="text-brand-blue" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-brand-dark truncate">{batch.name}</p>
                              <p className="text-xs text-gray-400 truncate">{formatDate(batch.createdAt)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 hidden sm:table-cell w-44">
                          <ProgressBar progress={pct} height="h-1.5" />
                          <p className="text-[11px] text-gray-400 mt-1.5">{pct}% · {batch.verified}/{batch.total} verified</p>
                        </td>
                        <td className="p-4 text-center">
                          <span className="inline-flex min-w-9 justify-center rounded-lg bg-gray-100 px-2.5 py-1 text-sm font-bold text-brand-dark">{batch.total}</span>
                        </td>
                        <td className="p-4">
                          <div className={`inline-flex rounded-xl border px-3 py-1.5 ${meta.tone}`}>
                            <span className="text-xs font-semibold font-inter">{meta.label}</span>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => setSelectedBatch(batch)}
                            className="flex items-center gap-1 text-xs text-brand-blue hover:underline ml-auto"
                          >
                            <Eye size={12} /> View Details
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-gray-400 font-inter">
              Page {page + 1} of {totalPages} · {filteredBatches.length} batches
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} icon={ChevronLeft}>Prev</Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} icon={ChevronRight}>Next</Button>
            </div>
          </div>
        )}

        <Button variant="primary" className="w-full" onClick={() => navigate('/org/verifications')} icon={RefreshCw}>
          New Batch Upload
        </Button>
      </div>

      {/* Batch Detail Modal */}
      <BatchDetailModal batch={selectedBatch} onClose={() => setSelectedBatch(null)} onRefresh={fetchData} />
    </AuthLayout>
  );
};

export default BatchStatus;
