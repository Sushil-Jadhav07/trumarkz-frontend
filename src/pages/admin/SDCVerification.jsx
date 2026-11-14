import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { authAPI, verificationAPI, sdcAPI, adminAPI, getApiError } from '@/services/api';
import { authorizationIsStale, describeGenerateError, groupSchemaWarnings } from '@/utils/partialSdc';
import { normalizeDhiwayDetails, resolveDhiwaySpaceId, batchSdcSpaceId } from '@/utils/dhiway';
import { normalizeCertificatesByUser, certificateEntriesByUser, certificateEntryFor, certificateDisplay } from '@/utils/sdcCertificates';
import {
  Search, ShieldCheck, Users, ChevronRight, CheckCircle, Clock, XCircle,
  ArrowLeft, FileText, QrCode, Eye, ChevronDown, Sparkles, RefreshCw, AlertCircle, Building2,
  Copy, Anchor, Star, Layers, Download,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Helpers ──────────────────────────────────────────────────────────────────
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
  !!batch && (batch.total > 0 || batch.users.length > 0);

const statusBadge = (status) => {
  if (status === 'approved') return { variant: 'success', label: 'Approved' };
  if (status === 'verified') return { variant: 'success', label: 'Verified' };
  if (status === 'rejected' || status === 'failed') return { variant: 'error', label: 'Rejected' };
  return { variant: 'pending', label: 'Pending' };
};

const isProductRecord = (r) =>
  r?.entity_type === 'product' || !!r?.product_name || !!r?.category_name;

const recordTitle = (r) => r?.product_name || r?.full_name || r?.email || r?.id || r?.user_id || r?.entity_id || 'Record';

const normalizeMatchKey = (value) => String(value || '').trim().toLowerCase();

const getRecordSerialNumber = (record) =>
  record?.serial_number ||
  record?.custom_fields?.serial_number ||
  record?.customFields?.serial_number ||
  record?.metadata?.serial_number ||
  '';

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const normaliseBatch = (b) => {
  if (!b || typeof b !== 'object') return null;
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
  const rawTypes = Array.isArray(b.industry_type) ? b.industry_type : [];
  // Backend stores SDC state in verification_progress.sdc (status, created_at,
  // issued_count, etc.) — not a flat sdc_status field. Any status present here
  // (draft_created or sdc_created) means generation has been kicked off.
  const sdcInfo = b.verification_progress?.sdc || null;
  return {
    id,
    name: b.batch_name || b.name || `Batch ${String(id).slice(0, 8)}`,
    total, verified, failed, pending,
    createdAt: b.created_at || b.createdAt,
    industryType: rawTypes,
    sdcStatus: sdcInfo?.status ? 'generated' : null,
    sdcInfo,
    // Server-resolved certificate space from the batch list (the list has no verification_progress).
    sdcSpaceId: b.sdc_space_id || null,
    users: records,
  };
};

// Fetches a single Dhiway record (API 3) and opens its pdf/verify link directly.
// The tab must be opened synchronously, in the same tick as the click, or
// browsers silently block it once we `await` the fetch first — redirecting an
// already-open blank tab once the URL arrives avoids that.
const fetchAndOpenCertificate = async (publicId, instanceKey, kind) => {
  const win = window.open('', '_blank');
  if (win) win.opener = null;
  try {
    const { data } = await sdcAPI.getRecord(publicId, instanceKey);
    const url = kind === 'pdf' ? data?.pdf : data?.verify;
    if (url) {
      if (win) win.location.href = url;
    } else {
      win?.close();
      // Anchoring is async on Dhiway's side — a cert can appear issued
      // slightly before its .vc endpoint actually has a PDF/verify link.
      // Expected, brief finalizing window, not a real failure.
      toast('This certificate is still finalizing — try again in a moment.', { icon: '⏳' });
    }
    return data;
  } catch (err) {
    win?.close();
    throw err;
  }
};

// Maps org_id -> that org's own Dhiway Space ID (set on the Profile page).
// /sdc/records silently falls back to a single global "config default" space
// when space_id is omitted — any org that has configured its own space
// issues certificates there instead, so omitting space_id returns 0 matches
// for those orgs even though the certificates genuinely exist on Dhiway.
const fetchOrgDhiwayDetailsMap = async () => {
  const map = {};
  let offset = 0;
  const limit = 200;
  let total = Infinity;
  while (offset < total) {
    const { data } = await adminAPI.getAllUsers({ user_type: 'organization', limit, offset });
    const users = Array.isArray(data?.users) ? data.users : [];
    users.forEach((u) => { if (u.id) map[u.id] = normalizeDhiwayDetails(u.dhiways_details || []); });
    total = typeof data?.total === 'number' ? data.total : users.length;
    offset += limit;
    if (users.length === 0) break;
  }
  return map;
};

const ALL_INDUSTRIES_FALLBACK = [
  'All Industries', 'Transport & Logistics', 'Healthcare', 'Education',
  'Electronics & Appliances', 'Luxury Products', 'Freelance / Gig',
  'Technology', 'Manufacturing', 'Agriculture', 'Insurance',
];

const Detail = ({ label, value, mono }) => (
  <div>
    <p className="text-xs text-gray-400 font-inter mb-0.5 capitalize">{label}</p>
    <p className={`text-sm text-brand-dark font-inter ${mono ? 'font-mono text-xs' : 'font-medium'}`}>
      {value || '-'}
    </p>
  </div>
);

// ── Generate SDC modal — selection + partial-approval helpers ──────────────
const recordSDCId = (r) => r?.id || r?.user_id || r?.entity_id;

// Client-side-only estimate for display — the backend remains authoritative
// (it silently skips an actually-ineligible selected user rather than
// trusting this). A record with no per-type breakdown falls back to its
// overall status bucket.
const getRecordEligibility = (r) => {
  const types = Object.values(r?.verification_type_status || {});
  if (types.length > 0) {
    const approved = types.filter((v) => v?.status === 'approved').length;
    if (approved === 0) return 'ineligible';
    if (approved === types.length) return 'verified';
    return 'partial';
  }
  const bucket = classifyRecordStatus(r?.verification_status ?? r?.status);
  if (bucket === 'verified') return 'verified';
  if (bucket === 'failed') return 'ineligible';
  return 'pending';
};

const ELIGIBILITY_META = {
  verified:   { label: 'Verified',           badge: 'success' },
  partial:    { label: 'Partially Verified', badge: 'partial' },
  pending:    { label: 'Pending',             badge: 'pending' },
  ineligible: { label: 'Not Eligible',        badge: 'default' },
};

// ── Generate SDC modal ───────────────────────────────────────────────────────
// org_id is fixed backend-side, space_id comes from the org's own Dhiway
// Space ID (set on the Profile page), and schema_id resolves from the
// batch's industry — none of these are supplied by the caller anymore.
export const GenerateSDCModal = ({ batch, onClose, onGenerated, onConfirmed, liveStatus, polling, records = [] }) => {
  const [active, setActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [result, setResult] = useState(null); // raw API response, shown for reference after submit
  const [sentPayload, setSentPayload] = useState(null);
  // What Dhiway has actually CONFIRMED, read from GET /sdc/batches/{id}/status → certificates_by_user
  // (exact batch_user_id → public id). The generate / issue responses only say a job was accepted.
  const [confirm, setConfirm] = useState({ known: true, byUser: {}, attempts: 0, gaveUp: false });
  const [recheck, setRecheck] = useState(0);
  const onConfirmedRef = useRef(onConfirmed);
  onConfirmedRef.current = onConfirmed;
  const [openingId, setOpeningId] = useState(null);

  // ── Selection — which records to generate for ──────────────────────────
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [recordSearch, setRecordSearch] = useState('');
  const [recordFilter, setRecordFilter] = useState('all'); // all | verified | partial | pending | ineligible
  const initializedForBatchId = useRef(null);

  // Partial holders need an active, valid organization authorization; fetched once per batch so the
  // selection can start with only the holders that can actually be generated.
  const [authsByHolder, setAuthsByHolder] = useState({});
  const [authsLoaded, setAuthsLoaded] = useState(false);
  useEffect(() => {
    let active = true;
    setAuthsLoaded(false);
    sdcAPI.getBatchPartialAuthorizations(batch.id, { status: 'active' })
      .then(({ data }) => {
        if (!active) return;
        const map = {};
        (Array.isArray(data?.authorizations) ? data.authorizations : []).forEach((a) => { map[a.batch_user_id] = a; });
        setAuthsByHolder(map);
      })
      .catch(() => { if (active) setAuthsByHolder({}); })
      .finally(() => { if (active) setAuthsLoaded(true); });
    return () => { active = false; };
  }, [batch.id]);

  const authState = (r) => {
    const a = authsByHolder[recordSDCId(r)];
    if (!a) return 'none';
    return authorizationIsStale(a) ? 'stale' : 'valid';
  };
  const canGenerate = (r) => {
    const e = getRecordEligibility(r);
    return e === 'verified' || (e === 'partial' && authState(r) === 'valid');
  };

  // Defaults to every holder that can be generated now: fully verified ones, and partially verified ones
  // with a valid authorization. Re-runs only when a different batch opens or the authorizations arrive.
  useEffect(() => {
    if (!authsLoaded) return;
    const key = `${batch?.id}:${authsLoaded}`;
    if (initializedForBatchId.current === key) return;
    initializedForBatchId.current = key;
    setSelectedIds(new Set(records.filter(canGenerate).map(recordSDCId).filter(Boolean)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batch?.id, records, authsLoaded]);

  const filteredRecords = useMemo(() => {
    const q = recordSearch.trim().toLowerCase();
    return records.filter((r) => {
      if (recordFilter !== 'all' && getRecordEligibility(r) !== recordFilter) return false;
      if (q && !String(recordTitle(r)).toLowerCase().includes(q)) return false;
      return true;
    });
  }, [records, recordSearch, recordFilter]);

  const toggleRecord = (id) => {
    if (!id) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const selectAllEligible = () => {
    setSelectedIds(new Set(records.filter(canGenerate).map(recordSDCId).filter(Boolean)));
  };
  const clearSelection = () => setSelectedIds(new Set());

  // The last generate failure, described (see describeGenerateError). Shown inline in the form.
  const [genError, setGenError] = useState(null);

  // After generate / issue the certificates are only "accepted". Dhiway finishes them in the background, so ask
  // the status endpoint (exact ids, never email / name / position) until every requested holder is confirmed.
  useEffect(() => {
    if (!result || (result.issue_pending && !liveStatus) || !batch?.id) return undefined;
    const targets = Array.isArray(sentPayload?.user_ids) && sentPayload.user_ids.length > 0
      ? sentPayload.user_ids.map(String)
      : records.map((r) => String(recordSDCId(r))).filter(Boolean);
    let cancelled = false;
    let timer = null;
    let attempts = 0;
    const MAX_ATTEMPTS = 38; // about 5 minutes at 8 s
    const tick = async () => {
      attempts += 1;
      let all = false;
      try {
        const { data } = await sdcAPI.getBatchStatus(batch.id);
        if (cancelled) return;
        const { known, byUser } = normalizeCertificatesByUser(data);
        all = known && targets.length > 0 && targets.every((id) => byUser[id]);
        setConfirm({ known, byUser, attempts, gaveUp: false });
        if (all) onConfirmedRef.current?.();
      } catch {
        // transient: keep trying
      }
      if (cancelled || all) return;
      if (attempts >= MAX_ATTEMPTS) { setConfirm((c) => ({ ...c, attempts, gaveUp: true })); return; }
      timer = setTimeout(tick, 8000);
    };
    setConfirm((c) => ({ ...c, attempts: 0, gaveUp: false }));
    tick();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, liveStatus, recheck, batch?.id]);

  const handleViewCertificate = async (publicId) => {
    setOpeningId(publicId);
    try {
      await fetchAndOpenCertificate(publicId, 'de', 'pdf');
    } catch (err) {
      toast.error(getApiError(err, 'Failed to open certificate'));
    } finally {
      setOpeningId(null);
    }
  };

  // Fallback issue call — only used when generate comes back with issue_pending.
  // 409 = Dhiway drafts not ready yet, retry with backoff. Large batches can take
  // Dhiway well over a minute to finish drafting, so this window is generous
  // (8 attempts, 5s/10s/.../40s — ~3 minutes worst case) rather than giving up fast.
  // 400 = generate wasn't called first (shouldn't happen from this code path).
  const issueWithRetry = async (batchId, attempt = 1, maxAttempts = 8) => {
    try {
      const { data } = await sdcAPI.issueBatchSDC(batchId);
      return data;
    } catch (err) {
      if (err?.response?.status === 409 && attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 5000));
        return issueWithRetry(batchId, attempt + 1, maxAttempts);
      }
      throw err;
    }
  };

  // Only calls /generate — never auto-calls /issue. If Dhiway comes back with
  // issue_pending: true, the result panel below surfaces an "Issue Now" button
  // so the admin triggers /issue explicitly instead of it firing silently.
  //
  // A failure is described by describeGenerateError and shown inline (partial holders without an
  // authorization, results changed since authorization, legacy layout, Dhiway errors, ...).
  const runGenerate = async (userIds) => {
    setSubmitting(true);
    setGenError(null);
    try {
      const payload = { publish: false, active, user_ids: userIds };
      const { data } = await sdcAPI.generateBatchSDC(batch.id, payload);
      const nothingNew = !data.issue_pending && data.records_sent === 0 &&
        Array.isArray(data.already_generated_user_ids) && data.already_generated_user_ids.length > 0;
      if (!data.issue_pending) {
        toast.success(nothingNew ? 'Nothing to generate — selected records already have SDCs' : 'SDC created');
      }
      // "already_generated" only means a DRAFT was created earlier — a single best-effort /issue closes
      // that gap without blocking the UI on Dhiway's full retry window.
      if (nothingNew) {
        try { await sdcAPI.issueBatchSDC(batch.id); } catch { /* best-effort only */ }
      }
      onGenerated(payload, data);
      setSentPayload(payload);
      setResult(data);
    } catch (err) {
      const described = describeGenerateError(err);
      if (described.kind === 'other') toast.error(getApiError(err, 'Failed to start SDC generation'));
      else setGenError(described);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedIds.size === 0) return;
    runGenerate(Array.from(selectedIds));
  };

  // Manual trigger for the /issue fallback — only ever called by the admin
  // clicking "Issue Certificates Now" below, never automatically.
  const handleIssueNow = async () => {
    setRetrying(true);
    try {
      const data = await issueWithRetry(batch.id);
      toast.success('Certificates issued');
      setResult(data);
      onGenerated(sentPayload, data);
    } catch (err) {
      toast.error(getApiError(err, 'Still not ready — try again in a bit'));
    } finally {
      setRetrying(false);
    }
  };

  // ── Post-submit ──────────────────────────────────────────────────────────
  if (result) {
    // liveStatus arrives from the background /status poll started right after
    // generate — if it's present, Dhiway finished issuing after our synchronous
    // response came back "pending", so treat this as done regardless of the
    // stale result.issue_pending snapshot.
    const isPending = result.issue_pending && !liveStatus;

    // Pending state — just a loader, nothing else, while Dhiway finishes issuing.
    if (isPending) {
      return (
        <Modal isOpen onClose={onClose} title="SDC Generation Started" size="sm">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="flex flex-col items-center justify-center gap-5 py-7 text-center"
          >
            {/* Emblem: soft pulses behind a slowly turning ring with the shield at its centre */}
            <div className="relative flex h-24 w-24 items-center justify-center">
              {polling && [0, 0.6, 1.2].map((delay) => (
                <motion.span
                  key={delay}
                  aria-hidden="true"
                  className="absolute inset-2 rounded-full bg-brand-blue/20"
                  initial={{ scale: 0.9, opacity: 0.55 }}
                  animate={{ scale: 1.65, opacity: 0 }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut', delay }}
                />
              ))}
              <span aria-hidden="true" className="absolute inset-0 rounded-full border border-brand-blue/10" />
              {polling && (
                <motion.span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-brand-blue border-r-brand-blue/40"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
                />
              )}
              <motion.span
                className="relative flex h-14 w-14 items-center justify-center rounded-full bg-brand-blue text-white shadow-[0_10px_24px_-10px_rgba(37,99,235,0.8)]"
                animate={polling ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                transition={{ duration: 1.6, repeat: polling ? Infinity : 0, ease: 'easeInOut' }}
              >
                {polling ? <ShieldCheck size={26} strokeWidth={1.8} /> : <Clock size={24} strokeWidth={1.8} />}
              </motion.span>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.3 }}
              className="w-full max-w-[300px]"
            >
              <p className="text-base font-semibold text-brand-dark font-inter">
                {polling ? 'Finishing certificate issuance…' : 'Issuance still pending'}
              </p>
              <p className="mt-1 text-xs leading-5 text-gray-500 font-inter">
                {polling
                  ? 'Checking Dhiway automatically — this can take up to a minute.'
                  : 'Click "Issue Certificates Now" to finish.'}
              </p>

              {polling && (
                <>
                  {/* Indeterminate progress bar */}
                  <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-brand-blue/10" role="progressbar" aria-label="Issuing certificates">
                    <motion.span
                      className="block h-full w-2/5 rounded-full bg-brand-blue"
                      animate={{ x: ['-100%', '250%'] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  </div>
                  {/* Where it is: the first step is already done */}
                  <ol className="mt-4 flex items-center justify-between text-[11px] font-medium font-inter">
                    {[['Sent', 'done'], ['Issuing', 'active'], ['Ready', 'todo']].map(([label, state], i) => (
                      <li key={label} className="flex items-center gap-1.5">
                        <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] ${state === 'done' ? 'bg-green-500 text-white' : state === 'active' ? 'bg-brand-blue text-white' : 'bg-gray-200 text-gray-500'}`}>
                          {state === 'done' ? <CheckCircle size={10} strokeWidth={3} /> : state === 'active' ? (
                            <motion.span className="h-1.5 w-1.5 rounded-full bg-white" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }} />
                          ) : i + 1}
                        </span>
                        <span className={state === 'todo' ? 'text-gray-400' : 'text-brand-dark'}>{label}</span>
                      </li>
                    ))}
                  </ol>
                </>
              )}
            </motion.div>

            <Modal.Footer>
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28, duration: 0.3 }}
                className="flex w-full flex-wrap items-center justify-center gap-3"
              >
                {!polling && (
                  <Button variant="secondary" loading={retrying} onClick={handleIssueNow}>
                    <Sparkles size={14} /> Issue Certificates Now
                  </Button>
                )}
                <Button onClick={onClose} className="min-w-[120px]">Done</Button>
              </motion.div>
            </Modal.Footer>
          </motion.div>
        </Modal>
      );
    }

    // Done — minimal summary + a direct way to actually view the certificate.
    const alreadyGenerated = Array.isArray(result.already_generated_user_ids) ? result.already_generated_user_ids : [];
    const unconfirmed = Array.isArray(result.accepted_unconfirmed_user_ids) ? result.accepted_unconfirmed_user_ids : [];
    const targetIds = Array.isArray(sentPayload?.user_ids) && sentPayload.user_ids.length > 0
      ? sentPayload.user_ids.map(String)
      : records.map((r) => String(recordSDCId(r))).filter(Boolean);
    const confirmedIds = targetIds.filter((id) => confirm.byUser[id]);
    const allConfirmed = confirm.known && targetIds.length > 0 && confirmedIds.length === targetIds.length;
    const nothingNew = allConfirmed && result.records_sent === 0 && alreadyGenerated.length > 0;
    const stillIssuing = !allConfirmed && confirm.known && !confirm.gaveUp;
    const dhiwayNote = result?.dhiway_response?.status === 'PROCESSING' ? (result.dhiway_response.message || 'Dhiway accepted the issue request and is processing it in the background.') : '';
    const nameOf = (id) => { const r = records.find((rec) => String(recordSDCId(rec)) === id); return r ? recordTitle(r) : id; };
    return (
      <Modal isOpen onClose={onClose} title={allConfirmed ? (nothingNew ? 'SDC Generation Complete' : 'Certificates Issued') : stillIssuing ? 'Issuing Certificates' : 'Certificates Not Confirmed Yet'} size="xl">
        <div className="space-y-5">
          {/* Status: green only once Dhiway has confirmed every requested certificate */}
          {allConfirmed ? (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-green-50 px-4 py-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600"><CheckCircle size={20} /></div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-brand-dark font-inter">{nothingNew ? 'Nothing to generate — already up to date' : 'All certificates are issued'}</p>
                <p className="text-xs text-emerald-700 font-inter">{confirmedIds.length}/{targetIds.length} confirmed by Dhiway</p>
              </div>
            </div>
          ) : !confirm.known ? (
            <div role="status" className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3.5">
              <AlertCircle size={18} className="mt-0.5 shrink-0 text-gray-500" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-brand-dark font-inter">Certificates were submitted</p>
                <p className="text-xs leading-5 text-gray-600 font-inter">This backend does not report which certificates are confirmed yet. Use “Refresh Certificates” on the batch page to check.</p>
              </div>
            </div>
          ) : (
            <div role="status" className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 ${stillIssuing ? 'border-blue-100 bg-blue-50/60' : 'border-amber-100 bg-amber-50'}`}>
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${stillIssuing ? 'bg-brand-blue/10 text-brand-blue' : 'bg-amber-100 text-amber-600'}`}>
                {stillIssuing ? <RefreshCw size={20} className="animate-spin motion-reduce:animate-none" /> : <Clock size={20} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-brand-dark font-inter">{stillIssuing ? 'Dhiway is issuing the certificates' : 'Not all certificates are confirmed yet'}</p>
                <p className="text-xs leading-5 text-gray-600 font-inter">
                  {confirmedIds.length}/{targetIds.length} confirmed. {stillIssuing ? 'This runs in the background and can take a few minutes — this page checks automatically.' : 'Dhiway has not confirmed the rest. Check again, or use “Refresh Certificates” on the batch page later.'}
                </p>
                {dhiwayNote && <p className="mt-1 text-[11px] text-gray-500 font-inter">{dhiwayNote}</p>}
                {!stillIssuing && (
                  <button type="button" onClick={() => setRecheck((n) => n + 1)} className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-blue hover:underline font-inter">
                    <RefreshCw size={12} /> Check again
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Exactly who this call targeted — resolved by name, not just a
              count, so it's immediately verifiable against what you
              actually selected (and against the Certificates list below,
              which is now scoped to these same ids — never the whole batch). */}
          {Array.isArray(sentPayload?.user_ids) && sentPayload.user_ids.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 font-inter">Requested</p>
              <div className="flex flex-wrap gap-1.5">
                {sentPayload.user_ids.map((id) => {
                  const r = records.find((rec) => recordSDCId(rec) === id);
                  return (
                    <span key={id} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 font-inter">
                      {r ? recordTitle(r) : id}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Informational, never shown as an error — these selected users
              simply already had SDCs and were skipped (not resubmitted). */}
          {alreadyGenerated.length > 0 && (
            <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5">
              <AlertCircle size={13} className="mt-0.5 shrink-0 text-brand-blue" />
              <p className="text-xs text-brand-blue/90 font-inter leading-relaxed">
                {alreadyGenerated.length} selected record{alreadyGenerated.length === 1 ? '' : 's'} already had {alreadyGenerated.length === 1 ? 'an SDC' : 'SDCs'} and {alreadyGenerated.length === 1 ? 'was' : 'were'} skipped.
              </p>
            </div>
          )}

          {/* Legacy-Human only — Dhiway only confirmed the job was accepted,
              not finished. Informational, never an error. */}
          {unconfirmed.length > 0 && (
            <div className="flex items-start gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
              <Clock size={13} className="mt-0.5 shrink-0 text-gray-400" />
              <div>
                <p className="text-xs font-semibold text-gray-600 font-inter">Submitted for Generation</p>
                <p className="text-xs text-gray-500 font-inter leading-relaxed mt-0.5">
                  {unconfirmed.length} credential{unconfirmed.length === 1 ? ' was' : 's were'} accepted for processing but {unconfirmed.length === 1 ? 'is' : 'are'} not yet confirmed. Use "Refresh Certificates" shortly to check.
                </p>
              </div>
            </div>
          )}

          {(() => {
            const grouped = groupSchemaWarnings(result.warning_details, result.schema_mapping_warnings);
            const dropped = Array.isArray(result.dropped_fields) ? result.dropped_fields : [];
            const used = Array.isArray(result.partial_authorization_ids_used) ? result.partial_authorization_ids_used : [];
            if (!grouped.warning.length && !grouped.info.length && !dropped.length && !used.length) return null;
            return (
              <div className="space-y-2">
                {used.length > 0 && (
                  <p className="rounded-xl border border-green-100 bg-green-50 px-3 py-2 text-xs text-green-700 font-inter">
                    {used.length} partial authorization{used.length === 1 ? '' : 's'} used. Each is now marked as used.
                  </p>
                )}
                {[...grouped.warning, ...grouped.info].map((w, i) => (
                  <p key={i} className={`rounded-xl border px-3 py-2 text-xs font-inter ${w.severity === 'warning' ? 'border-amber-100 bg-amber-50 text-amber-800' : 'border-gray-100 bg-gray-50 text-gray-600'}`}>
                    <span className="font-semibold">{w.title}</span>{w.message ? ` — ${w.message}` : ''}{w.fields.length ? `: ${w.fields.join(', ')}` : ''}
                  </p>
                ))}
                {dropped.length > 0 && (
                  <p className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-600 font-inter">
                    Not sent to Dhiway (not in the schema): {dropped.join(', ')}
                  </p>
                )}
              </div>
            );
          })()}

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 font-inter">Certificates</p>
            {targetIds.length === 0 ? (
              <p className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 text-xs text-gray-500 font-inter">No holders in this request.</p>
            ) : (
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {targetIds.map((id) => {
                  const publicId = confirm.byUser[id];
                  return (
                    <div key={id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white px-3.5 py-2.5">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${publicId ? 'bg-brand-blue/10 text-brand-blue' : 'bg-gray-100 text-gray-400'}`}><ShieldCheck size={14} /></div>
                        <span className="min-w-0 truncate text-sm font-medium text-brand-dark font-inter">{nameOf(id)}</span>
                      </div>
                      {publicId ? (
                        <Button variant="ghost" size="sm" loading={openingId === publicId} onClick={() => handleViewCertificate(publicId)}>
                          <Eye size={13} /> View
                        </Button>
                      ) : (
                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-600 font-inter">
                          {stillIssuing && <RefreshCw size={11} className="animate-spin motion-reduce:animate-none" />} {stillIssuing ? 'Issuing…' : 'Not confirmed yet'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Modal.Footer><Button onClick={onClose} className="w-full">Done</Button></Modal.Footer>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen onClose={onClose} title="Generate SDC" size="lg" onSubmit={handleSubmit}>
      <div className="space-y-4">
        <p className="text-xs text-gray-500 font-inter">
          Select the records to generate digital credentials for in <span className="font-semibold text-brand-dark">{batch.name}</span> via
          Dhiway Studio — the org, space, and schema all resolve automatically.
        </p>

        {genError && (
          <div role="alert" className="space-y-2 rounded-xl border border-red-100 bg-red-50 px-3.5 py-3">
            <p className="text-sm font-semibold text-red-700 font-inter">{genError.message}</p>
            {genError.kind === 'unauthorized' && (
              <>
                <p className="text-xs text-red-700/90 font-inter">The organization must authorize these holders first (Batches, then this batch, then Partial SDC authorization), or deselect them.</p>
                <ul className="flex flex-wrap gap-1.5">
                  {genError.unauthorizedIds.map((id) => {
                    const r = records.find((rec) => recordSDCId(rec) === id);
                    return <li key={id} className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-red-700">{r ? recordTitle(r) : id}</li>;
                  })}
                </ul>
                <button
                  type="button"
                  onClick={() => { setSelectedIds((prev) => new Set([...prev].filter((id) => !genError.unauthorizedIds.includes(id)))); setGenError(null); }}
                  className="text-xs font-semibold text-red-700 underline font-inter"
                >
                  Deselect these holders
                </button>
              </>
            )}
            {genError.kind === 'stale' && (
              <>
                <p className="text-xs text-red-700/90 font-inter">Verification results changed after authorization. The organization must authorize these holders again.</p>
                <ul className="space-y-0.5 text-xs text-red-700 font-inter">
                  {genError.stale.map((item) => {
                    const r = records.find((rec) => recordSDCId(rec) === item.batch_user_id);
                    return <li key={item.authorization_id || item.batch_user_id}>{r ? recordTitle(r) : item.batch_user_id}{(item.stale_verification_types || []).length ? ` — changed: ${item.stale_verification_types.join(', ')}` : ''}</li>;
                  })}
                </ul>
              </>
            )}
            {genError.kind === 'legacy' && (
              <p className="text-xs text-red-700/90 font-inter">These holders already have an SDC in the old Human layout and cannot get another one: {genError.userIds.map((id) => { const r = records.find((rec) => recordSDCId(rec) === id); return r ? recordTitle(r) : id; }).join(', ')}. Deselect them.</p>
            )}
            {genError.kind === 'ids' && (
              <p className="text-xs text-red-700/90 font-inter">Some authorizations are no longer active for these holders. Reopen this window and try again.</p>
            )}
            {genError.kind === 'busy' && <p className="text-xs text-red-700/90 font-inter">Wait a moment, then press Generate again.</p>}
            {genError.kind === 'dhiway' && <p className="text-xs text-red-700/90 font-inter">The authorization was released. You can generate again.</p>}
            {genError.kind === 'validation' && (
              <>
                {genError.errors?.length > 0 && (
                  <ul className="list-disc space-y-0.5 pl-4 text-xs text-red-700 font-inter">
                    {genError.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )}
                <p className="text-xs text-red-700/90 font-inter">Nothing was sent to Dhiway. Check the organization's schema configuration.</p>
              </>
            )}
          </div>
        )}

        {/* Search + filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-[180px] flex-1 items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5">
            <Search size={12} className="text-gray-400" />
            <input
              value={recordSearch}
              onChange={(e) => setRecordSearch(e.target.value)}
              placeholder="Search records…"
              className="w-full text-xs font-inter outline-none placeholder:text-gray-400"
            />
          </div>
          {['all', 'verified', 'partial', 'pending', 'ineligible'].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setRecordFilter(f)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium font-inter transition-colors ${
                recordFilter === f ? 'border-brand-blue bg-brand-blue/10 text-brand-blue' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              {f === 'all' ? 'All' : ELIGIBILITY_META[f].label}
            </button>
          ))}
        </div>

        {/* Selection table */}
        <div className="rounded-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-3 py-2">
            <button type="button" onClick={selectAllEligible} className="text-[11px] font-semibold text-brand-blue font-inter hover:underline">
              Select all ready
            </button>
            <button type="button" onClick={clearSelection} className="text-[11px] font-medium text-gray-400 font-inter hover:text-gray-600">
              Clear
            </button>
          </div>
          <div className="max-h-56 overflow-y-auto thin-scrollbar divide-y divide-gray-50">
            {filteredRecords.length === 0 ? (
              <p className="py-6 text-center text-xs text-gray-400 font-inter">No records match.</p>
            ) : (
              filteredRecords.map((r) => {
                const id = recordSDCId(r);
                const eligibility = getRecordEligibility(r);
                const meta = ELIGIBILITY_META[eligibility];
                const checked = !!id && selectedIds.has(id);
                return (
                  <label key={id || recordTitle(r)} className="flex cursor-pointer items-center gap-2.5 px-3 py-2 hover:bg-gray-50/70">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleRecord(id)}
                      className="accent-brand-blue"
                    />
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-brand-dark font-inter">{recordTitle(r)}</span>
                    <Badge status={meta.badge}>{meta.label}</Badge>
                    {eligibility === 'partial' && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${authState(r) === 'valid' ? 'bg-green-100 text-green-700' : authState(r) === 'stale' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>
                        {authState(r) === 'valid' ? 'Authorized' : authState(r) === 'stale' ? 'Results changed' : 'Needs authorization'}
                      </span>
                    )}
                  </label>
                );
              })
            )}
          </div>
        </div>

        <p className="text-xs font-inter text-gray-500">
          Selected: <span className="font-semibold text-brand-dark">{selectedIds.size}</span> record{selectedIds.size === 1 ? '' : 's'}
        </p>

        <div className="rounded-xl border border-gray-100 bg-brand-bg p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 mr-4">
              <p className="text-sm font-medium text-brand-dark font-inter">Active</p>
              <p className="text-xs text-gray-400 font-inter mt-0.5">Visible via active=1 record lookups on Dhiway</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={active}
              onClick={() => setActive((v) => !v)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                active ? 'bg-brand-blue' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  active ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5">
          <AlertCircle size={14} className="text-brand-blue mt-0.5 shrink-0" />
          <p className="text-xs text-brand-blue/90 font-inter">
            Generation runs in the background on Dhiway's side. A holder who isn't fully verified can only be generated after the organization authorizes their approved verifications; the credential then carries only those.
          </p>
        </div>

        <Modal.Footer className="flex gap-3">
          <Button type="submit" loading={submitting} disabled={selectedIds.size === 0}>
            <Sparkles size={14} /> Generate Selected ({selectedIds.size})
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        </Modal.Footer>
      </div>
    </Modal>
  );
};

// ── Record certificate modal ────────────────────────────────────────────────
const RecordCertModal = ({ record, sdcMatch, instanceKey, onClose }) => {
  const [loading, setLoading] = useState(false);

  if (!record) return null;
  const { variant, label } = statusBadge(record.verification_status);
  const isProduct = isProductRecord(record);

  const openCertificate = async (kind) => {
    if (!sdcMatch?.publicId) return;
    setLoading(true);
    try {
      await fetchAndOpenCertificate(sdcMatch.publicId, instanceKey, kind);
    } catch (err) {
      toast.error(getApiError(err, 'Failed to fetch certificate'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={!!record} onClose={onClose} title="Record Certificate" size="lg">
      <div className="space-y-5">
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
          variant === 'success' ? 'bg-green-50 border-green-100' :
          variant === 'error' ? 'bg-red-50 border-red-100' :
          'bg-orange-50 border-orange-100'
        }`}>
          <Badge status={variant}>{label}</Badge>
          {sdcMatch?.issued ? (
            <Badge status="info">SDC issued</Badge>
          ) : sdcMatch ? (
            <Badge status="pending">Draft on Dhiway — not yet issued</Badge>
          ) : (
            <span className="text-xs text-gray-400 font-inter">SDC not generated for this record yet</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {isProduct ? (
            <>
              <Detail label="Product Name" value={record.product_name} />
              <Detail label="Category" value={record.category_name} />
            </>
          ) : (
            <>
              <Detail label="Full Name" value={record.full_name} />
              <Detail label="Email" value={record.email} />
              <Detail label="Phone" value={record.phone_number} />
            </>
          )}
          <Detail label="Record ID" value={record.id || record.user_id || record.entity_id} mono />
          {sdcMatch && <Detail label="Dhiway Public ID" value={sdcMatch.publicId} mono />}
        </div>

        {sdcMatch?.issued ? (
          <Modal.Footer className="flex flex-wrap gap-3">
            <Button variant="secondary" size="sm" loading={loading} onClick={() => openCertificate('pdf')}>
              <FileText size={14} /> Download PDF
            </Button>
            <Button variant="outline" size="sm" loading={loading} onClick={() => openCertificate('verify')}>
              <QrCode size={14} /> Verify Certificate
            </Button>
          </Modal.Footer>
        ) : sdcMatch ? (
          <p className="text-xs text-gray-400 font-inter">
            This record's draft was created on Dhiway but hasn't been issued yet — refresh certificates again shortly.
          </p>
        ) : (
          <p className="text-xs text-gray-400 font-inter">
            Generate SDCs for this batch, then refresh certificates to link this record to its Dhiway credential.
          </p>
        )}
      </div>
    </Modal>
  );
};

const formatDetailDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const CopyField = ({ label, value, icon: Icon }) => {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-400">
          <Icon size={14} />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-400 font-inter">{label}</p>
          <p className="text-sm font-medium text-brand-dark font-mono break-all">{value}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => { navigator.clipboard.writeText(value); toast.success('Copied'); }}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition-colors hover:border-brand-blue hover:bg-blue-50 hover:text-brand-blue"
      >
        <Copy size={13} />
      </button>
    </div>
  );
};

// ── Certificate detail modal — mirrors Dhiway's own record-detail screen:
// identity block, issuance timeline, recipients, and a direct download.
export const CertificateDetailModal = ({ record, sdcMatch, instanceKey, onClose }) => {
  const [downloading, setDownloading] = useState(false);

  if (!record || !sdcMatch) return null;
  const recipients = Array.isArray(sdcMatch.recipients) ? sdcMatch.recipients : [];

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await fetchAndOpenCertificate(sdcMatch.publicId, instanceKey, 'pdf');
    } catch (err) {
      toast.error(getApiError(err, 'Failed to fetch certificate'));
    } finally {
      setDownloading(false);
    }
  };

  const timeline = [
    { key: 'created', label: 'Created', value: sdcMatch.createdAt, desc: 'Record created', icon: FileText, tone: 'bg-green-100 text-green-600' },
    { key: 'anchored', label: 'Anchored', value: sdcMatch.anchorTime, desc: 'Record anchored on blockchain', icon: Anchor, tone: 'bg-blue-100 text-blue-600' },
    { key: 'latest', label: 'Latest Version', value: sdcMatch.latest ? (sdcMatch.updatedAt || sdcMatch.anchorTime) : null, desc: 'This is the latest version', icon: Star, tone: 'bg-purple-100 text-purple-600' },
    { key: 'active', label: 'Active', value: sdcMatch.active ? (sdcMatch.updatedAt || sdcMatch.anchorTime) : null, desc: 'Record is active and valid', icon: CheckCircle, tone: 'bg-green-100 text-green-600' },
  ].filter((step) => step.value);

  return (
    <Modal isOpen={!!record} onClose={onClose} title="Certificate Detail" size="md">
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${sdcMatch.revoked ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
              <CheckCircle size={22} />
            </div>
            <div className="min-w-0">
              <h3 className="font-sora text-lg font-bold text-brand-dark truncate">{recordTitle(record)}</h3>
              <p className="text-xs text-gray-400 font-inter mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span className="flex items-center gap-1"><Clock size={11} /> {formatDetailDate(sdcMatch.anchorTime || sdcMatch.createdAt)}</span>
                <span>·</span>
                <span className="flex items-center gap-1"><Users size={11} /> {recipients.length} recipient{recipients.length === 1 ? '' : 's'}</span>
              </p>
            </div>
          </div>
          <Badge status={sdcMatch.revoked ? 'error' : 'success'}>{sdcMatch.revoked ? 'Revoked' : 'Active'}</Badge>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {sdcMatch.latest && <Badge status="info">Latest Version</Badge>}
          {!sdcMatch.edited && <Badge status="default">Original</Badge>}
        </div>

        <Modal.Footer><Button variant="primary" className="w-full" loading={downloading} onClick={handleDownload}>
          <FileText size={14} /> Download Certificate
        </Button></Modal.Footer>

        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 font-inter">Identity</p>
          <div className="rounded-xl border border-gray-100 px-3">
            <CopyField label="Public ID" value={sdcMatch.publicId} icon={ShieldCheck} />
            <CopyField label="Record ID" value={sdcMatch.id} icon={FileText} />
            <CopyField label="Date" value={formatDetailDate(sdcMatch.createdAt)} icon={Clock} />
          </div>
        </div>

        {timeline.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 font-inter">Timeline</p>
            <div>
              {timeline.map((step, i) => (
                <div key={step.key} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${step.tone}`}>
                      <step.icon size={14} />
                    </div>
                    {i < timeline.length - 1 && <div className="w-px flex-1 bg-gray-200 my-1" />}
                  </div>
                  <div className="pb-4">
                    <p className="text-sm font-semibold text-brand-dark font-inter">{step.label}</p>
                    <p className="text-xs text-gray-400 font-inter">{formatDetailDate(step.value)}</p>
                    <p className="text-xs text-gray-400 font-inter mt-0.5">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {recipients.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 font-inter">Recipients</p>
            <div className="space-y-2">
              {recipients.map((email) => (
                <div key={email} className="flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                    <Users size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-brand-dark font-inter truncate">{email}</p>
                    <p className="text-xs text-green-600 font-inter">Verified recipient</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-start gap-2 rounded-xl bg-blue-50 border border-blue-100 px-3 py-3">
          <AlertCircle size={14} className="text-brand-blue mt-0.5 shrink-0" />
          <p className="text-xs text-brand-blue/90 font-inter leading-relaxed">
            This record is secured on the blockchain and can't be tampered with. You can share this certificate as
            proof of authenticity.
          </p>
        </div>
      </div>
    </Modal>
  );
};

// ── Batch detail view ───────────────────────────────────────────────────────
// Generation only happens from the batch card in the org list view (with its
// own status polling) — this view is read-only: view records, refresh
// certificates, and open PDFs for whatever's already been generated.
const BatchDetail = ({ batchSummary, onBack }) => {
  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [certEntriesByUser, setCertEntriesByUser] = useState({}); // { batch_user_id: certificate entry } from certificates_by_user
  const [certsKnown, setCertsKnown] = useState(true); // false when the backend did not send certificates_by_user
  const [certsLoading, setCertsLoading] = useState(false);
  const [pdfLoadingId, setPdfLoadingId] = useState(null);
  const instanceKey = 'de';

  const loadBatch = useCallback(() => {
    setLoading(true);
    verificationAPI.getBatchDetails(batchSummary.id)
      .then(({ data }) => setBatch(normaliseBatch(data)))
      .catch((err) => toast.error(getApiError(err, 'Failed to load batch details')))
      .finally(() => setLoading(false));
  }, [batchSummary.id]);

  useEffect(() => { loadBatch(); }, [loadBatch]);

  // Individual certificate ownership comes ONLY from GET /sdc/batches/{id}/status → certificates_by_user
  // (exact batch_user_id → confirmed public id) — never matched by email, name or list position, and a
  // batch-level "generated" status does not make anyone Ready. Dhiway's record list only decorates a
  // confirmed public id (looked up by public id).
  const refreshCertificates = useCallback(async (silent = false) => {
    setCertsLoading(true);
    try {
      const orgId   = batchSummary.sdcInfo?.org_id || undefined;
      const spaceId = batchSummary.sdcSpaceId || batchSdcSpaceId(batchSummary.sdcInfo, batchSummary.spaceId) || undefined;
      const statusData = await sdcAPI.getBatchStatus(batchSummary.id).then(({ data }) => data).catch(() => null);
      const { known, byUser } = normalizeCertificatesByUser(statusData);
      setCertsKnown(known);
      const confirmedIds = new Set(Object.values(byUser));
      const metaByPublicId = {};
      if (confirmedIds.size > 0) {
        try {
          let page = 1;
          let hasMore = true;
          while (hasMore) {
            const { data } = await sdcAPI.getRecords({ active: 1, page, pageSize: 100, org_id: orgId, space_id: spaceId });
            const pageRecords = Array.isArray(data?.records) ? data.records : [];
            pageRecords.forEach((r) => { if (r?.publicId && confirmedIds.has(r.publicId)) metaByPublicId[r.publicId] = r; });
            const totalPages = Number(data?.totalPages || data?.total_pages || 0);
            hasMore = totalPages > 0 ? page < totalPages : pageRecords.length === 100;
            page += 1;
          }
        } catch {
          // metadata is optional — the confirmed mapping alone is enough to show Ready and to download
        }
      }
      const entries = certificateEntriesByUser(byUser, metaByPublicId);
      setCertEntriesByUser(entries);
      const issuedCount = Object.values(entries).filter((entry) => entry.issued).length;
      if (!silent) {
        toast.success(known ? `${issuedCount} certificate${issuedCount === 1 ? '' : 's'} confirmed for this batch` : 'Certificate ownership is not available from this backend yet');
      }
      return issuedCount;
    } catch (err) {
      if (!silent) toast.error(getApiError(err, 'Failed to fetch SDC records'));
      return 0;
    } finally {
      setCertsLoading(false);
    }
  }, [batchSummary.id, batchSummary.spaceId, batchSummary.sdcInfo]);

  const matchSdcRecord = useCallback((record) => certificateEntryFor(certEntriesByUser, record), [certEntriesByUser]);

  // Auto-pull certificate links once, as soon as we know this batch has SDCs
  // generated — otherwise the Certificate column stays blank until the admin
  // remembers to click "Refresh Certificates" manually.
  useEffect(() => {
    if (batch?.sdcStatus === 'generated') refreshCertificates(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batch?.id, batch?.sdcStatus]);

  const filtered = useMemo(() => {
    if (!batch) return [];
    const q = search.toLowerCase();
    if (!q) return batch.users;
    return batch.users.filter((r) =>
      [r.full_name, r.product_name, r.email, r.id].some((v) => v?.toLowerCase().includes(q))
    );
  }, [batch, search]);

  if (loading || !batch) {
    return (
      <LoadingSkeleton variant="detail" label="Loading batch" />
    );
  }

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-brand-dark transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          {batchSummary.orgName && (
            <p className="text-xs text-brand-blue font-inter font-medium mb-0.5">{batchSummary.orgName}</p>
          )}
          <h2 className="text-lg font-bold text-brand-dark font-sora">{batch.name}</h2>
          <p className="text-xs text-gray-500 font-inter font-mono">{batch.id}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {batch.sdcStatus === 'generated' ? (
            <Badge status="success">SDC Generated</Badge>
          ) : (
            <Badge status="default">SDC Not Generated</Badge>
          )}
          <Button size="sm" variant="outline" onClick={() => refreshCertificates(false)} loading={certsLoading}>
            <RefreshCw size={14} /> Refresh Certificates
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total', value: batch.total, color: 'text-brand-dark' },
          { label: 'Verified', value: batch.verified, color: 'text-green-600' },
          { label: 'Pending', value: batch.pending, color: 'text-orange-500' },
          { label: 'Failed', value: batch.failed, color: 'text-red-500' },
        ].map((s) => (
          <Card key={s.label} className="p-4 text-center">
            <p className={`text-2xl font-bold font-sora ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 font-inter mt-1">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="mb-4">
        <Input
          placeholder="Search records by name, email, ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={Search}
        />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider font-inter">Name / Product</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider font-inter">Email / ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider font-inter">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider font-inter">Certificate</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((record) => {
                const { variant, label } = statusBadge(record.verification_status);
                const match = matchSdcRecord(record);
                const recordId = record.id || record.user_id || record.entity_id;
                return (
                  <tr key={recordId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-brand-dark font-inter max-w-[260px] truncate">{recordTitle(record)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 font-inter max-w-[240px] truncate">{record.email || recordId}</td>
                    <td className="px-4 py-3"><Badge status={variant}>{label}</Badge></td>
                    <td className="px-4 py-3">
                      {certificateDisplay(match, certsKnown).canDownload ? (
                        <div className="flex items-center gap-2">
                          <Badge status="info">Ready</Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            loading={pdfLoadingId === recordId}
                            onClick={async () => {
                              setPdfLoadingId(recordId);
                              try {
                                await fetchAndOpenCertificate(match.publicId, instanceKey, 'pdf');
                              } catch (err) {
                                toast.error(getApiError(err, 'Failed to fetch certificate'));
                              } finally {
                                setPdfLoadingId(null);
                              }
                            }}
                          >
                            <FileText size={12} /> PDF
                          </Button>
                        </div>
                      ) : (
                        <Badge status={certificateDisplay(match, certsKnown).badge}>{certificateDisplay(match, certsKnown).label}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedRecord(record)}>
                        <Eye size={14} /> View
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400 font-inter">No records match your search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <RecordCertModal
        record={selectedRecord}
        sdcMatch={selectedRecord ? matchSdcRecord(selectedRecord) : null}
        instanceKey={instanceKey}
        onClose={() => setSelectedRecord(null)}
      />
    </motion.div>
  );
};

const BatchCard = ({ batch, onClick, onGenerateClick }) => {
  const pct = batch.total > 0 ? Math.round((batch.verified / batch.total) * 100) : 0;

  return (
    <Card hover className="p-5" onClick={onClick}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-blue/10 flex items-center justify-center shrink-0">
            <Users size={18} className="text-brand-blue" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-brand-dark font-inter truncate">{batch.name}</p>
            <p className="text-xs text-gray-400 font-mono">{String(batch.id || '').slice(0, 20)}...</p>
          </div>
        </div>
        <ChevronRight size={16} className="text-gray-300 shrink-0 mt-1" />
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {batch.sdcStatus === 'generated' ? (
          <Badge status="success">SDC Generated</Badge>
        ) : (
          <Badge status="default">SDC Not Generated</Badge>
        )}
        {batch.industryType.slice(0, 2).map((ind) => (
          <span key={ind} className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-brand-blue font-inter">{ind}</span>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 font-inter mb-2">
        <span>{batch.total} records</span>
        <span className="text-green-600 font-medium">{pct}% verified</span>
      </div>
      <ProgressBar progress={pct} showLabel={false} height="h-2" />

      <div className="flex items-center gap-3 mt-3">
        <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle size={11} /> {batch.verified}</span>
        <span className="flex items-center gap-1 text-xs text-orange-500"><Clock size={11} /> {batch.pending}</span>
        {batch.failed > 0 && <span className="flex items-center gap-1 text-xs text-red-500"><XCircle size={11} /> {batch.failed}</span>}
        <span className="ml-auto text-xs text-gray-400">{formatDate(batch.createdAt)}</span>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-50">
        <Button
          size="sm"
          variant={batch.sdcStatus === 'generated' ? 'outline' : 'primary'}
          className="w-full"
          disabled={batch.verified === 0}
          title={batch.verified === 0 ? 'No approved users in this batch yet' : undefined}
          onClick={(e) => { e.stopPropagation(); onGenerateClick(); }}
        >
          <Sparkles size={14} /> {batch.sdcStatus === 'generated' ? 'Regenerate SDCs' : 'Generate SDCs'}
        </Button>
      </div>
    </Card>
  );
};

const OrgCard = ({ org, onClick }) => {
  const totals = org.batches.reduce(
    (acc, b) => ({
      records: acc.records + b.total,
      verified: acc.verified + b.verified,
      generated: acc.generated + (b.sdcStatus === 'generated' ? 1 : 0),
    }),
    { records: 0, verified: 0, generated: 0 }
  );
  const pct = totals.records > 0 ? Math.round((totals.verified / totals.records) * 100) : 0;

  return (
    <Card hover className="p-5" onClick={onClick}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-brand-blue/10 flex items-center justify-center shrink-0">
            <Building2 size={18} className="text-brand-blue" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-brand-dark font-inter truncate">{org.orgName}</p>
            <p className="text-xs text-gray-400 font-inter">{org.batches.length} batch{org.batches.length === 1 ? '' : 'es'}</p>
          </div>
        </div>
        <ChevronRight size={16} className="text-gray-300 shrink-0 mt-1" />
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Badge status={totals.generated === org.batches.length && org.batches.length > 0 ? 'success' : 'default'}>
          {totals.generated}/{org.batches.length} SDC Generated
        </Badge>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 font-inter mb-2">
        <span>{totals.records} records</span>
        <span className="text-green-600 font-medium">{pct}% verified</span>
      </div>
      <ProgressBar progress={pct} showLabel={false} height="h-2" />
    </Card>
  );
};

const STATUS_FILTERS = [
  { value: 'all', label: 'All Batches' },
  { value: 'generated', label: 'SDC Generated' },
  { value: 'not_generated', label: 'SDC Not Generated' },
];

const FilterDropdown = ({ value, options, onChange, className = '' }) => {
  const [open, setOpen] = useState(false);
  const selected = options.find((opt) => opt.value === value) || options[0];

  return (
    <div className={`relative ${className}`}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        className="h-[50px] min-w-[170px] px-3 py-2 border-2 border-brand-gray rounded-xl text-sm font-inter text-gray-700 bg-white flex items-center justify-between cursor-pointer"
      >
        <span>{selected?.label}</span>
        <ChevronDown size={16} className={`text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>
      {open && (
        <div className="absolute z-30 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-md py-1">
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`px-3 py-2 text-sm font-inter cursor-pointer hover:bg-gray-50 ${
                opt.value === value ? 'text-brand-blue font-medium' : 'text-gray-700'
              }`}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const SDCVerification = () => {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orgSearch, setOrgSearch] = useState('');

  const [selectedOrg, setSelectedOrg] = useState(null);
  const [search, setSearch] = useState('');
  const [industryFilter, setIndustryFilter] = useState('All Industries');
  const [statusFilter, setStatusFilter] = useState('all');

  const [selectedBatch, setSelectedBatch] = useState(null);
  const [generateBatch, setGenerateBatch] = useState(null);
  const [liveBatchStatus, setLiveBatchStatus] = useState(null); // { batchId, ready, total } once a poll confirms done:true
  const [pollingBatchId, setPollingBatchId] = useState(null); // batchId while the background poll is still actively running

  // Orgs and their batches aren't linked by any single API — batches/verification
  // records are scoped to the caller's own JWT and never carry an org_id/org_name.
  // We reconstruct the mapping from documented endpoints: list orgs via
  // /auth/users/grouped, then for each org discover its batch_ids via
  // /verification/all?org_id=..., then load each batch's details.
  const fetchOrgsAndBatches = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: orgList }, dhiwayDetailsMap] = await Promise.all([
        authAPI.getUsersGrouped(),
        fetchOrgDhiwayDetailsMap().catch(() => ({})),
      ]);
      const rawOrgs = Array.isArray(orgList) ? orgList : [];

      const results = await Promise.all(
        rawOrgs.map(async (org) => {
          const orgId = org.org_id || org.id;
          const orgName = org.organization_name || org.org_name || org.name || 'Organization';
          const dhiwaysDetails = dhiwayDetailsMap[orgId] || [];
          try {
            const { data } = await verificationAPI.getAllVerifications({ orgId, limit: 500 });
            const batchIds = Array.from(
              new Set((data?.users || []).map((u) => u.batch_id).filter(Boolean))
            );
            const batchDetails = await Promise.all(
              batchIds.map((batchId) =>
                verificationAPI.getBatchDetails(batchId)
                  .then(({ data: detail }) => normaliseBatch(detail))
                  .catch(() => null)
              )
            );
            return { orgId, orgName, dhiwaysDetails, batches: batchDetails.filter(hasRenderableRecords) };
          } catch {
            return { orgId, orgName, dhiwaysDetails, batches: [] };
          }
        })
      );

      setOrgs(results);
    } catch (err) {
      toast.error(getApiError(err, 'Failed to load organizations'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrgsAndBatches(); }, [fetchOrgsAndBatches]);

  const filteredOrgs = useMemo(() => {
    if (!orgSearch.trim()) return orgs;
    const q = orgSearch.toLowerCase();
    return orgs.filter((o) => o.orgName.toLowerCase().includes(q));
  }, [orgs, orgSearch]);

  const orgIndustries = useMemo(() => {
    if (!selectedOrg) return ['All Industries'];
    const set = new Set();
    selectedOrg.batches.forEach((b) => b.industryType.forEach((i) => set.add(i)));
    return ['All Industries', ...(set.size ? Array.from(set) : ALL_INDUSTRIES_FALLBACK.slice(1))];
  }, [selectedOrg]);

  const filteredOrgBatches = useMemo(() => {
    if (!selectedOrg) return [];
    let data = selectedOrg.batches;

    if (statusFilter === 'generated') data = data.filter((b) => b.sdcStatus === 'generated');
    if (statusFilter === 'not_generated') data = data.filter((b) => b.sdcStatus !== 'generated');
    if (industryFilter !== 'All Industries') data = data.filter((b) => b.industryType.includes(industryFilter));

    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter((b) =>
        b.name.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q) ||
        b.industryType.some((i) => i.toLowerCase().includes(q))
      );
    }

    return data;
  }, [selectedOrg, search, industryFilter, statusFilter]);

  const totalBatches = orgs.reduce((s, o) => s + o.batches.length, 0);
  const totalRecords = orgs.reduce((s, o) => s + o.batches.reduce((s2, b) => s2 + b.total, 0), 0);
  const totalVerified = orgs.reduce((s, o) => s + o.batches.reduce((s2, b) => s2 + b.verified, 0), 0);
  const totalGenerated = orgs.reduce((s, o) => s + o.batches.filter((b) => b.sdcStatus === 'generated').length, 0);

  // Exports the currently loaded org/batch summary — every row is real data
  // already held in `orgs` (no extra API calls).
  const handleExportReport = () => {
    const rows = orgs.flatMap((org) =>
      org.batches.map((b) => ({
        'Organization': org.orgName,
        'Batch Name': b.name,
        'Records': b.total,
        'Verified': b.verified,
        'Pending': b.pending,
        'Failed': b.failed,
        'SDC Status': b.sdcStatus === 'generated' ? 'Generated' : 'Not Generated',
        'Created On': formatDate(b.createdAt),
      }))
    );
    if (rows.length === 0) { toast.error('No batches to export'); return; }
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'SDC Report');
    XLSX.writeFile(workbook, `trumarkz-sdc-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`Exported ${rows.length} batch${rows.length === 1 ? '' : 'es'}`);
  };

  const patchBatchInState = (batchId, patch) => {
    setOrgs((prev) => prev.map((o) => ({
      ...o,
      batches: o.batches.map((b) => (b.id === batchId ? { ...b, ...patch } : b)),
    })));
  };

  // Poll GET /sdc/batches/{id}/status after a card-level generate, until
  // done:true (or timeout) — gates the "certificates ready" confirmation on
  // that, same as the flow used to live inside batch detail. Also feeds
  // liveBatchStatus so the still-open GenerateSDCModal (which only has the
  // stale snapshot from the moment generate returned) can update itself
  // instead of showing "Issuance Pending" after certificates already issued.
  const pollBatchStatusUntilDone = useCallback((batchId) => {
    let attempts = 0;
    const maxAttempts = 30; // about 4 minutes at 8 s: Dhiway issues in the background
    setPollingBatchId(batchId);
    const tick = async () => {
      attempts += 1;
      try {
        const { data } = await sdcAPI.getBatchStatus(batchId);
        if (data.done) {
          setLiveBatchStatus({ batchId, ready: data.ready, total: data.total });
          setPollingBatchId((current) => (current === batchId ? null : current));
          toast.success(`Certificates ready — ${data.ready}/${data.total} issued`);
          return;
        }
      } catch {
        // transient error — keep polling, only give up after maxAttempts
      }
      if (attempts < maxAttempts) {
        setTimeout(tick, 8000);
      } else {
        setPollingBatchId((current) => (current === batchId ? null : current));
        toast('Still processing — refresh shortly.', { icon: '⏳' });
      }
    };
    tick();
  }, []);

  // ── Level 3: batch detail (records table, generate/refresh certificates) ──
  if (selectedBatch) {
    return (
      <AuthLayout title="SDC Verification">
        <div className="w-full px-2 sm:px-4 lg:px-1">
          <BatchDetail
            batchSummary={selectedBatch}
            onBack={() => setSelectedBatch(null)}
          />
        </div>
      </AuthLayout>
    );
  }

  // ── Level 2: one organization's batches ────────────────────────────────────
  if (selectedOrg) {
    return (
      <AuthLayout title="SDC Verification">
        <div className="w-full px-2 sm:px-4 lg:px-1">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setSelectedOrg(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-brand-dark transition-colors">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2 className="text-lg font-bold text-brand-dark font-sora">{selectedOrg.orgName}</h2>
              <p className="text-xs text-gray-500 font-inter">{selectedOrg.batches.length} batch{selectedOrg.batches.length === 1 ? '' : 'es'}</p>
            </div>
          </div>

          <Card className="p-4 mb-6 border-gray-200">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[240px]">
                <Input
                  placeholder="Search batches by name, ID, industry..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  icon={Search}
                />
              </div>
              <FilterDropdown
                value={industryFilter}
                onChange={setIndustryFilter}
                options={orgIndustries.map((ind) => ({ value: ind, label: ind }))}
              />
              <FilterDropdown
                value={statusFilter}
                onChange={setStatusFilter}
                options={STATUS_FILTERS}
              />
            </div>
          </Card>

          {filteredOrgBatches.length === 0 ? (
            <Card className="p-12 text-center">
              <ShieldCheck size={40} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-inter text-sm">No batches match your filters.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <AnimatePresence>
                {filteredOrgBatches.map((batch, i) => (
                  <motion.div
                    key={batch.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <BatchCard
                      batch={batch}
                      onClick={() => setSelectedBatch({
                        ...batch,
                        orgName: selectedOrg.orgName,
                        orgId: selectedOrg.orgId,
                        spaceId: resolveDhiwaySpaceId(selectedOrg.dhiwaysDetails, batch.batchType),
                      })}
                      onGenerateClick={() => setGenerateBatch({
                        ...batch,
                        orgId: selectedOrg.orgId,
                        spaceId: resolveDhiwaySpaceId(selectedOrg.dhiwaysDetails, batch.batchType),
                      })}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {generateBatch && (
          <GenerateSDCModal
            batch={generateBatch}
            liveStatus={liveBatchStatus?.batchId === generateBatch.id ? liveBatchStatus : null}
            polling={pollingBatchId === generateBatch.id}
            onClose={() => { setGenerateBatch(null); setLiveBatchStatus(null); }}
            onGenerated={() => {
              patchBatchInState(generateBatch.id, { sdcStatus: 'generated' });
              pollBatchStatusUntilDone(generateBatch.id);
            }}
          />
        )}
      </AuthLayout>
    );
  }

  // ── Level 1: organizations ──────────────────────────────────────────────────
  return (
    <AuthLayout title="SDC Verification">
      <div className="w-full px-2 sm:px-4 lg:px-1">
        <PageHeader
          title="SDC Verification"
          subtitle="Generate and track Signed Digital Certificates, organized by organization and batch"
          action={
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" icon={Download} onClick={handleExportReport}>
                Export Report
              </Button>
            </div>
          }
        />

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Organizations', value: orgs.length, icon: Building2, color: 'text-brand-dark', iconColor: 'text-slate-500', bg: 'bg-gray-50' },
            { label: 'Total Batches', value: totalBatches, icon: Layers, color: 'text-brand-blue', iconColor: 'text-brand-blue', bg: 'bg-blue-50' },
            { label: 'Verified Records', value: `${totalVerified}/${totalRecords}`, icon: CheckCircle, color: 'text-green-600', iconColor: 'text-green-600', bg: 'bg-green-50' },
            { label: 'SDC Generated', value: `${totalGenerated}/${totalBatches}`, icon: Sparkles, color: 'text-orange-500', iconColor: 'text-orange-500', bg: 'bg-orange-50' },
          ].map((s) => (
            <Card key={s.label} className={`p-4 ${s.bg}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className={`text-3xl font-bold font-sora ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-500 font-inter mt-1">{s.label}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm">
                  <s.icon size={18} className={s.iconColor} />
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="p-4 mb-6 border-gray-200">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[240px]">
              <Input
                placeholder="Search by organization name..."
                value={orgSearch}
                onChange={(e) => setOrgSearch(e.target.value)}
                icon={Search}
              />
            </div>

            <Button variant="ghost" size="sm" onClick={fetchOrgsAndBatches} loading={loading}>
              <RefreshCw size={14} /> Refresh
            </Button>

            {orgSearch && (
              <button
                onClick={() => setOrgSearch('')}
                className="text-xs text-gray-500 hover:text-brand-dark font-inter underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </Card>

        <p className="text-xs text-gray-400 font-inter mb-4">
          {loading ? 'Loading organizations...' : `Showing ${filteredOrgs.length} organization${filteredOrgs.length !== 1 ? 's' : ''}`}
        </p>

        {loading ? <LoadingSkeleton variant="cards" rows={4} label="Loading organizations" /> : filteredOrgs.length === 0 ? (
          <Card className="p-12 text-center">
            <ShieldCheck size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-inter text-sm">No organizations match your search.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <AnimatePresence>
              {filteredOrgs.map((org, i) => (
                <motion.div
                  key={org.orgId}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <OrgCard org={org} onClick={() => setSelectedOrg(org)} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </AuthLayout>
  );
};

export default SDCVerification;
