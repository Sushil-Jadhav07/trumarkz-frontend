import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { verificationAPI, getApiError } from '@/services/api';
import {
  CheckCircle,
  Clock,
  Download,
  Eye,
  FileText,
  Filter,
  IdCard,
  Mail,
  Package,
  QrCode,
  RefreshCw,
  Send,
  Upload,
  User,
  Users,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'send_to_verifier', label: 'Send to Verifier' },
  { value: 'verified', label: 'Verified' },
  { value: 'send_to_organization', label: 'Sent to Org' },
];

const BATCH_WORKFLOW_KEY = 'trumarkz_admin_batch_workflow_mock';

const MOCK_VERIFICATION_DATA = {
  total: 10,
  pending: 7,
  verified: 3,
  failed: 0,
  users: [
    {
      id: 'mock-user-001',
      batch_id: 'BATCH-MOCK-001',
      full_name: 'Aarav Sharma',
      email: 'aarav.sharma@example.com',
      phone_number: '+91 98765 43001',
      verification_status: 'pending_verification',
      created_at: '2026-05-10T08:30:00Z',
    },
    {
      id: 'mock-user-002',
      batch_id: 'BATCH-MOCK-001',
      full_name: 'Meera Joshi',
      email: 'meera.joshi@example.com',
      phone_number: '+91 98765 43002',
      verification_status: 'pending_verification',
      created_at: '2026-05-10T08:31:00Z',
    },
    {
      id: 'mock-user-003',
      batch_id: 'BATCH-MOCK-001',
      full_name: 'Kabir Verma',
      email: 'kabir.verma@example.com',
      phone_number: '+91 98765 43003',
      verification_status: 'pending_verification',
      created_at: '2026-05-10T08:32:00Z',
    },
    {
      id: 'mock-user-004',
      batch_id: 'BATCH-MOCK-001',
      full_name: 'Nisha Patel',
      email: 'nisha.patel@example.com',
      phone_number: '+91 98765 43004',
      verification_status: 'pending_verification',
      created_at: '2026-05-10T08:33:00Z',
    },
    {
      id: 'mock-user-005',
      batch_id: 'BATCH-MOCK-002',
      full_name: 'Rohan Gupta',
      email: 'rohan.gupta@example.com',
      phone_number: '+91 98765 43005',
      verification_status: 'verified',
      created_at: '2026-05-09T10:15:00Z',
      verified_at: '2026-05-12T11:00:00Z',
    },
    {
      id: 'mock-user-006',
      batch_id: 'BATCH-MOCK-002',
      full_name: 'Priya Nair',
      email: 'priya.nair@example.com',
      phone_number: '+91 98765 43006',
      verification_status: 'verified',
      created_at: '2026-05-09T10:16:00Z',
      verified_at: '2026-05-12T11:02:00Z',
    },
    {
      id: 'mock-user-007',
      batch_id: 'BATCH-MOCK-003',
      full_name: 'Sameer Khan',
      email: 'sameer.khan@example.com',
      phone_number: '+91 98765 43007',
      verification_status: 'pending_verification',
      created_at: '2026-05-11T12:05:00Z',
    },
    {
      id: 'mock-user-008',
      batch_id: 'BATCH-MOCK-003',
      full_name: 'Anika Rao',
      email: 'anika.rao@example.com',
      phone_number: '+91 98765 43008',
      verification_status: 'pending_verification',
      created_at: '2026-05-11T12:06:00Z',
    },
    {
      id: 'mock-product-001',
      batch_id: 'BATCH-MOCK-004',
      entity_type: 'product',
      product_name: 'TruTag Smart Label',
      category_name: 'Electronics',
      verification_status: 'verified',
      created_at: '2026-05-08T09:00:00Z',
      verified_at: '2026-05-10T09:00:00Z',
    },
    {
      id: 'mock-user-009',
      batch_id: 'BATCH-MOCK-005',
      full_name: 'Dev Malhotra',
      email: 'dev.malhotra@example.com',
      phone_number: '+91 98765 43009',
      verification_status: 'pending_verification',
      created_at: '2026-05-12T09:20:00Z',
    },
  ],
};

