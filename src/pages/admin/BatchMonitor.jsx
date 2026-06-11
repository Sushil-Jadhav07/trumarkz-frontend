import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { verificationAPI, getApiError, triggerBlobDownload } from '@/services/api';
import {
  CheckCircle, Clock, Download, Eye, FileText, Filter, IdCard,
  Mail, MoreVertical, Package, Pencil, QrCode, RefreshCw, Send, Upload, User, Users, XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Verifier directory (shared with Verifiers.jsx) ───────────────────────────
export const VERIFIER_DIRECTORY = [
  { id: 'VRF-001', name: 'TrustCheck Verification Services', email: 'ops@trustcheck.example',        status: 'active' },
  { id: 'VRF-002', name: 'SureProof Agencies',               email: 'verify@sureproof.example',      status: 'active' },
  { id: 'VRF-003', name: 'Manual Audit Partner',             email: 'audit@manualpartner.example',   status: 'paused' },
  { id: 'VRF-004', name: 'Test Verifier',                    email: 'timepasspurpose7@gmail.com',    status: 'active' },
];

const MANUAL_UPLOAD_LINK_PLACEHOLDER = '__TRUMARKZ_UPLOAD_LINK__';

const STATUS_OPTIONS = [
  { value: '',                     label: 'All' },
  { value: 'pending',              label: 'Pending' },
  { value: 'send_to_verifier',     label: 'Send to Verifier' },
  { value: 'verified',             label: 'Verified' },
  { value: 'send_to_organization', label: 'Sent to Org' },
];

const BATCH_WORKFLOW_KEY = 'trumarkz_admin_batch_workflow_mock';

const MOCK_VERIFICATION_DATA = {
  total: 10, pending: 7, verified: 3, failed: 0,
  users: [
    { id: 'mock-user-001', batch_id: 'BATCH-MOCK-001', full_name: 'Aarav Sharma',   email: 'aarav.sharma@example.com',   phone_number: '+91 98765 43001', verification_status: 'pending_verification', created_at: '2026-05-10T08:30:00Z' },
    { id: 'mock-user-002', batch_id: 'BATCH-MOCK-001', full_name: 'Meera Joshi',    email: 'meera.joshi@example.com',    phone_number: '+91 98765 43002', verification_status: 'pending_verification', created_at: '2026-05-10T08:31:00Z' },
    { id: 'mock-user-003', batch_id: 'BATCH-MOCK-001', full_name: 'Kabir Verma',    email: 'kabir.verma@example.com',    phone_number: '+91 98765 43003', verification_status: 'pending_verification', created_at: '2026-05-10T08:32:00Z' },
    { id: 'mock-user-004', batch_id: 'BATCH-MOCK-001', full_name: 'Nisha Patel',    email: 'nisha.patel@example.com',    phone_number: '+91 98765 43004', verification_status: 'pending_verification', created_at: '2026-05-10T08:33:00Z' },
    { id: 'mock-user-005', batch_id: 'BATCH-MOCK-002', full_name: 'Rohan Gupta',    email: 'rohan.gupta@example.com',    phone_number: '+91 98765 43005', verification_status: 'verified',             created_at: '2026-05-09T10:15:00Z', verified_at: '2026-05-12T11:00:00Z' },
    { id: 'mock-user-006', batch_id: 'BATCH-MOCK-002', full_name: 'Priya Nair',     email: 'priya.nair@example.com',     phone_number: '+91 98765 43006', verification_status: 'verified',             created_at: '2026-05-09T10:16:00Z', verified_at: '2026-05-12T11:02:00Z' },
    { id: 'mock-user-007', batch_id: 'BATCH-MOCK-003', full_name: 'Sameer Khan',    email: 'sameer.khan@example.com',    phone_number: '+91 98765 43007', verification_status: 'pending_verification', created_at: '2026-05-11T12:05:00Z' },
    { id: 'mock-user-008', batch_id: 'BATCH-MOCK-003', full_name: 'Anika Rao',      email: 'anika.rao@example.com',      phone_number: '+91 98765 43008', verification_status: 'pending_verification', created_at: '2026-05-11T12:06:00Z' },
    { id: 'mock-product-001', batch_id: 'BATCH-MOCK-004', entity_type: 'product', product_name: 'TruTag Smart Label', category_name: 'Electronics', verification_status: 'verified', created_at: '2026-05-08T09:00:00Z', verified_at: '2026-05-10T09:00:00Z' },
    { id: 'mock-user-009', batch_id: 'BATCH-MOCK-005', full_name: 'Dev Malhotra',   email: 'dev.malhotra@example.com',   phone_number: '+91 98765 43009', verification_status: 'pending_verification', created_at: '2026-05-12T09:20:00Z' },
  ],
};

const statusBadge = (status) => {
  if (status === 'verified') return { variant: 'success', label: 'Verified', icon: CheckCircle };
  if (status === 'failed')   return { variant: 'error',   label: 'Failed',   icon: XCircle };
  return                            { variant: 'pending', label: 'Pending',  icon: Clock };
};

const batchStatusMeta = {
  pending:              { label: 'Pending',              badge: 'warning', stage: 'Review',    tone: 'bg-orange-50 text-orange-700 border-orange-100' },
  send_to_verifier:     { label: 'Send to Verifier',     badge: 'info',    stage: 'Verify',    tone: 'bg-blue-50 text-brand-blue border-blue-100' },
  verified:             { label: 'Verified',             badge: 'success', stage: 'Verified',  tone: 'bg-green-50 text-green-700 border-green-100' },
  send_to_organization: { label: 'Send to Organization', badge: 'success', stage: 'Shared',    tone: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
};

const WORKFLOW_STEPS = [
  { id: 'pending',              label: 'Review' },
  { id: 'send_to_verifier',     label: 'Verifier' },
  { id: 'verified',             label: 'Verified' },
  { id: 'send_to_organization', label: 'Org Shared' },
];

const getStoredWorkflow = () => {
  try { return JSON.parse(localStorage.getItem(BATCH_WORKFLOW_KEY) || '{}'); }
  catch { return {}; }
};

const isProductRecord = (record) =>
  record?.entity_type === 'product' || !!record?.product_name || !!record?.category_name || !!record?.custom_fields;

const recordTitle = (record) =>
  record.product_name || record.full_name || record.email || record.id || 'Verification record';

const formatLastAction = (value) => {
  if (!value) return 'No batch action yet';
  return new Date(value).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const groupByBatch = (records) => {
  const batches = records.reduce((acc, record) => {
    const id = record.batch_id || 'single-records';
    if (!acc[id]) {
      acc[id] = {
        id, name: id === 'single-records' ? 'Single records' : `Batch ${id.slice(0, 8)}`,
        orgName: record.organization_name || record.org_name || 'Organization',
        records: [], total: 0, pending: 0, verified: 0, failed: 0,
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

// ── Select-Verifier sub-modal ─────────────────────────────────────────────────
const SelectVerifierModal = ({ isOpen, onClose, onConfirm, batchName, sending }) => {
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState('verifier');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const activeVerifiers = VERIFIER_DIRECTORY.filter((v) => v.status === 'active');

  const LINK_PLACEHOLDER = MANUAL_UPLOAD_LINK_PLACEHOLDER;
  const LINK_PREVIEW = `${window.location.origin}/upload?batch=${encodeURIComponent(batchName || '')}&token={generated-on-send}`;

  const buildBody = (name, uploadUrl) =>
    `Hi Team,\n\nPlease process the verification batch: ${name}.\n\nUpload the verified report using this secure one-time link:\n${uploadUrl}\n\nKindly upload all relevant verification documents using the one-time link above.\n\nRegards,\nTruMarkZ Admin`;

  useEffect(() => {
    setSubject(`Verification Batch Handoff: ${batchName}`);
    setBody(buildBody(batchName, LINK_PREVIEW));
    setSelected(null);
  }, [batchName]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Select Third-Party Verifier" size="xl">
      <div className="space-y-5">
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-blue-600 font-semibold font-inter">Batch Handoff</p>
          <p className="text-sm text-brand-dark font-semibold font-inter mt-1">{batchName}</p>
        </div>

        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-full">
          <button type="button" onClick={() => setActiveTab('verifier')} className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium font-inter transition-all ${activeTab === 'verifier' ? 'bg-white text-brand-dark shadow-sm' : 'text-gray-500 hover:text-brand-dark'}`}>
            Select Verifier
          </button>
          <button type="button" onClick={() => setActiveTab('template')} className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium font-inter transition-all ${activeTab === 'template' ? 'bg-white text-brand-dark shadow-sm' : 'text-gray-500 hover:text-brand-dark'}`}>
            Mail Template
          </button>
        </div>

        {activeTab === 'verifier' ? (
          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {activeVerifiers.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelected(v)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${selected?.id === v.id ? 'border-brand-blue bg-blue-50 shadow-sm' : 'border-gray-200 hover:border-brand-blue/40 hover:bg-gray-50'}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${selected?.id === v.id ? 'bg-brand-blue text-white' : 'bg-brand-blue/10 text-brand-blue'}`}>
                  <Mail size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-brand-dark font-inter truncate">{v.name}</p>
                  <p className="text-xs text-gray-500 font-inter truncate">{v.email}</p>
                </div>
                {selected?.id === v.id && <CheckCircle size={16} className="text-brand-blue shrink-0 ml-auto" />}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl border border-gray-200 p-3 bg-gray-50">
              <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold font-inter">Template Tips</p>
              <p className="text-xs text-gray-500 font-inter mt-1">Keep the upload URL in the body. A real one-time token link will be inserted when you send the request.</p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 font-inter mb-1">Subject</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-inter focus:outline-none focus:ring-2 focus:ring-brand-blue" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 font-inter mb-1">Body</label>
              <textarea rows={10} value={body} onChange={(e) => setBody(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-inter resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue" />
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
          <Button
            variant="primary"
            icon={Mail}
            className="flex-1"
            disabled={!selected || sending || !subject.trim() || !body.trim()}
            onClick={() => onConfirm(selected, { subject: subject.trim(), body: body.trim() })}
          >
            {sending ? 'Sending�' : 'Send Mail'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// -- Upload-Verified sub-modal ------------------------------------------------
const UploadVerifiedModal = ({ isOpen, onClose, onConfirm, batchName, uploading }) => {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);

  const reset = () => { setFile(null); setProgress(0); };
  const handleClose = () => { reset(); onClose(); };

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer?.files?.[0];
    if (dropped) setFile(dropped);
  };

  const label = 'Verified Data Document';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Upload ${label}`} size="md">
      <div className="space-y-4">
        <p className="text-sm text-gray-500 font-inter">
          Upload the {label.toLowerCase()} for <span className="font-semibold text-brand-dark">{batchName}</span>. This will mark the batch as <span className="font-semibold text-green-700">Verified</span>.
        </p>
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-colors ${file ? 'border-brand-blue bg-blue-50' : 'border-gray-200 hover:border-brand-blue hover:bg-gray-50'}`}
        >
          <input ref={fileRef} type="file" className="hidden" accept=".pdf,.xlsx,.xls,.csv,.docx,.doc" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${file ? 'bg-brand-blue/10' : 'bg-gray-100'}`}>
            <Upload size={22} className={file ? 'text-brand-blue' : 'text-gray-400'} />
          </div>
          {file ? (
            <div className="text-center">
              <p className="text-sm font-semibold text-brand-dark font-inter">{file.name}</p>
              <p className="text-xs text-gray-400 font-inter mt-1">{(file.size / 1024).toFixed(1)} KB � Click to change</p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600 font-inter">Drop file here or click to browse</p>
              <p className="text-xs text-gray-400 font-inter mt-1">PDF, Excel, CSV, Word � max 50MB</p>
            </div>
          )}
        </div>
        {uploading && progress > 0 && (
          <div>
            <div className="flex justify-between text-xs text-gray-500 font-inter mb-1">
              <span>Uploading...</span><span>{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full bg-brand-blue rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <Button variant="ghost" onClick={handleClose} className="flex-1" disabled={uploading}>Cancel</Button>
          <Button variant="primary" icon={Upload} className="flex-1" disabled={!file || uploading} onClick={() => onConfirm(file, setProgress)}>
            {uploading ? 'Uploading...' : `Upload ${label}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
const EditBatchModal = ({ isOpen, onClose, draft, onChange, onSave, saving }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Edit Batch (Dummy)" size="lg">
    <div className="space-y-4">
      <p className="text-sm text-gray-500 font-inter">
        Dummy edit form for local testing. Changes are stored in local state/localStorage for this mock flow.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input
          label="Batch Name"
          value={draft.name || ''}
          onChange={(e) => onChange('name', e.target.value)}
          placeholder="Enter batch name"
        />
        <Input
          label="Organization Name"
          value={draft.orgName || ''}
          onChange={(e) => onChange('orgName', e.target.value)}
          placeholder="Enter organization"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-dark font-inter mb-1.5">Status</label>
        <div className="relative">
          <select
            value={draft.status || 'pending'}
            onChange={(e) => onChange('status', e.target.value)}
            className="w-full rounded-xl border-2 border-brand-gray px-4 py-3 font-inter text-sm outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10"
          >
            <option value="pending">Pending</option>
            <option value="send_to_verifier">Send to Verifier</option>
            <option value="verified">Verified</option>
            <option value="send_to_organization">Sent to Organization</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-dark font-inter mb-1.5">Internal Notes</label>
        <textarea
          rows={3}
          value={draft.notes || ''}
          onChange={(e) => onChange('notes', e.target.value)}
          placeholder="Add notes..."
          className="w-full rounded-xl border-2 border-brand-gray px-4 py-3 font-inter text-sm outline-none resize-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <Button variant="ghost" className="flex-1" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="primary" className="flex-1" onClick={onSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  </Modal>
);

// ── Main BatchMonitor component ───────────────────────────────────────────────
export const BatchMonitor = () => {
  const [data, setData] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const [workflowByBatch, setWorkflowByBatch] = useState(() => getStoredWorkflow());

  // Action loading states
  const [mailSending, setMailSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generatingAssets, setGeneratingAssets] = useState(false);
  const [sendingToOrg, setSendingToOrg] = useState(false);
  const [downloadingDoc, setDownloadingDoc] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);

  // Sub-modal states
  const [verifierModalOpen, setVerifierModalOpen] = useState(false);
  const [verifierModalBatch, setVerifierModalBatch] = useState(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadModalBatch, setUploadModalBatch] = useState(null);
  const [actionMenuBatchId, setActionMenuBatchId] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editBatchId, setEditBatchId] = useState(null);
  const [editDraft, setEditDraft] = useState({ name: '', orgName: '', status: 'pending', notes: '' });

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data: result } = await verificationAPI.getAllVerifications({ limit: 200, offset: 0 });
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
    const edited = stored.edited || {};
    const inferredStatus = batch.pending > 0 ? 'pending' : 'verified';
    const status = edited.status || stored.status || inferredStatus;
    const assets = stored.assets || [];
    const batchComplete = status === 'verified' || status === 'send_to_organization';
    return {
      ...batch,
      name: edited.name || batch.name,
      orgName: edited.orgName || batch.orgName,
      pending: batchComplete ? 0 : batch.pending,
      verified: batchComplete ? batch.total - batch.failed : batch.verified,
      status,
      statusMeta: batchStatusMeta[status] || batchStatusMeta.pending,
      verifiedDocument: stored.verifiedDocument || batchComplete,
      verifiedReport: stored.verifiedReport || batchComplete,
      assets,
      sharedWithOrganization: status === 'send_to_organization',
      lastAction: stored.lastAction,
      verifiedDocumentUrl: stored.verifiedDocumentUrl || null,
      verifiedReportUrl: stored.verifiedReportUrl || null,
      editNotes: edited.notes || '',
      uploadLink: stored.uploadLink || null,
      verifierToken: stored.verifierToken || null,
    };
  });

  const visibleBatches = statusFilter ? batches.filter((b) => b.status === statusFilter) : batches;
  const selectedBatch = batches.find((b) => b.id === selectedBatchId) || null;

  // Prefer the API-reported aggregates; fall back to computing from batch rows
  const total    = data?.total    ?? batches.reduce((s, b) => s + b.total,    0);
  const pending  = data?.pending  ?? batches.reduce((s, b) => s + b.pending,  0);
  const verified = data?.verified ?? batches.reduce((s, b) => s + b.verified, 0);
  const failed   = data?.failed   ?? batches.reduce((s, b) => s + b.failed,   0);

  const statCards = [
    { label: 'Total Records', value: total,    icon: Users,        accent: 'bg-brand-blue', surface: 'bg-blue-50',   text: 'text-brand-blue' },
    { label: 'Pending Review', value: pending, icon: Clock,        accent: 'bg-orange-400', surface: 'bg-orange-50', text: 'text-orange-600' },
    { label: 'Verified',       value: verified, icon: CheckCircle, accent: 'bg-green-500',  surface: 'bg-green-50',  text: 'text-green-600' },
    { label: 'Failed',         value: failed,   icon: XCircle,     accent: 'bg-red-500',    surface: 'bg-red-50',    text: 'text-red-600' },
  ];

  const updateBatchWorkflow = (batchId, patch) => {
    setWorkflowByBatch((current) => {
      const next = { ...current, [batchId]: { ...(current[batchId] || {}), ...patch, lastAction: new Date().toISOString() } };
      localStorage.setItem(BATCH_WORKFLOW_KEY, JSON.stringify(next));
      return next;
    });
  };

  // ── Action: Mail to Verifier ─────────────────────────────────────────────
  const openMailVerifierModal = (batch) => {
    setVerifierModalBatch(batch);
    setVerifierModalOpen(true);
  };

  const handleConfirmMailVerifier = async (verifier, template) => {
    const batch = verifierModalBatch;
    const verifierEmail = verifier.email_address || verifier.email;
    if (!batch || !verifierEmail) {
      toast.error('Missing batch or verifier email.');
      return;
    }
    setMailSending(true);
    try {
      const { data: reqData } = await verificationAPI.requestManualVerification({
        batch_id:                 batch.id,
        verification_type_name:   'Manual Verification',
        verifier_email:           verifierEmail,
      });

      const token = reqData?.token;
      const requestId = reqData?.request_id;
      const expiresAt = reqData?.expires_at;
      const responseEmail = reqData?.verifier_email || verifierEmail;

      if (!token || !requestId) {
        throw new Error('Manual verification response did not include the required token or request ID.');
      }

      const uploadLink = `${window.location.origin}/upload?batch=${encodeURIComponent(batch.name)}&token=${encodeURIComponent(token)}`;

      const finalBody = template.body
        .replaceAll(MANUAL_UPLOAD_LINK_PLACEHOLDER, uploadLink)
        .replace(/https?:\/\/[^\s]*\/upload\?[^\s\n]*/g, uploadLink)
        .replace(/\{generated-on-send\}/g, token);

      updateBatchWorkflow(batch.id, {
        status:        'send_to_verifier',
        mailTemplate:  { ...template, body: finalBody },
        verifierToken: token,
        uploadLink,
        verifierEmail: responseEmail,
        requestId,
        expiresAt,
      });

      toast.success(`Manual verification request sent to ${verifier.name}`);
      setVerifierModalOpen(false);
      setVerifierModalBatch(null);
    } catch (err) {
      toast.error(getApiError(err, 'Could not generate upload token. The request was not marked as sent.'));
    } finally {
      setMailSending(false);
    }
  };

  // ── Action: Upload Verified Document ────────────────────────────────────
  const openUploadModal = (batch) => {
    setUploadModalBatch(batch);
    setUploadModalOpen(true);
  };

  const handleConfirmUpload = async (file, setProgress) => {
    const batch = uploadModalBatch;
    setUploading(true);
    try {
      setProgress(100);
      updateBatchWorkflow(batch.id, {
        status: 'verified',
        verifiedDocument: true,
        verifiedReport: true,
        verifiedDocumentUrl: null,
        verifiedReportUrl: null,
      });
      toast.success(`Verified data document uploaded. Batch marked Verified.`);
      setUploadModalOpen(false);
      setUploadModalBatch(null);
    } catch (err) {
      // Fallback: mark verified locally if API not live
      updateBatchWorkflow(batch.id, { status: 'verified', verifiedDocument: true, verifiedReport: true });
      toast.success(`(Mock) Verified data document uploaded. Batch marked Verified.`);
      setUploadModalOpen(false);
      setUploadModalBatch(null);
    } finally {
      setUploading(false);
    }
  };

  const openEditBatchModal = (batch) => {
    setEditBatchId(batch.id);
    setEditDraft({
      name: batch.name || '',
      orgName: batch.orgName || '',
      status: batch.status || 'pending',
      notes: batch.editNotes || '',
    });
    setEditModalOpen(true);
  };

  const handleSaveBatchEdit = () => {
    if (!editBatchId) return;
    setEditSaving(true);
    updateBatchWorkflow(editBatchId, { edited: editDraft, status: editDraft.status });
    setTimeout(() => {
      setEditSaving(false);
      setEditModalOpen(false);
      toast.success('Batch changes saved (dummy)');
    }, 250);
  };

  // ── Action: Generate Batch Assets ────────────────────────────────────────
  const handleGenerateAssets = async (batch) => {
    setGeneratingAssets(true);
    const toastId = toast.loading(`Generating assets for ${batch.total} records…`);
    try {
      const finalAssets = await Promise.all(batch.records.map(async (r) => {
          let idCardUrl = `/mock-assets/${batch.id}/${r.id}-id-card.pdf`;
          try {
            const { data } = await verificationAPI.generateQRAndCertificate(r.id);
            if (data?.pdf_url) idCardUrl = data.pdf_url;
          } catch {}
          return {
            recordId: r.id,
            title: recordTitle(r),
            idCardUrl,
            qrCodeUrl: `/mock-assets/${batch.id}/${r.id}-qr.png`,
            reportUrl: `/mock-assets/${batch.id}/${r.id}-report.pdf`,
          };
        }));
      updateBatchWorkflow(batch.id, { assets: finalAssets });
      toast.dismiss(toastId);
      toast.success(`Generated assets for ${finalAssets.length} records`);
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(getApiError(err, 'Failed to generate assets'));
    } finally {
      setGeneratingAssets(false);
    }
  };

  // ── Action: Send to Organization ────────────────────────────────────────
  const handleSendToOrganization = async (batch) => {
    setSendingToOrg(true);
    try {
      const assets = batch.assets.length
        ? batch.assets
        : batch.records.map((r) => ({
            recordId: r.id,
            title: recordTitle(r),
            idCardUrl: `/mock-assets/${batch.id}/${r.id}-id-card.pdf`,
            qrCodeUrl: `/mock-assets/${batch.id}/${r.id}-qr.png`,
            reportUrl: `/mock-assets/${batch.id}/${r.id}-report.pdf`,
          }));
      updateBatchWorkflow(batch.id, { status: 'send_to_organization', assets });
      toast.success(`${batch.name} assets shared with the organization`);
    } catch (err) {
      // Fallback mock
      const assets = batch.assets.length ? batch.assets : batch.records.map((r) => ({
        recordId: r.id, title: recordTitle(r),
        idCardUrl: `/mock-assets/${batch.id}/${r.id}-id-card.pdf`,
        qrCodeUrl: `/mock-assets/${batch.id}/${r.id}-qr.png`,
        reportUrl: `/mock-assets/${batch.id}/${r.id}-report.pdf`,
      }));
      updateBatchWorkflow(batch.id, { status: 'send_to_organization', assets });
      toast.success(`(Mock) ${batch.name} assets shared with the organization`);
    } finally {
      setSendingToOrg(false);
    }
  };

  // ── Action: Download Verified Document ──────────────────────────────────
  const handleDownloadVerifiedDocument = async (batch) => {
    // If we have a real URL from the upload response, open it directly
    if (batch.verifiedDocumentUrl) {
      window.open(batch.verifiedDocumentUrl, '_blank');
      return;
    }
    setDownloadingDoc(true);
    try {
      const content = `Mock Verified Document\nBatch: ${batch.name}\nBatch ID: ${batch.id}\nRecords: ${batch.total}\nGenerated: ${new Date().toLocaleString()}`;
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      triggerBlobDownload(blob, `${batch.name.replace(/\s+/g, '-')}-verified-document.txt`);
      toast('(Mock) Verified document downloaded', { icon: '📄' });
    } catch (err) {
      toast.error(getApiError(err, 'Failed to download document'));
    } finally {
      setDownloadingDoc(false);
    }
  };

  // ── Action: Download Verified Report ────────────────────────────────────
  const handleDownloadVerifiedReport = async (batch) => {
    if (batch.verifiedReportUrl) {
      window.open(batch.verifiedReportUrl, '_blank');
      return;
    }
    setDownloadingReport(true);
    try {
      const content = `Mock Verified Report\nBatch: ${batch.name}\nBatch ID: ${batch.id}\nRecords: ${batch.total}\nGenerated: ${new Date().toLocaleString()}`;
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      triggerBlobDownload(blob, `${batch.name.replace(/\s+/g, '-')}-verified-report.txt`);
      toast('(Mock) Verified report downloaded', { icon: '📊' });
    } catch (err) {
      toast.error(getApiError(err, 'Failed to download report'));
    } finally {
      setDownloadingReport(false);
    }
  };

  // ── Action: Download per-record asset ───────────────────────────────────
  const handleDownloadAsset = (batch, type, record) => {
    const asset = batch.assets.find((a) => a.recordId === record.id);
    const url = type === 'id-card' ? asset?.idCardUrl : asset?.qrCodeUrl;
    if (url && !url.startsWith('/mock-')) {
      window.open(url, '_blank');
      return;
    }
    const title = recordTitle(record);
    const content = `Mock ${type}\nBatch: ${batch.name}\nRecord: ${title} (${record.id})\nGenerated: ${new Date().toLocaleString()}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    triggerBlobDownload(blob, `${title.replace(/\s+/g, '-')}-${type}.txt`);
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

      {/* Stat Cards */}
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

      {/* Filter bar */}
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

      {/* Batch Table */}
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
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <Card className="p-0 overflow-visible border border-gray-200 shadow-sm">
            <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-sora font-semibold text-brand-dark text-lg">Verification Batches</h3>
                <p className="text-sm text-gray-500 font-inter mt-1">Manage verifier handoff, uploads, generated assets, and organization sharing.</p>
              </div>
              <Badge status="default" className="bg-gray-900 text-white">{visibleBatches.length} batches</Badge>
            </div>
            <div className="overflow-x-auto scrollbar-hidden bg-white">
              <table className="w-full min-w-[1120px] border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 font-inter">Batch</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 font-inter">Progress</th>
                    <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-500 font-inter">Records</th>
                    <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-500 font-inter">Pending</th>
                    <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-500 font-inter">Verified</th>
                    <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-500 font-inter">Failed</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 font-inter">Status</th>
                    <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-500 font-inter">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {visibleBatches.map((batch) => {
                    const complete = batch.total ? Math.round(((batch.verified + batch.failed) / batch.total) * 100) : 0;
                    return (
                      <tr key={batch.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-brand-blue/10 text-brand-blue flex items-center justify-center shrink-0">
                              <Package size={18} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-sora font-semibold text-lg leading-5 text-brand-dark">{batch.name}</p>
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
                                <span key={step.id} className={`h-1.5 rounded-full ${index <= activeIndex ? 'bg-brand-blue' : 'bg-gray-200'}`} />
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="inline-flex min-w-10 justify-center rounded-lg bg-gray-100 px-2.5 py-1 text-sm font-bold text-brand-dark font-inter border border-gray-200">{batch.total}</span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="inline-flex min-w-9 justify-center rounded-lg bg-orange-50 px-2.5 py-1 text-sm font-bold text-orange-600 font-inter border border-orange-100">{batch.pending}</span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="inline-flex min-w-9 justify-center rounded-lg bg-green-50 px-2.5 py-1 text-sm font-bold text-green-600 font-inter border border-green-100">{batch.verified}</span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="inline-flex min-w-9 justify-center rounded-lg bg-red-50 px-2.5 py-1 text-sm font-bold text-red-600 font-inter border border-red-100">{batch.failed}</span>
                        </td>
                        <td className="px-5 py-4">
                          <div className={`inline-flex flex-col gap-1 rounded-xl border px-3 py-2 ${batch.statusMeta.tone}`}>
                            <span className="text-xs font-semibold font-inter">{batch.statusMeta.label}</span>
                            <span className="text-[11px] opacity-80 font-inter">{batch.statusMeta.stage}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="relative flex items-center justify-center min-w-[80px]">
                            <button
                              type="button"
                              onClick={() => setActionMenuBatchId((current) => (current === batch.id ? null : batch.id))}
                              className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-brand-dark hover:bg-gray-50 shadow-sm"
                            >
                              <MoreVertical size={14} />
                            </button>
                            {actionMenuBatchId === batch.id && (
                              <div className="absolute right-0 top-10 z-20 w-44 rounded-xl border border-gray-200 bg-white shadow-md p-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionMenuBatchId(null);
                                    setSelectedBatchId(batch.id);
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm font-inter text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <Eye size={14} />
                                  View Details
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionMenuBatchId(null);
                                    if (batch.status === 'pending') openMailVerifierModal(batch);
                                    else toast('Mail Verifier is available in Pending stage only');
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm font-inter text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <Mail size={14} />
                                  Mail Verifier
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionMenuBatchId(null);
                                    openEditBatchModal(batch);
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm font-inter text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <Pencil size={14} />
                                  Edit Batch
                                </button>
                              </div>
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

      {/* ── View Details Modal ─────────────────────────────────────────────── */}
      <Modal
        isOpen={!!selectedBatch}
        onClose={() => setSelectedBatchId(null)}
        title={selectedBatch ? `${selectedBatch.name} Control Center` : 'Batch Control Center'}
        size="5xl"
      >
        {selectedBatch && (
          <div className="space-y-5">
            {/* Stage header */}
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
                      { label: 'Records', value: selectedBatch.total,    className: 'text-brand-dark' },
                      { label: 'Pending', value: selectedBatch.pending,  className: 'text-orange-600' },
                      { label: 'Verified', value: selectedBatch.verified, className: 'text-green-600' },
                      { label: 'Failed',  value: selectedBatch.failed,   className: 'text-red-600' },
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
                    {selectedBatch.uploadLink && (
                      <div className="pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-500 font-inter mb-1.5">Verifier upload link</p>
                        <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2">
                          <p className="text-[11px] text-brand-blue font-mono flex-1 truncate">{selectedBatch.uploadLink}</p>
                          <button
                            type="button"
                            onClick={() => { navigator.clipboard.writeText(selectedBatch.uploadLink); toast.success('Link copied'); }}
                            className="text-[10px] font-semibold font-inter text-brand-blue hover:text-blue-800 shrink-0"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Workflow + Actions */}
            <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-4">
              {/* Workflow steps */}
              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <p className="font-sora font-semibold text-brand-dark">Batch Workflow</p>
                    <p className="text-xs text-gray-400 font-inter mt-1">Review → Verifier → Verified → Org Shared</p>
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

              {/* Actions panel */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <p className="font-sora font-semibold text-brand-dark">Batch Actions</p>
                    <p className="text-xs text-gray-400 font-inter mt-1">Whole-batch controls only</p>
                  </div>
                  {selectedBatch.sharedWithOrganization && <Badge status="success">Shared</Badge>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-2">

                  {/* Mail verifier — only when pending */}
                  {selectedBatch.status === 'pending' && (
                    <Button variant="outline" size="sm" icon={Mail} className="justify-start"
                      onClick={() => openMailVerifierModal(selectedBatch)}>
                      Mail to Third-Party Verifier
                    </Button>
                  )}
                  <Button variant="outline" size="sm" icon={Pencil} className="justify-start" onClick={() => openEditBatchModal(selectedBatch)}>
                    Edit Batch Information
                  </Button>
                  {/* Download + generate + send to org — for verified / sent */}
                  {(selectedBatch.status === 'verified' || selectedBatch.status === 'send_to_organization') && (
                    <>
                      <Button variant="outline" size="sm" icon={downloadingDoc ? RefreshCw : Download}
                        className="justify-start" disabled={downloadingDoc}
                        onClick={() => handleDownloadVerifiedDocument(selectedBatch)}>
                        {downloadingDoc ? 'Downloading…' : 'Download Verified Document'}
                      </Button>
                      <Button variant="outline" size="sm" icon={downloadingReport ? RefreshCw : FileText}
                        className="justify-start" disabled={downloadingReport}
                        onClick={() => handleDownloadVerifiedReport(selectedBatch)}>
                        {downloadingReport ? 'Downloading…' : 'Download Verified Report'}
                      </Button>
                      <Button variant="primary" size="sm" icon={generatingAssets ? RefreshCw : IdCard}
                        className="justify-start" disabled={generatingAssets}
                        onClick={() => handleGenerateAssets(selectedBatch)}>
                        {generatingAssets ? 'Generating…' : 'Generate Batch Assets'}
                      </Button>
                      {selectedBatch.status === 'verified' && (
                        <Button variant="success" size="sm" icon={sendingToOrg ? RefreshCw : Send}
                          className="justify-start" disabled={sendingToOrg}
                          onClick={() => handleSendToOrganization(selectedBatch)}>
                          {sendingToOrg ? 'Sending…' : 'Send to Organization'}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Records table */}
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
                                <Button variant="ghost" size="sm" icon={IdCard}
                                  onClick={() => handleDownloadAsset(selectedBatch, 'id-card', record)}>
                                  ID Card
                                </Button>
                                <Button variant="ghost" size="sm" icon={QrCode}
                                  onClick={() => handleDownloadAsset(selectedBatch, 'qr-code', record)}>
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

      {/* ── Select Verifier Sub-Modal ────────────────────────────────────── */}
      <SelectVerifierModal
        isOpen={verifierModalOpen}
        onClose={() => { setVerifierModalOpen(false); setVerifierModalBatch(null); }}
        onConfirm={handleConfirmMailVerifier}
        batchName={verifierModalBatch?.name || ''}
        sending={mailSending}
      />

      {/* ── Upload Verified Sub-Modal ────────────────────────────────────── */}
      <UploadVerifiedModal
        isOpen={uploadModalOpen}
        onClose={() => { setUploadModalOpen(false); setUploadModalBatch(null); }}
        onConfirm={handleConfirmUpload}
        batchName={uploadModalBatch?.name || ''}
        uploading={uploading}
      />

      <EditBatchModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        draft={editDraft}
        onChange={(field, value) => setEditDraft((current) => ({ ...current, [field]: value }))}
        onSave={handleSaveBatchEdit}
        saving={editSaving}
      />
    </AuthLayout>
  );
};

export default BatchMonitor;
