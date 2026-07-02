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
import { verificationAPI, verifiersAPI, getApiError, triggerBlobDownload } from '@/services/api';
import {
  ArrowRight, CheckCircle, ChevronLeft, Clock, Download, Eye, FileText, Filter, IdCard, Info,
  Mail, MoreVertical, Package, Pencil, Plus, QrCode, RefreshCw, Send, Trash2, Upload, User, Users, X, XCircle, Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';


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

const formatCreatedAt = (value) => {
  if (!value) return 'Created date unavailable';
  return new Date(value).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const groupByBatch = (records) => {
  const batches = records.reduce((acc, record) => {
    const id = record.batch_id || 'single-records';
    const createdAt = record.created_at ? new Date(record.created_at).getTime() : 0;
    if (!acc[id]) {
      acc[id] = {
        id, name: id === 'single-records' ? 'Single records' : `Batch ${id.slice(0, 8)}`,
        orgName: record.organization_name || record.org_name || 'Organization',
        records: [], total: 0, pending: 0, verified: 0, failed: 0, latestCreatedAt: createdAt,
      };
    }
    acc[id].records.push(record);
    acc[id].total += 1;
    if (createdAt > (acc[id].latestCreatedAt || 0)) acc[id].latestCreatedAt = createdAt;
    if (record.verification_status === 'verified') acc[id].verified += 1;
    else if (record.verification_status === 'failed') acc[id].failed += 1;
    else acc[id].pending += 1;
    return acc;
  }, {});
  return Object.values(batches).sort((a, b) => {
    if ((b.latestCreatedAt || 0) !== (a.latestCreatedAt || 0)) {
      return (b.latestCreatedAt || 0) - (a.latestCreatedAt || 0);
    }
    return b.pending - a.pending || b.total - a.total;
  });
};

// ── Smart Send — Verifier Row ─────────────────────────────────────────────────
const VerifierRow = ({ row, ri, allVerifiers, batchTotal, countBefore, onUpdate, onRemove }) => {
  const [showTemplate, setShowTemplate] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const verifierInfo = allVerifiers.find((v) => v.id === row.verifier_id);
  const count     = parseInt(row.count) || 0;
  const available = batchTotal - countBefore;   // slots left for this row and beyond
  const isOver    = count > available;
  const rangeStart = countBefore + 1;
  const rangeEnd   = countBefore + count;

  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-3">

      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-blue text-[10px] font-bold text-white font-inter">{ri + 1}</span>
        <p className="flex-1 text-xs font-semibold text-brand-dark font-inter">Verifier {ri + 1}</p>
        {count > 0 && !isOver && (
          <span className="rounded-full bg-brand-blue/10 px-2 py-0.5 text-[10px] font-semibold text-brand-blue font-inter">
            {count} user{count !== 1 ? 's' : ''}
          </span>
        )}
        {isOver && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600 font-inter">over limit</span>
        )}
        <button type="button" onClick={() => onRemove(row._key)}
          className="rounded-lg p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors">
          <Trash2 size={12} />
        </button>
      </div>

      {/* Verifier picker */}
      <div>
        <label className="block text-[11px] font-medium text-gray-500 font-inter mb-1">Select Verifier *</label>
        <div ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((p) => !p)}
            className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-sm font-inter text-left transition-colors focus:outline-none ${dropdownOpen ? 'rounded-t-xl border border-b-0 border-brand-blue/40 bg-white' : 'rounded-xl border border-gray-200 bg-white hover:border-brand-blue/40'}`}
          >
            <span className={verifierInfo ? 'text-brand-dark font-medium' : 'text-gray-400'}>
              {verifierInfo
                ? `${verifierInfo.name || verifierInfo.email}${verifierInfo.organization ? ` — ${verifierInfo.organization}` : ''}`
                : '— Choose a verifier —'}
            </span>
            <ChevronLeft size={14} className="shrink-0 text-gray-400" style={{ transform: dropdownOpen ? 'rotate(90deg)' : 'rotate(-90deg)' }} />
          </button>
          {dropdownOpen && (
            <div className="rounded-b-xl border border-t-0 border-brand-blue/40 bg-white overflow-hidden">
              <button type="button" onClick={() => { onUpdate(row._key, { verifier_id: '' }); setDropdownOpen(false); }}
                className="w-full px-3 py-2 text-left text-sm font-inter text-gray-400 hover:bg-gray-50 transition-colors border-b border-gray-100">
                — Choose a verifier —
              </button>
              <div className="max-h-36 overflow-y-auto divide-y divide-gray-50">
                {allVerifiers.map((v) => (
                  <button key={v.id} type="button"
                    onClick={() => { onUpdate(row._key, { verifier_id: v.id }); setDropdownOpen(false); }}
                    className={`w-full px-3 py-2.5 text-left transition-colors hover:bg-blue-50 ${row.verifier_id === v.id ? 'bg-blue-50' : ''}`}>
                    <p className="text-sm font-semibold text-brand-dark font-inter leading-tight">
                      {v.name || v.email}
                      {row.verifier_id === v.id && <span className="ml-1.5 text-[10px] font-bold text-brand-blue">✓</span>}
                    </p>
                    {(v.organization || v.specialization) && (
                      <p className="text-[10px] text-gray-400 font-inter mt-0.5">{[v.organization, v.specialization].filter(Boolean).join(' · ')}</p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        {verifierInfo?.email && <p className="mt-1 text-[11px] text-gray-400 font-inter">{verifierInfo.email}</p>}
      </div>

      {/* User count */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[11px] font-medium text-gray-500 font-inter">Users to assign *</label>
          <span className={`text-[11px] font-inter ${isOver ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
            {isOver ? `only ${available} available` : `${available} of ${batchTotal} remaining`}
          </span>
        </div>
        <div className={`flex items-center rounded-xl border overflow-hidden ${isOver ? 'border-red-300' : 'border-gray-200'}`}>
          <button type="button"
            onClick={() => onUpdate(row._key, { count: String(Math.max(0, count - 1)) })}
            disabled={count === 0}
            className="px-4 py-2.5 text-gray-400 hover:bg-gray-50 hover:text-brand-dark transition-colors disabled:opacity-30 text-base select-none font-medium">
            −
          </button>
          <input
            type="number"
            min={0}
            max={batchTotal}
            value={row.count}
            onChange={(e) => onUpdate(row._key, { count: e.target.value })}
            className={`flex-1 py-2.5 text-sm font-bold font-inter text-center border-x border-gray-100 focus:outline-none bg-transparent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${isOver ? 'text-red-500' : count > 0 ? 'text-brand-blue' : 'text-gray-400'}`}
            placeholder="0"
          />
          <button type="button"
            onClick={() => onUpdate(row._key, { count: String(count + 1) })}
            disabled={available <= 0}
            className="px-4 py-2.5 text-gray-400 hover:bg-gray-50 hover:text-brand-dark transition-colors disabled:opacity-30 text-base select-none font-medium">
            +
          </button>
        </div>
        {count > 0 && !isOver && rangeEnd <= batchTotal && (
          <p className="mt-1 text-[11px] text-gray-400 font-inter">
            {count === 1 ? `User ${rangeStart}` : `Users ${rangeStart}–${rangeEnd}`} of {batchTotal}
          </p>
        )}
      </div>

      {/* Email template */}
      <button type="button" onClick={() => setShowTemplate((p) => !p)}
        className="flex items-center gap-1.5 text-xs text-brand-blue font-inter hover:opacity-70">
        <Mail size={11} />{showTemplate ? 'Hide email template' : 'Customize email template'}
      </button>

      {showTemplate && (
        <div className="space-y-2">
          <div>
            <label className="block text-[11px] font-medium text-gray-500 font-inter mb-1">Subject *</label>
            <input value={row.email_subject} onChange={(e) => onUpdate(row._key, { email_subject: e.target.value })}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-inter focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-500 font-inter mb-1">Body *</label>
            <textarea rows={4} value={row.email_body} onChange={(e) => onUpdate(row._key, { email_body: e.target.value })}
              className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm font-inter focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
            <p className="mt-1 text-[10px] text-gray-400 font-inter">The Excel file and upload link are automatically appended by the system.</p>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Smart Send Modal ─────────────────────────────────────────────────────────
const SmartSendModal = ({ isOpen, onClose, onSent, batch }) => {
  const [verificationTypes, setVerificationTypes] = useState([]);
  const [allVerifiers,      setAllVerifiers]      = useState([]);
  const [loading,           setLoading]           = useState(false);
  // assignments: { [type_name]: [{ _key, verifier_id, email_subject, email_body, count: '' }] }
  const [assignments, setAssignments] = useState({});
  const [sending,     setSending]     = useState(false);
  const [expandedType, setExpandedType] = useState(null);

  const slugToLabel = (s) => s?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || s;
  const defaultSubject = (typeName) => `Verification Request: ${slugToLabel(typeName)}`;
  const defaultBody = (typeName) =>
    `Hi,\n\nPlease find the attached Excel file with the candidates assigned to you for ${slugToLabel(typeName)} verification.\n\nComplete the verification and upload your report using the secure link provided.\n\nRegards,\nTruMarkZ Admin`;

  // Derive batch users from the already-loaded batch.records
  const batchUsers = (batch?.records || []).map((r) => ({
    id: r.id,
    name: r.full_name || r.product_name || r.email || r.id,
  }));

  useEffect(() => {
    if (!isOpen || !batch?.id) return;
    setAssignments({});
    setExpandedType(null);
    setLoading(true);
    Promise.all([
      verificationAPI.getThirdPartyVerifiers(batch.id),
      verifiersAPI.getAll(),
    ])
      .then(([typesRes, verifiersRes]) => {
        const raw = typesRes.data?.third_party_verifiers || [];
        const typeMap = {};
        raw.forEach((v) => {
          if (!typeMap[v.verification_name]) {
            typeMap[v.verification_name] = { verification_name: v.verification_name, label: v.label || slugToLabel(v.verification_name) };
          }
        });
        const types = Object.values(typeMap);
        setVerificationTypes(types);
        if (types.length > 0) setExpandedType(types[0].verification_name);
        const rawVerifiers = verifiersRes.data?.verifiers || verifiersRes.data || [];
        setAllVerifiers(Array.isArray(rawVerifiers) ? rawVerifiers : []);
      })
      .catch(() => toast.error('Failed to load verification data'))
      .finally(() => setLoading(false));
  }, [isOpen, batch?.id]);

  const addVerifier = (typeName) => {
    setAssignments((prev) => ({
      ...prev,
      [typeName]: [
        ...(prev[typeName] || []),
        { _key: `${typeName}-${Date.now()}`, verifier_id: '', email_subject: defaultSubject(typeName), email_body: defaultBody(typeName), count: '' },
      ],
    }));
  };

  const autoSplit = (typeName) => {
    const activeRows = (assignments[typeName] || []).filter((r) => r.verifier_id);
    if (activeRows.length === 0) return;
    const perV    = Math.floor(batchUsers.length / activeRows.length);
    const remainder = batchUsers.length % activeRows.length;
    let activeIdx = 0;
    setAssignments((prev) => ({
      ...prev,
      [typeName]: (prev[typeName] || []).map((row) => {
        if (!row.verifier_id) return row;
        const c = perV + (activeIdx < remainder ? 1 : 0);
        activeIdx++;
        return { ...row, count: String(c) };
      }),
    }));
  };

  const removeVerifier = (typeName, key) =>
    setAssignments((prev) => ({ ...prev, [typeName]: (prev[typeName] || []).filter((v) => v._key !== key) }));

  const updateVerifier = (typeName, key, patch) =>
    setAssignments((prev) => ({
      ...prev,
      [typeName]: (prev[typeName] || []).map((v) => v._key === key ? { ...v, ...patch } : v),
    }));

  const typeRows = (typeName) => assignments[typeName] || [];

  // Coverage: per type, sum of counts of active (verifier-assigned) rows vs batch total
  const typesCoverage = verificationTypes.map((t) => {
    const activeRows = typeRows(t.verification_name).filter((r) => r.verifier_id);
    const covered = activeRows.reduce((s, r) => s + (parseInt(r.count) || 0), 0);
    return { typeName: t.verification_name, covered, total: batchUsers.length, hasVerifiers: activeRows.length > 0 };
  });

  const activeTypes  = typesCoverage.filter((t) => t.hasVerifiers);
  const hasOverflow  = activeTypes.some((t) => t.covered > t.total);
  const allCovered   = batchUsers.length === 0 || (activeTypes.length > 0 && activeTypes.every((t) => t.covered === t.total));
  const totalAssigned = activeTypes.reduce((n, t) => n + typeRows(t.typeName).filter((r) => r.verifier_id).length, 0);
  const canSend = totalAssigned > 0 && allCovered && !hasOverflow;

  const handleSend = async () => {
    if (!allCovered || hasOverflow) {
      toast.error('User counts must add up exactly to the total batch size for each verification type');
      return;
    }
    const batchUserIds = batchUsers.map((u) => u.id);
    const verification_assignments = verificationTypes
      .map((t) => {
        let offset = 0;
        const verifiers = typeRows(t.verification_name)
          .filter((v) => v.verifier_id && parseInt(v.count) > 0 && v.email_subject.trim() && v.email_body.trim())
          .map(({ verifier_id, email_subject, email_body, count }) => {
            const n       = parseInt(count);
            const user_ids = batchUserIds.slice(offset, offset + n);
            offset += n;
            return { verifier_id, email_subject, email_body, user_ids };
          });
        return { verification_type_name: t.verification_name, verifiers };
      })
      .filter((t) => t.verifiers.length > 0);

    if (verification_assignments.length === 0) {
      toast.error('Assign at least one verifier to a verification type');
      return;
    }
    setSending(true);
    try {
      const { data } = await verificationAPI.smartSendManualVerification({ batch_id: batch.id, verification_assignments });
      const summary = data?.results?.map((r) => `${slugToLabel(r.verification_type_name)}: ${r.verifiers?.map((v) => `${v.assigned_count} users`).join(', ')}`).join(' | ');
      toast.success(summary ? `Smart Send done — ${summary}` : 'Smart Send complete');
      onSent?.(data);
      onClose();
    } catch (err) {
      toast.error(getApiError(err, 'Smart Send failed'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Smart Send to Verifiers" size="xl">
      <div className="space-y-4">

        {/* Batch + coverage summary chip */}
        <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-blue/15 text-brand-blue shrink-0">
            <Zap size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-500 font-inter">Smart Send</p>
            <p className="text-sm font-semibold text-brand-dark font-inter truncate">{batch?.name}</p>
          </div>
          <div className="flex gap-3 shrink-0 text-right">
            <div>
              <p className="text-[10px] text-gray-400 font-inter">Total users</p>
              <p className="text-lg font-bold text-brand-dark font-sora">{batchUsers.length}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-inter">Verifiers</p>
              <p className="text-lg font-bold text-brand-blue font-sora">{totalAssigned}</p>
            </div>
          </div>
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5">
          <Info size={13} className="text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700 font-inter leading-relaxed">
            Manually assign <strong>each batch user</strong> to a verifier. Each verifier receives an Excel of their assigned users + a secure upload link.{' '}
            <strong>All {batchUsers.length} users must be assigned</strong> — no user can be left out or assigned twice.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <RefreshCw size={22} className="animate-spin text-brand-blue" />
            <p className="text-sm text-gray-400 font-inter">Loading verification types & verifiers…</p>
          </div>
        ) : verificationTypes.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-gray-400 font-inter">No manual verification types found for this batch.</p>
          </div>
        ) : (
          <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-1">
            {verificationTypes.map((vtype) => {
              const rows    = typeRows(vtype.verification_name);
              const isOpen_ = expandedType === vtype.verification_name;
              const cov     = typesCoverage.find((c) => c.typeName === vtype.verification_name);
              const assigned = rows.filter((r) => r.verifier_id).length;
              const fullyDone = cov?.hasVerifiers && cov.covered === cov.total && cov.total > 0;

              return (
                <div key={vtype.verification_name} className="overflow-hidden rounded-xl border border-gray-100 bg-white">
                  {/* Type header */}
                  <button
                    type="button"
                    onClick={() => setExpandedType(isOpen_ ? null : vtype.verification_name)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${fullyDone ? 'bg-green-100 text-green-600' : 'bg-brand-blue/10 text-brand-blue'}`}>
                      {fullyDone ? <CheckCircle size={14} /> : <Mail size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-brand-dark font-inter">{vtype.label}</p>
                      <p className="text-xs text-gray-400 font-mono">{vtype.verification_name}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {assigned > 0 && (
                        <span className="flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-[10px] font-semibold text-green-700 font-inter">
                          <Users size={9} />{assigned} verifier{assigned !== 1 ? 's' : ''}
                        </span>
                      )}
                      {cov?.hasVerifiers && (
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold font-inter ${fullyDone ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {cov.covered}/{cov.total} users
                        </span>
                      )}
                      <ChevronLeft size={14} className={`text-gray-400 transition-transform ${isOpen_ ? '-rotate-90' : 'rotate-180'}`} />
                    </div>
                  </button>

                  {/* Expanded */}
                  {isOpen_ && (
                    <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-3 space-y-3">
                      {rows.length === 0 && (
                        <p className="text-xs text-gray-400 font-inter text-center py-2">No verifiers assigned yet. Add one below.</p>
                      )}

                      {rows.map((row, ri) => {
                        const countBefore = rows
                          .slice(0, ri)
                          .reduce((s, r) => s + (parseInt(r.count) || 0), 0);
                        return (
                          <VerifierRow
                            key={row._key}
                            row={row}
                            ri={ri}
                            allVerifiers={allVerifiers}
                            batchTotal={batchUsers.length}
                            countBefore={countBefore}
                            onUpdate={(key, patch) => updateVerifier(vtype.verification_name, key, patch)}
                            onRemove={(key) => removeVerifier(vtype.verification_name, key)}
                          />
                        );
                      })}

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => addVerifier(vtype.verification_name)}
                          className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-2.5 text-sm font-semibold text-gray-500 font-inter transition-colors hover:border-brand-blue hover:text-brand-blue"
                        >
                          <Plus size={14} />
                          {rows.length === 0 ? 'Assign a Verifier' : 'Add Another Verifier'}
                        </button>
                        {rows.filter((r) => r.verifier_id).length >= 2 && (
                          <button
                            type="button"
                            onClick={() => autoSplit(vtype.verification_name)}
                            className="flex items-center gap-1.5 rounded-xl border-2 border-dashed border-brand-blue/30 px-3 py-2 text-xs font-semibold text-brand-blue font-inter transition-colors hover:bg-brand-blue/5"
                          >
                            <Zap size={12} /> Auto-split
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Coverage warning */}
        {!loading && activeTypes.length > 0 && (!allCovered || hasOverflow) && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
            <Info size={12} className="text-amber-500 shrink-0" />
            <p className="text-xs text-amber-700 font-inter">
              {activeTypes.filter((t) => t.covered !== t.total).map((t) => {
                const diff = t.total - t.covered;
                return diff > 0
                  ? `${slugToLabel(t.typeName)}: ${diff} user${diff !== 1 ? 's' : ''} unassigned`
                  : `${slugToLabel(t.typeName)}: ${Math.abs(diff)} over total`;
              }).join(' · ')}
            </p>
          </div>
        )}

        {/* Footer */}
        {!loading && verificationTypes.length > 0 && (
          <div className="flex gap-2 pt-1 border-t border-gray-100">
            <Button variant="ghost" onClick={onClose} className="flex-1" disabled={sending}>Cancel</Button>
            <Button
              variant="primary"
              icon={sending ? RefreshCw : Zap}
              className="flex-1"
              disabled={!canSend || sending}
              onClick={handleSend}
            >
              {sending ? 'Sending…' : canSend ? `Smart Send (${totalAssigned} verifier${totalAssigned !== 1 ? 's' : ''})` : 'Assign all users first'}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
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
  const [deletingDraft, setDeletingDraft] = useState(null);
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
    subject: defaultSubject(currentGroup?.verification_name || ''),
    body: defaultBody(currentGroup?.verification_name || ''),
    saveAsDraft: false,
    appliedDraftId: null,
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
        const d = allData[g.verification_name] || { selectedEmail: g.emails[0] || '', subject: defaultSubject(g.verification_name), body: defaultBody(g.verification_name) };
        return { verification_type_name: g.verification_name, verifier_email: d.selectedEmail, email_subject: d.subject, email_body: d.body };
      });
      const { data: result } = await verificationAPI.sendBulkManualVerification({ batch_id: batch.id, verifiers: verifiersPayload });
      await Promise.allSettled(
        groups.filter((g) => allData[g.verification_name]?.saveAsDraft).map((g) => {
          const d = allData[g.verification_name];
          if (d.appliedDraftId) {
            // Update the existing draft via PUT
            return verificationAPI.updateEmailDraft(d.appliedDraftId, { subject: d.subject, body: d.body });
          }
          // Create a new draft via POST
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
                <p className="font-sora font-semibold text-brand-dark mt-0.5">{currentGroup?.verification_name}</p>
                {currentGroup?.label && (
                  <p className="text-[11px] text-gray-400 font-inter mt-0.5">{currentGroup?.label}</p>
                )}
              </div>
              {groups.length > 1 && (
                <div className="flex gap-1.5 items-center">
                  {groups.map((g, i) => (
                    <div key={g.verification_name} className={`rounded-full transition-all ${i === stepIndex ? 'w-5 h-2 bg-brand-blue' : i < stepIndex ? 'w-2 h-2 bg-blue-300' : 'w-2 h-2 bg-gray-200'}`} />
                  ))}
                </div>
              )}
            </div>

            {/* Main tab bar: Select Verifier | Mail Template */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
              {[['email', 'Select Verifier'], ['template', 'Mail Template']].map(([val, label]) => (
                <button key={val} type="button" onClick={() => setActiveTab(val)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium font-inter transition-all ${activeTab === val ? 'bg-white text-brand-dark shadow-sm' : 'text-gray-500 hover:text-brand-dark'}`}>
                  {label}
                </button>
              ))}
            </div>

            {activeTab === 'email' ? (
              /* ── Select Verifier tab ── */
              <div className="space-y-3">
                <p className="text-xs text-gray-500 font-inter">Select the email address to send this verification request to:</p>
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {currentGroup?.emails.map((email) => (
                    <button key={email} type="button" onClick={() => updateStep({ selectedEmail: email })}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${currentData.selectedEmail === email ? 'border-brand-blue bg-blue-50 shadow-sm' : 'border-gray-200 hover:border-brand-blue/40 hover:bg-gray-50'}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${currentData.selectedEmail === email ? 'bg-brand-blue text-white' : 'bg-brand-blue/10 text-brand-blue'}`}>
                        <Mail size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold text-gray-400 font-inter uppercase tracking-wider mb-0.5">
                          {currentGroup?.verification_name}
                        </p>
                        <p className="text-sm font-medium text-brand-dark font-inter truncate">{email}</p>
                      </div>
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
              /* ── Mail Template tab ── */
              <div className="space-y-3">
                {/* Template sub-tabs: Template 1, Template 2, … + New */}
                {loadingDrafts ? (
                  <div className="flex items-center gap-2 py-0.5">
                    <RefreshCw size={11} className="animate-spin text-gray-400" />
                    <span className="text-xs text-gray-400 font-inter">Loading templates…</span>
                  </div>
                ) : (
                  <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto scrollbar-hidden">
                    {drafts.map((d, idx) => {
                      const isActive = currentData.appliedDraftId === d.id;
                      return (
                        <div
                          key={d.id}
                          className={`flex items-center shrink-0 rounded-lg overflow-hidden transition-all ${isActive ? 'bg-white shadow-sm' : 'hover:bg-gray-200/50'}`}
                        >
                          <button
                            type="button"
                            onClick={() => updateStep({ subject: d.subject, body: d.body, appliedDraftId: d.id })}
                            className={`py-1.5 pl-3 pr-2 text-xs font-semibold font-inter whitespace-nowrap transition-colors ${isActive ? 'text-brand-dark' : 'text-gray-500 hover:text-brand-dark'}`}
                          >
                            Template {idx + 1}
                          </button>
                          <button
                            type="button"
                            disabled={deletingDraft === d.id}
                            onClick={async () => {
                              setDeletingDraft(d.id);
                              try {
                                await verificationAPI.deleteEmailDraft(d.id);
                                setDrafts((prev) => prev.filter((x) => x.id !== d.id));
                                if (currentData.appliedDraftId === d.id) {
                                  updateStep({
                                    subject: defaultSubject(currentGroup?.verification_name || ''),
                                    body: defaultBody(currentGroup?.verification_name || ''),
                                    appliedDraftId: null,
                                  });
                                }
                                toast.success('Template deleted');
                              } catch {
                                toast.error('Failed to delete template');
                              } finally {
                                setDeletingDraft(null);
                              }
                            }}
                            className="px-1.5 text-gray-400 hover:text-red-400 disabled:opacity-40 transition-colors"
                          >
                            <XCircle size={11} />
                          </button>
                        </div>
                      );
                    })}
                    {/* + New sub-tab */}
                    <button
                      type="button"
                      onClick={() => updateStep({
                        subject: defaultSubject(currentGroup?.verification_name || ''),
                        body: defaultBody(currentGroup?.verification_name || ''),
                        appliedDraftId: null,
                      })}
                      className={`shrink-0 py-1.5 px-3 rounded-lg text-xs font-semibold font-inter whitespace-nowrap transition-all ${
                        !currentData.appliedDraftId
                          ? 'bg-white shadow-sm text-brand-dark'
                          : 'text-gray-500 hover:text-brand-dark'
                      }`}
                    >
                      Default Template
                    </button>
                  </div>
                )}

                {/* Subject & Body */}
                <div>
                  <label className="block text-xs text-gray-500 font-inter mb-1">Subject</label>
                  <input value={currentData.subject} onChange={(e) => updateStep({ subject: e.target.value, appliedDraftId: null })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-inter focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 font-inter mb-1">Body</label>
                  <textarea rows={6} value={currentData.body} onChange={(e) => updateStep({ body: e.target.value, appliedDraftId: null })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-inter resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
                  <div className="mt-2 flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
                    <Info size={13} className="text-brand-blue mt-0.5 shrink-0" />
                    <p className="text-[11px] text-brand-blue font-inter leading-relaxed">
                      The <strong>one-time secure upload link</strong> is automatically appended to the bottom of this email by the system. The verifier will receive it at the end of their email.
                    </p>
                  </div>
                </div>
                <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                  <input type="checkbox" checked={currentData.saveAsDraft} onChange={(e) => updateStep({ saveAsDraft: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 accent-brand-blue cursor-pointer" />
                  <span className="text-sm font-inter text-gray-600 group-hover:text-brand-dark">Save this template as a draft</span>
                </label>
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
  const [batchDetail, setBatchDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
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
  const [verifierModalOpen,   setVerifierModalOpen]   = useState(false);
  const [verifierModalBatch,  setVerifierModalBatch]  = useState(null);
  const [smartSendOpen,       setSmartSendOpen]       = useState(false);
  const [smartSendBatch,      setSmartSendBatch]      = useState(null);
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

  useEffect(() => {
    if (!selectedBatchId) { setBatchDetail(null); return; }
    setLoadingDetail(true);
    verificationAPI.getBatchDetails(selectedBatchId)
      .then(({ data }) => setBatchDetail(data))
      .catch(() => toast.error('Failed to load batch details'))
      .finally(() => setLoadingDetail(false));
  }, [selectedBatchId]);

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
      createdAt: batch.latestCreatedAt || null,
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
      const batchRecords = batch.records.length ? batch.records : (batchDetail?.users || []);
      const finalAssets = await Promise.all(batchRecords.map(async (r) => {
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
    const fallbackRecords = batch.records.length ? batch.records : (batchDetail?.users || []);
    try {
      const assets = batch.assets.length
        ? batch.assets
        : fallbackRecords.map((r) => ({
            recordId: r.id,
            title: recordTitle(r),
            idCardUrl: `/mock-assets/${batch.id}/${r.id}-id-card.pdf`,
            qrCodeUrl: `/mock-assets/${batch.id}/${r.id}-qr.png`,
            reportUrl: `/mock-assets/${batch.id}/${r.id}-report.pdf`,
          }));
      updateBatchWorkflow(batch.id, { status: 'send_to_organization', assets });
      toast.success(`${batch.name} assets shared with the organization`);
    } catch (err) {
      const assets = batch.assets.length ? batch.assets : fallbackRecords.map((r) => ({
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
                              <p className="text-xs text-gray-400 font-inter mt-1 truncate">{batch.orgName}</p>
                              <p className="text-[11px] text-gray-400 font-inter mt-2">Created {formatCreatedAt(batch.createdAt)}</p>
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
                                    if (batch.status === 'pending' || batch.status === 'send_to_verifier') {
                                      setSmartSendBatch(batch);
                                      setSmartSendOpen(true);
                                    } else {
                                      toast('Smart Send is available for Pending / Send to Verifier batches only');
                                    }
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm font-inter text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <Zap size={14} />
                                  Smart Send
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
                      <p className="text-xs opacity-80 font-inter mt-2">{selectedBatch.orgName}</p>
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
                      <p className="font-sora font-semibold text-brand-dark mt-1">{formatCreatedAt(selectedBatch.createdAt)}</p>
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

                  {/* Smart Send — assign multiple verifiers per type with random split */}
                  {(selectedBatch.status === 'pending' || selectedBatch.status === 'send_to_verifier') && (
                    <Button variant="primary" size="sm" icon={Zap} className="justify-start"
                      onClick={() => { setSmartSendBatch(selectedBatch); setSmartSendOpen(true); }}>
                      Smart Send to Verifiers
                    </Button>
                  )}

                  {/* Mail verifier — legacy single-verifier-per-type flow */}
                  {(selectedBatch.status === 'pending' || selectedBatch.status === 'send_to_verifier') && (
                    <Button variant="outline" size="sm" icon={Mail} className="justify-start"
                      onClick={() => openMailVerifierModal(selectedBatch)}>
                      {selectedBatch.status === 'send_to_verifier' ? 'Send More Verifiers' : 'Mail to Verifier (Basic)'}
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
                        {req.status !== 'failed' && (
                          <button
                            type="button"
                            disabled={resending === (req.request_id || req.token)}
                            onClick={() => handleResend(req.request_id || req.token, req.verifier_email)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-white text-xs font-semibold font-inter text-brand-blue hover:bg-blue-50 disabled:opacity-50 transition-colors"
                          >
                            <RefreshCw size={12} className={resending === (req.request_id || req.token) ? 'animate-spin' : ''} />
                            {resending === (req.request_id || req.token) ? 'Resending...' : 'Resend'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Records table */}
            {(() => {
              const detailRecords = batchDetail?.users || selectedBatch.records || [];
              return (
                <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-4 border-b border-gray-100 bg-gray-50">
                    <div>
                      <h4 className="font-sora font-semibold text-sm text-brand-dark">Batch Records</h4>
                      <p className="text-xs text-gray-400 font-inter mt-1">Individual approvals are disabled. Assets appear after batch verification.</p>
                    </div>
                    <Badge status="default">{loadingDetail ? '…' : detailRecords.length} records</Badge>
                  </div>
                  <div className="max-h-80 overflow-y-auto scrollbar-hidden">
                    {loadingDetail ? (
                      <div className="flex items-center justify-center py-10 gap-2">
                        <RefreshCw size={16} className="animate-spin text-brand-blue" />
                        <p className="text-sm text-gray-400 font-inter">Loading records…</p>
                      </div>
                    ) : detailRecords.length === 0 ? (
                      <div className="py-8 text-center">
                        <p className="text-sm text-gray-400 font-inter">No records found for this batch</p>
                      </div>
                    ) : (
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
                          {detailRecords.map((record) => {
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
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </Modal>

      {/* ── Smart Send Modal ────────────────────────────────────────────── */}
      <SmartSendModal
        isOpen={smartSendOpen}
        onClose={() => { setSmartSendOpen(false); setSmartSendBatch(null); }}
        onSent={(result) => { handleBulkSent(smartSendBatch, result); setSmartSendOpen(false); setSmartSendBatch(null); }}
        batch={smartSendBatch}
      />

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
