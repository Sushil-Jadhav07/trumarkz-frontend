import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { verificationAPI, verifiersAPI, sdcAPI, adminAPI, getApiError, triggerBlobDownload } from '@/services/api';
import { GenerateSDCModal, CertificateDetailModal } from '@/pages/admin/SDCVerification';
import {
  ArrowRight, Building2, CheckCircle, ChevronLeft, Clock, Download, Eye, Filter, Info,
  Mail, MoreVertical, Package, Plus, RefreshCw, Send, ShieldCheck, Sparkles, Trash2, User, Users, X, XCircle, Zap,
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

// Real backend batch statuses (BatchListResponse.status / BatchDetailResponse.status)
// — derived server-side from users + manual verification requests + SDC issuance.
// Monotonic: only ever moves forward through this list.
const STATUS_OPTIONS = [
  { value: '',                          label: 'All' },
  { value: 'pending',                   label: 'Pending' },
  { value: 'processing',                label: 'Processing' },
  { value: 'verification_in_progress',  label: 'Verification In Progress' },
  { value: 'verification_completed',    label: 'Verification Completed' },
  { value: 'sdc_generated',             label: 'SDC Generated' },
];

// "Send to Organization" has no backend concept (batch.status stops at
// sdc_generated) — it's a purely local notify-action, tracked client-side
// only, shown as an extra badge alongside the real status.
const BATCH_WORKFLOW_KEY = 'trumarkz_admin_batch_workflow_mock';

const statusBadge = (status) => {
  if (status === 'approved') return { variant: 'success', label: 'Approved', icon: CheckCircle };
  if (status === 'rejected') return { variant: 'error',   label: 'Rejected', icon: XCircle };
  return                            { variant: 'pending', label: 'Pending',  icon: Clock };
};

const batchStatusMeta = {
  pending:                   { label: 'Pending',                   badge: 'warning', tone: 'bg-orange-50 text-orange-700 border-orange-100' },
  processing:                { label: 'Processing',                badge: 'info',    tone: 'bg-blue-50 text-brand-blue border-blue-100' },
  verification_in_progress: { label: 'Verification In Progress',  badge: 'info',    tone: 'bg-blue-50 text-brand-blue border-blue-100' },
  verification_completed:   { label: 'Verification Completed',    badge: 'success', tone: 'bg-green-50 text-green-700 border-green-100' },
  sdc_generated:             { label: 'SDC Generated',             badge: 'success', tone: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
};

const WORKFLOW_STEPS = [
  { id: 'pending',                   label: 'Pending',     icon: Eye },
  { id: 'processing',                label: 'Processing',  icon: Mail },
  { id: 'verification_in_progress',  label: 'Verifying',   icon: ShieldCheck },
  { id: 'verification_completed',    label: 'Completed',   icon: CheckCircle },
  { id: 'sdc_generated',              label: 'SDC Issued',  icon: Sparkles },
];

const getStoredWorkflow = () => {
  try { return JSON.parse(localStorage.getItem(BATCH_WORKFLOW_KEY) || '{}'); }
  catch { return {}; }
};

const isProductRecord = (record) =>
  record?.entity_type === 'product' || !!record?.product_name || !!record?.category_name || !!record?.custom_fields;

const recordTitle = (record) =>
  record.product_name || record.full_name || record.email || record.id || record.user_id || record.entity_id || 'Verification record';

// verification_type_label is just "Manual"/"Automatic" (a category, per the
// submitted-reports docs) — not a display name. The readable name has to
// come from slugifying verification_type_name (e.g. "police_verification" →
// "Police Verification"); using the label here would show "Manual" as the
// title for every single report.
const formatVerifTypeLabel = (report) =>
  report.verification_type_name?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ||
  report.verification_type_label ||
  'Manual Verification';

const formatCreatedAt = (value) => {
  if (!value) return 'date unavailable';
  return new Date(value).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

// Batch aggregates come straight from GET /verification/batches — each entry
// already carries its own total/approved/rejected counts and a real `status`
// field (BatchListResponse), so there's no need to pull every individual
// record via /verification/all and group them client-side, and no need to
// infer status client-side either.
const normaliseApiBatch = (b) => {
  const id = b.batch_id || b.id || '';
  const total = Number(b.total_users ?? b.total ?? 0);
  const verified = Number(b.approved ?? b.approved_count ?? 0);
  const failed = Number(b.rejected ?? b.rejected_count ?? 0);
  const pending = Math.max(0, total - verified - failed);
  const createdAt = b.created_at ? new Date(b.created_at).getTime() : 0;
  return {
    id,
    name: b.batch_name || b.name || `Batch ${String(id).slice(0, 8)}`,
    orgName: b.organization_name || b.org_name || 'Organization',
    orgId: b.org_id || null,
    records: Array.isArray(b.users) ? b.users : [],
    total, pending, verified, failed,
    rawStatus: b.status || 'pending',
    latestCreatedAt: createdAt,
    sdcInfo: b.verification_progress?.sdc || null,
  };
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
          <label className="flex items-center gap-2.5 cursor-pointer select-none group">
            <input type="checkbox" checked={row.saveAsDraft || false} onChange={(e) => onUpdate(row._key, { saveAsDraft: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 accent-brand-blue cursor-pointer" />
            <span className="text-xs font-inter text-gray-600 group-hover:text-brand-dark">Save this template as a draft</span>
          </label>
        </div>
      )}
    </div>
  );
};

// ── Smart Send Modal ─────────────────────────────────────────────────────────
const SmartSendModal = ({ isOpen, onClose, onSent, batch }) => {
  const [verificationTypes, setVerificationTypes] = useState([]);
  const [verifiersByType,   setVerifiersByType]    = useState({}); // { [verification_name]: verifier[] }
  const [loading,           setLoading]           = useState(false);
  // assignments: { [type_name]: [{ _key, verifier_id, email_subject, email_body, count: '' }] }
  const [assignments, setAssignments] = useState({});
  const [sending,     setSending]     = useState(false);
  const [expandedType, setExpandedType] = useState(null);

  const slugToLabel = (s) => s?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || s;
  const defaultSubject = (typeName) => `Verification Request: ${slugToLabel(typeName)}`;
  const defaultBody = (typeName) =>
    `Hi,\n\nPlease find the attached Excel file with the candidates assigned to you for ${slugToLabel(typeName)} verification.\n\nComplete the verification and upload your report using the secure link provided.\n\nRegards,\nTruMarkZ Admin`;

  // Derive batch users from the already-loaded batch.records — confirmed via
  // the actual GET /verification/batches/{id} response that each user object
  // is keyed by `user_id`, not `id` (that field name only appears elsewhere,
  // e.g. the bulk-upload response's `entity_id`) — check all three so this
  // doesn't silently send `null` again if the shape varies by caller.
  const batchUsers = (batch?.records || []).map((r) => ({
    id: r.id || r.user_id || r.entity_id,
    name: r.full_name || r.product_name || r.email || r.id || r.user_id || r.entity_id,
  }));

  useEffect(() => {
    if (!isOpen || !batch?.id) return;
    setAssignments({});
    setExpandedType(null);
    setVerifiersByType({});
    setLoading(true);
    // /verification/batches/{id}/third-party-verifiers is the purpose-built
    // endpoint for "which verification types in this batch need a third
    // party" — confirmed by the Manual Verification API docs, not a stale
    // endpoint. (batch.verification_types is the batch's *overall* type
    // list, which can include automatic types and doesn't tell us which
    // manual types actually have a pending third-party need.)
    verificationAPI.getThirdPartyVerifiers(batch.id)
      .then(async ({ data }) => {
        const raw = data?.third_party_verifiers || [];
        const typeMap = {};
        raw.forEach((v) => {
          if (!typeMap[v.verification_name]) {
            typeMap[v.verification_name] = {
              verification_name: v.verification_name,
              label: v.label || slugToLabel(v.verification_name),
              defaultEmail: v.email_address || null,
            };
          }
        });
        const types = Object.values(typeMap);
        setVerificationTypes(types);
        if (types.length > 0) setExpandedType(types[0].verification_name);

        // Only verifiers whose own specialization includes each type — keeps
        // an admin from assigning "Address Verification" to a verifier who
        // only handles "Aadhaar Verification".
        const entries = await Promise.all(
          types.map((t) =>
            verifiersAPI.getByType(t.verification_name)
              .then(({ data: vData }) => [t.verification_name, Array.isArray(vData?.verifiers) ? vData.verifiers : (Array.isArray(vData) ? vData : [])])
              .catch(() => [t.verification_name, []])
          )
        );
        setVerifiersByType(Object.fromEntries(entries));
      })
      .catch(() => toast.error('Failed to load verification data'))
      .finally(() => setLoading(false));
  }, [isOpen, batch?.id]);

  const addVerifier = (typeName) => {
    setAssignments((prev) => ({
      ...prev,
      [typeName]: [
        ...(prev[typeName] || []),
        { _key: `${typeName}-${Date.now()}`, verifier_id: '', email_subject: defaultSubject(typeName), email_body: defaultBody(typeName), count: '', saveAsDraft: false },
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

    // Collect any per-verifier templates marked "save as draft" before we send
    const draftsToSave = [];
    verificationTypes.forEach((t) => {
      typeRows(t.verification_name).forEach((row) => {
        if (row.verifier_id && parseInt(row.count) > 0 && row.saveAsDraft && row.email_subject.trim() && row.email_body.trim()) {
          draftsToSave.push({ verification_type: t.verification_name, subject: row.email_subject, body: row.email_body });
        }
      });
    });

    setSending(true);
    try {
      const { data } = await verificationAPI.smartSendManualVerification({ batch_id: batch.id, verification_assignments });
      if (draftsToSave.length > 0) {
        await Promise.allSettled(draftsToSave.map((d) => verificationAPI.createEmailDraft(d)));
      }

      // The backend returns 200 even when every assignment fails — real
      // success/failure lives in the response body (total_sent/total_failed,
      // and per-entry status/error), not in the HTTP status. Blindly showing
      // a success toast here (as before) masked failures like "No users in
      // this batch have 'X'" and closed the modal as if it had worked.
      const results     = Array.isArray(data?.results) ? data.results : [];
      const failed      = results.filter((r) => r.status === 'failed');
      const totalSent   = data?.total_sent ?? (results.length - failed.length);
      const totalFailed = data?.total_failed ?? failed.length;

      if (totalFailed > 0) {
        const failureMsg = failed
          .map((r) => `${slugToLabel(r.verification_type_name)}: ${r.error || 'failed'}`)
          .join(' | ');
        toast.error(failureMsg || `${totalFailed} assignment${totalFailed === 1 ? '' : 's'} failed`);
      }
      if (totalSent > 0) {
        toast.success(`Smart Send: ${totalSent} verifier${totalSent === 1 ? '' : 's'} emailed`);
      }

      // Only advance the batch's workflow state and close the modal if at
      // least one email actually went out — a total failure should leave the
      // admin in the modal to fix the assignment and retry.
      if (totalSent > 0) {
        onSent?.(data);
        onClose();
      }
    } catch (err) {
      toast.error(getApiError(err, 'Smart Send failed'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bulk Send to Verifiers" size="xl">
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
                            allVerifiers={verifiersByType[vtype.verification_name] || []}
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

// ── Main BatchMonitor component ───────────────────────────────────────────────
export const BatchMonitor = () => {
  const [data, setData] = useState(null);
  const [batchDetail, setBatchDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [orgFilter, setOrgFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const [workflowByBatch, setWorkflowByBatch] = useState(() => getStoredWorkflow());
  const [orgSpaceMap, setOrgSpaceMap] = useState({}); // org_id -> that org's own Dhiway Space ID (Profile page)

  // Action loading states
  const [resending, setResending] = useState(null); // request token being resent
  const [sendingToOrg, setSendingToOrg] = useState(false);

  // Submitted verifier reports (real backend data)
  const [submittedReports, setSubmittedReports] = useState(null);
  const [loadingReports, setLoadingReports] = useState(false);
  const [decidingRequestId, setDecidingRequestId] = useState(null); // request being approved/rejected
  const [rejectingRequestId, setRejectingRequestId] = useState(null); // which report's inline reason box is open
  const [rejectReason, setRejectReason] = useState('');
  const [downloadingFileKey, setDownloadingFileKey] = useState(null);

  // Sub-modal states
  const [smartSendOpen,       setSmartSendOpen]       = useState(false);
  const [smartSendBatch,      setSmartSendBatch]      = useState(null);
  const [sdcGenerateBatch,    setSdcGenerateBatch]    = useState(null);
  const [sdcLiveStatus,       setSdcLiveStatus]       = useState(null); // { batchId, ready, total }
  const [sdcPollingBatchId,   setSdcPollingBatchId]   = useState(null); // batchId while the background poll is still actively running
  const [sdcRecordsByEmail,   setSdcRecordsByEmail]   = useState({});
  const [sdcRecordsByName,    setSdcRecordsByName]    = useState({});
  const [batchSdcRecords,     setBatchSdcRecords]     = useState([]);
  const [batchSdcByRecordId,  setBatchSdcByRecordId]  = useState({});
  const [sdcCertsLoading,     setSdcCertsLoading]     = useState(false);
  const [downloadingSdcId,    setDownloadingSdcId]    = useState(null);
  const [detailRecord,        setDetailRecord]        = useState(null);
  const [actionMenuBatchId, setActionMenuBatchId] = useState(null);

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data: result } = await verificationAPI.getBatches();
      const list = Array.isArray(result) ? result : (result?.batches || result?.items || []);
      // Super admin gets orgs grouped with a nested `batches` array per org;
      // flatten it and stamp each batch with its parent org's name. If the
      // response is already a flat batch list (e.g. org-scoped callers),
      // each entry has no `batches` array — pass it through as-is.
      const flat = list.flatMap((entry) =>
        Array.isArray(entry.batches)
          ? entry.batches.map((b) => ({ ...b, organization_name: entry.organization_name, org_id: entry.org_id }))
          : [entry]
      );
      setData(flat.map(normaliseApiBatch));
    } catch (err) {
      setData([]);
      toast.error(getApiError(err, 'Failed to load verification batches'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // /sdc/records falls back to a single global "config default" Dhiway space
  // when space_id is omitted — any org that has set its OWN Dhiway Space ID
  // (Profile page) issues certificates into that separate space instead, so
  // omitting space_id silently returns 0 matches for those orgs. Fetch each
  // org's space id once so refreshSdcCertificates can pass the right one.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const map = {};
        let offset = 0;
        const limit = 200;
        let total = Infinity;
        while (offset < total) {
          const { data } = await adminAPI.getAllUsers({ user_type: 'organization', limit, offset });
          const users = Array.isArray(data?.users) ? data.users : [];
          users.forEach((u) => {
            if (u.id && u.dhiway_space_id) map[u.id] = u.dhiway_space_id;
          });
          total = typeof data?.total === 'number' ? data.total : users.length;
          offset += limit;
          if (users.length === 0) break;
        }
        if (!cancelled) setOrgSpaceMap(map);
      } catch {
        // non-fatal — certificate matching just falls back to the default space
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const batches = (data || []).map((batch) => {
    const stored = workflowByBatch[batch.id] || {};
    const edited = stored.edited || {};
    const status = batch.rawStatus;
    return {
      ...batch,
      name: edited.name || batch.name,
      orgName: edited.orgName || batch.orgName,
      spaceId: batch.orgId ? orgSpaceMap[batch.orgId] || null : null,
      createdAt: batch.latestCreatedAt || null,
      status,
      statusMeta: batchStatusMeta[status] || batchStatusMeta.pending,
      sharedWithOrganization: !!stored.orgShared,
      uploadLink: stored.uploadLink || null,
      sentRequests: stored.sentRequests || (stored.requestId ? [{
        verification_type_name: 'Manual Verification',
        verifier_email: stored.verifierEmail || '',
        request_id: stored.requestId,
        status: 'sent',
      }] : []),
    };
  });

  const orgOptions = Array.from(new Set(batches.map((b) => b.orgName).filter(Boolean))).sort((a, b) => a.localeCompare(b));

  const visibleBatches = batches
    .filter((b) => !statusFilter || b.status === statusFilter)
    .filter((b) => !orgFilter || b.orgName === orgFilter);
  const selectedBatch = batches.find((b) => b.id === selectedBatchId) || null;

  const total    = batches.reduce((s, b) => s + b.total,    0);
  const pending  = batches.reduce((s, b) => s + b.pending,  0);
  const verified = batches.reduce((s, b) => s + b.verified, 0);
  const failed   = batches.reduce((s, b) => s + b.failed,   0);

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

  // ── Action: Generate SDC — poll GET /status until done, mirrors the flow
  // used in SDCVerification.jsx so the still-open modal can update itself once
  // Dhiway actually finishes issuing (instead of staying stuck on "pending").
  const pollSdcStatusUntilDone = useCallback((batchId) => {
    let attempts = 0;
    const maxAttempts = 10;
    setSdcPollingBatchId(batchId);
    const tick = async () => {
      attempts += 1;
      try {
        const { data } = await sdcAPI.getBatchStatus(batchId);
        if (data.done) {
          setSdcLiveStatus({ batchId, ready: data.ready, total: data.total });
          setSdcPollingBatchId((current) => (current === batchId ? null : current));
          setData((prev) => (prev || []).map((b) => (
            b.id === batchId ? { ...b, sdcInfo: { ...(b.sdcInfo || {}), status: 'sdc_created' } } : b
          )));
          toast.success(`Certificates ready — ${data.ready}/${data.total} issued`);
          refreshSdcCertificates();
          return;
        }
      } catch {
        // transient error — keep polling, only give up after maxAttempts
      }
      if (attempts < maxAttempts) {
        setTimeout(tick, 8000);
      } else {
        setSdcPollingBatchId((current) => (current === batchId ? null : current));
        toast.error('Still processing — check the batch again shortly');
      }
    };
    tick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pulls the org's SDC records and matches them to this batch's users by
  // email — same anchorTime-based issued/draft distinction used elsewhere.
  // Dhiway records are matched to batch users "by email or name" per the
  // backend docs — email alone isn't enough (test/dummy records often have
  // empty or non-matching email fields), so also index by title as a fallback.
  const refreshSdcCertificates = useCallback(async (batchIdArg = selectedBatchId, detailRecordsArg = null, sdcInfoArg = undefined) => {
    if (!batchIdArg) return;
    // Prefer the batch's own recorded verification_progress.sdc.{org_id,space_id}
    // — that's exactly what was used to generate this batch's certificates,
    // and is more reliable than the org's *current* profile setting (which
    // this falls back to only for older batches that predate this field).
    const sdcInfo = sdcInfoArg !== undefined ? sdcInfoArg : batchDetail?.verification_progress?.sdc;
    const orgId   = sdcInfo?.org_id || undefined;
    const spaceId = sdcInfo?.space_id || selectedBatch?.spaceId || undefined;
    setSdcCertsLoading(true);
    try {
      const allRecords = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const { data } = await sdcAPI.getRecords({ active: 1, page, pageSize: 100, org_id: orgId, space_id: spaceId });
        const pageRecords = Array.isArray(data?.records) ? data.records : [];
        allRecords.push(...pageRecords);
        const totalPages = Number(data?.totalPages || data?.total_pages || 0);
        hasMore = totalPages > 0 ? page < totalPages : pageRecords.length === 100;
        page += 1;
      }

      const byEmail = {};
      const byName = {};
      allRecords.forEach((r) => {
        const issued = !!r.anchorTime && !r.revoked;
        const entry = {
          id: r.id, publicId: r.publicId, title: r.title, issued,
          recipients: Array.isArray(r.recipients) ? r.recipients : [],
          anchorTime: r.anchorTime || null, revoked: !!r.revoked,
          active: !!r.active, latest: !!r.latest, edited: !!r.edited,
          createdAt: r.createdAt || null, updatedAt: r.updatedAt || null,
        };
        (r.recipients || []).forEach((email) => {
          if (email) byEmail[email.toLowerCase()] = entry;
        });
        if (r.title?.trim()) byName[r.title.trim().toLowerCase()] = entry;
      });
      setSdcRecordsByEmail(byEmail);
      setSdcRecordsByName(byName);

      const detailRecords = detailRecordsArg || batchDetail?.users || selectedBatch?.records || [];
      const matchedRecords = [];
      const matchedByRecordId = {};
      const seenPublicIds = new Set();
      detailRecords.forEach((record) => {
        // Confirmed via the live batch-details response: each user is keyed
        // by `user_id`, not `id` — check all three since the shape can vary.
        const recordId = record?.id || record?.user_id || record?.entity_id;
        const recordEmail = record?.email?.trim().toLowerCase();
        const recordName = recordTitle(record)?.trim().toLowerCase();
        const match = allRecords.find((item) => {
          const recipients = (item?.recipients || []).map((value) => value?.trim().toLowerCase()).filter(Boolean);
          const itemTitle = item?.title?.trim().toLowerCase();
          return (recordEmail && recipients.includes(recordEmail)) || (recordName && itemTitle === recordName);
        });
        if (match?.publicId && !seenPublicIds.has(match.publicId)) {
          seenPublicIds.add(match.publicId);
          matchedRecords.push(match);
        }
        if (match?.publicId && recordId) {
          matchedByRecordId[recordId] = {
            id: match.id,
            publicId: match.publicId,
            title: match.title,
            recipients: match.recipients || [],
            anchorTime: match.anchorTime || null,
            revoked: !!match.revoked,
            issued: !!match.anchorTime && !match.revoked,
            active: !!match.active,
            latest: !!match.latest,
            edited: !!match.edited,
            createdAt: match.createdAt || null,
            updatedAt: match.updatedAt || null,
          };
        }
      });
      setBatchSdcRecords(matchedRecords);
      setBatchSdcByRecordId(matchedByRecordId);
    } catch {
      // silent — certificate column just stays blank if this fails
      setBatchSdcRecords([]);
      setBatchSdcByRecordId({});
    } finally {
      setSdcCertsLoading(false);
    }
  }, [batchDetail?.users, batchDetail?.verification_progress?.sdc, selectedBatch?.records, selectedBatch?.spaceId, selectedBatchId]);

  const matchSdcRecord = useCallback((record) => {
    const recordId = record?.id || record?.user_id || record?.entity_id;
    if (recordId && batchSdcByRecordId[recordId]) return batchSdcByRecordId[recordId];
    const byEmail = record?.email ? sdcRecordsByEmail[record.email.toLowerCase()] : null;
    if (byEmail) return byEmail;
    const title = recordTitle(record)?.trim().toLowerCase();
    return title ? sdcRecordsByName[title] || null : null;
  }, [batchSdcByRecordId, sdcRecordsByEmail, sdcRecordsByName]);

  const handleOpenBatchDetails = useCallback(async (batch) => {
    setActionMenuBatchId(null);
    setSelectedBatchId(batch.id);
    setBatchDetail(null);
    setSubmittedReports(null);
    setSdcRecordsByEmail({});
    setSdcRecordsByName({});
    setBatchSdcRecords([]);
    setBatchSdcByRecordId({});

    setLoadingDetail(true);
    setLoadingReports(true);

    try {
      const [detailRes, reportsRes] = await Promise.all([
        verificationAPI.getBatchDetails(batch.id),
        verificationAPI.getSubmittedReports(batch.id).catch(() => ({ data: null })),
      ]);

      const detailData = detailRes?.data || null;
      setBatchDetail(detailData);
      setSubmittedReports(reportsRes?.data || null);

      // SDC generation is a separate workflow from the local Review→Verifier→
      // Verified pipeline — gate on the batch's actual SDC status (only present
      // on the detail response, the list endpoint never returns it) rather than
      // the local workflow stage, so already-issued certificates still show up
      // for batches still sitting at "Pending" in the mock workflow.
      const sdcInfo = detailData?.verification_progress?.sdc;
      if (sdcInfo?.status) {
        await refreshSdcCertificates(batch.id, detailData?.users || batch.records || [], sdcInfo);
      }
    } catch (err) {
      toast.error(getApiError(err, 'Failed to load batch details'));
    } finally {
      setLoadingDetail(false);
      setLoadingReports(false);
    }
  }, [refreshSdcCertificates]);

  // Smart Send needs actual per-user records to assign — the list endpoint
  // (GET /verification/batches) never returns a `users` array, only the
  // detail endpoint does. `batch.records` from the list is always empty, so
  // fetch fresh detail records here rather than trusting whatever's already
  // cached (which may be for a different batch, or not fetched at all if
  // Smart Send is triggered from the table row before Control Center opens).
  const openSmartSend = useCallback(async (batch) => {
    const cachedId = batchDetail?.batch_id || batchDetail?.id;
    if (batch.id === cachedId && Array.isArray(batchDetail?.users) && batchDetail.users.length) {
      setSmartSendBatch({ ...batch, records: batchDetail.users, verificationTypes: batchDetail?.verification_types || [] });
      setSmartSendOpen(true);
      return;
    }
    try {
      const { data } = await verificationAPI.getBatchDetails(batch.id);
      setSmartSendBatch({
        ...batch,
        records: Array.isArray(data?.users) ? data.users : batch.records,
        verificationTypes: data?.verification_types || [],
      });
    } catch (err) {
      toast.error(getApiError(err, 'Failed to load batch records'));
      setSmartSendBatch(batch);
    }
    setSmartSendOpen(true);
  }, [batchDetail]);

  // Opens a blank tab synchronously (in the same tick as the click) and
  // redirects it once the URL arrives — awaiting the fetch first and only
  // then calling window.open gets silently blocked by most browsers since
  // it's no longer seen as a direct response to the user gesture.
  const openSdcCertificate = useCallback(async (publicId, kind = 'pdf') => {
    if (!publicId) return;
    setDownloadingSdcId(publicId);
    const win = window.open('', '_blank');
    if (win) win.opener = null;
    try {
      const { data } = await sdcAPI.getRecord(publicId);
      const url = kind === 'verify' ? data?.verify : data?.pdf;
      if (url) {
        if (win) win.location.href = url;
      } else {
        win?.close();
        toast.error(`No ${kind === 'verify' ? 'verify' : 'PDF'} link on this certificate yet`);
      }
    } catch (err) {
      win?.close();
      toast.error(getApiError(err, 'Failed to fetch certificate'));
    } finally {
      setDownloadingSdcId(null);
    }
  }, []);

  const handleBulkSent = (batch, result) => {
    const sentRequests = result?.results || [];
    updateBatchWorkflow(batch.id, {
      sentRequests,
      uploadLink: sentRequests[0]?.upload_link || null,
    });
    fetchData(true);
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

  // ── Action: Download an individual verifier-submitted report file ────────
  const handleDownloadReportFile = async (requestId, fileIndex, filename) => {
    const key = `${requestId}-${fileIndex}`;
    setDownloadingFileKey(key);
    try {
      const { data } = await verificationAPI.downloadManualReport(requestId, fileIndex);
      triggerBlobDownload(data, filename || `report-${fileIndex}`);
    } catch (err) {
      toast.error(getApiError(err, 'Failed to download report file'));
    } finally {
      setDownloadingFileKey(null);
    }
  };

  // Approve/reject a submitted manual verification report. The backend
  // derives every affected user's status and the batch's own `status` as a
  // side effect of this call — the frontend never sets those directly, it
  // just re-fetches: submitted-reports + batch detail (for the modal) and
  // the outer batch list (so the Batch Queue row's counts/status badge
  // reflect the decision too).
  const handleDecideReport = async (requestId, status, reason) => {
    setDecidingRequestId(requestId);
    try {
      const { data } = await verificationAPI.updateManualVerificationStatus(requestId, status, reason);
      toast.success(data?.message || `Marked ${status}`);
      setRejectingRequestId(null);
      setRejectReason('');
      const batchId = selectedBatch?.id;
      if (batchId) {
        const [reportsRes, detailRes] = await Promise.all([
          verificationAPI.getSubmittedReports(batchId).catch(() => null),
          verificationAPI.getBatchDetails(batchId).catch(() => null),
        ]);
        if (reportsRes) setSubmittedReports(reportsRes.data);
        if (detailRes) setBatchDetail(detailRes.data);
      }
      fetchData(true);
    } catch (err) {
      toast.error(getApiError(err, `Failed to mark ${status}`));
    } finally {
      setDecidingRequestId(null);
    }
  };

  // ── Action: Send to Organization ──────────────────────────────────────────
  // Purely a local notify-action — the backend has no such stage (batch.status
  // stops at sdc_generated) — so it's tracked client-side only, as an extra
  // badge alongside the real status rather than a stage of it.
  const handleSendToOrganization = async (batch) => {
    setSendingToOrg(true);
    try {
      updateBatchWorkflow(batch.id, { orgShared: true });
      toast.success(`${batch.name} shared with the organization`);
    } finally {
      setSendingToOrg(false);
    }
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
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Building2 size={14} className="text-gray-400 shrink-0" />
              <select
                value={orgFilter}
                onChange={(e) => setOrgFilter(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold font-inter text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 max-w-[220px]"
              >
                <option value="">All Organizations</option>
                {orgOptions.map((org) => (
                  <option key={org} value={org}>{org}</option>
                ))}
              </select>
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
                <p className="text-sm text-gray-500 font-inter mt-1">Manage verifier handoff, uploads, and organization sharing.</p>
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
                          <div className="grid grid-cols-5 gap-1 mt-3">
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
                            {batch.sharedWithOrganization && <span className="text-[11px] opacity-80 font-inter">Shared with org</span>}
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
                                  onClick={() => handleOpenBatchDetails(batch)}
                                  className="w-full px-3 py-2 text-left text-sm font-inter text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <Eye size={14} />
                                  View Details
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionMenuBatchId(null);
                                    if (batch.status === 'pending' || batch.status === 'processing' || batch.status === 'verification_in_progress') {
                                      openSmartSend(batch);
                                    } else {
                                      toast('Smart Send is only available before verification is completed');
                                    }
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm font-inter text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <Zap size={14} />
                                  Smart Send
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
        {selectedBatch && (() => {
          // The list endpoint (GET /verification/batches) never returns
          // verification_progress, so selectedBatch.sdcInfo is always stale —
          // prefer the detail response (batchDetail), which does have it.
          const sdcInfo = batchDetail?.verification_progress?.sdc || selectedBatch.sdcInfo || null;
          return (
          <div className="space-y-5">
            {/* Stage header */}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
              <div className={`relative p-6 overflow-hidden ${selectedBatch.statusMeta.tone}`}>
                <div className="pointer-events-none absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/25" />
                <div className="relative flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider font-inter">
                      Stage {(WORKFLOW_STEPS.findIndex((s) => s.id === selectedBatch.status) + 1) || 1} of {WORKFLOW_STEPS.length}
                    </span>
                    <h3 className="font-sora font-bold text-3xl mt-3 leading-tight">{selectedBatch.statusMeta.label}</h3>
                    <p className="text-xs opacity-80 font-inter mt-2 flex items-center gap-1.5">
                      <Building2 size={13} /> {selectedBatch.orgName}
                    </p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-white/80 flex items-center justify-center shrink-0 shadow-sm">
                    <Package size={24} />
                  </div>
                </div>
                <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-6">
                  {[
                    { label: 'Records',  value: selectedBatch.total,    icon: Users },
                    { label: 'Pending',  value: selectedBatch.pending,  icon: Clock },
                    { label: 'Verified', value: selectedBatch.verified, icon: CheckCircle },
                    { label: 'Failed',   value: selectedBatch.failed,   icon: XCircle },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl bg-white/80 border border-white/90 p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <item.icon size={11} className="opacity-60" />
                        <p className="text-[10px] uppercase tracking-wide opacity-70 font-inter">{item.label}</p>
                      </div>
                      <p className="font-sora font-bold text-xl">{item.value}</p>
                    </div>
                  ))}
                </div>

              </div>
            </div>

            {/* Workflow + Actions */}
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-4">
              {/* Workflow steps — driven by the backend's real batch.status (batchDetail
                  is the freshest source; falls back to the list-derived status) */}
              <div className="min-w-0 rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
                <div className="mb-6 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-sora font-semibold text-brand-dark">Batch Workflow</p>
                    <p className="text-xs text-gray-400 font-inter mt-1">Pending → Processing → Verifying → Completed → SDC Issued</p>
                  </div>
                  {typeof batchDetail?.verifiers_total === 'number' && batchDetail.verifiers_total > 0 && (
                    <Badge status={batchDetail.all_verifiers_submitted ? 'success' : 'default'}>
                      {batchDetail.verifiers_submitted ?? 0}/{batchDetail.verifiers_total} verifiers submitted
                    </Badge>
                  )}
                </div>
                <div className="flex items-start">
                  {WORKFLOW_STEPS.map((step, index) => {
                    const activeIndex = WORKFLOW_STEPS.findIndex((item) => item.id === (batchDetail?.status || selectedBatch.status));
                    const completed = index < activeIndex;
                    const active    = index === activeIndex;
                    const reached   = index <= activeIndex;
                    const StepIcon  = step.icon;
                    return (
                      <React.Fragment key={step.id}>
                        <div className="flex flex-col items-center gap-2 shrink-0 w-16">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border-2 transition-colors ${
                            reached ? 'bg-brand-blue border-brand-blue text-white shadow-sm' : 'bg-white border-gray-200 text-gray-300'
                          } ${active ? 'ring-4 ring-brand-blue/15' : ''}`}>
                            {completed ? <CheckCircle size={16} /> : <StepIcon size={16} />}
                          </div>
                          <span className={`text-[11px] text-center font-semibold font-inter leading-tight ${reached ? 'text-brand-dark' : 'text-gray-400'}`}>
                            {step.label}
                          </span>
                        </div>
                        {index < WORKFLOW_STEPS.length - 1 && (
                          <div className={`flex-1 h-0.5 mt-5 rounded-full transition-colors ${index < activeIndex ? 'bg-brand-blue' : 'bg-gray-200'}`} />
                        )}
                      </React.Fragment>
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
                  {(selectedBatch.status === 'pending' || selectedBatch.status === 'processing' || selectedBatch.status === 'verification_in_progress') && (
                    <Button variant="primary" size="sm" icon={Zap} className="justify-start"
                      onClick={() => openSmartSend(selectedBatch)}>
                      Email to Verifiers
                    </Button>
                  )}

                  {/* Generate SDC — same generate → poll /status → issue flow as SDC Verification.
                      Backend now 400s with "no approved users" if none are approved yet, so
                      disable proactively instead of letting the admin hit that round-trip. */}
                  <Button variant="outline" size="sm" icon={Sparkles} className="justify-start"
                    disabled={selectedBatch.verified === 0}
                    title={selectedBatch.verified === 0 ? 'No approved users in this batch yet' : undefined}
                    onClick={() => setSdcGenerateBatch(selectedBatch)}>
                    {sdcInfo?.status ? 'Regenerate SDC' : 'Generate SDC'}
                  </Button>
                  {/* Send to org — once verification is done (completed or SDC issued) and not yet shared */}
                  {(selectedBatch.status === 'verification_completed' || selectedBatch.status === 'sdc_generated') && !selectedBatch.sharedWithOrganization && (
                    <Button variant="success" size="sm" icon={sendingToOrg ? RefreshCw : Send}
                      className="justify-start" disabled={sendingToOrg}
                      onClick={() => handleSendToOrganization(selectedBatch)}>
                      {sendingToOrg ? 'Sending…' : 'Send to Organization'}
                    </Button>
                  )}
                </div>

                {/* SDC certificate status — populated by refreshSdcCertificates */}
                <div className="mt-4 pt-4 border-t border-gray-200/70">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-gray-500 font-inter uppercase tracking-wide">SDC Certificates</p>
                    <button
                      type="button"
                      onClick={() => refreshSdcCertificates(selectedBatch.id, batchDetail?.users || selectedBatch.records || [], batchDetail?.verification_progress?.sdc)}
                      disabled={sdcCertsLoading}
                      className="flex items-center gap-1 text-[11px] font-semibold text-brand-blue font-inter hover:opacity-70 disabled:opacity-50"
                    >
                      <RefreshCw size={11} className={sdcCertsLoading ? 'animate-spin' : ''} /> Refresh
                    </button>
                  </div>
                  {(() => {
                    const issuedCount = batchSdcRecords.filter((item) => !!item.anchorTime && !item.revoked).length;
                    if (!sdcInfo?.status && batchSdcRecords.length === 0) {
                      return <p className="text-xs text-gray-400 font-inter">Not generated yet.</p>;
                    }
                    // SDCs are only ever generated for approved users, not the
                    // batch's full user list — selectedBatch.verified (the
                    // approved count) is the right denominator here, not the
                    // batch's total_users, or this ratio would look permanently
                    // "incomplete" for any batch with pending/rejected users.
                    return (
                      <div className="flex items-center justify-between gap-3 rounded-xl bg-white border border-gray-100 px-3 py-2.5">
                        <Badge status={issuedCount > 0 ? 'success' : 'pending'}>
                          {issuedCount > 0 ? `${issuedCount}/${selectedBatch.verified} issued` : 'Drafting…'}
                        </Badge>
                        <span className="text-[11px] text-gray-400 font-inter">{batchSdcRecords.length} fetched</span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* ── Resend panel — shown once emails have been sent for this batch ── */}
            {selectedBatch.sentRequests?.length > 0 && (
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

            {/* ── Submitted Reports panel — real verifier uploads ────────── */}
            {(loadingReports || submittedReports?.reports?.length > 0) && (
              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-sora font-semibold text-brand-dark">Submitted Reports</p>
                    <p className="text-xs text-gray-400 font-inter mt-1">Files uploaded by each verifier for this batch.</p>
                  </div>
                  {submittedReports && (
                    <Badge status={submittedReports.total_submitted === submittedReports.total_requests ? 'success' : 'default'}>
                      {submittedReports.total_submitted}/{submittedReports.total_requests} submitted
                    </Badge>
                  )}
                </div>

                {loadingReports ? (
                  <div className="flex items-center justify-center gap-2 py-8">
                    <RefreshCw size={16} className="animate-spin text-brand-blue" />
                    <p className="text-sm text-gray-400 font-inter">Loading submitted reports…</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {submittedReports.reports.map((report) => {
                      const decided = report.status === 'approved' || report.status === 'rejected';
                      const awaitingReview = report.status === 'doc_uploaded' && !decided;
                      const isDeciding = decidingRequestId === report.request_id;
                      const badge = report.status === 'approved'
                        ? { status: 'success', label: 'Approved' }
                        : report.status === 'rejected'
                          ? { status: 'error', label: 'Rejected' }
                          : report.status === 'doc_uploaded'
                            ? { status: 'pending', label: 'Awaiting Review' }
                            : { status: 'default', label: 'Awaiting Upload' };
                      return (
                      <div key={report.request_id} className={`rounded-xl border px-4 py-3 ${report.submitted ? 'border-green-100 bg-green-50/40' : 'border-gray-100 bg-gray-50'}`}>
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${report.submitted ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                              {report.submitted ? <CheckCircle size={14} /> : <Clock size={14} />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-brand-dark font-inter truncate">{formatVerifTypeLabel(report)}</p>
                              <p className="text-xs text-gray-500 font-inter truncate">{report.verifier_email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {report.submitted && (
                              <span className="text-xs text-gray-400 font-inter">{report.report_count} file{report.report_count !== 1 ? 's' : ''}</span>
                            )}
                            <Badge status={badge.status}>{badge.label}</Badge>
                          </div>
                        </div>

                        {report.submitted && report.report_files?.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2 pl-11">
                            {report.report_files.map((file, fileIndex) => {
                              const key = `${report.request_id}-${fileIndex}`;
                              const isDownloading = downloadingFileKey === key;
                              return (
                                <button
                                  key={key}
                                  type="button"
                                  disabled={isDownloading}
                                  onClick={() => handleDownloadReportFile(report.request_id, fileIndex, file.filename)}
                                  className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold font-inter text-brand-blue hover:bg-blue-50 disabled:opacity-50 transition-colors"
                                >
                                  {isDownloading ? <RefreshCw size={12} className="animate-spin" /> : <Download size={12} />}
                                  {file.filename}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {awaitingReview && (
                          <div className="mt-3 pl-11">
                            {rejectingRequestId === report.request_id ? (
                              <div className="space-y-2">
                                <input
                                  value={rejectReason}
                                  onChange={(e) => setRejectReason(e.target.value)}
                                  placeholder="Reason for rejection (optional)"
                                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-inter focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
                                />
                                <div className="flex gap-2">
                                  <Button
                                    variant="danger" size="sm" loading={isDeciding}
                                    onClick={() => handleDecideReport(report.request_id, 'rejected', rejectReason.trim() || undefined)}
                                  >
                                    Confirm Reject
                                  </Button>
                                  <Button
                                    variant="ghost" size="sm" disabled={isDeciding}
                                    onClick={() => { setRejectingRequestId(null); setRejectReason(''); }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <Button
                                  variant="success" size="sm" icon={CheckCircle} loading={isDeciding}
                                  onClick={() => handleDecideReport(report.request_id, 'approved')}
                                >
                                  Approve
                                </Button>
                                <Button
                                  variant="outline" size="sm" icon={XCircle} disabled={isDeciding}
                                  onClick={() => { setRejectingRequestId(report.request_id); setRejectReason(''); }}
                                >
                                  Reject
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      );
                    })}
                  </div>
                )}
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
                      <p className="text-xs text-gray-400 font-inter mt-1">Individual approvals are disabled.</p>
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
                      <table className="w-full min-w-[720px]">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase text-gray-500 font-inter">Record</th>
                            <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase text-gray-500 font-inter">Type</th>
                            <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase text-gray-500 font-inter">Status</th>
                            <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase text-gray-500 font-inter w-56">Certificate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {detailRecords.map((record) => {
                            const product = isProductRecord(record);
                            const Icon = product ? Package : User;
                            const status = statusBadge(record.verification_status);
                            const sdcMatch = matchSdcRecord(record);
                            return (
                              <tr key={record.id || record.user_id || record.entity_id} className="hover:bg-gray-50/70 transition-colors">
                                <td className="px-4 py-3.5">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 shrink-0 rounded-xl bg-brand-blue/10 border border-blue-100 flex items-center justify-center">
                                      <Icon size={15} className="text-brand-blue" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-brand-dark font-inter truncate">{recordTitle(record)}</p>
                                      <p className="text-xs text-gray-400 font-inter truncate">{product ? record.category_name || 'Product' : record.email || 'Human'}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3.5 text-sm text-gray-600 font-inter">{product ? 'Product' : 'Human'}</td>
                                <td className="px-4 py-3.5"><Badge status={status.variant}>{status.label}</Badge></td>
                                <td className="px-4 py-3.5">
                                  {sdcMatch?.issued || sdcMatch ? (
                                    <div className="flex items-center gap-2">
                                      <Badge status={sdcMatch.issued ? 'info' : 'pending'}>{sdcMatch.issued ? 'Ready' : 'Draft'}</Badge>
                                      <div className="flex items-center gap-0.5 rounded-lg border border-gray-100 bg-gray-50 p-0.5">
                                        {sdcMatch.issued && (
                                          <button
                                            type="button"
                                            disabled={downloadingSdcId === sdcMatch.publicId}
                                            onClick={() => openSdcCertificate(sdcMatch.publicId, 'pdf')}
                                            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold font-inter text-brand-blue transition-colors hover:bg-white hover:shadow-sm disabled:opacity-50"
                                          >
                                            <Download size={12} className={downloadingSdcId === sdcMatch.publicId ? 'animate-spin' : ''} /> Download
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => setDetailRecord(record)}
                                          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold font-inter text-gray-500 transition-colors hover:bg-white hover:text-brand-blue hover:shadow-sm"
                                        >
                                          <Info size={12} /> Detail
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-gray-300 font-inter">-</span>
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
          );
        })()}
      </Modal>

      {/* ── Smart Send Modal ────────────────────────────────────────────── */}
      <SmartSendModal
        isOpen={smartSendOpen}
        onClose={() => { setSmartSendOpen(false); setSmartSendBatch(null); }}
        onSent={(result) => { handleBulkSent(smartSendBatch, result); setSmartSendOpen(false); setSmartSendBatch(null); }}
        batch={smartSendBatch}
      />

      {/* ── Generate SDC Modal — same component/flow as SDC Verification ─── */}
      {sdcGenerateBatch && (
        <GenerateSDCModal
          batch={sdcGenerateBatch}
          records={batchDetail?.users || sdcGenerateBatch.records || []}
          liveStatus={sdcLiveStatus?.batchId === sdcGenerateBatch.id ? sdcLiveStatus : null}
          polling={sdcPollingBatchId === sdcGenerateBatch.id}
          onClose={() => { setSdcGenerateBatch(null); setSdcLiveStatus(null); }}
          onGenerated={() => {
            const batchId = sdcGenerateBatch.id;
            setData((prev) => (prev || []).map((b) => (
              b.id === batchId ? { ...b, sdcInfo: { ...(b.sdcInfo || {}), status: 'draft_created' } } : b
            )));
            pollSdcStatusUntilDone(batchId);
          }}
        />
      )}

      <CertificateDetailModal
        record={detailRecord}
        sdcMatch={detailRecord ? matchSdcRecord(detailRecord) : null}
        instanceKey="de"
        onClose={() => setDetailRecord(null)}
      />

    </AuthLayout>
  );
};

export default BatchMonitor;