const statusBadge = (status) => {
  if (status === 'verified') return { variant: 'success', label: 'Verified', icon: CheckCircle };
  if (status === 'failed') return { variant: 'error', label: 'Failed', icon: XCircle };
  return { variant: 'pending', label: 'Pending', icon: Clock };
};

const batchStatusMeta = {
  pending: { label: 'Pending', badge: 'warning', stage: 'Review', tone: 'bg-orange-50 text-orange-700 border-orange-100' },
  send_to_verifier: { label: 'Send to Verifier', badge: 'info', stage: 'Verify', tone: 'bg-blue-50 text-brand-blue border-blue-100' },
  verified: { label: 'Verified', badge: 'success', stage: 'Verified', tone: 'bg-green-50 text-green-700 border-green-100' },
  send_to_organization: { label: 'Send to Organization', badge: 'success', stage: 'Shared', tone: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
};

const WORKFLOW_STEPS = [
  { id: 'pending', label: 'Review' },
  { id: 'send_to_verifier', label: 'Verifier' },
  { id: 'verified', label: 'Verified' },
  { id: 'send_to_organization', label: 'Org Shared' },
];

const getStoredWorkflow = () => {
  try {
    return JSON.parse(localStorage.getItem(BATCH_WORKFLOW_KEY) || '{}');
  } catch {
    return {};
  }
};

const downloadMockFile = (fileName, content) => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
};

const generateMockBatchAssets = async (batch) => {
  const generators = batch.records.map((record) =>
    Promise.resolve({
      recordId: record.id,
      title: recordTitle(record),
      idCardUrl: `/mock-assets/${batch.id}/${record.id}-id-card.pdf`,
      qrCodeUrl: `/mock-assets/${batch.id}/${record.id}-qr.png`,
      reportUrl: `/mock-assets/${batch.id}/${record.id}-report.pdf`,
    })
  );
  return Promise.all(generators);
};

const isProductRecord = (record) =>
  record?.entity_type === 'product' ||
  !!record?.product_name ||
  !!record?.category_name ||
  !!record?.custom_fields;

const recordTitle = (record) =>
  record.product_name || record.full_name || record.email || record.id || 'Verification record';

