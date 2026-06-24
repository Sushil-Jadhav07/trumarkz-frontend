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
  ArrowRight, CheckCircle, ChevronLeft, Clock, Download, Eye, FileText, Filter, IdCard,
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

const buildHtmlBody = (name, uploadUrl) => `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.09);">
  <tr><td style="background:#1e3a8a;padding:28px 40px;text-align:center;">
    <img src="https://trumarkz.asynk.in/assets/Logo/logo%20white.png" alt="TruMarkZ" height="38" style="display:block;margin:0 auto;" />
  </td></tr>
  <tr><td style="height:4px;background:#3b82f6;"></td></tr>
  <tr><td style="padding:36px 40px 28px;">
    <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0f172a;">Manual Verification Request</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;">You have been assigned a verification task by <strong style="color:#0f172a;">TruMarkZ</strong>. Please review the batch details and upload your report using the secure link below.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;margin-bottom:24px;">
      <tr><td style="padding:18px 22px;">
        <p style="margin:0 0 3px;font-size:10px;font-weight:700;color:#2563eb;letter-spacing:0.08em;text-transform:uppercase;">Batch Handoff</p>
        <p style="margin:0;font-size:17px;font-weight:700;color:#0f172a;">${name}</p>
      </td></tr>
    </table>
    <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.6;">Please upload all verification report documents using the secure one-time link below. This link is valid for <strong style="color:#0f172a;">1 hour</strong> and can be used <strong style="color:#0f172a;">only once</strong>.</p>
    <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr><td style="border-radius:8px;background:#1d4ed8;">
        <a href="${uploadUrl}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Upload Verification Documents &rarr;</a>
      </td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fefce8;border:1px solid #fde047;border-radius:8px;margin-bottom:24px;">
      <tr><td style="padding:12px 16px;font-size:12px;color:#713f12;line-height:1.5;">&#9888;&nbsp; <strong>One-time use only.</strong> This link expires in 1 hour and becomes invalid after the first submission.</td></tr>
    </table>
    <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.5;">For any questions contact the TruMarkZ admin team. Do not forward this link to others.</p>
  </td></tr>
  <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
    <p style="margin:0 0 2px;font-size:12px;font-weight:700;color:#1e293b;">TruMarkZ</p>
    <p style="margin:0;font-size:11px;color:#94a3b8;">Automated Compliance Verification Platform &nbsp;&middot;&nbsp; <a href="https://trumarkz.asynk.in" style="color:#3b82f6;text-decoration:none;">trumarkz.asynk.in</a></p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;

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

// ── Select-Verifier sub-modal (multi-step wizard) ────────────────────────────
const SelectVerifierModal = ({ isOpen, onClose, onBulkSent, batch }) => {
  const [groups, setGroups] = useState([]);
  const [loadingVerifiers, setLoadingVerifiers] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [stepData, setStepData] = useState({});
  const [activeTab, setActiveTab] = useState('email');
  const [drafts, setDrafts] = useState([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [sending, setSending] = useState(false);

  const defaultSubject = (label) => `Verification Request: ${label}`;
  const defaultBody = (label) =>
    `Hi Team,\n\nPlease process the verification for: ${label}.\n\nUpload your verified report using the secure one-time link provided at the bottom of this email.\n\nKindly complete the verification and upload the documents.\n\nRegards,\nTruMarkZ Admin`;

  useEffect(() => {
    if (!isOpen || !batch?.id) return;
    setStepIndex(0);
    setStepData({});
    setActiveTab('email');
    setDrafts([]);
    setLoadingVerifiers(true);
    verificationAPI.getThirdPartyVerifiers(batch.id)
      .then(({ data }) => {
        const raw = data?.third_party_verifiers || [];
        const map = {};
        raw.forEach((v) => {
          if (!map[v.verification_name]) {
            map[v.verification_name] = { verification_name: v.verification_name, label: v.label, emails: [] };
          }
          if (v.email_address && !map[v.verification_name].emails.includes(v.email_address)) {
            map[v.verification_name].emails.push(v.email_address);
          }
        });
        setGroups(Object.values(map));
      })
      .catch(() => toast.error('Failed to load verifiers'))
      .finally(() => setLoadingVerifiers(false));
  }, [isOpen, batch?.id]);

  const currentGroup = groups[stepIndex] || null;
  const isLastStep = stepIndex === groups.length - 1;

  const currentData = stepData[currentGroup?.verification_name] || {
    selectedEmail: currentGroup?.emails?.[0] || '',
    subject: defaultSubject(currentGroup?.label || ''),
    body: defaultBody(currentGroup?.label || ''),
    saveAsDraft: false,
  };

  const updateStep = (patch) => {
    if (!currentGroup) return;
    setStepData((prev) => ({
      ...prev,
      [currentGroup.verification_name]: { ...currentData, ...patch },
    }));
  };

  useEffect(() => {
    if (!isOpen || !currentGroup) return;
    setLoadingDrafts(true);
    setDrafts([]);
    verificationAPI.getEmailDraftsByType(currentGroup.verification_name)
      .then(({ data }) => setDrafts(Array.isArray(data) ? data : []))
      .catch(() => setDrafts([]))
      .finally(() => setLoadingDrafts(false));
  }, [isOpen, stepIndex]);

  const handleNext = () => {
    if (currentGroup && !stepData[currentGroup.verification_name]) {
      setStepData((prev) => ({ ...prev, [currentGroup.verification_name]: currentData }));
    }
    if (isLastStep) {
      handleSendAll();
    } else {
      setStepIndex((p) => p + 1);
      setActiveTab('email');
    }
  };

  const handleSendAll = async () => {
    const allData = { ...stepData, ...(currentGroup ? { [currentGroup.verification_name]: currentData } : {}) };
    setSending(true);
    try {
      const verifiersPayload = groups.map((g) => {
        const d = allData[g.verification_name] || { selectedEmail: g.emails[0] || '', subject: defaultSubject(g.label), body: defaultBody(g.label) };
        return { verification_type_name: g.verification_name, verifier_email: d.selectedEmail, email_subject: d.subject, email_body: d.body };
      });
      const { data: result } = await verificationAPI.sendBulkManualVerification({ batch_id: batch.id, verifiers: verifiersPayload });
      await Promise.allSettled(
        groups.filter((g) => allData[g.verification_name]?.saveAsDraft).map((g) => {
          const d = allData[g.verification_name];
          return verificationAPI.createEmailDraft({ verification_type: g.verification_name, subject: d.subject, body: d.body });
        })
      );
      toast.success(`Sent to ${result.total_sent ?? verifiersPayload.length} verifier(s)`);
      onBulkSent?.(result);
      onClose();
    } catch (err) {
      toast.error(getApiError(err, 'Failed to send verification emails'));
    } finally {
      setSending(false);
    }
  };

  const canProceed = !!(currentData.selectedEmail && currentData.subject.trim() && currentData.body.trim());

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Send to Third-Party Verifiers" size="xl">
      <div className="space-y-4">
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-blue-600 font-semibold font-inter">Batch Handoff</p>
          <p className="text-sm text-brand-dark font-semibold font-inter mt-1">{batch?.name}</p>
        </div>

        {loadingVerifiers ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <RefreshCw size={22} className="animate-spin text-brand-blue" />
            <p className="text-sm text-gray-400 font-inter">Loading verifiers...</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm text-gray-400 font-inter">No manual verification types assigned to this batch.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 font-inter uppercase tracking-wider">Step {stepIndex + 1} of {groups.length}</p>
                <p className="font-sora font-semibold text-brand-dark mt-0.5">{currentGroup?.label}</p>
              </div>
              <div className="flex gap-1.5 items-center">
                {groups.map((g, i) => (
                  <div key={g.verification_name} className={`rounded-full transition-all ${i === stepIndex ? 'w-5 h-2 bg-brand-blue' : i < stepIndex ? 'w-2 h-2 bg-blue-300' : 'w-2 h-2 bg-gray-200'}`} />
                ))}
              </div>
            </div>

            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
              {['email', 'template'].map((tab) => (
                <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium font-inter transition-all ${activeTab === tab ? 'bg-white text-brand-dark shadow-sm' : 'text-gray-500 hover:text-brand-dark'}`}>
                  {tab === 'email' ? 'Select Verifier' : 'Mail Template'}
                </button>
              ))}
            </div>

            {activeTab === 'email' ? (
              <div className="space-y-3">
                <p className="text-xs text-gray-500 font-inter">Select the email address to send this verification request to:</p>
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {currentGroup?.emails.map((email) => (
                    <button key={email} type="button" onClick={() => updateStep({ selectedEmail: email })}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${currentData.selectedEmail === email ? 'border-brand-blue bg-blue-50 shadow-sm' : 'border-gray-200 hover:border-brand-blue/40 hover:bg-gray-50'}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${currentData.selectedEmail === email ? 'bg-brand-blue text-white' : 'bg-brand-blue/10 text-brand-blue'}`}>
                        <Mail size={16} />
                      </div>
                      <p className="flex-1 text-sm font-medium text-brand-dark font-inter truncate">{email}</p>
                      {currentData.selectedEmail === email && <CheckCircle size={16} className="text-brand-blue shrink-0" />}
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                  <input type="checkbox" checked={currentData.saveAsDraft} onChange={(e) => updateStep({ saveAsDraft: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 accent-brand-blue cursor-pointer" />
                  <span className="text-sm font-inter text-gray-600 group-hover:text-brand-dark">Save this template as a draft</span>
                </label>
              </div>
            ) : (
              <div className="space-y-3">
                {(loadingDrafts || drafts.length > 0) && (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <p className="text-xs font-semibold text-gray-500 font-inter uppercase tracking-wider mb-2">Load from saved drafts</p>
                    {loadingDrafts ? (
                      <p className="text-xs text-gray-400 font-inter">Loading drafts...</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {drafts.map((d) => (
                          <button key={d.id} type="button" onClick={() => { updateStep({ subject: d.subject, body: d.body }); toast.success('Draft applied'); }}
                            className="px-3 py-1.5 rounded-lg border border-blue-100 bg-white text-xs font-medium text-brand-blue hover:bg-blue-50 font-inter transition-colors">
                            {d.subject || 'Draft'}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div>
                  <label className="block text-xs text-gray-500 font-inter mb-1">Subject</label>
                  <input value={currentData.subject} onChange={(e) => updateStep({ subject: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-inter focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 font-inter mb-1">Body</label>
                  <textarea rows={8} value={currentData.body} onChange={(e) => updateStep({ body: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-inter resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="ghost" onClick={onClose} className="flex-1" disabled={sending}>Cancel</Button>
              {stepIndex > 0 && (
                <Button variant="outline" icon={ChevronLeft} disabled={sending} onClick={() => { setStepIndex((p) => p - 1); setActiveTab('email'); }}>Back</Button>
              )}
              <Button variant="primary" icon={sending ? RefreshCw : isLastStep ? Send : ArrowRight} className="flex-1" disabled={!canProceed || sending} onClick={handleNext}>
                {sending ? 'Sending...' : isLastStep ? 'Send All' : 'Next'}
              </Button>
            </div>
          </>
        )}
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
  const [resending, setResending] = useState(null); // request token being resent
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
      sentRequests: stored.sentRequests || (stored.requestId ? [{
        verification_type_name: 'Manual Verification',
        verifier_email: stored.verifierEmail || '',
        request_id: stored.requestId,
        status: 'sent',
      }] : []),
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
    { label: 'Total Records', value: total,    icon: Users,        accent: 'bg-brand-blue', surface: 'bg-blue-50', text: 'text-brand-blue' },
    { label: 'Pending Review', value: pending, icon: Clock,        accent: 'bg-brand-blue', surface: 'bg-blue-50', text: 'text-brand-blue' },
    { label: 'Verified',       value: verified, icon: CheckCircle, accent: 'bg-brand-blue', surface: 'bg-blue-50', text: 'text-brand-blue' },
    { label: 'Failed',         value: failed,   icon: XCircle,     accent: 'bg-brand-blue', surface: 'bg-blue-50', text: 'text-brand-blue' },
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

  const handleBulkSent = (batch, result) => {
    const sentRequests = result?.results || [];
    updateBatchWorkflow(batch.id, {
      status: 'send_to_verifier',
      sentRequests,
      uploadLink: sentRequests[0]?.upload_link || null,
    });
  };

  const handleResend = async (requestId, verifierEmail) => {
    setResending(requestId);
    try {
      await verificationAPI.resendManualVerification(requestId);
      toast.success(`Verification link resent to ${verifierEmail}`);
    } catch (err) {
      toast.error(getApiError(err, 'Failed to resend verification link'));
    } finally {
      setResending(null);
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
              <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4 items-stretch">
                <div className={`min-w-0 rounded-xl border p-5 ${selectedBatch.statusMeta.tone}`}>
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
                      { label: 'Records', value: selectedBatch.total,    className: 'text-brand-blue' },
                      { label: 'Pending', value: selectedBatch.pending,  className: 'text-brand-blue' },
                      { label: 'Verified', value: selectedBatch.verified, className: 'text-brand-blue' },
                      { label: 'Failed',  value: selectedBatch.failed,   className: 'text-brand-blue' },
                    ].map((item) => (
                      <div key={item.label} className="rounded-xl bg-white/75 border border-white/80 p-3">
                        <p className={`font-sora font-bold text-xl ${item.className}`}>{item.value}</p>
                        <p className="text-[11px] opacity-75 font-inter">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="min-w-0 rounded-xl border border-gray-100 bg-white p-5">
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
                        <div className="flex min-w-0 items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
                          <p className="min-w-0 flex-1 break-all text-[11px] text-brand-blue font-mono">{selectedBatch.uploadLink}</p>
                          <button
                            type="button"
                            onClick={() => { navigator.clipboard.writeText(selectedBatch.uploadLink); toast.success('Link copied'); }}
                            className="shrink-0 text-[10px] font-semibold font-inter text-brand-blue hover:text-blue-800"
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
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-4">
              {/* Workflow steps */}
              <div className="min-w-0 rounded-2xl border border-gray-100 bg-white p-5">
                <div className="mb-4">
                  <p className="font-sora font-semibold text-brand-dark">Batch Workflow</p>
                  <p className="text-xs text-gray-400 font-inter mt-1">Review → Verifier → Verified → Org Shared</p>
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
              <div className="min-w-0 rounded-2xl border border-gray-100 bg-gray-50 p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <p className="font-sora font-semibold text-brand-dark">Batch Actions</p>
                    <p className="text-xs text-gray-400 font-inter mt-1">Whole-batch controls only</p>
                  </div>
                  {selectedBatch.sharedWithOrganization && <Badge status="success">Shared</Badge>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-2">

                  {/* Mail verifier — pending or resend from send_to_verifier */}
                  {(selectedBatch.status === 'pending' || selectedBatch.status === 'send_to_verifier') && (
                    <Button variant="outline" size="sm" icon={Mail} className="justify-start"
                      onClick={() => openMailVerifierModal(selectedBatch)}>
                      {selectedBatch.status === 'send_to_verifier' ? 'Send More Verifiers' : 'Mail to Third-Party Verifier'}
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

            {/* ── Resend panel — shown when batch is send_to_verifier ── */}
            {selectedBatch.status === 'send_to_verifier' && selectedBatch.sentRequests?.length > 0 && (
              <div className="rounded-2xl border border-blue-100 bg-white p-5">
                <div className="mb-4">
                  <p className="font-sora font-semibold text-brand-dark">Manual Verifications Sent</p>
                  <p className="text-xs text-gray-400 font-inter mt-1">Resend the link if a verifier didn't receive it.</p>
                </div>
                <div className="space-y-3">
                  {selectedBatch.sentRequests.map((req) => (
                    <div
                      key={req.request_id || req.verification_type_name}
                      className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
                        req.status === 'failed' ? 'border-red-100 bg-red-50' : 'border-blue-100 bg-blue-50/40'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${req.status === 'failed' ? 'bg-red-100 text-red-500' : 'bg-brand-blue/10 text-brand-blue'}`}>
                          <Mail size={14} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-brand-dark font-inter truncate">{req.verification_type_name}</p>
                          <p className="text-xs text-gray-500 font-inter truncate">{req.verifier_email}</p>
                          {req.error && <p className="text-xs text-red-500 font-inter mt-0.5">{req.error}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge status={req.status === 'failed' ? 'error' : 'success'}>{req.status || 'sent'}</Badge>
                        {req.request_id && (
                          <button
                            type="button"
                            disabled={resending === req.request_id}
                            onClick={() => handleResend(req.request_id, req.verifier_email)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-white text-xs font-semibold font-inter text-brand-blue hover:bg-blue-50 disabled:opacity-50 transition-colors"
                          >
                            <RefreshCw size={12} className={resending === req.request_id ? 'animate-spin' : ''} />
                            {resending === req.request_id ? 'Resending...' : 'Resend'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
        onBulkSent={(result) => { handleBulkSent(verifierModalBatch, result); setVerifierModalOpen(false); setVerifierModalBatch(null); }}
        batch={verifierModalBatch}
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
