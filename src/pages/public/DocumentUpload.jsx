import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { verificationAPI, getApiError } from '@/services/api';
import { Logo } from '@/components/ui/Logo';
import {
  AlertTriangle, CheckCircle, Clock, Eye, FileText, RefreshCw, Search, ShieldCheck,
  Sparkles, Upload, X, XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

// Same shape, same page, for Human and Product — request-info's users[]
// never says which entity type a row is, so nothing here ever guesses that
// from name formatting. Every row is just an "assigned record".
const formatBytes = (bytes) => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const isInvalidTokenError = (err) => {
  const status = err?.response?.status;
  if (status === 404 || status === 410) return true;
  const msg = (err?.response?.data?.detail || err?.response?.data?.message || err?.message || '').toLowerCase();
  return msg.includes('invalid token') || msg.includes('token not found') || msg.includes('expired');
};

const ROW_STATUS_META = {
  approved: { label: 'Approved', tone: 'text-green-700 bg-green-50 border-green-100', icon: CheckCircle },
  rejected: { label: 'Rejected', tone: 'text-red-700 bg-red-50 border-red-100', icon: XCircle },
  pending:  { label: 'Pending',  tone: 'text-amber-700 bg-amber-50 border-amber-100', icon: Clock },
};

// report_url has no filename field of its own — this is a best-effort label
// derived from the real URL's own last path segment, never a fabricated name.
const reportLabel = (url) => {
  try {
    const last = decodeURIComponent(url.split('/').filter(Boolean).pop() || '');
    return last || 'Report';
  } catch {
    return 'Report';
  }
};

const ROW_GRID = 'grid-cols-[28px_minmax(0,1.3fr)_170px_170px_130px_120px]';

export const DocumentUpload = () => {
  const { token: pathToken } = useParams();
  const [searchParams] = useSearchParams();
  const token = pathToken || searchParams.get('token');

  // null = loading; 'ready' | 'invalid' | 'error' | 'no-token'
  const [pageState, setPageState] = useState(token ? null : 'no-token');
  const [requestInfo, setRequestInfo] = useState(null);
  const [loadError, setLoadError] = useState(null);

  const [search, setSearch] = useState('');
  const [pendingOnly, setPendingOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  // Locally staged (not-yet-uploaded) files, keyed by batch_user_id — lifted
  // up here (rather than kept inside each row) so "Submit Selected Reports"
  // can upload every checked row's staged file in one action.
  const [pendingFiles, setPendingFiles] = useState({});
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  const [decidingId, setDecidingId] = useState(null);
  const [reviewingId, setReviewingId] = useState(null); // row whose inline approve/reject panel is open
  const [rejectingId, setRejectingId] = useState(null); // row whose reject-reason input is open
  const [rejectReason, setRejectReason] = useState('');

  const loadRequestInfo = useCallback(async () => {
    if (!token) return;
    try {
      const { data } = await verificationAPI.getManualVerificationRequestInfo(token);
      setRequestInfo(data);
      setPageState('ready');
    } catch (err) {
      if (isInvalidTokenError(err)) {
        setPageState('invalid');
      } else {
        setLoadError(getApiError(err, 'Failed to load this verification request'));
        setPageState('error');
      }
    }
  }, [token]);

  useEffect(() => { loadRequestInfo(); }, [loadRequestInfo]);

  const users = useMemo(() => (Array.isArray(requestInfo?.users) ? requestInfo.users : []), [requestInfo]);
  const isLegacy = !!requestInfo?.is_legacy_whole_batch;

  const uploadedCount = users.filter((u) => !!u.report_url).length;
  const approvedCount = users.filter((u) => u.status === 'approved').length;
  const rejectedCount = users.filter((u) => u.status === 'rejected').length;
  const pendingCount = users.filter((u) => (u.status || 'pending') === 'pending').length;
  const decidedCount = approvedCount + rejectedCount;
  const allDecided = users.length > 0 && decidedCount === users.length;
  const progressPct = users.length ? Math.round((uploadedCount / users.length) * 100) : 0;

  const filteredUsers = users.filter((u) => {
    if (pendingOnly && (u.status || 'pending') !== 'pending') return false;
    if (search.trim() && !(u.full_name || '').toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });

  const toggleSelected = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Rows with a staged file are the only ones a bulk submit can act on —
  // this is what "select all" toggles and what the submit button gates on.
  const stagedIds = Object.keys(pendingFiles);
  const allStagedSelected = stagedIds.length > 0 && stagedIds.every((id) => selectedIds.has(id));
  const selectedSubmittableCount = stagedIds.filter((id) => selectedIds.has(id)).length;
  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (allStagedSelected) {
        const next = new Set(prev);
        stagedIds.forEach((id) => next.delete(id));
        return next;
      }
      return new Set([...prev, ...stagedIds]);
    });
  };

  // Picking a file for a row is the clear signal the admin wants it
  // submitted, so it auto-checks itself — no separate "now also tick the
  // box" step needed before "Submit Selected Reports" will pick it up.
  const stageFile = (batchUserId, file) => {
    if (!file) return;
    setPendingFiles((prev) => ({ ...prev, [batchUserId]: file }));
    setSelectedIds((prev) => new Set(prev).add(batchUserId));
  };
  const clearStagedFile = (batchUserId) => {
    setPendingFiles((prev) => {
      const next = { ...prev };
      delete next[batchUserId];
      return next;
    });
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(batchUserId);
      return next;
    });
  };

  // The upload link is single-use per token: the backend accepts exactly
  // ONE call to POST /verification/manual/upload/{token} and rejects every
  // call after it with "Link already used", even for a different record.
  // Firing one call per row (or racing several in parallel) let the first
  // one claim the token and broke every other row's upload. So every staged
  // file for every selected record must go up together, in this one call,
  // tagged by the parallel batch_user_ids array — never as separate calls.
  const handleSubmitSelected = async () => {
    const targets = [...selectedIds].filter((id) => pendingFiles[id]);
    if (targets.length === 0) { toast.error('Select at least one record with a report attached'); return; }
    setBulkSubmitting(true);
    try {
      const files = targets.map((id) => pendingFiles[id]);
      await verificationAPI.uploadManualReport(token, files, targets);
      toast.success(`${targets.length} report${targets.length === 1 ? '' : 's'} uploaded`);
      setPendingFiles((prev) => {
        const next = { ...prev };
        targets.forEach((id) => delete next[id]);
        return next;
      });
      setSelectedIds((prev) => {
        const next = new Set(prev);
        targets.forEach((id) => next.delete(id));
        return next;
      });
      await loadRequestInfo();
    } catch (err) {
      toast.error(getApiError(err, 'Upload failed — the link may have already been used. Please contact the admin if this persists.'));
    } finally {
      setBulkSubmitting(false);
    }
  };

  const handleApprove = async (batchUserId, name) => {
    setDecidingId(batchUserId);
    try {
      await verificationAPI.verifyManualVerificationRequest(token, [{ batch_user_id: batchUserId, status: 'approved' }]);
      toast.success(`${name || 'Record'} approved`);
      setReviewingId(null);
      await loadRequestInfo();
    } catch (err) {
      toast.error(getApiError(err, 'Failed to approve'));
    } finally {
      setDecidingId(null);
    }
  };

  const handleReject = async (batchUserId, name) => {
    if (!rejectReason.trim()) { toast.error('A rejection reason is required'); return; }
    setDecidingId(batchUserId);
    try {
      await verificationAPI.verifyManualVerificationRequest(token, [
        { batch_user_id: batchUserId, status: 'rejected', reason: rejectReason.trim() },
      ]);
      toast.success(`${name || 'Record'} rejected`);
      setReviewingId(null);
      setRejectingId(null);
      setRejectReason('');
      await loadRequestInfo();
    } catch (err) {
      toast.error(getApiError(err, 'Failed to reject'));
    } finally {
      setDecidingId(null);
    }
  };

  // ── Loading / error states ──────────────────────────────────────────────
  if (pageState === 'no-token') {
    return (
      <CenteredCard icon={AlertTriangle} tone="orange" title="Missing Verification Link">
        This page needs a valid verification token in the URL. Use the secure link sent to you by TruMarkZ.
      </CenteredCard>
    );
  }
  if (pageState === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="flex items-center gap-2 text-gray-400 font-inter text-sm">
          <RefreshCw size={16} className="animate-spin" /> Loading verification request…
        </div>
      </div>
    );
  }
  if (pageState === 'invalid') {
    return (
      <CenteredCard icon={AlertTriangle} tone="orange" title="Link Invalid or Expired">
        This verification link is no longer valid. Please contact the admin if you need a new one.
      </CenteredCard>
    );
  }
  if (pageState === 'error') {
    return (
      <CenteredCard icon={AlertTriangle} tone="red" title="Something Went Wrong" action={
        <button
          type="button"
          onClick={() => { setPageState(null); loadRequestInfo(); }}
          className="mt-4 rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white font-inter hover:bg-blue-700"
        >
          Try Again
        </button>
      }>
        {loadError}
      </CenteredCard>
    );
  }

  const tokenMasked = token && token.length > 10 ? `${token.slice(0, 6)}…${token.slice(-4)}` : token;

  return (
    <div className="min-h-screen bg-[#f5f6fa]">
      <header className="bg-white border-b border-gray-100 px-6 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 font-inter">
            <ShieldCheck size={13} />
            Secure Upload
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">

          {/* ── Left column ─────────────────────────────────────────────── */}
          <div className="min-w-0 space-y-4">
            {/* Request card */}
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-blue font-inter">TruMarkZ · Batch Verification</p>
                <h1 className="font-sora font-bold text-2xl text-brand-dark mt-1.5">{requestInfo?.verification_type_name || 'Verification Request'}</h1>
                <p className="text-xs text-gray-400 font-inter mt-1">Upload reports and review each assigned record below.</p>
              </div>
              <div className="hidden sm:flex items-center gap-3 shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-blue/10 text-brand-blue">
                  <Sparkles size={22} />
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-brand-dark font-inter">Secure · Verifiable · Trusted</p>
                  <p className="text-[11px] text-gray-400 font-inter">Streamline verification with confidence</p>
                </div>
              </div>
            </div>

            {allDecided && (
              <div className="rounded-2xl border border-green-100 bg-green-50 px-5 py-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <CheckCircle size={20} className="text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-800 font-inter">All assigned records reviewed</p>
                  <p className="text-xs text-green-700 font-inter">Every record on this request has been approved or rejected.</p>
                </div>
              </div>
            )}

            {/* Assigned Records table */}
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
                <p className="text-sm font-semibold text-brand-dark font-inter">Assigned Records ({users.length})</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="flex items-center gap-1.5 text-xs text-gray-500 font-inter cursor-pointer select-none">
                    <input type="checkbox" checked={pendingOnly} onChange={(e) => setPendingOnly(e.target.checked)} className="accent-brand-blue" />
                    Show only pending
                  </label>
                  <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5">
                    <Search size={12} className="text-gray-400" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by name…"
                      className="w-32 text-xs font-inter outline-none placeholder:text-gray-400"
                    />
                  </div>
                </div>
              </div>

              {users.length === 0 ? (
                <div className="py-10 text-center px-6">
                  <p className="text-sm text-gray-400 font-inter">
                    {isLegacy
                      ? 'This is a legacy shared request with no individually assigned records — contact the admin for how to proceed.'
                      : 'No records are assigned to this request.'}
                  </p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400 font-inter">No records match your filters.</p>
              ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-[760px]">
                    <div className={`grid ${ROW_GRID} gap-x-2 bg-gray-50 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400 font-inter border-b border-gray-100`}>
                      <input
                        type="checkbox"
                        checked={allStagedSelected}
                        disabled={stagedIds.length === 0}
                        onChange={toggleSelectAll}
                        title={stagedIds.length === 0 ? 'Attach a report to a record first' : 'Select all records with a report attached'}
                        className="accent-brand-blue disabled:opacity-30"
                      />
                      <span>Name</span>
                      <span>Upload Report</span>
                      <span>Uploaded File</span>
                      <span>Status</span>
                      <span>Action</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {filteredUsers.map((row) => {
                        const id = row.batch_user_id;
                        const status = row.status || 'pending';
                        const meta = ROW_STATUS_META[status] || ROW_STATUS_META.pending;
                        const StatusIcon = meta.icon;
                        const reportUrl = row.report_url;
                        // Automatic checks can carry a raw gs:// path — never
                        // openable directly; only ever show an http(s) proxy URL.
                        const canView = typeof reportUrl === 'string' && /^https?:\/\//i.test(reportUrl);
                        const staged = pendingFiles[id];
                        const isDeciding = decidingId === id;
                        const decided = status === 'approved' || status === 'rejected';

                        return (
                          <div key={id}>
                            <div className={`grid ${ROW_GRID} items-center gap-x-2 px-4 py-3`}>
                              <input
                                type="checkbox"
                                checked={selectedIds.has(id)}
                                onChange={() => toggleSelected(id)}
                                className="accent-brand-blue"
                              />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-brand-dark font-inter">{row.full_name || 'Assigned record'}</p>
                              </div>

                              {/* Upload Report — local staged file, pre-submit */}
                              <div className="min-w-0">
                                {staged ? (
                                  <div className="flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50/60 px-2 py-1.5">
                                    <FileText size={12} className="shrink-0 text-brand-blue" />
                                    <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-brand-dark font-inter">{staged.name}</span>
                                    <button type="button" onClick={() => clearStagedFile(id)} className="shrink-0 text-gray-400 hover:text-red-500">
                                      <X size={12} />
                                    </button>
                                  </div>
                                ) : (
                                  <FilePickerButton onPick={(file) => stageFile(id, file)} />
                                )}
                              </div>

                              {/* Uploaded File — already on the backend */}
                              <div className="min-w-0">
                                {canView ? (
                                  <button
                                    type="button"
                                    onClick={() => window.open(reportUrl, '_blank', 'noopener,noreferrer')}
                                    className="flex items-center gap-1 truncate text-[11px] font-semibold text-brand-blue font-inter hover:underline"
                                  >
                                    <Eye size={11} className="shrink-0" /> <span className="truncate">{reportLabel(reportUrl)}</span>
                                  </button>
                                ) : (
                                  <span className="text-xs text-gray-300 font-inter">—</span>
                                )}
                              </div>

                              <div>
                                <span className={`flex w-fit items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold font-inter ${meta.tone}`}>
                                  <StatusIcon size={11} /> {meta.label}
                                </span>
                              </div>

                              <div>
                                {staged ? (
                                  // Submission only ever happens through the one
                                  // "Submit Selected Reports" action (the upload
                                  // link is single-use) — this is a status
                                  // indicator, not a separate submit trigger.
                                  <span className="flex items-center gap-1 text-[11px] font-semibold text-brand-blue font-inter">
                                    <Upload size={11} /> Ready to submit
                                  </span>
                                ) : decided ? (
                                  canView ? (
                                    <button
                                      type="button"
                                      onClick={() => window.open(reportUrl, '_blank', 'noopener,noreferrer')}
                                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 font-inter hover:bg-gray-50"
                                    >
                                      View
                                    </button>
                                  ) : (
                                    <span className="text-xs text-gray-300 font-inter">—</span>
                                  )
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setReviewingId(reviewingId === id ? null : id)}
                                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold font-inter transition-colors ${
                                      reviewingId === id ? 'border-brand-blue bg-brand-blue/5 text-brand-blue' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                    }`}
                                  >
                                    Review
                                  </button>
                                )}
                              </div>
                            </div>

                            {status === 'rejected' && (row.rejection_reason || row.reason) && (
                              <div className="px-4 pb-2 -mt-1">
                                <p className="rounded-lg bg-red-50 px-3 py-1.5 text-[11px] text-red-600 font-inter">
                                  <span className="font-semibold">Reason: </span>{row.rejection_reason || row.reason}
                                </p>
                              </div>
                            )}

                            {/* Inline review panel — approve/reject this one
                                record, independent of every sibling row. */}
                            {reviewingId === id && !decided && (
                              <div className="px-4 pb-3">
                                {rejectingId === id ? (
                                  <div className="space-y-2 rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                                    <input
                                      value={rejectReason}
                                      onChange={(e) => setRejectReason(e.target.value)}
                                      placeholder="Reason for rejection (required)"
                                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-inter focus:outline-none focus:ring-2 focus:ring-red-200"
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        disabled={isDeciding || !rejectReason.trim()}
                                        onClick={() => handleReject(id, row.full_name)}
                                        className="flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white font-inter hover:bg-red-600 disabled:opacity-50"
                                      >
                                        {isDeciding ? <RefreshCw size={12} className="animate-spin" /> : <XCircle size={12} />}
                                        Confirm Reject
                                      </button>
                                      <button
                                        type="button"
                                        disabled={isDeciding}
                                        onClick={() => { setRejectingId(null); setRejectReason(''); }}
                                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 font-inter hover:bg-gray-50 disabled:opacity-50"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex gap-2 rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                                    <button
                                      type="button"
                                      disabled={isDeciding}
                                      onClick={() => handleApprove(id, row.full_name)}
                                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-500 px-3 py-2 text-xs font-semibold text-white font-inter hover:bg-green-600 disabled:opacity-50"
                                    >
                                      {isDeciding ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                                      Approve
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isDeciding}
                                      onClick={() => setRejectingId(id)}
                                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-500 font-inter hover:bg-red-50 disabled:opacity-50"
                                    >
                                      <XCircle size={12} /> Reject
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Right column: Upload Summary ────────────────────────────── */}
          <div className="space-y-4 xl:sticky xl:top-6">
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
              <p className="text-sm font-semibold text-brand-dark font-inter mb-1">Upload Summary</p>
              <p className="text-xs text-gray-400 font-inter mb-4">Track your progress and submit when ready.</p>

              <div className="flex items-center gap-4">
                <div
                  className="relative h-24 w-24 shrink-0 rounded-full"
                  style={{ background: `conic-gradient(#2563eb ${progressPct}%, #e5e7eb ${progressPct}% 100%)` }}
                >
                  <div className="absolute inset-2 rounded-full bg-white flex items-center justify-center">
                    <span className="font-sora text-lg font-bold text-brand-dark">{progressPct}%</span>
                  </div>
                </div>
                <div className="flex-1 space-y-1.5 text-xs font-inter">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-gray-500"><span className="h-2 w-2 rounded-full bg-brand-blue" /> Files Uploaded</span>
                    <span className="font-semibold text-brand-dark">{uploadedCount}/{users.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-gray-500"><span className="h-2 w-2 rounded-full bg-green-500" /> Approved</span>
                    <span className="font-semibold text-brand-dark">{approvedCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-gray-500"><span className="h-2 w-2 rounded-full bg-amber-400" /> Pending Review</span>
                    <span className="font-semibold text-brand-dark">{pendingCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-gray-500"><span className="h-2 w-2 rounded-full bg-red-500" /> Rejected</span>
                    <span className="font-semibold text-brand-dark">{rejectedCount}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-brand-dark font-inter">Token Status</p>
                <span className="flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-700 font-inter">
                  <CheckCircle size={11} /> Valid
                </span>
              </div>
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2.5 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-inter">
                  <span className="text-gray-400">Token</span>
                  <span className="font-mono font-semibold text-brand-dark">{tokenMasked}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSubmitSelected}
              disabled={bulkSubmitting || selectedSubmittableCount === 0}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-blue py-3 text-sm font-semibold text-white font-inter hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {bulkSubmitting ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
              {bulkSubmitting ? 'Submitting…' : selectedSubmittableCount > 0 ? `Submit Selected Reports (${selectedSubmittableCount})` : 'Submit Selected Reports'}
            </button>
            <p className="text-[11px] text-gray-400 font-inter text-center -mt-2">
              Attach a report with "Upload File" — it's auto-selected and ready to submit.
            </p>

            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5 flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
                <ShieldCheck size={16} />
              </div>
              <div>
                <p className="text-xs font-semibold text-brand-dark font-inter">Your data is secure</p>
                <p className="text-[11px] text-gray-400 font-inter mt-0.5 leading-relaxed">
                  Files are encrypted and stored securely on TruMarkZ Cloud using a one-time tokenized link.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const CenteredCard = ({ icon: Icon, tone, title, children, action }) => {
  const tones = {
    orange: { bg: 'bg-orange-100', text: 'text-orange-500' },
    red: { bg: 'bg-red-100', text: 'text-red-500' },
  };
  const t = tones[tone] || tones.orange;
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-sm rounded-2xl bg-white p-10 shadow-sm border border-gray-100"
      >
        <div className={`w-16 h-16 rounded-full ${t.bg} flex items-center justify-center mx-auto mb-4`}>
          <Icon size={32} className={t.text} />
        </div>
        <h2 className="font-sora font-bold text-xl text-brand-dark mb-2">{title}</h2>
        <p className="text-sm text-gray-500 font-inter leading-relaxed">{children}</p>
        {action}
      </motion.div>
    </div>
  );
};

const FilePickerButton = ({ onPick }) => {
  const inputRef = useRef(null);
  return (
    <>
      <input ref={inputRef} type="file" className="hidden" onChange={(e) => onPick(e.target.files?.[0])} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-2.5 py-1.5 text-[11px] font-semibold text-gray-500 font-inter hover:border-brand-blue/50 hover:text-brand-blue transition-colors"
      >
        <Upload size={12} /> Upload File
      </button>
    </>
  );
};

export default DocumentUpload;
