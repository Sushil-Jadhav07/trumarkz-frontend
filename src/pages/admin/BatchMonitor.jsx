import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { verificationAPI, verifiersAPI, sdcAPI, adminAPI, getApiError, triggerBlobDownload } from '@/services/api';
import { GenerateSDCModal, CertificateDetailModal } from '@/pages/admin/SDCVerification';
import { TablePagination } from '@/components/shared/TablePagination';
import { normalizeDhiwayDetails, resolveDhiwaySpaceId } from '@/utils/dhiway';
import {
  AlertCircle, AlertTriangle, ArrowRight, Building2, Calendar, CheckCircle, ChevronDown, ChevronLeft, ChevronRight, Clock, Download, Eye, Info,
  Layers, Mail, MoreVertical, Package, Plus, RefreshCw, Save, Search, Send, ShieldCheck, Sparkles, Trash2, User, Users, X, XCircle, Zap,
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

// Local-only UI conveniences that genuinely have no backend endpoint (a
// renamed batch display label, a generated verifier-upload link, mock
// "sent" email tracking for Smart Send). "Send to Organization" is NOT one
// of these — it's a real, persisted backend action (see
// verificationAPI.shareWithOrganization / Batch.shared_with_org) and must
// never be tracked here; sharedWithOrg comes from normaliseApiBatch instead.
const BATCH_WORKFLOW_KEY = 'trumarkz_admin_batch_workflow_mock';

// Accepts either the internal `verification_status` (approved/rejected/
// pending — unchanged, still the source of truth for backend logic) or the
// newer, purely-presentational `overall_status_label` (verified/
// partially_verified/rejected/pending) — callers should prefer the latter
// for display when it's present, per `record.overall_status_label ||
// record.verification_status`, but never feed it back into any eligibility
// check.
export const statusBadge = (status) => {
  if (status === 'approved') return { variant: 'success', label: 'Approved', icon: CheckCircle };
  if (status === 'verified') return { variant: 'success', label: 'Verified', icon: CheckCircle };
  // A user with e.g. Police:rejected + Driving License:approved must read as
  // "Partially Verified", never fall through to "Rejected" below.
  if (status === 'partially_verified') return { variant: 'partial', label: 'Partially Verified', icon: AlertCircle };
  if (status === 'rejected' || status === 'failed') return { variant: 'error',   label: 'Rejected', icon: XCircle };
  return                            { variant: 'pending', label: 'Pending',  icon: Clock };
};

export const batchStatusMeta = {
  pending:                   { label: 'Pending',                   badge: 'warning', tone: 'bg-orange-50 text-orange-700 border-orange-100' },
  processing:                { label: 'Processing',                badge: 'info',    tone: 'bg-blue-50 text-brand-blue border-blue-100' },
  verification_in_progress: { label: 'Verification In Progress',  badge: 'info',    tone: 'bg-blue-50 text-brand-blue border-blue-100' },
  verification_completed:   { label: 'Verification Completed',    badge: 'success', tone: 'bg-green-50 text-green-700 border-green-100' },
  sdc_generated:             { label: 'SDC Generated',             badge: 'success', tone: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  // Warranty batches are auto-approved on upload — no verification pipeline,
  // so "approved" is their terminal status straight out of the backend.
  approved:                  { label: 'Approved',                  badge: 'success', tone: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
};

export const WORKFLOW_STEPS = [
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

const VERIFIED_RECORD_STATUSES = new Set(['approved', 'verified']);
const FAILED_RECORD_STATUSES = new Set(['rejected', 'failed']);
const PENDING_RECORD_STATUSES = new Set([
  'pending',
  'pending_verification',
  'processing',
  'verification_in_progress',
  'doc_uploaded',
  'awaiting_review',
]);

const classifyRecordStatus = (status) => {
  const value = String(status || '').trim().toLowerCase();
  if (VERIFIED_RECORD_STATUSES.has(value)) return 'verified';
  if (FAILED_RECORD_STATUSES.has(value)) return 'failed';
  if (!value || PENDING_RECORD_STATUSES.has(value)) return 'pending';
  return 'pending';
};

const summarizeRecordCounts = (records = []) => (
  records.reduce((acc, record) => {
    const bucket = classifyRecordStatus(record?.verification_status ?? record?.status);
    acc[bucket] += 1;
    return acc;
  }, { verified: 0, failed: 0, pending: 0 })
);

const hasRenderableRecords = (batch) =>
  !!batch && (batch.total > 0 || batch.records.length > 0);

// batchType (the batch's own real batch_type, e.g. from GET /verification/
// batches/{batch_id}) is the authoritative signal when known — trust it
// first. Per-record sniffing (falling back on product_name/category_name/
// custom_fields) is only a guess for when batchType isn't available yet,
// and !!record?.custom_fields is a real truthy-object trap on its own: it's
// `true` for ANY non-null object, so a Human record with completely normal
// custom_fields (license_number, police_verification, etc.) was always
// misread as "Product" — confirmed live (batch_type: "human", still shown
// as "Product" in this table) — without batchType ever being checked first.
export const isProductRecord = (record, batchType) => {
  if (batchType) return batchType === 'product';
  return record?.entity_type === 'product' || !!record?.product_name || !!record?.category_name || !!record?.custom_fields;
};

export const recordTitle = (record) =>
  record.product_name || record.full_name || record.email || record.id || record.user_id || record.entity_id || 'Verification record';

const normalizeMatchKey = (value) => String(value || '').trim().toLowerCase();

const getProductSerialNumber = (record) =>
  record?.serial_number ||
  record?.serial_no ||
  record?.custom_fields?.serial_number ||
  record?.custom_fields?.serial_no ||
  record?.customFields?.serial_number ||
  record?.customFields?.serial_no ||
  record?.metadata?.serial_number ||
  record?.metadata?.serial_no ||
  '';

// The certificate's own structured credential data (credentialSubject.serial_no)
// is the authoritative, identity-based association key confirmed live against
// Dhiway — prefer it over `title`, which only works if the org's Dhiway schema
// happens to echo the serial number into the title field.
const getCertificateSerialNumber = (rec) =>
  rec?.credential?.credentialSubject?.serial_no ||
  rec?.credentialSubject?.serial_no ||
  rec?.record?.credentialSubject?.serial_no ||
  rec?.credential?.credentialSubject?.serial_number ||
  rec?.credentialSubject?.serial_number ||
  null;

// Plain Product batches have no serial_number field at all (their schema is
// product_name/sku_no/model_no/brand/QR — see VERIFICATION_REQUIRED_HEADERS;
// sku_no is a pre-upload document-matching key only and, per the backend's
// own architecture docs, must never be used for certificate correlation),
// so title/email matching permanently fails for them: the list endpoint
// (GET /sdc/records) echoes the certificate's own publicId into `title` and
// leaves `recipients` empty for products, carrying no identity back to the
// batch record at all. Confirmed live in a single-record detail fetch
// (GET /sdc/records/{publicId}) that credentialSubject.product_id IS present
// there — same shape as serial_no above — so that's the reliable key for
// products, at the cost of one extra request per unmatched candidate.
export const getCertificateProductId = (rec) =>
  rec?.credential?.credentialSubject?.product_id ||
  rec?.credentialSubject?.product_id ||
  rec?.record?.credentialSubject?.product_id ||
  null;

// verification_type_label is just "Manual"/"Automatic" (a category, per the
// submitted-reports docs) — not a display name. The readable name has to
// come from slugifying verification_type_name (e.g. "police_verification" →
// "Police Verification"); using the label here would show "Manual" as the
// title for every single report.
export const formatVerifTypeLabel = (report) =>
  report.verification_type_name?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ||
  report.verification_type_label ||
  'Manual Verification';

// "doc_uploaded" is the only status an admin can still act on (approved/
// rejected are already decided, everything else hasn't been submitted yet)
// — same condition handleApproveAllReports uses to pick which requests to
// approve in bulk.
export const countPendingReview = (reports) => (reports || []).filter((r) => r.status === 'doc_uploaded').length;

const formatCreatedAt = (value) => {
  if (!value) return 'date unavailable';
  return new Date(value).toLocaleString([], { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// Batch aggregates come straight from GET /verification/batches — each entry
// already carries its own total/approved/rejected counts and a real `status`
// field (BatchListResponse), so there's no need to pull every individual
// record via /verification/all and group them client-side, and no need to
// infer status client-side either.
const normaliseApiBatch = (b) => {
  const id = b.batch_id || b.id || '';
  const records = Array.isArray(b.users) ? b.users : [];
  const total = records.length > 0 ? records.length : Number(b.total_users ?? b.total ?? 0);
  const summaryVerified = Number(b.approved ?? b.approved_count ?? 0);
  const summaryFailed = Number(b.rejected ?? b.rejected_count ?? 0);
  const hasRecordStatuses = records.some((record) => record?.verification_status != null || record?.status != null);
  const recordCounts = hasRecordStatuses ? summarizeRecordCounts(records) : null;
  const verified = recordCounts ? recordCounts.verified : summaryVerified;
  const failed = recordCounts ? recordCounts.failed : summaryFailed;
  const pending = recordCounts ? recordCounts.pending : Math.max(0, total - verified - failed);
  const createdAt = b.created_at ? new Date(b.created_at).getTime() : 0;
  return {
    id,
    name: b.batch_name || b.name || `Batch ${String(id).slice(0, 8)}`,
    orgName: b.organization_name || b.org_name || 'Organization',
    orgId: b.org_id || null,
    records,
    total, pending, verified, failed,
    rawStatus: b.status || 'pending',
    // 'human' | 'product' | 'warranty' — now a required field on batch
    // creation; null for older batches created before it existed.
    batchType: b.batch_type || null,
    latestCreatedAt: createdAt,
    sdcInfo: b.verification_progress?.sdc || null,
    // Real, persisted sharing state from the backend (Batch.shared_with_org)
    // — the actual security gate for certificate visibility, not a local
    // notify-action. See handleSendToOrganization / shareWithOrganization.
    sharedWithOrg: !!b.shared_with_org,
    sharedAt: b.shared_at || null,
    sharedBy: b.shared_by || null,
  };
};

// `specialization` on a verifier object is a comma-joined string of every
// verification type name they support (confirmed live — this is what was
// dumping as one giant unreadable line in the dropdown before), so its
// actual count is the real "N verification types available" figure, not a
// guess scoped to just this batch's needed types.
const getVerifierTypeCount = (v) =>
  String(v?.specialization || '').split(',').map((s) => s.trim()).filter(Boolean).length;

// ── Smart Send — Verifier Table Row ─────────────────────────────────────────
// A row's own email_subject/email_body only matter once `customized` is set
// (the admin clicked "Customize Template" and actually edited it in the
// drawer) — until then it mirrors the single shared `defaultTemplate` from
// the modal. The row itself never shows an inline editor — clicking
// "Customize Template" just tells the parent to open the one template
// drawer pointed at this row instead, so there's only ever a single editor
// visible at a time.
const VERIFIER_ROW_GRID = 'grid-cols-[28px_minmax(0,1.7fr)_140px_100px_150px_28px]';

const VerifierRow = ({ index, row, typeLabel, allVerifiers, batchTotal, countBefore, canRemove, isEditing, onCustomize, onUpdate, onRemove }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [verifierSearch, setVerifierSearch] = useState('');
  const [menuPos, setMenuPos] = useState(null);
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);
  const searchInputRef = useRef(null);

  // The row list this lives in scrolls (`overflow-y-auto`), which clips any
  // absolutely-positioned child to that scroll viewport — the dropdown was
  // getting cut off / squashed against the scrollbar instead of floating
  // above the table. Portal it to <body> and position it with fixed coords
  // from the trigger's own rect instead, recomputed on open and kept in
  // sync while the ancestor scrolls or the viewport resizes.
  useEffect(() => {
    if (!dropdownOpen) return;
    const updatePos = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) setMenuPos({ top: rect.bottom, left: rect.left, width: rect.width });
    };
    updatePos();
    window.addEventListener('scroll', updatePos, true);
    window.addEventListener('resize', updatePos);
    return () => {
      window.removeEventListener('scroll', updatePos, true);
      window.removeEventListener('resize', updatePos);
    };
  }, [dropdownOpen]);

  const verifierInfo = allVerifiers.find((v) => v.id === row.verifier_id);
  const typeCount = verifierInfo ? getVerifierTypeCount(verifierInfo) : 0;
  // Any of these fields being a non-string (a number, an object — seen
  // enough surprising API shapes in this app to not assume) would throw on
  // .toLowerCase() and blank the whole page with an uncaught render error,
  // so coerce with String(...) first rather than trusting they're strings.
  const searchQuery = verifierSearch.trim().toLowerCase();
  const filteredVerifiers = searchQuery
    ? allVerifiers.filter((v) =>
        [v.name, v.email, v.organization, v.specialization]
          .map((f) => (f == null ? '' : String(f)))
          .some((f) => f.toLowerCase().includes(searchQuery))
      )
    : allVerifiers;
  const count     = parseInt(row.count) || 0;
  const available = batchTotal - countBefore;   // slots left for this row and beyond, within its own type
  const isOver    = count > available;

  const status = count === 0 ? 'pending' : isOver ? 'over' : 'complete';
  const statusMeta = {
    pending:  { label: 'Pending',    tone: 'bg-amber-50 text-amber-600' },
    complete: { label: 'Complete',   tone: 'bg-emerald-50 text-emerald-600' },
    over:     { label: 'Over Limit', tone: 'bg-red-50 text-red-600' },
  }[status];

  const menuRef = useRef(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        menuRef.current && !menuRef.current.contains(e.target)
      ) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  return (
    <div className={`grid ${VERIFIER_ROW_GRID} items-start gap-x-2 px-3 py-2 transition-colors hover:bg-gray-50/60`}>

      {/* # */}
      <span className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-blue text-[10px] font-bold text-white font-inter">{index + 1}</span>

      {/* Verifier picker */}
      <div className="min-w-0">
        <div ref={dropdownRef} className="relative">
          <button
            ref={triggerRef}
            type="button"
            onClick={() => {
              setDropdownOpen((p) => !p);
              setVerifierSearch('');
              // Focus the search box the moment it mounts, same tick as open.
              requestAnimationFrame(() => searchInputRef.current?.focus());
            }}
            className={`flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-sm font-inter text-left transition-colors focus:outline-none ${dropdownOpen ? 'rounded-lg border border-brand-blue/40 bg-white ring-2 ring-brand-blue/10' : 'rounded-lg border border-gray-200 bg-white hover:border-brand-blue/40'}`}
          >
            <span className={`truncate ${verifierInfo ? 'text-brand-dark font-medium' : 'text-gray-400'}`}>
              {verifierInfo
                ? `${verifierInfo.name || verifierInfo.email}${verifierInfo.organization ? ` — ${verifierInfo.organization}` : ''}`
                : '— Select a verifier —'}
            </span>
            <Search size={13} className="shrink-0 text-gray-400" />
          </button>
          {dropdownOpen && menuPos && createPortal(
            <div
              ref={menuRef}
              style={{ position: 'fixed', top: menuPos.top + 4, left: menuPos.left, width: Math.max(menuPos.width, 240) }}
              className="z-[60] rounded-lg border border-brand-blue/40 bg-white shadow-xl overflow-hidden"
            >
              <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
                <Search size={13} className="shrink-0 text-gray-400" />
                <input
                  ref={searchInputRef}
                  value={verifierSearch}
                  onChange={(e) => setVerifierSearch(e.target.value)}
                  placeholder="Search verifiers"
                  className="w-full text-sm font-inter text-brand-dark outline-none placeholder:text-gray-400"
                />
              </div>
              <div className="max-h-40 overflow-y-auto divide-y divide-gray-50">
                {!verifierSearch.trim() && row.verifier_id && (
                  <button type="button" onClick={() => { onUpdate(row._key, { verifier_id: '' }); setDropdownOpen(false); }}
                    className="w-full px-3 py-2 text-left text-xs italic text-gray-400 font-inter hover:bg-gray-50 transition-colors">
                    Clear selection
                  </button>
                )}
                {filteredVerifiers.length === 0 ? (
                  <p className="px-3 py-3 text-center text-xs text-gray-400 font-inter">No verifiers match "{verifierSearch}"</p>
                ) : (
                  filteredVerifiers.map((v) => {
                    const vCount = getVerifierTypeCount(v);
                    return (
                      <button key={v.id} type="button"
                        onClick={() => { onUpdate(row._key, { verifier_id: v.id }); setDropdownOpen(false); }}
                        className={`w-full px-3 py-2.5 text-left transition-colors hover:bg-blue-50 ${row.verifier_id === v.id ? 'bg-blue-50' : ''}`}>
                        <p className="text-sm font-semibold text-brand-dark font-inter leading-tight">
                          {v.name || v.email}
                          {row.verifier_id === v.id && <span className="ml-1.5 text-[10px] font-bold text-brand-blue">✓</span>}
                        </p>
                        <p className="text-[11px] text-gray-400 font-inter mt-0.5">
                          {vCount} verification type{vCount !== 1 ? 's' : ''} available
                        </p>
                      </button>
                    );
                  })
                )}
              </div>
            </div>,
            document.body
          )}
        </div>
        {verifierInfo?.email && <p className="mt-0.5 truncate text-[10px] text-gray-400 font-inter">{verifierInfo.email}</p>}
        {verifierInfo && (
          <p className="truncate text-[10px] text-gray-400 font-inter">
            {typeCount} verification type{typeCount !== 1 ? 's' : ''} available
          </p>
        )}
        <p className="truncate text-[10px] font-semibold text-brand-blue/70 font-inter">{typeLabel}</p>
      </div>

      {/* Users to assign */}
      <div>
        <div className={`flex items-center rounded-lg border overflow-hidden ${isOver ? 'border-red-300' : 'border-gray-200'}`}>
          <button type="button"
            onClick={() => onUpdate(row._key, { count: String(Math.max(0, count - 1)) })}
            disabled={count === 0}
            className="px-2 py-1.5 text-gray-400 hover:bg-gray-50 hover:text-brand-dark transition-colors disabled:opacity-30 text-sm select-none font-medium">
            −
          </button>
          <input
            type="number"
            min={0}
            max={batchTotal}
            value={row.count}
            onChange={(e) => onUpdate(row._key, { count: e.target.value })}
            className={`w-full min-w-0 py-1.5 text-sm font-bold font-inter text-center border-x border-gray-100 focus:outline-none bg-transparent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${isOver ? 'text-red-500' : count > 0 ? 'text-brand-blue' : 'text-gray-400'}`}
            placeholder="0"
          />
          <button type="button"
            onClick={() => onUpdate(row._key, { count: String(count + 1) })}
            disabled={available <= 0}
            className="px-2 py-1.5 text-gray-400 hover:bg-gray-50 hover:text-brand-dark transition-colors disabled:opacity-30 text-sm select-none font-medium">
            +
          </button>
        </div>
        {isOver && <p className="mt-0.5 text-[10px] font-medium text-red-500 font-inter">only {available} available</p>}
      </div>

      {/* Assigned / Remaining */}
      <div className="pt-1">
        <p className="text-sm font-bold text-brand-dark font-inter">{count}/{batchTotal}</p>
        <span className={`mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold font-inter ${statusMeta.tone}`}>{statusMeta.label}</span>
      </div>

      {/* Email Template — opens the single shared drawer pointed at this row */}
      <div>
        <button type="button" onClick={() => onCustomize(row._key)}
          className={`flex w-full items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-semibold font-inter transition-colors ${
            isEditing
              ? 'border-brand-blue bg-brand-blue/5 text-brand-blue'
              : 'border-gray-200 bg-white text-brand-blue hover:bg-blue-50/60'
          }`}>
          <Mail size={11} className="shrink-0" />
          <span className="truncate">{row.customized ? 'Custom Template' : 'Customize Template'}</span>
        </button>
        <p className="mt-0.5 flex items-center gap-1 text-[10px] text-gray-400 font-inter">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${row.customized ? 'bg-emerald-500' : 'bg-gray-300'}`} />
          {row.customized ? 'Template configured' : 'Using default template'}
        </p>
      </div>

      {/* Delete — direct icon, no menu */}
      <button
        type="button"
        onClick={() => canRemove && onRemove(row._key)}
        disabled={!canRemove}
        title={canRemove ? 'Remove this verifier' : 'This verification type needs at least one verifier row — add another before removing this one'}
        className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-lg transition-colors ${canRemove ? 'text-gray-400 hover:bg-red-50 hover:text-red-500' : 'text-gray-200 cursor-not-allowed'}`}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
};

// ── Smart Send Modal ─────────────────────────────────────────────────────────
export const SmartSendModal = ({ isOpen, onClose, onSent, batch }) => {
  const [verificationTypes, setVerificationTypes] = useState([]);
  const [verifiersByType,   setVerifiersByType]    = useState({}); // { [verification_name]: verifier[] }
  const [loading,           setLoading]           = useState(false);
  // assignments: { [type_name]: [{ _key, verifier_id, email_subject, email_body, customized, count: '' }] }
  const [assignments, setAssignments] = useState({});
  const [sending,     setSending]     = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  // The shared template shown in "Edit Default Template" — only actually
  // used for a row once the admin has typed into it (defaultTemplateTouched)
  // AND that row isn't individually customized. Until touched, each
  // untouched row instead gets its OWN type's auto-generated subject/body
  // (see rowDefaultSubject/rowDefaultBody below) — a batch with more than
  // one verification type used to hand every verifier the literal text
  // generated for the FIRST type only (e.g. an "Active Ingredient" verifier
  // getting an email that talks about "Allergy Testing"), because this was
  // one fixed string shared by every type instead of being per-type.
  const [defaultTemplate, setDefaultTemplate] = useState({ subject: '', body: '' });
  const [defaultTemplateTouched, setDefaultTemplateTouched] = useState(false);
  const [saveDefaultAsDraft, setSaveDefaultAsDraft] = useState(false);
  // null = the template drawer is closed; a row _key = the drawer is open,
  // pointed at that one row (via its "Customize Template" button). There is
  // only ever one template editor visible at a time, never a second one
  // inline in the table row itself.
  const [editingKey, setEditingKey] = useState(null);

  const slugToLabel = (s) => s?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || s;
  const defaultSubject = (typeName) => `Verification Request: ${slugToLabel(typeName)}`;
  // verification_name almost always already ends in "...Verification" once
  // slugified (e.g. "allergy_testing_results_verification" → "Allergy
  // Testing Results Verification"), so appending the word again here used to
  // read "...Verification verification." — dropped the trailing word rather
  // than special-casing every type name.
  const defaultBody = (typeName) =>
    `Hi,\n\nPlease find the attached Excel file with the candidates assigned to you for ${slugToLabel(typeName)}.\n\nComplete the verification and upload your report using the secure link provided.\n\nRegards,\nTruMarkZ Admin`;

  // Derive batch users from the already-loaded batch.records — confirmed via
  // the actual GET /verification/batches/{id} response that each user object
  // is keyed by `user_id`, not `id` (that field name only appears elsewhere,
  // e.g. the bulk-upload response's `entity_id`) — check all three so this
  // doesn't silently send `null` again if the shape varies by caller.
  const batchUsers = (batch?.records || []).map((r) => ({
    id: r.id || r.user_id || r.entity_id,
    name: r.full_name || r.product_name || r.email || r.id || r.user_id || r.entity_id,
  }));

  // The template preview defaults to the batch's first needed verification
  // type — the only unambiguous single choice when one shared template can
  // end up covering several different types at once. It's just a starting
  // point for editing, though — see rowDefaultSubject/rowDefaultBody for
  // what actually gets sent to an untouched row.
  const primaryTypeName = verificationTypes[0]?.verification_name || null;
  // What an untouched (non-customized) row actually sends: its own type's
  // auto-generated text until the admin explicitly edits the shared
  // default, at which point that literal text is used for every untouched
  // row instead — an intentional admin choice at that point, not a silent
  // mismatch.
  const rowDefaultSubject = (typeName) => (defaultTemplateTouched ? defaultTemplate.subject : defaultSubject(typeName));
  const rowDefaultBody    = (typeName) => (defaultTemplateTouched ? defaultTemplate.body    : defaultBody(typeName));

  useEffect(() => {
    if (!isOpen || !batch?.id) return;
    setAssignments({});
    setVerifiersByType({});
    setSaveDefaultAsDraft(false);
    setDefaultTemplate({ subject: '', body: '' });
    setDefaultTemplateTouched(false);
    setEditingKey(null);
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
              // v.label here is "manual"/"automatic" — a category, not a
              // display name (same trap documented on formatVerifTypeLabel
              // above for the analogous submitted-reports field). Always
              // derive the readable name from verification_name itself;
              // v.label is never a fallback candidate for this.
              label: slugToLabel(v.verification_name),
              defaultEmail: v.email_address || null,
            };
          }
        });
        const types = Object.values(typeMap);
        setVerificationTypes(types);
        if (types.length > 0) {
          setDefaultTemplate({ subject: defaultSubject(types[0].verification_name), body: defaultBody(types[0].verification_name) });
          // Start with one card per type, matching the common case of one
          // verifier handling each check — Add Another Verifier covers the
          // rest (multiple verifiers splitting one type, or a type with none
          // picked yet).
          setAssignments(Object.fromEntries(types.map((t) => [
            t.verification_name,
            [{ _key: `${t.verification_name}-0`, verifier_id: '', email_subject: '', email_body: '', customized: false, count: '' }],
          ])));
        }

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
        { _key: `${typeName}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, verifier_id: '', email_subject: '', email_body: '', customized: false, count: '' },
      ],
    }));
  };

  const removeVerifier = (typeName, key) => {
    setAssignments((prev) => ({ ...prev, [typeName]: (prev[typeName] || []).filter((v) => v._key !== key) }));
    // Removing the card currently being edited would otherwise leave the
    // right panel pointed at a row that no longer exists.
    setEditingKey((current) => (current === key ? null : current));
  };

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

  // Flattened, numbered card list for the left column — countBefore/available
  // still have to be computed per-type (each verification type independently
  // needs full batch coverage), so this is derived per-type first and then
  // flattened purely for display/numbering.
  const flatRows = verificationTypes.flatMap((t) => {
    const rows = typeRows(t.verification_name);
    return rows.map((row, ri) => ({
      ...row,
      typeName: t.verification_name,
      typeLabel: t.label,
      allVerifiers: verifiersByType[t.verification_name] || [],
      countBefore: rows.slice(0, ri).reduce((s, r) => s + (parseInt(r.count) || 0), 0),
      // Every verification type the batch actually needs must keep at least
      // one card so it can never silently drop out of coverage — only rows
      // added on top via "Add Another Verifier" (splitting one type across
      // multiple verifiers) are removable.
      canRemove: rows.length > 1,
    }));
  });

  const activeTypes  = typesCoverage.filter((t) => t.hasVerifiers);
  const hasOverflow  = activeTypes.some((t) => t.covered > t.total);
  const allCovered   = batchUsers.length === 0 || (activeTypes.length > 0 && activeTypes.every((t) => t.covered === t.total));
  // Only rows that will actually receive an email — a verifier picked with 0
  // users assigned isn't really "sending" anything yet.
  const totalAssigned = flatRows.filter((r) => r.verifier_id && (parseInt(r.count) || 0) > 0).length;
  const canSend = totalAssigned > 0 && allCovered && !hasOverflow;

  // Regenerating goes back to the safe per-type auto behavior (touched:
  // false) rather than re-freezing a literal string that would just recreate
  // the original mismatch for every other type again.
  const resetDefaultTemplate = () => {
    if (!primaryTypeName) return;
    setDefaultTemplate({ subject: defaultSubject(primaryTypeName), body: defaultBody(primaryTypeName) });
    setDefaultTemplateTouched(false);
  };

  // Opens the shared template drawer pointed at one specific verifier row.
  const handleCustomize = (key) => setEditingKey(key);

  const isEditingDefault = editingKey === 'DEFAULT';
  const editingRow = editingKey && !isEditingDefault ? flatRows.find((r) => r._key === editingKey) : null;
  // Falls back to this row's own per-type default if it hasn't forked yet,
  // exactly like handleSend already does when building the real payload —
  // keeps the drawer preview and the actual send in lock-step.
  const editingSubject = editingRow ? (editingRow.customized ? editingRow.email_subject : rowDefaultSubject(editingRow.typeName)) : defaultTemplate.subject;
  const editingBody    = editingRow ? (editingRow.customized ? editingRow.email_body    : rowDefaultBody(editingRow.typeName))    : defaultTemplate.body;
  const editingVerifierInfo = editingRow ? (editingRow.allVerifiers || []).find((v) => v.id === editingRow.verifier_id) : null;
  const editingVerifierLabel = editingRow
    ? (editingVerifierInfo
        ? `${editingVerifierInfo.name || editingVerifierInfo.email}${editingVerifierInfo.organization ? ` — ${editingVerifierInfo.organization}` : ''}`
        : `Verifier ${flatRows.findIndex((r) => r._key === editingRow._key) + 1}`)
    : '';

  const handleSaveDraft = async () => {
    if (!primaryTypeName) return;
    if (!defaultTemplate.subject.trim() || !defaultTemplate.body.trim()) {
      toast.error('Add a subject and message first');
      return;
    }
    setSavingDraft(true);
    try {
      await verificationAPI.createEmailDraft({ verification_type: primaryTypeName, subject: defaultTemplate.subject, body: defaultTemplate.body });
      toast.success('Email template saved as a draft');
    } catch (err) {
      toast.error(getApiError(err, 'Failed to save draft'));
    } finally {
      setSavingDraft(false);
    }
  };

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
          .filter((v) => v.verifier_id && parseInt(v.count) > 0)
          .map((row) => {
            const n = parseInt(row.count);
            const user_ids = batchUserIds.slice(offset, offset + n);
            offset += n;
            const email_subject = row.customized ? row.email_subject : rowDefaultSubject(t.verification_name);
            const email_body    = row.customized ? row.email_body    : rowDefaultBody(t.verification_name);
            return { verifier_id: row.verifier_id, email_subject, email_body, user_ids };
          })
          .filter((v) => v.email_subject.trim() && v.email_body.trim());
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
      if (saveDefaultAsDraft && primaryTypeName && defaultTemplate.subject.trim() && defaultTemplate.body.trim()) {
        await verificationAPI.createEmailDraft({ verification_type: primaryTypeName, subject: defaultTemplate.subject, body: defaultTemplate.body }).catch(() => {});
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

  // Single drawer that opens only when a row's "Customize Template" (or the
  // "Edit Default Template" link) is clicked — passed to Modal as
  // `sidePanel`, docked beside the main dialog. Doubles as the editor for
  // either one specific row or the shared default, never both at once.
  const templateDrawer = (editingRow || isEditingDefault) && (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
        <div className="min-w-0">
          <h4 className="font-sora text-base font-semibold text-brand-dark">
            {editingRow ? 'Customize Email Template' : 'Edit Default Template'}
          </h4>
          <p className="mt-1 text-xs text-gray-400 font-inter leading-relaxed">
            {editingRow
              ? <>This template will be sent to all users assigned to <span className="font-semibold text-brand-dark">{editingVerifierLabel}</span>.</>
              : 'This is the shared template sent to every verifier who has not customized their own.'}
          </p>
        </div>
        <button type="button" onClick={() => setEditingKey(null)}
          className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
          <X size={18} />
        </button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2.5">
          <Info size={13} className="mt-0.5 shrink-0 text-brand-blue" />
          <p className="text-xs text-blue-700 font-inter leading-relaxed">The Excel file and secure upload link are automatically appended by the system.</p>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-gray-500 font-inter mb-1">Subject *</label>
          <input
            value={editingSubject}
            onChange={(e) => editingRow
              ? updateVerifier(editingRow.typeName, editingRow._key, { email_subject: e.target.value, customized: true })
              : (setDefaultTemplate((p) => ({ ...p, subject: e.target.value })), setDefaultTemplateTouched(true))}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-inter focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-gray-500 font-inter mb-1">Message *</label>
          <textarea
            rows={12}
            value={editingBody}
            onChange={(e) => editingRow
              ? updateVerifier(editingRow.typeName, editingRow._key, { email_body: e.target.value, customized: true })
              : (setDefaultTemplate((p) => ({ ...p, body: e.target.value })), setDefaultTemplateTouched(true))}
            className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm font-inter focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          />
        </div>
        {editingRow ? (
          editingRow.customized && (
            <button type="button"
              onClick={() => updateVerifier(editingRow.typeName, editingRow._key, { customized: false, email_subject: '', email_body: '' })}
              className="flex items-center gap-1.5 text-xs font-semibold text-brand-blue font-inter hover:underline">
              <RefreshCw size={12} /> Reset to shared template
            </button>
          )
        ) : (
          <button type="button" onClick={resetDefaultTemplate}
            className="flex items-center gap-1.5 text-xs font-semibold text-brand-blue font-inter hover:underline">
            <RefreshCw size={12} /> Regenerate default template
          </button>
        )}
      </div>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bulk Send to Verifiers" size="7xl" sidePanel={templateDrawer} sidePanelWidth="max-w-md">
      <div className="space-y-4">
        <p className="-mt-2 text-sm text-gray-500 font-inter">Assign batch users to verifiers for document verification</p>

        {/* Batch + coverage summary chip */}
        <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-blue/15 text-brand-blue shrink-0">
            <Zap size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-500 font-inter">Smart Send</p>
            <p className="text-sm font-semibold text-brand-dark font-inter truncate">{batch?.name}</p>
            <p className="text-xs text-gray-400 font-inter">Verification Process: Manual Assignment</p>
          </div>
          <div className="flex gap-3 shrink-0 text-right">
            <div>
              <p className="text-[10px] text-gray-400 font-inter">Total Users</p>
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
          <div className="min-w-0">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-brand-dark font-inter">Assigned Verifiers ({flatRows.length})</p>
              <button type="button" onClick={() => setEditingKey('DEFAULT')}
                className="flex items-center gap-1.5 text-xs font-semibold text-brand-blue font-inter hover:underline">
                <Mail size={12} /> Edit Default Template
              </button>
            </div>

            {/* Table — grouped by verification type (a thin label row per
                type) so every row's type stays visible even though the
                columns themselves don't repeat it; each type keeps its own
                "add another" link right under its own rows, so adding a
                verifier can never land on the wrong type. */}
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <div className="min-w-[620px]">
                  <div className={`grid ${VERIFIER_ROW_GRID} gap-x-2 bg-gray-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400 font-inter border-b border-gray-100`}>
                    <span></span>
                    <span>Verifier</span>
                    <span>Users to assign</span>
                    <span>Assigned</span>
                    <span>Email Template</span>
                    <span></span>
                  </div>
                  <div className="max-h-[54vh] divide-y divide-gray-100 overflow-y-auto">
                    {flatRows.length === 0 && (
                      <p className="py-6 text-center text-xs text-gray-400 font-inter">No verifiers assigned yet.</p>
                    )}
                    {verificationTypes.map((t) => {
                      const rows = typeRows(t.verification_name);
                      return (
                        <div key={t.verification_name}>
                          <div className="bg-blue-50/50 px-3 py-1 text-[11px] font-semibold text-brand-blue font-inter">{t.label}</div>
                          {rows.map((row) => {
                            const flatRow = flatRows.find((r) => r._key === row._key);
                            const index = flatRows.indexOf(flatRow);
                            return (
                              <VerifierRow
                                key={row._key}
                                index={index}
                                row={flatRow}
                                typeLabel={t.label}
                                allVerifiers={verifiersByType[t.verification_name] || []}
                                batchTotal={batchUsers.length}
                                countBefore={flatRow.countBefore}
                                canRemove={flatRow.canRemove}
                                isEditing={editingKey === row._key}
                                onCustomize={handleCustomize}
                                onUpdate={(key, patch) => updateVerifier(t.verification_name, key, patch)}
                                onRemove={(key) => removeVerifier(t.verification_name, key)}
                              />
                            );
                          })}
                          <div className="px-3 py-1.5">
                            <button type="button" onClick={() => addVerifier(t.verification_name)}
                              className="flex items-center gap-1 text-xs font-semibold text-brand-blue font-inter hover:underline">
                              <Plus size={12} /> Add another verifier for {t.label}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Coverage warning */}
            {(!allCovered || hasOverflow) && activeTypes.length > 0 && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
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
          </div>
        )}

        {/* Footer */}
        {!loading && verificationTypes.length > 0 && (
          <div className="flex flex-col gap-3 pt-1 border-t border-gray-100 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-2.5 cursor-pointer select-none group">
              <input type="checkbox" checked={saveDefaultAsDraft} onChange={(e) => setSaveDefaultAsDraft(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 accent-brand-blue cursor-pointer" />
              <span className="text-xs font-inter text-gray-600 group-hover:text-brand-dark">Save the default template as a draft when sending</span>
            </label>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button variant="ghost" onClick={onClose} disabled={sending}>Cancel</Button>
              <Button variant="outline" icon={savingDraft ? RefreshCw : Save} loading={savingDraft} onClick={handleSaveDraft} disabled={sending}>
                Save Email Draft
              </Button>
              <Button
                variant="primary"
                icon={sending ? RefreshCw : Zap}
                disabled={!canSend || sending}
                onClick={handleSend}
              >
                {sending ? 'Sending…' : canSend ? `Smart Send (${totalAssigned} verifier${totalAssigned !== 1 ? 's' : ''})` : 'Assign all users first'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

// ── Warranty product status (approve/reject outcome — distinct from the
// batch-level statuses below) ───────────────────────────────────────────────
const WARRANTY_PRODUCT_STATUS_META = {
  pending:  { label: 'Pending',  tone: 'bg-amber-50 text-amber-700 border-amber-200',    icon: Clock },
  approved: { label: 'Approved', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle },
  rejected: { label: 'Rejected', tone: 'bg-red-50 text-red-600 border-red-200',          icon: XCircle },
};

// ── Warranty BATCH status — separate vocabulary from the product-level one
// above. `sdc_generated` only ever applies at the batch level (once certs are
// issued, the backend now keeps the batch here permanently — it no longer
// reverts to "approved" on refresh/poll, per the backend fix). Read this
// straight off `data.status` with no client-side override, exactly as the
// backend now guarantees it — no fallback workaround to "approved".
const WARRANTY_BATCH_STATUS_META = {
  pending:       { label: 'Pending',       banner: 'bg-amber-50 text-amber-700',    icon: Clock },
  approved:      { label: 'Approved',      banner: 'bg-emerald-50 text-emerald-700', icon: CheckCircle },
  sdc_generated: { label: 'SDC Generated', banner: 'bg-blue-50 text-brand-blue',    icon: Sparkles },
  rejected:      { label: 'Rejected',      banner: 'bg-red-50 text-red-600',       icon: XCircle },
};

// Warranty's own real lifecycle — auto-approval means there's no
// Pending→Processing→Verifying→Completed pipeline to show, but there IS a
// genuine 3-step progression worth visualizing, driven by the same
// data.status this modal already trusts (no separate tracking needed).
const WARRANTY_LIFECYCLE_STEPS = [
  { id: 'uploaded',      label: 'Uploaded',   icon: Package },
  { id: 'approved',      label: 'Approved',   icon: CheckCircle },
  { id: 'sdc_generated', label: 'SDC Issued', icon: Sparkles },
];

const warrantyDetailFormatDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? v
    : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

// ── Delete Batch Modal — DELETE /verification/batches/{batch_id}, superadmin
// only. Hard-deletes the whole batch (BatchUsers, documents, audit logs,
// verification/SDC state, GCS files, and — for Warranty — its reserved
// serial numbers). Irreversible and can't roll back an already-issued
// Dhiway credential, so this requires typing the batch's exact name before
// the delete button even enables — the same friction GitHub-style "type to
// confirm" deletes use for something this destructive.
export const DeleteBatchModal = ({ batch, onClose, onDeleted }) => {
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  if (!batch) return null;
  const canDelete = confirmText.trim() === batch.name && !deleting;

  const handleDelete = async () => {
    if (!canDelete) return;
    setDeleting(true);
    try {
      const { data } = await verificationAPI.deleteBatch(batch.id);
      toast.success(data?.message || `"${batch.name}" deleted permanently`);
      // Surface any orphaned-Dhiway-credential info the backend returns —
      // never implying the external credential itself was also removed,
      // since Dhiway issuance can't be revoked from here.
      const dhiwayWarning = data?.dhiway_warning || data?.warning || data?.orphan_info || data?.orphaned_credentials;
      if (dhiwayWarning) {
        toast(
          typeof dhiwayWarning === 'string'
            ? dhiwayWarning
            : 'This batch had an issued Dhiway credential — it could not be revoked and may still exist/resolve externally, even though the batch and its data are now deleted from TruMarkZ.',
          { icon: '⚠️', duration: 10000 }
        );
      }
      onDeleted(batch.id);
    } catch (err) {
      const httpStatus = err?.response?.status;
      if (httpStatus === 404) {
        toast.error('This batch was already deleted.');
        onDeleted(batch.id);
        return;
      }
      if (httpStatus === 409) {
        toast.error('This batch is still processing — wait for it to finish, then try deleting again.');
        return;
      }
      toast.error(getApiError(err, 'Failed to delete batch'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal isOpen={!!batch} onClose={() => !deleting && onClose()} title="Delete Batch Permanently" size="md">
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div className="font-inter text-sm text-red-700">
            <p className="font-semibold">This cannot be undone.</p>
            <p className="mt-1 text-red-600">
              Deleting <span className="font-semibold">"{batch.name}"</span> permanently removes the batch and everything
              belonging to it — all records, uploaded documents/photos/images, verification reports, Excel/CSV files,
              audit logs, and verification/SDC state.
            </p>
            {batch.batchType === 'warranty' && (
              <p className="mt-1 text-red-600">Its reserved warranty serial numbers are released back to the registry too.</p>
            )}
            <p className="mt-2 text-red-600">
              If a Dhiway certificate was already issued for this batch, it cannot be revoked from here — it may still
              exist externally even after this delete.
            </p>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block font-inter text-xs font-medium text-gray-600">
            Type <span className="font-semibold text-gray-800">{batch.name}</span> to confirm
          </label>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={batch.name}
            disabled={deleting}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 font-inter text-sm outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 disabled:bg-gray-50"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="danger" size="sm" icon={deleting ? RefreshCw : Trash2}
            loading={deleting} disabled={!canDelete}
            onClick={handleDelete}
          >
            Delete Permanently
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ── Send Rejected List Modal — POST /verification/batches/{batch_id}/
// send-rejected-list, superadmin only. Emails an Excel of every user with at
// least one rejected verification_type_status entry (not just users whose
// overall status is "rejected" — a partially-verified user with one
// rejected type is included too) to the batch's organization. There is no
// separate "preview" endpoint — the summary (rejected count, per-type
// breakdown, recipient) only exists in the SEND call's own response, so it
// can only be shown after sending, never before.
export const SendRejectedListModal = ({ batch, onClose }) => {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  if (!batch) return null;

  const handleSend = async () => {
    if (sending) return;
    setSending(true);
    try {
      const { data } = await verificationAPI.sendRejectedList(batch.id);
      setResult(data || {});
      toast.success(data?.message || 'Rejected list generated and made available to the organization');
    } catch (err) {
      const httpStatus = err?.response?.status;
      if (httpStatus === 404) {
        toast.error('No rejected users found in this batch — nothing to send.');
      } else if (httpStatus === 400) {
        toast.error(getApiError(err, "This organization has no email on file"));
      } else {
        toast.error(getApiError(err, 'Failed to send rejected list'));
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal isOpen={!!batch} onClose={() => !sending && onClose()} title="Send Rejected List" size="md">
      <div className="space-y-4">
        {!result ? (
          <>
            <div className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-500" />
              <p className="text-xs text-amber-700 font-inter leading-relaxed">
                Generates an Excel of every user in <strong>{batch.name}</strong> with at least one rejected
                verification type — including each user's status and rejection reason per type — and makes
                it available to the organization directly in the app. Nothing is emailed.
              </p>
            </div>
            <p className="text-sm text-gray-600 font-inter">
              Generate the rejected verification list for this batch now?
            </p>
            <div className="flex justify-end gap-2 pt-1 border-t border-gray-100">
              <Button variant="ghost" onClick={onClose} disabled={sending}>Cancel</Button>
              <Button variant="primary" icon={sending ? RefreshCw : Send} loading={sending} onClick={handleSend}>
                Send Rejected List
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-green-50 px-4 py-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600">
                <CheckCircle size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-brand-dark font-inter">Rejected List Generated</p>
                <p className="text-xs text-emerald-700 font-inter truncate">
                  {result.message || 'Now available to the organization in the app — nothing was emailed.'}
                </p>
              </div>
            </div>

            <div className="space-y-1.5 rounded-xl border border-gray-100 px-3 py-2.5">
              <div className="flex items-center justify-between text-sm font-inter">
                <span className="text-gray-500">Rejected Users</span>
                <span className="font-semibold text-brand-dark">{result.total_rejected_users ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm font-inter">
                <span className="shrink-0 text-gray-500">Organization</span>
                <span className="min-w-0 truncate font-semibold text-brand-dark">{result.organization_email || '—'}</span>
              </div>
            </div>

            {Array.isArray(result.rejected_by_type) && result.rejected_by_type.length > 0 && (
              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 font-inter">By Verification Type</p>
                <div className="space-y-1.5">
                  {result.rejected_by_type.map((t) => (
                    <div key={t.verification_type_name} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-inter">
                      <span className="text-gray-600">{t.verification_type_name}</span>
                      <span className="font-semibold text-red-500">{t.rejected_count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={onClose} className="w-full">Done</Button>
          </>
        )}
      </div>
    </Modal>
  );
};

// Stable (module-level) shell so WarrantyDetailModal can render either as the
// old popup or inline as a full page without remounting its children.
const WarrantyShell = ({ asPage, isOpen, onClose, title, children }) => (
  asPage
    ? <div className="space-y-5">{children}</div>
    : <Modal isOpen={isOpen} onClose={onClose} title={title} size="4xl">{children}</Modal>
);

// ── Warranty Detail — fetches from the dedicated warranty endpoint (warranty
// batches carry product/serial/warranty-date records, not the generic
// human/product verification shape the Control Center page renders). Rendered
// as a full page via WarrantyControlCenter (asPage) so every batch type opens
// a dedicated page instead of a mix of pages and popups. ─
const WarrantyDetailModal = ({ batchId, batchName, orgId, spaceId, onClose, asPage = false }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [warrantyPage, setWarrantyPage] = useState(1);
  const [warrantyPageSize, setWarrantyPageSize] = useState(10);
  useEffect(() => { setWarrantyPage(1); }, [search, warrantyPageSize]);

  // "Send to Organization" — real, persisted backend action. Sharing state
  // is read straight off this batch's own fetched status (shared_with_org),
  // never localStorage, so it reflects what's actually in the database and
  // agrees with what the org side sees.
  const sharedWithOrganization = !!data?.shared_with_org;
  const [sendingToOrg, setSendingToOrg] = useState(false);

  const handleSendToOrganization = async () => {
    setSendingToOrg(true);
    try {
      await verificationAPI.shareWithOrganization(batchId);
      toast.success(`${batchName} shared with the organization`);
      // Reflect the backend's own change immediately rather than a full
      // refetch — the rest of `data` (products, certs) is unaffected by this
      // action, so there's nothing else that needs to reload.
      setData((prev) => (prev ? { ...prev, shared_with_org: true, shared_at: new Date().toISOString() } : prev));
    } catch (err) {
      toast.error(getApiError(err, 'Failed to share batch with organization'));
    } finally {
      setSendingToOrg(false);
    }
  };

  // SDC generation — same generate → poll /status → issue flow as the
  // generic Control Center modal, self-contained here since warranty batches
  // carry their own status/certs separately from the generic batch shape.
  const [sdcGenerateOpen, setSdcGenerateOpen] = useState(false);
  const [sdcLiveStatus, setSdcLiveStatus] = useState(null);
  const [sdcPolling, setSdcPolling] = useState(false);
  const [sdcCertsLoading, setSdcCertsLoading] = useState(false);
  const [sdcByProductId, setSdcByProductId] = useState({});
  const [sdcRecords, setSdcRecords] = useState([]);
  const [detailRecord, setDetailRecord] = useState(null);
  const [downloadingSdcId, setDownloadingSdcId] = useState(null);

  // Per-product delete — same "Delete? Yes/No" inline confirm as the
  // generic Batch Records table.
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Fetches each certificate's full detail from an already-fetched warranty
  // status response (which now carries certificate_ids directly) and pairs
  // them to products. Pure — takes the response object, doesn't re-fetch the
  // batch itself, so both the initial load and an explicit refresh can share it.
  const loadCertificatesFrom = useCallback(async (resp) => {
    const certIds = Array.isArray(resp?.certificate_ids) ? resp.certificate_ids : [];
    if (certIds.length === 0) {
      setSdcByProductId({});
      setSdcRecords([]);
      return;
    }
    const fetched = await Promise.all(
      certIds.map((publicId) =>
        sdcAPI.getRecord(publicId)
          .then(({ data: rec }) => ({
            id: rec?.id, publicId: rec?.publicId || publicId, title: rec?.title,
            serialNo: getCertificateSerialNumber(rec),
            recipients: Array.isArray(rec?.recipients) ? rec.recipients : [],
            anchorTime: rec?.anchorTime || null,
            revoked: !!rec?.revoked,
            // Presence in certificate_ids already means the backend
            // confirmed sdc_status: "sdc_created" — no need to also
            // require anchorTime, which this single-record endpoint
            // doesn't reliably return.
            issued: !rec?.revoked,
            active: !!rec?.active, latest: !!rec?.latest, edited: !!rec?.edited,
            createdAt: rec?.createdAt || null, updatedAt: rec?.updatedAt || null,
          }))
          .catch(() => null)
      )
    );
    const matched = fetched.filter(Boolean);
    setSdcRecords(matched);

    // certificate_ids only confirms "these belong to this batch" — it
    // doesn't pair each one to a specific product, and array position is
    // NOT a reliable pairing key (verified live: a 5-record batch had
    // products and certificate_ids come back in different orders, silently
    // cross-wiring every certificate to the wrong product). The only
    // reliable association is by identity: each product's own serial number
    // against the certificate's own credentialSubject.serial_no. A product
    // that can't be matched this way is left unpaired (shows no certificate)
    // rather than guessed at by position — never assign one product's
    // certificate to another just because arrays came back in some order.
    const freshProducts = resp?.products || [];
    const approvedProducts = freshProducts.filter((p) => (p.warranty_status || 'approved') === 'approved');

    const certsBySerial = new Map();
    const certsByTitle = new Map();
    matched.forEach((cert) => {
      const serialKey = normalizeMatchKey(cert.serialNo);
      if (serialKey && !certsBySerial.has(serialKey)) certsBySerial.set(serialKey, cert);
      // Fallback only — some certificates predate the Dhiway schema update
      // that started echoing serial_no into credentialSubject, so title
      // (when the org's schema happens to mirror serial_no there) is kept
      // as a secondary identity-based match, never a positional one.
      const titleKey = normalizeMatchKey(cert.title);
      if (titleKey && !certsByTitle.has(titleKey)) certsByTitle.set(titleKey, cert);
    });

    const byId = {};
    approvedProducts.forEach((product) => {
      const productId = product.product_id || product.id;
      if (!productId) return;
      const serial = normalizeMatchKey(getProductSerialNumber(product));
      if (!serial) return;
      const cert = certsBySerial.get(serial) || certsByTitle.get(serial);
      if (cert) byId[productId] = cert;
    });

    setSdcByProductId(byId);
  }, []);

  useEffect(() => {
    if (!batchId) return;
    setLoading(true);
    setData(null);
    setSearch('');
    setSdcByProductId({});
    setSdcRecords([]);
    setSdcLiveStatus(null);
    setConfirmDeleteId(null);
    verificationAPI.getWarrantyStatus(batchId)
      .then(async ({ data: resp }) => {
        setData(resp);
        // certificate_ids now arrives on this same response — no separate
        // SDC-status call needed just to find out what certs exist.
        await loadCertificatesFrom(resp);
      })
      .catch((err) => toast.error(getApiError(err, 'Failed to load warranty status')))
      .finally(() => setLoading(false));
  }, [batchId, loadCertificatesFrom]);

  const products = data?.products || [];

  // The backend's own `summary` product counts can go stale/zero on older
  // batches (seen live: a batch with 1 clearly-approved product reporting
  // pending/approved/rejected all as 0) — when its total doesn't add up to
  // the actual product count, derive the counts from the products
  // themselves instead of trusting it. (This is unrelated to — and doesn't
  // touch — the batch-level `status` field, which is now trusted as-is per
  // the backend's own status-persistence fix.)
  const derivedSummary = products.reduce((acc, p) => {
    const status = p.warranty_status || 'approved';
    if (status === 'pending') acc.pending += 1;
    else if (status === 'rejected') acc.rejected += 1;
    else acc.approved += 1;
    return acc;
  }, { pending: 0, approved: 0, rejected: 0 });
  const rawSummary = data?.summary || null;
  const summaryIsConsistent = rawSummary &&
    Number(rawSummary.pending ?? 0) + Number(rawSummary.approved ?? 0) + Number(rawSummary.rejected ?? 0) === products.length;
  const summary = summaryIsConsistent ? rawSummary : derivedSummary;

  const filtered = search.trim()
    ? products.filter((p) =>
        [p.product_name, p.serial_number]
          .filter(Boolean)
          .some((v) => v.toLowerCase().includes(search.toLowerCase()))
      )
    : products;

  const warrantyStart = (Math.min(warrantyPage, Math.max(1, Math.ceil(filtered.length / warrantyPageSize))) - 1) * warrantyPageSize;
  const pagedProducts = filtered.slice(warrantyStart, warrantyStart + warrantyPageSize);

  const tiles = [
    { label: 'Pending',  value: summary?.pending  ?? 0, icon: Clock,       ico: 'text-amber-500',   num: 'text-amber-600' },
    { label: 'Approved', value: summary?.approved ?? 0, icon: CheckCircle, ico: 'text-emerald-500', num: 'text-emerald-600' },
    { label: 'Rejected', value: summary?.rejected ?? 0, icon: XCircle,     ico: 'text-red-400',     num: 'text-red-500' },
  ];

  const batchStatusMeta = WARRANTY_BATCH_STATUS_META[data?.status] || WARRANTY_BATCH_STATUS_META.approved;
  const BatchStatusIcon = batchStatusMeta.icon;

  // "Refresh" re-syncs the whole batch — status, summary, products, AND
  // certificates — from the single primary warranty endpoint, rather than
  // just re-checking certs. That also fixes a real gap: right after
  // generating, only the cert list used to update, so the status banner
  // could keep showing "Approved" until the modal was closed and reopened,
  // even though the backend had already moved it to "sdc_generated".
  const refreshSdcCertificates = useCallback(async () => {
    if (!batchId) return;
    setSdcCertsLoading(true);
    try {
      const { data: resp } = await verificationAPI.getWarrantyStatus(batchId);
      setData(resp);
      await loadCertificatesFrom(resp);
    } catch (err) {
      toast.error(getApiError(err, 'Failed to fetch SDC certificates'));
    } finally {
      setSdcCertsLoading(false);
    }
  }, [batchId, loadCertificatesFrom]);

  const pollSdcStatusUntilDone = useCallback((id) => {
    let attempts = 0;
    const maxAttempts = 10;
    setSdcPolling(true);
    const tick = async () => {
      attempts += 1;
      try {
        const { data: statusData } = await sdcAPI.getBatchStatus(id);
        if (statusData.done) {
          setSdcLiveStatus({ ready: statusData.ready, total: statusData.total });
          setSdcPolling(false);
          toast.success(`Certificates ready — ${statusData.ready}/${statusData.total} issued`);
          refreshSdcCertificates();
          return;
        }
      } catch {
        // transient error — keep polling, only give up after maxAttempts
      }
      if (attempts < maxAttempts) {
        setTimeout(tick, 8000);
      } else {
        setSdcPolling(false);
        toast.error('Still processing — check the batch again shortly');
      }
    };
    tick();
  }, [refreshSdcCertificates]);


  const issuedCount = sdcRecords.filter((r) => r.issued).length;
  const sdcRecordsForGenerate = products.map((p) => ({
    id: p.product_id || p.id,
    product_name: p.product_name,
    serial_number: p.serial_number,
  }));

  // Opens a blank tab synchronously (same tick as the click) and redirects it
  // once the URL arrives — mirrors BatchMonitor's own openSdcCertificate so
  // the popup isn't blocked by the browser as an async-triggered window.
  const openSdcCertificate = async (publicId) => {
    if (!publicId) return;
    setDownloadingSdcId(publicId);
    const win = window.open('', '_blank');
    if (win) win.opener = null;
    try {
      const { data: cert } = await sdcAPI.getRecord(publicId);
      if (cert?.pdf) {
        if (win) win.location.href = cert.pdf;
      } else {
        win?.close();
        toast.error('No PDF link on this certificate yet');
      }
    } catch (err) {
      win?.close();
      toast.error(getApiError(err, 'Failed to fetch certificate'));
    } finally {
      setDownloadingSdcId(null);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!productId) return;
    setDeletingId(productId);
    try {
      await verificationAPI.deleteBatchUser(batchId, productId);
      toast.success('Product removed from batch');
      setData((prev) => prev ? {
        ...prev,
        products: (prev.products || []).filter((p) => (p.product_id || p.id) !== productId),
      } : prev);
      setConfirmDeleteId(null);
    } catch (err) {
      toast.error(getApiError(err, 'Failed to delete product'));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
    <WarrantyShell asPage={asPage} isOpen={!!batchId} onClose={onClose} title={batchName ? `${batchName} — Warranty Status` : "Warranty Status"}>
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-brand-blue/10 bg-brand-blue/5">
            <RefreshCw size={20} className="animate-spin text-brand-blue" />
          </div>
          <p className="font-inter text-sm text-gray-400">Loading warranty status…</p>
        </div>
      ) : !data ? (
        <div className="flex flex-col items-center justify-center gap-3 py-12">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-red-100 bg-red-50">
            <XCircle size={22} className="text-red-500" />
          </div>
          <p className="font-inter text-sm text-gray-500">Failed to load details.</p>
        </div>
      ) : (
        <div className="space-y-4">

          {/* Hero banner — same treatment as the generic Control Center's
              status header (decorative circle, big status title, icon badge,
              nested tiles), just built from warranty's own status/tiles
              instead of the human workflow stage. Status is read straight
              from the backend with no override — sdc_generated persists
              here on its own per the backend's status-precedence fix. */}
          <div className={`relative p-6 overflow-hidden rounded-2xl ${batchStatusMeta.banner}`}>
            <div className="pointer-events-none absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/25" />
            <div className="relative flex items-start justify-between gap-4">
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider font-inter">
                  Warranty Batch
                </span>
                <h3 className="font-sora font-bold text-3xl mt-3 leading-tight">{batchStatusMeta.label}</h3>
                {batchName && (
                  <p className="text-xs opacity-80 font-inter mt-2 flex items-center gap-1.5">
                    <Package size={13} /> {batchName}
                  </p>
                )}
              </div>
              <div className="w-14 h-14 rounded-2xl bg-white/80 flex items-center justify-center shrink-0 shadow-sm">
                <BatchStatusIcon size={24} />
              </div>
            </div>
            <div className="relative grid grid-cols-3 gap-2.5 mt-6">
              {tiles.map((t) => (
                <div key={t.label} className="rounded-xl bg-white/90 border border-white/90 p-3">
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <p className="text-[10px] uppercase tracking-wide text-gray-400 font-inter">{t.label}</p>
                    <t.icon size={13} className={t.ico} />
                  </div>
                  <p className={`font-sora font-bold text-xl ${t.num}`}>{t.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Lifecycle + Actions — same two-column layout as the generic
              Control Center's "Batch Workflow" + "Batch Actions" pair, just
              with warranty's own real 3-step lifecycle on the left instead
              of the 5-step human/product verification pipeline (which
              doesn't apply here — warranty has no manual review stages). */}
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-4">

            {/* Warranty Lifecycle */}
            <div className="min-w-0 rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
              <div className="mb-6">
                <p className="font-sora font-semibold text-brand-dark">Warranty Lifecycle</p>
                <p className="text-xs text-gray-400 font-inter mt-1">Uploaded → Approved → SDC Issued</p>
              </div>
              <div className="flex items-start">
                {WARRANTY_LIFECYCLE_STEPS.map((step, index) => {
                  const activeIndex = data.status === 'sdc_generated' ? 2 : data.status === 'approved' ? 1 : 0;
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
                      {index < WARRANTY_LIFECYCLE_STEPS.length - 1 && (
                        <div className={`flex-1 h-0.5 mt-5 rounded-full transition-colors ${index < activeIndex ? 'bg-brand-blue' : 'bg-gray-200'}`} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Batch Actions — same structure as before (heading, action
                button, SDC Certificates sub-section below a divider), now
                sized to sit in the right column instead of full-width. */}
            <div className="min-w-0 rounded-2xl border border-gray-100 bg-gray-50 p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="font-sora font-semibold text-brand-dark">Batch Actions</p>
                  <p className="text-xs text-gray-400 font-inter mt-1">Whole-batch controls only</p>
                </div>
                {sharedWithOrganization && <Badge status="success">Shared</Badge>}
              </div>

              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  icon={Sparkles}
                  className="w-full justify-start"
                  disabled={(summary?.approved ?? 0) === 0}
                  title={(summary?.approved ?? 0) === 0 ? 'No approved products in this batch yet' : undefined}
                  onClick={() => setSdcGenerateOpen(true)}
                >
                  {sdcRecords.length > 0 ? 'Regenerate SDC' : 'Generate SDC'}
                </Button>

                {/* Send to org — once SDC is generated and not yet shared, same
                    gating as the generic Control Center modal. */}
                {data?.status === 'sdc_generated' && !sharedWithOrganization && (
                  <Button
                    variant="success"
                    size="sm"
                    icon={sendingToOrg ? RefreshCw : Send}
                    className="w-full justify-start"
                    disabled={sendingToOrg}
                    onClick={handleSendToOrganization}
                  >
                    {sendingToOrg ? 'Sending…' : 'Send to Organization'}
                  </Button>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200/70">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-500 font-inter uppercase tracking-wide">SDC Certificates</p>
                  <button
                    type="button"
                    onClick={refreshSdcCertificates}
                    disabled={sdcCertsLoading || products.length === 0}
                    className="flex items-center gap-1 text-[11px] font-semibold text-brand-blue font-inter hover:opacity-70 disabled:opacity-50"
                  >
                    <RefreshCw size={11} className={sdcCertsLoading ? 'animate-spin' : ''} /> Refresh
                  </button>
                </div>
                {sdcRecords.length > 0 ? (
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-white border border-gray-100 px-3 py-2.5">
                    <Badge status={issuedCount > 0 ? 'success' : 'pending'}>
                      {issuedCount > 0 ? `${issuedCount}/${summary?.approved ?? products.length} issued` : 'Drafting…'}
                    </Badge>
                    <span className="text-[11px] text-gray-400 font-inter">{sdcRecords.length} fetched</span>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 font-inter">Not generated yet.</p>
                )}
              </div>
            </div>

          </div>

          <div className="max-w-sm">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search product or serial…"
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 font-inter text-sm text-brand-dark outline-none transition-all placeholder:text-gray-400 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-blue-100">
            {filtered.length === 0 ? (
              <div className="py-12 text-center">
                <p className="font-inter text-sm text-gray-400">No products found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] font-inter">
                  <thead>
                    <tr className="border-b border-blue-100 bg-blue-50/80">
                      {['Product', 'Serial Number', 'Warranty Start', 'Warranty End', 'Status', 'Certificate', 'Reason', 'Actions'].map((h) => (
                        <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-brand-blue/70">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pagedProducts.map((product, i) => {
                      const statusMeta = WARRANTY_PRODUCT_STATUS_META[product.warranty_status] || WARRANTY_PRODUCT_STATUS_META.approved;
                      const StatusIcon = statusMeta.icon;
                      const productId = product.product_id || product.id;
                      const sdcMatch = productId ? sdcByProductId[productId] : null;
                      return (
                        <tr key={productId || i} className="border-b border-blue-50 last:border-0 hover:bg-blue-50/30 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-blue/10">
                                <Package size={13} className="text-brand-blue" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-brand-dark truncate">{product.product_name || '—'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-xs font-mono text-gray-500">{product.serial_number || '—'}</td>
                          <td className="px-5 py-3.5 text-xs text-gray-500">{warrantyDetailFormatDate(product.warranty_start_date)}</td>
                          <td className="px-5 py-3.5 text-xs text-gray-500">{warrantyDetailFormatDate(product.warranty_end_date)}</td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold font-inter ${statusMeta.tone}`}>
                              <StatusIcon size={11} />
                              {statusMeta.label}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            {sdcMatch ? (
                              <div className="flex items-center gap-2">
                                <Badge status={sdcMatch.issued ? 'info' : 'pending'}>{sdcMatch.issued ? 'Ready' : 'Draft'}</Badge>
                                <div className="flex items-center gap-0.5 rounded-lg border border-gray-100 bg-gray-50 p-0.5">
                                  {sdcMatch.issued && (
                                    <button
                                      type="button"
                                      disabled={downloadingSdcId === sdcMatch.publicId}
                                      onClick={() => openSdcCertificate(sdcMatch.publicId)}
                                      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold font-inter text-brand-blue transition-colors hover:bg-white hover:shadow-sm disabled:opacity-50"
                                    >
                                      <Download size={12} className={downloadingSdcId === sdcMatch.publicId ? 'animate-spin' : ''} /> Download
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setDetailRecord(product)}
                                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold font-inter text-gray-500 transition-colors hover:bg-white hover:text-brand-blue hover:shadow-sm"
                                  >
                                    <Info size={12} /> Detail
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-300 font-inter">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-xs text-gray-400 max-w-[160px]">
                            <span className="line-clamp-2">{product.warranty_reason || '—'}</span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            {confirmDeleteId === productId ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <span className="text-xs text-gray-400 font-inter">Delete?</span>
                                <button
                                  type="button"
                                  disabled={deletingId === productId}
                                  onClick={() => handleDeleteProduct(productId)}
                                  className="rounded-md px-2 py-1 text-xs font-semibold font-inter text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 transition-colors"
                                >
                                  {deletingId === productId ? '…' : 'Yes'}
                                </button>
                                <button
                                  type="button"
                                  disabled={deletingId === productId}
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="rounded-md px-2 py-1 text-xs font-semibold font-inter text-gray-500 hover:bg-gray-100 disabled:opacity-50 transition-colors"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                title="Permanently remove this product from the batch"
                                onClick={() => setConfirmDeleteId(productId)}
                                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold font-inter text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 size={12} /> Delete
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <TablePagination
              page={warrantyPage}
              pageSize={warrantyPageSize}
              total={filtered.length}
              onPageChange={setWarrantyPage}
              onPageSizeChange={setWarrantyPageSize}
              noun="product"
            />
          </div>

        </div>
      )}
    </WarrantyShell>

    {sdcGenerateOpen && (
      <GenerateSDCModal
        batch={{ id: batchId, spaceId, sdcInfo: { org_id: orgId, space_id: spaceId } }}
        records={sdcRecordsForGenerate}
        liveStatus={sdcLiveStatus}
        polling={sdcPolling}
        onClose={() => setSdcGenerateOpen(false)}
        onGenerated={() => pollSdcStatusUntilDone(batchId)}
      />
    )}

    <CertificateDetailModal
      record={detailRecord}
      sdcMatch={detailRecord ? sdcByProductId[detailRecord.product_id || detailRecord.id] || null : null}
      instanceKey="de"
      onClose={() => setDetailRecord(null)}
    />
    </>
  );
};

// ── Shared batch-list data hook — fetch + normalize + per-batch workflow
// overlay + Dhiway space-id lookup, used identically by both the list page
// (BatchMonitor) and the detail page (BatchControlCenter) so a page reached
// directly by URL (not navigated to from an already-loaded list) still gets
// the exact same batches array, never a second, drifted implementation.
export const useBatchList = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [workflowByBatch, setWorkflowByBatch] = useState(() => getStoredWorkflow());
  const [orgDhiwayDetailsMap, setOrgDhiwayDetailsMap] = useState({});

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
      setData(flat.map(normaliseApiBatch).filter(hasRenderableRecords));
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
            if (u.id) map[u.id] = normalizeDhiwayDetails(u.dhiways_details || []);
          });
          total = typeof data?.total === 'number' ? data.total : users.length;
          offset += limit;
          if (users.length === 0) break;
        }
        if (!cancelled) setOrgDhiwayDetailsMap(map);
      } catch {
        // non-fatal — certificate matching just falls back to the default space
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const getOrgSpaceId = useCallback(
    (orgId, batchType = 'human') => resolveDhiwaySpaceId(orgDhiwayDetailsMap[orgId] || [], batchType),
    [orgDhiwayDetailsMap]
  );

  const batches = (data || []).map((batch) => {
    const stored = workflowByBatch[batch.id] || {};
    const edited = stored.edited || {};
    const status = batch.rawStatus;
    return {
      ...batch,
      name: edited.name || batch.name,
      orgName: edited.orgName || batch.orgName,
      spaceId: batch.orgId ? getOrgSpaceId(batch.orgId, batch.batchType) || null : null,
      createdAt: batch.latestCreatedAt || null,
      status,
      statusMeta: batchStatusMeta[status] || batchStatusMeta.pending,
      // Source of truth is the backend's Batch.shared_with_org (see
      // normaliseApiBatch) — never localStorage, which only ever reflected
      // what this browser tab last clicked, not what's actually persisted.
      sharedWithOrganization: !!batch.sharedWithOrg,
      sharedAt: batch.sharedAt,
      uploadLink: stored.uploadLink || null,
      sentRequests: stored.sentRequests || (stored.requestId ? [{
        verification_type_name: 'Manual Verification',
        verifier_email: stored.verifierEmail || '',
        request_id: stored.requestId,
        status: 'sent',
      }] : []),
    };
  });

  const updateBatchWorkflow = useCallback((batchId, patch) => {
    setWorkflowByBatch((current) => {
      const next = { ...current, [batchId]: { ...(current[batchId] || {}), ...patch, lastAction: new Date().toISOString() } };
      localStorage.setItem(BATCH_WORKFLOW_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { data, setData, batches, loading, refreshing, fetchData, workflowByBatch, getOrgSpaceId, updateBatchWorkflow };
};

// ── Warranty Control Center — full page for Warranty batches, mirroring the
// Human/Product BatchControlCenter page (same back-link/header treatment)
// so no batch type opens as a popup while the others open as pages.
export const WarrantyControlCenter = () => {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const { batches, loading, getOrgSpaceId } = useBatchList();
  const batch = batches.find((b) => b.id === batchId) || null;

  if (!loading && !batch) {
    return (
      <AuthLayout title="Batch Monitor">
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <p className="text-sm font-semibold text-brand-dark font-inter">Batch not found</p>
          <p className="text-xs text-gray-400 font-inter">It may have been deleted, or the link is out of date.</p>
          <Button variant="outline" size="sm" icon={ChevronLeft} onClick={() => navigate('/admin/batch-monitor')}>
            Back to Batch Monitor
          </Button>
        </div>
      </AuthLayout>
    );
  }
  if (!batch) {
    return (
      <AuthLayout title="Batch Monitor">
        <div className="flex items-center justify-center py-24 gap-2">
          <RefreshCw size={18} className="animate-spin text-brand-blue" />
          <p className="text-sm text-gray-400 font-inter">Loading batch…</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Batch Monitor">
      <div className="space-y-4">
        <div>
          <button
            type="button"
            onClick={() => navigate('/admin/batch-monitor')}
            className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-brand-blue font-inter hover:underline"
          >
            <ChevronLeft size={14} /> Back to Batch Monitor
          </button>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="font-sora text-2xl font-bold text-brand-dark">{batch.name}</h1>
            <Badge status="info">Warranty</Badge>
          </div>
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500 font-inter">
            <Building2 size={13} className="text-gray-400" /> {batch.orgName}
          </p>
        </div>
        <WarrantyDetailModal
          asPage
          batchId={batch.id}
          batchName={batch.name}
          orgId={batch.orgId || null}
          spaceId={batch.orgId ? getOrgSpaceId(batch.orgId, batch.batchType || 'warranty') || null : null}
          onClose={() => navigate('/admin/batch-monitor')}
        />
      </div>
    </AuthLayout>
  );
};

// ── Main BatchMonitor component (the batch LIST/table page) ────────────────
// The per-batch "Control Center" used to be a Modal rendered inline here;
// it's now its own routed page, BatchControlCenter (below), reached via
// navigate(`/admin/batch-monitor/${batch.id}`) — both pages share the exact
// same fetch/normalize logic via useBatchList() so neither can drift from
// the other.
export const BatchMonitor = () => {
  const navigate = useNavigate();
  const { batches, loading, refreshing, fetchData, updateBatchWorkflow } = useBatchList();

  const [orgFilter, setOrgFilter] = useState('');

  // Sub-modal states — row-level actions, reachable straight from the list
  // without opening the batch's own Control Center page.
  const [deleteBatchTarget,   setDeleteBatchTarget]   = useState(null); // batch pending the delete-confirm modal
  const [rejectedListTarget,  setRejectedListTarget]  = useState(null); // batch pending the Send Rejected List modal
  const [smartSendOpen,       setSmartSendOpen]       = useState(false);
  const [smartSendBatch,      setSmartSendBatch]      = useState(null);
  const [actionMenu, setActionMenu] = useState({ batchId: null, anchorRect: null });

  // Table filters / pagination — all applied client-side over the batches
  // array from useBatchList().
  const [searchTerm,   setSearchTerm]   = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | in_progress | pending | completed | failed
  const [batchTypeFilter, setBatchTypeFilter] = useState(''); // '' | human | product | warranty
  const [dateFrom,     setDateFrom]     = useState('');
  const [dateTo,       setDateTo]       = useState('');
  const [showDateRange, setShowDateRange] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [currentPage,  setCurrentPage]  = useState(1);
  const [pageSize,     setPageSize]     = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [orgFilter, statusFilter, batchTypeFilter, searchTerm, dateFrom, dateTo]);

  const closeActionMenu = useCallback(() => {
    setActionMenu({ batchId: null, anchorRect: null });
  }, []);

  useEffect(() => {
    if (!actionMenu.batchId) return undefined;
    const handleEscape = (event) => {
      if (event.key === 'Escape') closeActionMenu();
    };
    const handleScrollOrResize = () => closeActionMenu();
    window.addEventListener('keydown', handleEscape);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('keydown', handleEscape);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [actionMenu.batchId, closeActionMenu]);

  const orgOptions = Array.from(new Set(batches.map((b) => b.orgName).filter(Boolean))).sort((a, b) => a.localeCompare(b));

  // Batch-level status buckets for the quick filter pills. There is no
  // batch-level "failed" status in the backend (failure only exists per
  // record), so the Failed pill matches batches with at least one failed
  // record instead of a status string.
  const STATUS_FILTERS = {
    in_progress: (b) => b.status === 'processing' || b.status === 'verification_in_progress',
    pending: (b) => b.status === 'pending',
    completed: (b) => b.status === 'verification_completed' || b.status === 'sdc_generated' || b.status === 'approved',
    failed: (b) => b.failed > 0,
  };

  const searchValue = searchTerm.trim().toLowerCase();
  const fromTime = dateFrom ? new Date(dateFrom).getTime() : null;
  const toTime = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;

  const visibleBatches = batches.filter((b) => {
    if (orgFilter && b.orgName !== orgFilter) return false;
    if (statusFilter !== 'all' && !STATUS_FILTERS[statusFilter]?.(b)) return false;
    if (batchTypeFilter && b.batchType !== batchTypeFilter) return false;
    if (searchValue && !`${b.name} ${b.id} ${b.orgName}`.toLowerCase().includes(searchValue)) return false;
    if (fromTime && (!b.createdAt || new Date(b.createdAt).getTime() < fromTime)) return false;
    if (toTime && (!b.createdAt || new Date(b.createdAt).getTime() > toTime)) return false;
    return true;
  });

  const hasActiveFilters = !!(orgFilter || statusFilter !== 'all' || batchTypeFilter || searchTerm || dateFrom || dateTo);
  const clearAllFilters = () => {
    setOrgFilter(''); setStatusFilter('all'); setBatchTypeFilter('');
    setSearchTerm(''); setDateFrom(''); setDateTo('');
  };

  const totalPages = Math.max(1, Math.ceil(visibleBatches.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedBatches = visibleBatches.slice((safePage - 1) * pageSize, safePage * pageSize);

  const total    = batches.reduce((s, b) => s + b.total,    0);
  const pending  = batches.reduce((s, b) => s + b.pending,  0);
  const verified = batches.reduce((s, b) => s + b.verified, 0);
  const failed   = batches.reduce((s, b) => s + b.failed,   0);

  // Real 7-day trend per metric, bucketed by each batch's actual created_at.
  // (There's no per-status-transition timestamp in the API, so this reflects
  // "records on batches created that day", not a true state-change history.)
  const sparkSeries = useMemo(() => {
    const days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (6 - i)); return d;
    });
    const bucket = (selector) => days.map((day, i) => {
      const next = new Date(day); next.setDate(day.getDate() + 1);
      const value = batches.reduce((sum, b) => {
        if (!b.createdAt) return sum;
        const t = new Date(b.createdAt).getTime();
        return (t >= day.getTime() && t < next.getTime()) ? sum + selector(b) : sum;
      }, 0);
      return { i, value };
    });
    return {
      total: bucket((b) => b.total),
      pending: bucket((b) => b.pending),
      verified: bucket((b) => b.verified),
      failed: bucket((b) => b.failed),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batches]);

  const statCards = [
    { key: 'total',    label: 'Total Records', value: total,    sub: 'Across all batches',    icon: Users,       surface: 'bg-blue-50',   text: 'text-brand-blue', stroke: '#2563eb', spark: sparkSeries.total },
    { key: 'pending',  label: 'Pending Review', value: pending, sub: 'Awaiting verification',  icon: Clock,       surface: 'bg-orange-50', text: 'text-orange-500', stroke: '#f97316', spark: sparkSeries.pending },
    { key: 'verified', label: 'Verified',       value: verified, sub: 'Successfully verified', icon: CheckCircle, surface: 'bg-green-50',  text: 'text-green-500',  stroke: '#22c55e', spark: sparkSeries.verified },
    { key: 'failed',   label: 'Failed',         value: failed,   sub: 'Verification failed',   icon: XCircle,     surface: 'bg-red-50',    text: 'text-red-500',    stroke: '#ef4444', spark: sparkSeries.failed },
  ];

  // "View Details" — every batch type opens its own dedicated page. Warranty
  // batches carry product/serial/warranty-date records, not the generic
  // human/product verification shape, so they get their own page component.
  const handleOpenBatchDetails = useCallback((batch) => {
    navigate(batch.batchType === 'warranty'
      ? `/admin/batch-monitor/warranty/${batch.id}`
      : `/admin/batch-monitor/${batch.id}`);
  }, [navigate]);

  // Fired by DeleteBatchModal once the backend confirms the batch is gone
  // (or was already gone, 404) — closes the delete-confirm modal and
  // refreshes the list so the row disappears.
  const handleBatchDeleted = useCallback((batchId) => {
    setDeleteBatchTarget(null);
    fetchData();
  }, [fetchData]);

  // Smart Send needs actual per-user records to assign — the list endpoint
  // (GET /verification/batches) never returns a `users` array, only the
  // detail endpoint does, so always fetch fresh detail records when
  // triggered from here (the Control Center page has its own copy of this
  // that can skip the fetch using its already-loaded batchDetail).
  const openSmartSend = useCallback(async (batch) => {
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
  }, []);

  const handleBulkSent = (batch, result) => {
    const sentRequests = result?.results || [];
    updateBatchWorkflow(batch.id, {
      sentRequests,
      uploadLink: sentRequests[0]?.upload_link || null,
    });
    fetchData(true);
  };

  // ── Export the currently filtered batch list (not just the current page) ──
  const handleExport = (format) => {
    setShowExportMenu(false);
    if (visibleBatches.length === 0) { toast.error('No batches to export'); return; }
    const rows = visibleBatches.map((b) => ({
      'Batch Name': b.name,
      'Organization': b.orgName,
      'Records': b.total,
      'Pending': b.pending,
      'Verified': b.verified,
      'Failed': b.failed,
      'Status': b.statusMeta.label,
      'Created On': formatCreatedAt(b.createdAt),
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const stamp = new Date().toISOString().slice(0, 10);
    if (format === 'csv') {
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      triggerBlobDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `trumarkz-batches-${stamp}.csv`);
    } else {
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Batches');
      XLSX.writeFile(workbook, `trumarkz-batches-${stamp}.xlsx`);
    }
    toast.success(`Exported ${rows.length} batch${rows.length === 1 ? '' : 'es'}`);
  };

  return (
    <AuthLayout title="Batch Monitor">
      <PageHeader
        title="Verification Batch Monitor"
        subtitle="Review live human and product verification records"
        action={
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" icon={RefreshCw} loading={refreshing} onClick={() => fetchData(true)}>
              Refresh
            </Button>
            <div className="relative">
              <Button variant="primary" size="sm" icon={Download} onClick={() => setShowExportMenu((v) => !v)}>
                Export
              </Button>
              {showExportMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-gray-200 bg-white p-1 shadow-xl z-50">
                    <button
                      type="button"
                      onClick={() => handleExport('xlsx')}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-inter text-gray-700 hover:bg-gray-50"
                    >
                      <Download size={14} /> Export as Excel (.xlsx)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExport('csv')}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-inter text-gray-700 hover:bg-gray-50"
                    >
                      <Download size={14} /> Export as CSV
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.key} className="p-4 overflow-hidden">
              <div className="flex items-start justify-between gap-3">
                <div className={`w-11 h-11 rounded-xl ${stat.surface} flex items-center justify-center shrink-0`}>
                  <Icon size={20} className={stat.text} />
                </div>
                <div className="w-20 h-10 -mr-1 -mt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stat.spark} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id={`spark-${stat.key}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={stat.stroke} stopOpacity={0.35} />
                          <stop offset="100%" stopColor={stat.stroke} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="value" stroke={stat.stroke} strokeWidth={1.75} fill={`url(#spark-${stat.key})`} isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <p className="text-xs text-gray-500 font-inter mt-3">{stat.label}</p>
              <p className="font-sora font-bold text-2xl text-brand-dark mt-0.5">{stat.value}</p>
              <p className="text-[11px] text-gray-400 font-inter mt-0.5">{stat.sub}</p>
            </Card>
          );
        })}
      </div>

      {/* Filter bar */}
      <Card className="p-4 mb-4 overflow-visible">
        <div className="flex flex-col xl:flex-row xl:items-center gap-3">
          <div className="flex items-center gap-2">
            <Building2 size={14} className="text-gray-400 shrink-0" />
            <CustomSelect
              value={orgFilter}
              onChange={setOrgFilter}
              className="w-full max-w-[200px]"
              options={[
                { value: '', label: 'All Organizations' },
                ...orgOptions.map((org) => ({ value: org, label: org })),
              ]}
            />
          </div>

          <div className="flex items-center gap-2">
            <Layers size={14} className="text-gray-400 shrink-0" />
            <CustomSelect
              value={batchTypeFilter}
              onChange={setBatchTypeFilter}
              className="w-full max-w-[160px]"
              options={[
                { value: '', label: 'All Batch Types' },
                { value: 'human', label: 'Human' },
                { value: 'product', label: 'Product' },
                { value: 'warranty', label: 'Warranty' },
              ]}
            />
          </div>

          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by batch name or ID..."
              className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-xs font-inter text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
            />
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDateRange((v) => !v)}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold font-inter text-gray-600 hover:border-gray-300 whitespace-nowrap"
            >
              <Calendar size={14} className="text-gray-400" />
              {dateFrom || dateTo ? `${dateFrom || '…'} → ${dateTo || '…'}` : 'Date Range'}
              <ChevronDown size={12} className="text-gray-400" />
            </button>
            {showDateRange && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowDateRange(false)} />
                <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-gray-200 bg-white p-3 shadow-xl z-50 space-y-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-500 font-inter">From</label>
                    <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full mt-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-inter text-gray-600" />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-500 font-inter">To</label>
                    <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full mt-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-inter text-gray-600" />
                  </div>
                  <div className="flex justify-between pt-1">
                    <button type="button" onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-xs text-gray-400 font-inter hover:text-gray-600">Clear</button>
                    <button type="button" onClick={() => setShowDateRange(false)} className="text-xs font-semibold text-brand-blue font-inter hover:underline">Done</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Quick status pills */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-100">
          {[
            { key: 'all', label: 'All' },
            { key: 'in_progress', label: 'In Progress' },
            { key: 'pending', label: 'Pending' },
            { key: 'completed', label: 'Verification Completed' },
            { key: 'failed', label: 'Failed' },
          ].map((pill) => (
            <button
              key={pill.key}
              type="button"
              onClick={() => setStatusFilter(pill.key)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold font-inter transition-colors ${
                statusFilter === pill.key ? 'bg-brand-blue text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {pill.label}
            </button>
          ))}
          {hasActiveFilters && (
            <button type="button" onClick={clearAllFilters} className="text-xs font-semibold text-brand-blue font-inter hover:underline ml-1">
              Clear All
            </button>
          )}
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
          <p className="text-sm text-gray-400 font-inter">
            {batches.length === 0 ? 'No verification records found' : 'No batches match the current filters'}
          </p>
          {hasActiveFilters && batches.length > 0 && (
            <button type="button" onClick={clearAllFilters} className="mt-2 text-xs font-semibold text-brand-blue font-inter hover:underline">
              Clear filters
            </button>
          )}
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
              <table className="w-full min-w-[1180px] border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 font-inter">Batch Name</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 font-inter">Organization</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 font-inter">Progress</th>
                    <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-500 font-inter">Records</th>
                    <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-500 font-inter">Pending</th>
                    <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-500 font-inter">Verified</th>
                    <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-500 font-inter">Failed</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 font-inter">Status</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 font-inter">Created On</th>
                    <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-500 font-inter">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {paginatedBatches.map((batch) => {
                    const complete = batch.total ? Math.round(((batch.verified + batch.failed) / batch.total) * 100) : 0;
                    return (
                      <tr
                        key={batch.id}
                        onClick={() => handleOpenBatchDetails(batch)}
                        className="cursor-pointer hover:bg-blue-50/30 transition-colors"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-brand-blue/10 text-brand-blue flex items-center justify-center shrink-0">
                              <Package size={18} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-sora font-semibold text-sm leading-5 text-brand-dark truncate max-w-[220px]">{batch.name}</p>
                              <p className="text-[11px] text-gray-400 font-inter font-mono mt-1 truncate max-w-[220px]">{batch.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5 text-sm text-gray-600 font-inter">
                            <Building2 size={13} className="text-gray-400 shrink-0" />
                            <span className="truncate max-w-[140px]">{batch.orgName}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 w-40">
                          <div className="flex items-center gap-2">
                            <div className="flex-1"><ProgressBar progress={complete} height="h-2" showLabel={false} /></div>
                            <span className="text-xs font-semibold text-gray-500 font-inter w-9 text-right shrink-0">{complete}%</span>
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
                          <p className="text-xs text-gray-500 font-inter whitespace-nowrap">{formatCreatedAt(batch.createdAt)}</p>
                        </td>
                        <td className="px-5 py-4">
                          <div className="relative flex items-center justify-center min-w-[80px]">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                const rect = event.currentTarget.getBoundingClientRect();
                                setActionMenu((current) => (
                                  current.batchId === batch.id
                                    ? { batchId: null, anchorRect: null }
                                    : { batchId: batch.id, anchorRect: rect }
                                ));
                              }}
                              className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-brand-dark hover:bg-gray-50 shadow-sm"
                            >
                              <MoreVertical size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 font-inter">
                Showing {(safePage - 1) * pageSize + 1} to {Math.min(safePage * pageSize, visibleBatches.length)} of {visibleBatches.length} results
              </p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  {Array.from({ length: totalPages }).slice(0, 5).map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-7 h-7 rounded-lg text-xs font-semibold font-inter ${
                          safePage === pageNum ? 'bg-brand-blue text-white' : 'text-gray-500 hover:bg-gray-50 border border-gray-200'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
                <CustomSelect
                  value={pageSize}
                  onChange={setPageSize}
                  className="w-24"
                  options={[10, 25, 50].map((n) => ({ value: n, label: `${n} / page` }))}
                />
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {actionMenu.batchId && actionMenu.anchorRect && createPortal(
        <div
          className="fixed inset-0 z-[100] bg-transparent"
          onMouseDown={closeActionMenu}
        >
          {(() => {
            const width = 176;
            const height = 172;
            const margin = 12;
            const gap = 8;
            const flipUp = window.innerHeight - actionMenu.anchorRect.bottom < height + gap + margin;
            const top = flipUp
              ? Math.max(margin, actionMenu.anchorRect.top - height - gap)
              : actionMenu.anchorRect.bottom + gap;
            const left = Math.min(
              Math.max(margin, actionMenu.anchorRect.right - width),
              window.innerWidth - width - margin
            );
            const batch = batches.find((item) => item.id === actionMenu.batchId) || null;
            if (!batch) return null;
            return (
              <div
                role="menu"
                aria-label="Batch actions"
                className="fixed w-44 rounded-xl border border-gray-200 bg-white p-1 shadow-xl"
                style={{ top, left, zIndex: 101 }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    closeActionMenu();
                    handleOpenBatchDetails(batch);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-inter text-gray-700 hover:bg-gray-50"
                >
                  <Eye size={14} />
                  View Details
                </button>
                <button
                  type="button"
                  onClick={() => {
                    closeActionMenu();
                    if (batch.status === 'pending' || batch.status === 'processing' || batch.status === 'verification_in_progress') {
                      openSmartSend(batch);
                    } else {
                      toast('Smart Send is only available before verification is completed');
                    }
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-inter text-gray-700 hover:bg-gray-50"
                >
                  <Zap size={14} />
                  Smart Send
                </button>
                <button
                  type="button"
                  onClick={() => {
                    closeActionMenu();
                    setRejectedListTarget(batch);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-inter text-gray-700 hover:bg-gray-50"
                >
                  <Send size={14} />
                  Send Rejected List
                </button>
                <div className="my-1 border-t border-gray-100" />
                <button
                  type="button"
                  onClick={() => {
                    closeActionMenu();
                    setDeleteBatchTarget(batch);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-inter text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={14} />
                  Delete Batch
                </button>
              </div>
            );
          })()}
        </div>,
        document.body
      )}

      {/* ── Delete Batch Modal ──────────────────────────────────────────────── */}
      <DeleteBatchModal
        batch={deleteBatchTarget}
        onClose={() => setDeleteBatchTarget(null)}
        onDeleted={handleBatchDeleted}
      />

      {/* ── Send Rejected List Modal ─────────────────────────────────────────── */}
      <SendRejectedListModal
        batch={rejectedListTarget}
        onClose={() => setRejectedListTarget(null)}
      />

      {/* ── Smart Send Modal ────────────────────────────────────────────── */}
      <SmartSendModal
        isOpen={smartSendOpen}
        onClose={() => { setSmartSendOpen(false); setSmartSendBatch(null); }}
        onSent={(result) => { handleBulkSent(smartSendBatch, result); setSmartSendOpen(false); setSmartSendBatch(null); }}
        batch={smartSendBatch}
      />

    </AuthLayout>
  );
};

export default BatchMonitor;