const formatLastAction = (value) => {
  if (!value) return 'No batch action yet';
  return new Date(value).toLocaleString([], {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

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
  const [data, setData] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const [workflowByBatch, setWorkflowByBatch] = useState(() => getStoredWorkflow());

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data: result } = await verificationAPI.getAllVerifications({
        limit: 200,
        offset: 0,
      });
      setData(result?.users?.length ? result : MOCK_VERIFICATION_DATA);
    } catch (err) {
      setData(MOCK_VERIFICATION_DATA);
      toast.error(`${getApiError(err, 'Failed to load live verification batches')}. Showing mock batch data.`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const records = data?.users || [];
  const batches = groupByBatch(records).map((batch) => {
    const stored = workflowByBatch[batch.id] || {};
    const inferredStatus = batch.pending > 0 ? 'pending' : 'verified';
    const status = stored.status || inferredStatus;
    const assets = stored.assets || [];
    const batchComplete = status === 'verified' || status === 'send_to_organization';
    return {
      ...batch,
      pending: batchComplete ? 0 : batch.pending,
      verified: batchComplete ? batch.total - batch.failed : batch.verified,
      status,
      statusMeta: batchStatusMeta[status] || batchStatusMeta.pending,
      verifiedDocument: stored.verifiedDocument || batchComplete,
      verifiedReport: stored.verifiedReport || batchComplete,
      assets,
      sharedWithOrganization: batchComplete && status === 'send_to_organization',
      lastAction: stored.lastAction,
    };
  });
  const visibleBatches = statusFilter ? batches.filter((batch) => batch.status === statusFilter) : batches;
  const selectedBatch = batches.find((batch) => batch.id === selectedBatchId) || null;
  const total = batches.reduce((sum, batch) => sum + batch.total, 0);
  const pending = batches.reduce((sum, batch) => sum + batch.pending, 0);
  const verified = batches.reduce((sum, batch) => sum + batch.verified, 0);
  const failed = batches.reduce((sum, batch) => sum + batch.failed, 0);
  const statCards = [
    { label: 'Total Records', value: total, icon: Users, accent: 'bg-brand-blue', surface: 'bg-blue-50', text: 'text-brand-blue' },
    { label: 'Pending Review', value: pending, icon: Clock, accent: 'bg-orange-400', surface: 'bg-orange-50', text: 'text-orange-600' },
    { label: 'Verified', value: verified, icon: CheckCircle, accent: 'bg-green-500', surface: 'bg-green-50', text: 'text-green-600' },
    { label: 'Failed', value: failed, icon: XCircle, accent: 'bg-red-500', surface: 'bg-red-50', text: 'text-red-600' },
  ];

  const updateBatchWorkflow = (batchId, patch) => {
    setWorkflowByBatch((current) => {
      const next = {
        ...current,
        [batchId]: {
          ...(current[batchId] || {}),
          ...patch,
          lastAction: new Date().toISOString(),
        },
      };
      localStorage.setItem(BATCH_WORKFLOW_KEY, JSON.stringify(next));
      return next;
    });
  };

  const handleMailVerifier = (batch) => {
    updateBatchWorkflow(batch.id, { status: 'send_to_verifier' });
    toast.success(`Mock email sent to third-party verifier for ${batch.name}`);
  };

  const handleUploadVerifiedOutput = async (batch, type) => {
    const assets = await generateMockBatchAssets(batch);
    updateBatchWorkflow(batch.id, {
      status: 'verified',
      verifiedDocument: true,
      verifiedReport: true,
      assets,
      uploadedType: type,
    });
    toast.success(`${type === 'data' ? 'Verified data' : 'Verified document'} uploaded. Batch marked verified.`);
  };

  const handleGenerateAssets = async (batch) => {
    const assets = await generateMockBatchAssets(batch);
    updateBatchWorkflow(batch.id, { assets });
    toast.success(`Generated ${assets.length} ID cards, QR codes, and reports in mock storage`);
  };

  const handleSendToOrganization = async (batch) => {
    const assets = batch.assets.length
      ? batch.assets
      : await generateMockBatchAssets(batch);
    updateBatchWorkflow(batch.id, { status: 'send_to_organization', assets });
    toast.success(`${batch.name} assets shared with the organization`);
  };

  const handleDownload = (batch, type, record = null) => {
    const title = record ? record.title : batch.name;
    const content = [
      `Mock ${type}`,
      `Batch: ${batch.name}`,
      `Batch ID: ${batch.id}`,
      record ? `Record: ${record.title} (${record.recordId})` : `Records: ${batch.total}`,
      `Generated: ${new Date().toLocaleString()}`,
    ].join('\n');
    downloadMockFile(`${title.replace(/\s+/g, '-').toLowerCase()}-${type.replace(/\s+/g, '-')}.txt`, content);
  };

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

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-4 overflow-hidden relative">
              <div className={`absolute inset-x-0 top-0 h-1 ${stat.accent}`} />
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-gray-500 font-inter">{stat.label}</p>
                  <p className="font-sora font-bold text-2xl text-brand-dark mt-1">{stat.value}</p>
                </div>
                <div className={`w-11 h-11 rounded-xl ${stat.surface} flex items-center justify-center`}>
                  <Icon size={20} className={stat.text} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-4 mb-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <p className="font-sora font-semibold text-sm text-brand-dark">Batch Queue</p>
            <p className="text-xs text-gray-400 font-inter mt-1">{visibleBatches.length} of {batches.length} batches shown</p>
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400 shrink-0" />
            <div className="flex gap-2 flex-wrap">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setStatusFilter(option.value)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold font-inter transition-all ${
                    statusFilter === option.value ? 'bg-brand-blue text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {loading ? (
        <Card className="p-10 flex flex-col items-center justify-center gap-3">
          <RefreshCw size={24} className="animate-spin text-brand-blue" />
          <p className="text-sm text-gray-400 font-inter">Loading batches...</p>
        </Card>
      ) : visibleBatches.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-sm text-gray-400 font-inter">No verification records found</p>
        </Card>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <Card className="p-0 overflow-hidden border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-sora font-semibold text-brand-dark">Verification Batches</h3>
                <p className="text-xs text-gray-400 font-inter mt-1">Manage verifier handoff, uploads, generated assets, and organization sharing.</p>
              </div>
              <Badge status="default">{visibleBatches.length} batches</Badge>
            </div>
            <div className="overflow-x-auto scrollbar-hidden">
              <table className="w-full min-w-[1120px] border-collapse">
                <thead>
                  <tr className="bg-gray-50/90 border-b border-gray-100">
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 font-inter">Batch</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 font-inter">Progress</th>
                    <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-500 font-inter">Records</th>
                    <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-500 font-inter">Pending</th>
                    <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-500 font-inter">Verified</th>
                    <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-500 font-inter">Failed</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 font-inter">Status</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 font-inter">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {visibleBatches.map((batch) => {
                    const complete = batch.total ? Math.round(((batch.verified + batch.failed) / batch.total) * 100) : 0;
                    return (
                      <tr key={batch.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-brand-blue/10 text-brand-blue flex items-center justify-center shrink-0">
                              <Package size={18} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-sora font-semibold text-sm text-brand-dark">{batch.name}</p>
                              <p className="text-xs text-gray-400 font-inter mt-1 truncate">{batch.orgName} / {batch.id}</p>
                              <p className="text-[11px] text-gray-400 font-inter mt-2">{formatLastAction(batch.lastAction)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 w-64">
                          <ProgressBar progress={complete} height="h-2" />
                          <div className="grid grid-cols-4 gap-1 mt-3">
                            {WORKFLOW_STEPS.map((step, index) => {
                              const activeIndex = WORKFLOW_STEPS.findIndex((item) => item.id === batch.status);
                              return (
                                <span
                                  key={step.id}
                                  className={`h-1.5 rounded-full ${index <= activeIndex ? 'bg-brand-blue' : 'bg-gray-200'}`}
                                />
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="inline-flex min-w-10 justify-center rounded-lg bg-gray-100 px-2.5 py-1 text-sm font-bold text-brand-dark font-inter">
                            {batch.total}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="inline-flex min-w-9 justify-center rounded-lg bg-orange-50 px-2.5 py-1 text-sm font-bold text-orange-600 font-inter">
                            {batch.pending}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="inline-flex min-w-9 justify-center rounded-lg bg-green-50 px-2.5 py-1 text-sm font-bold text-green-600 font-inter">
                            {batch.verified}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="inline-flex min-w-9 justify-center rounded-lg bg-red-50 px-2.5 py-1 text-sm font-bold text-red-600 font-inter">
                            {batch.failed}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className={`inline-flex flex-col gap-1 rounded-xl border px-3 py-2 ${batch.statusMeta.tone}`}>
                            <span className="text-xs font-semibold font-inter">{batch.statusMeta.label}</span>
                            <span className="text-[11px] opacity-80 font-inter">{batch.statusMeta.stage}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2 min-w-[240px]">
                            <Button variant="ghost" size="sm" icon={Eye} onClick={() => setSelectedBatchId(batch.id)}>
                              View Details
                            </Button>
                            {batch.status === 'pending' && (
                              <Button variant="outline" size="sm" icon={Mail} onClick={() => handleMailVerifier(batch)}>
                                Mail Verifier
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      )}

      <Modal
        isOpen={!!selectedBatch}
        onClose={() => setSelectedBatchId(null)}
        title={selectedBatch ? `${selectedBatch.name} Control Center` : 'Batch Control Center'}
        size="5xl"
      >
        {selectedBatch && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
                <div className={`rounded-xl border p-5 ${selectedBatch.statusMeta.tone}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide opacity-80 font-inter">Current stage</p>
                      <h3 className="font-sora font-bold text-2xl mt-1">{selectedBatch.statusMeta.label}</h3>
                      <p className="text-xs opacity-80 font-inter mt-2">{selectedBatch.orgName} / {selectedBatch.id}</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-white/70 flex items-center justify-center shrink-0">
                      <Package size={22} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-5">
                    {[
                      { label: 'Records', value: selectedBatch.total, className: 'text-brand-dark' },
                      { label: 'Pending', value: selectedBatch.pending, className: 'text-orange-600' },
                      { label: 'Verified', value: selectedBatch.verified, className: 'text-green-600' },
                      { label: 'Failed', value: selectedBatch.failed, className: 'text-red-600' },
                    ].map((item) => (
                      <div key={item.label} className="rounded-xl bg-white/75 border border-white/80 p-3">
                        <p className={`font-sora font-bold text-xl ${item.className}`}>{item.value}</p>
                        <p className="text-[11px] opacity-75 font-inter">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-gray-100 bg-white p-5">
                  <p className="text-xs text-gray-400 font-inter">Last action</p>
                  <p className="font-sora font-semibold text-brand-dark mt-1">{formatLastAction(selectedBatch.lastAction)}</p>
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between text-xs font-inter">
                      <span className="text-gray-500">Verified document</span>
                      <Badge status={selectedBatch.verifiedDocument ? 'success' : 'default'}>{selectedBatch.verifiedDocument ? 'Ready' : 'Pending'}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs font-inter">
                      <span className="text-gray-500">Generated assets</span>
                      <Badge status={selectedBatch.assets.length ? 'success' : 'default'}>{selectedBatch.assets.length || 0}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs font-inter">
                      <span className="text-gray-500">Organization share</span>
                      <Badge status={selectedBatch.sharedWithOrganization ? 'success' : 'default'}>{selectedBatch.sharedWithOrganization ? 'Shared' : 'Not sent'}</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-4">
              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <p className="font-sora font-semibold text-brand-dark">Batch Workflow</p>
                    <p className="text-xs text-gray-400 font-inter mt-1">Review to verifier processing to organization sharing</p>
                  </div>
                  <Badge status={selectedBatch.statusMeta.badge}>{selectedBatch.statusMeta.label}</Badge>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  {WORKFLOW_STEPS.map((step, index) => {
                    const activeIndex = WORKFLOW_STEPS.findIndex((item) => item.id === selectedBatch.status);
                    const active = index <= activeIndex;
                    return (
                      <div key={step.id} className={`rounded-xl px-3 py-4 text-center text-xs font-semibold font-inter border ${active ? 'bg-brand-blue text-white border-brand-blue shadow-sm' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                        <span className={`block w-7 h-7 rounded-full mx-auto mb-2 leading-7 ${active ? 'bg-white/20' : 'bg-white border border-gray-100'}`}>{index + 1}</span>
                        {step.label}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <p className="font-sora font-semibold text-brand-dark">Batch Actions</p>
                    <p className="text-xs text-gray-400 font-inter mt-1">Whole-batch controls only</p>
                  </div>
                  {selectedBatch.sharedWithOrganization && <Badge status="success">Shared</Badge>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-2">
                  {selectedBatch.status === 'pending' && (
                    <Button variant="outline" size="sm" icon={Mail} className="justify-start" onClick={() => handleMailVerifier(selectedBatch)}>
                      Mail to Third-Party Verifier
                    </Button>
                  )}
                  {selectedBatch.status !== 'verified' && selectedBatch.status !== 'send_to_organization' && (
                    <>
                      <Button variant="primary" size="sm" icon={Upload} className="justify-start" onClick={() => handleUploadVerifiedOutput(selectedBatch, 'data')}>
                        Upload Verified Data
                      </Button>
                      <Button variant="secondary" size="sm" icon={Upload} className="justify-start" onClick={() => handleUploadVerifiedOutput(selectedBatch, 'document')}>
                        Upload Verified Document
                      </Button>
                    </>
                  )}
                  {(selectedBatch.status === 'verified' || selectedBatch.status === 'send_to_organization') && (
                    <>
                      <Button variant="outline" size="sm" icon={Download} className="justify-start" onClick={() => handleDownload(selectedBatch, 'verified-document')}>
                        Download Verified Document
                      </Button>
                      <Button variant="outline" size="sm" icon={FileText} className="justify-start" onClick={() => handleDownload(selectedBatch, 'verified-report')}>
                        Download Verified Report
                      </Button>
                      <Button variant="primary" size="sm" icon={IdCard} className="justify-start" onClick={() => handleGenerateAssets(selectedBatch)}>
                        Generate Batch Assets
                      </Button>
                      {selectedBatch.status === 'verified' && (
                        <Button variant="success" size="sm" icon={Send} className="justify-start" onClick={() => handleSendToOrganization(selectedBatch)}>
                          Send to Organization
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-4 border-b border-gray-100 bg-gray-50">
                <div>
                  <h4 className="font-sora font-semibold text-sm text-brand-dark">Batch Records</h4>
                  <p className="text-xs text-gray-400 font-inter mt-1">Individual approvals are disabled. Assets appear after batch verification.</p>
                </div>
                <Badge status="default">{selectedBatch.records.length} records</Badge>
              </div>
              <div className="max-h-80 overflow-y-auto scrollbar-hidden">
                <table className="w-full min-w-[640px]">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase text-gray-500 font-inter">Record</th>
                      <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase text-gray-500 font-inter">Type</th>
                      <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase text-gray-500 font-inter">Status</th>
                      <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase text-gray-500 font-inter">Assets</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedBatch.records.map((record) => {
                      const product = isProductRecord(record);
                      const Icon = product ? Package : User;
                      const status = selectedBatch.status === 'verified' || selectedBatch.status === 'send_to_organization'
                        ? { variant: 'success', label: 'Verified' }
                        : statusBadge(record.verification_status);
                      const asset = selectedBatch.assets.find((item) => item.recordId === record.id);
                      return (
                        <tr key={record.id} className="hover:bg-gray-50/70 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-brand-blue/10 border border-blue-100 flex items-center justify-center">
                                <Icon size={15} className="text-brand-blue" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-brand-dark font-inter truncate">{recordTitle(record)}</p>
                                <p className="text-xs text-gray-400 font-inter truncate">{product ? record.category_name || 'Product' : record.email || 'Human'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 font-inter">{product ? 'Product' : 'Human'}</td>
                          <td className="px-4 py-3"><Badge status={status.variant}>{status.label}</Badge></td>
                          <td className="px-4 py-3">
                            {selectedBatch.status === 'verified' || selectedBatch.status === 'send_to_organization' ? (
                              <div className="flex flex-wrap gap-1.5">
                                <Button variant="ghost" size="sm" icon={IdCard} onClick={() => handleDownload(selectedBatch, 'id-card', asset || { recordId: record.id, title: recordTitle(record) })}>
                                  ID Card
                                </Button>
                                <Button variant="ghost" size="sm" icon={QrCode} onClick={() => handleDownload(selectedBatch, 'qr-code', asset || { recordId: record.id, title: recordTitle(record) })}>
                                  QR
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 font-inter">Available after verification</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </AuthLayout>
  );
};

export default BatchMonitor;

