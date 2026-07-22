import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { authAPI, verificationAPI, sdcAPI, adminAPI, getApiError } from '@/services/api';
import {
  Search, ShieldCheck, Users, ChevronRight, CheckCircle, Clock, XCircle,
  ArrowLeft, FileText, QrCode, Eye, ChevronDown, Sparkles, RefreshCw, AlertCircle, Building2,
  Copy, Anchor, Star,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Helpers ──────────────────────────────────────────────────────────────────
const statusBadge = (status) => {
  if (status === 'approved') return { variant: 'success', label: 'Approved' };
  if (status === 'rejected') return { variant: 'error', label: 'Rejected' };
  return { variant: 'pending', label: 'Pending' };
};

const isProductRecord = (r) =>
  r?.entity_type === 'product' || !!r?.product_name || !!r?.category_name;

const recordTitle = (r) => r?.product_name || r?.full_name || r?.email || r?.id || r?.user_id || r?.entity_id || 'Record';

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const normaliseBatch = (b) => {
  if (!b || typeof b !== 'object') return null;
  const id = b.batch_id || b.id || '';
  const total = Number(b.total_users ?? b.total ?? 0);
  const verified = Number(b.approved ?? b.approved_count ?? 0);
  const failed = Number(b.rejected ?? b.rejected_count ?? 0);
  const pending = Math.max(0, total - verified - failed);
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
    users: Array.isArray(b.users) ? b.users : [],
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
      toast.error(`No ${kind === 'pdf' ? 'PDF' : 'verify'} link on this certificate yet`);
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
const fetchOrgSpaceMap = async () => {
  const map = {};
  let offset = 0;
  const limit = 200;
  let total = Infinity;
  while (offset < total) {
    const { data } = await adminAPI.getAllUsers({ user_type: 'organization', limit, offset });
    const users = Array.isArray(data?.users) ? data.users : [];
    users.forEach((u) => { if (u.id && u.dhiway_space_id) map[u.id] = u.dhiway_space_id; });
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

// ── Generate SDC modal ───────────────────────────────────────────────────────
// org_id is fixed backend-side, space_id comes from the org's own Dhiway
// Space ID (set on the Profile page), and schema_id resolves from the
// batch's industry — none of these are supplied by the caller anymore.
export const GenerateSDCModal = ({ batch, onClose, onGenerated, liveStatus, polling, records = [] }) => {
  const [active, setActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [result, setResult] = useState(null); // raw API response, shown for reference after submit
  const [sentPayload, setSentPayload] = useState(null);
  const [certMatches, setCertMatches] = useState([]);
  const [certLoading, setCertLoading] = useState(false);
  const [openingId, setOpeningId] = useState(null);

  // Matches this batch's records against the org's Dhiway record list by
  // email/title (same approach BatchMonitor's refreshSdcCertificates uses) so
  // the success panel can offer a direct "View" link instead of sending the
  // admin elsewhere to find it.
  const matchCertificates = useCallback(async () => {
    if (!records.length) return;
    setCertLoading(true);
    try {
      const allRecords = [];
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        const { data } = await sdcAPI.getRecords({
          active: 1, page, pageSize: 100,
          org_id: batch?.sdcInfo?.org_id || undefined,
          space_id: batch?.sdcInfo?.space_id || batch?.spaceId || undefined,
        });
        const pageRecords = Array.isArray(data?.records) ? data.records : [];
        allRecords.push(...pageRecords);
        const totalPages = Number(data?.totalPages || data?.total_pages || 0);
        hasMore = totalPages > 0 ? page < totalPages : pageRecords.length === 100;
        page += 1;
      }
      const matches = [];
      records.forEach((r) => {
        const email = r?.email?.trim().toLowerCase();
        const title = recordTitle(r)?.trim().toLowerCase();
        const match = allRecords.find((item) => {
          const recipients = (item?.recipients || []).map((v) => v?.trim().toLowerCase()).filter(Boolean);
          const itemTitle = item?.title?.trim().toLowerCase();
          return (email && recipients.includes(email)) || (title && itemTitle === title);
        });
        if (match?.publicId) {
          matches.push({ publicId: match.publicId, title: recordTitle(r) });
        }
      });
      setCertMatches(matches);
    } catch {
      setCertMatches([]);
    } finally {
      setCertLoading(false);
    }
  }, [records, batch?.spaceId, batch?.sdcInfo]);

  useEffect(() => {
    if (result && !(result.issue_pending && !liveStatus)) {
      matchCertificates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, liveStatus]);

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
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { publish: false, active };
      const { data } = await sdcAPI.generateBatchSDC(batch.id, payload);
      if (!data.issue_pending) toast.success('SDC created');
      onGenerated(payload, data);
      setSentPayload(payload);
      setResult(data);
    } catch (err) {
      toast.error(getApiError(err, 'Failed to start SDC generation'));
    } finally {
      setSubmitting(false);
    }
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
            className="flex flex-col items-center justify-center gap-4 py-8 text-center"
          >
            <div className="relative flex items-center justify-center w-16 h-16">
              <AnimatePresence>
                {polling && (
                  <>
                    <motion.span
                      key="ring-1"
                      className="absolute inset-0 rounded-full bg-brand-blue/15"
                      initial={{ scale: 1, opacity: 0.6 }}
                      animate={{ scale: 1.7, opacity: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                    />
                    <motion.span
                      key="ring-2"
                      className="absolute inset-0 rounded-full bg-brand-blue/10"
                      initial={{ scale: 1, opacity: 0.5 }}
                      animate={{ scale: 2, opacity: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut', delay: 0.4 }}
                    />
                  </>
                )}
              </AnimatePresence>
              {polling ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  className="relative w-11 h-11 rounded-full border-[3px] border-brand-blue/15 border-t-brand-blue"
                />
              ) : (
                <div className="relative flex items-center justify-center w-11 h-11 rounded-full bg-brand-blue/10">
                  <Clock size={20} className="text-brand-blue" />
                </div>
              )}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.3 }}
            >
              <p className="text-sm font-semibold text-brand-dark font-inter">
                {polling ? 'Finishing certificate issuance…' : 'Issuance still pending'}
              </p>
              <p className="text-xs text-gray-400 font-inter mt-1">
                {polling
                  ? 'Checking Dhiway automatically — this can take up to a minute.'
                  : 'Click "Issue Certificates Now" to finish.'}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, duration: 0.3 }}
              className="flex gap-3 pt-1"
            >
              {!polling && (
                <Button variant="secondary" loading={retrying} onClick={handleIssueNow}>
                  <Sparkles size={14} /> Issue Certificates Now
                </Button>
              )}
              <Button onClick={onClose}>Done</Button>
            </motion.div>
          </motion.div>
        </Modal>
      );
    }

    // Done — minimal summary + a direct way to actually view the certificate.
    return (
      <Modal isOpen onClose={onClose} title="Certificates Issued" size="md">
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl border bg-green-50 border-green-100">
            <Badge status="success">SDC Created</Badge>
            <span className="text-xs text-green-700 font-inter">
              {liveStatus ? `${liveStatus.ready}/${liveStatus.total} issued` : `${result.issued_count ?? 0}/${result.records_sent ?? '—'} issued`}
            </span>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 font-inter">Certificates</p>
            {certLoading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-400 font-inter">
                <RefreshCw size={14} className="animate-spin" /> Fetching issued certificates…
              </div>
            ) : certMatches.length > 0 ? (
              <div className="space-y-2">
                {certMatches.map((m) => (
                  <div key={m.publicId} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-brand-dark font-inter">{m.title}</span>
                    <Button variant="ghost" size="sm" loading={openingId === m.publicId} onClick={() => handleViewCertificate(m.publicId)}>
                      <Eye size={13} /> View
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 font-inter">
                Not matched yet — Dhiway can take a minute to index new certificates. Reopen "Generate SDC" or use "Refresh Certificates" shortly.
              </p>
            )}
          </div>

          <Button onClick={onClose} className="w-full">Done</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen onClose={onClose} title="Generate SDC Certificates" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-gray-500 font-inter">
          Generates signed digital certificates for every user in <span className="font-semibold text-brand-dark">{batch.name}</span> via
          Dhiway Studio. The Dhiway org is fixed, the space comes from this organization's Dhiway Space ID (set on the
          Profile page), and the schema resolves from this batch's industry — nothing else to fill in.
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
            Generation runs in the background on Dhiway's side (202 Processing). Records may take a moment to appear
            after this completes — use "Refresh Certificates" in the batch view to check.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={submitting}>
            <Sparkles size={14} /> Generate SDCs
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </form>
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
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" size="sm" loading={loading} onClick={() => openCertificate('pdf')}>
              <FileText size={14} /> Download PDF
            </Button>
            <Button variant="outline" size="sm" loading={loading} onClick={() => openCertificate('verify')}>
              <QrCode size={14} /> Verify Certificate
            </Button>
          </div>
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

        <Button variant="primary" className="w-full" loading={downloading} onClick={handleDownload}>
          <FileText size={14} /> Download Certificate
        </Button>

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
  const [sdcRecordsByEmail, setSdcRecordsByEmail] = useState({});
  const [sdcRecordsByName, setSdcRecordsByName] = useState({});
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

  // Dhiway records are matched to batch users "by email or name" per the
  // backend docs — email alone isn't enough (test/dummy records often have
  // empty or non-matching email fields), so also index by title as a fallback.
  const refreshCertificates = useCallback(async (silent = false) => {
    setCertsLoading(true);
    try {
      // org_id/space_id come straight from THIS batch's own recorded
      // verification_progress.sdc — that's exactly what was used to generate
      // its certificates, and is more reliable than the org's *current*
      // profile setting (space_id from fetchOrgSpaceMap is only a fallback
      // for older batches that predate this field being recorded).
      // Paginate through the whole record list — a single page silently hides
      // any certificate that falls outside the first 100 once an org
      // accumulates more than that many issued records.
      const orgId   = batchSummary.sdcInfo?.org_id || undefined;
      const spaceId = batchSummary.sdcInfo?.space_id || batchSummary.spaceId || undefined;
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
      const map = {};
      const byName = {};
      allRecords.forEach((r) => {
        // anchorTime is the source of truth for issued-vs-draft: set = issued,
        // null = still a draft on Dhiway's side (no PDF yet).
        const issued = !!r.anchorTime && !r.revoked;
        const entry = {
          id: r.id, publicId: r.publicId, updatedAt: r.updatedAt, title: r.title,
          anchorTime: r.anchorTime || null, revoked: !!r.revoked, issued,
          active: !!r.active, latest: !!r.latest, edited: !!r.edited,
          createdAt: r.createdAt || null,
          recipients: Array.isArray(r.recipients) ? r.recipients : [],
        };
        (r.recipients || []).forEach((email) => {
          if (email) map[email.toLowerCase()] = entry;
        });
        if (r.title?.trim()) byName[r.title.trim().toLowerCase()] = entry;
      });
      setSdcRecordsByEmail(map);
      setSdcRecordsByName(byName);
      const issuedCount = Object.values(map).filter((m) => m.issued).length;
      if (!silent) {
        toast.success(`Loaded ${allRecords.length} certificate${allRecords.length === 1 ? '' : 's'}`);
      }
      return issuedCount;
    } catch (err) {
      if (!silent) toast.error(getApiError(err, 'Failed to fetch SDC records'));
      return 0;
    } finally {
      setCertsLoading(false);
    }
  }, [batchSummary.id, batchSummary.spaceId, batchSummary.sdcInfo]);

  const matchSdcRecord = useCallback((record) => {
    const byEmail = record?.email ? sdcRecordsByEmail[record.email.toLowerCase()] : null;
    if (byEmail) return byEmail;
    const title = recordTitle(record)?.trim().toLowerCase();
    return title ? sdcRecordsByName[title] || null : null;
  }, [sdcRecordsByEmail, sdcRecordsByName]);

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
      <div className="py-24 text-center text-sm text-gray-400 font-inter">Loading batch...</div>
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
                      {match?.issued ? (
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
                      ) : match ? (
                        <Badge status="pending">Draft</Badge>
                      ) : (
                        <span className="text-xs text-gray-300 font-inter">-</span>
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
      const [{ data: orgList }, spaceMap] = await Promise.all([
        authAPI.getUsersGrouped(),
        fetchOrgSpaceMap().catch(() => ({})),
      ]);
      const rawOrgs = Array.isArray(orgList) ? orgList : [];

      const results = await Promise.all(
        rawOrgs.map(async (org) => {
          const orgId = org.org_id || org.id;
          const orgName = org.organization_name || org.org_name || org.name || 'Organization';
          const spaceId = spaceMap[orgId] || null;
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
            return { orgId, orgName, spaceId, batches: batchDetails.filter(Boolean) };
          } catch {
            return { orgId, orgName, spaceId, batches: [] };
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
    const maxAttempts = 10; // ~80s worst case at 8s intervals
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
        toast.error('Still processing — check the batch again shortly');
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
                      onClick={() => setSelectedBatch({ ...batch, orgName: selectedOrg.orgName, orgId: selectedOrg.orgId, spaceId: selectedOrg.spaceId })}
                      onGenerateClick={() => setGenerateBatch({ ...batch, orgId: selectedOrg.orgId, spaceId: selectedOrg.spaceId })}
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
        <PageHeader title="SDC Verification" subtitle="Generate and track Signed Digital Certificates, organized by organization and batch" />

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Organizations', value: orgs.length, color: 'text-brand-dark', bg: 'bg-gray-50' },
            { label: 'Total Batches', value: totalBatches, color: 'text-brand-blue', bg: 'bg-blue-50' },
            { label: 'Verified Records', value: `${totalVerified}/${totalRecords}`, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'SDC Generated', value: `${totalGenerated}/${totalBatches}`, color: 'text-orange-500', bg: 'bg-orange-50' },
          ].map((s) => (
            <Card key={s.label} className={`p-4 ${s.bg}`}>
              <p className={`text-3xl font-bold font-sora ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 font-inter mt-1">{s.label}</p>
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

        {!loading && filteredOrgs.length === 0 ? (
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
