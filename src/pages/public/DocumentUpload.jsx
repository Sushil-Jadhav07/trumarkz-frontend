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

// The upload endpoint's link is single-use per token, for the whole
// request — once any upload call against it has succeeded, every later
// call fails this way, even for a different record. Once we see it, there
// is no point offering "Upload File" anywhere on the page any more.
const isLinkAlreadyUsedError = (err) => {
  const msg = (err?.response?.data?.detail || err?.response?.data?.message || err?.message || '').toLowerCase();
  return msg.includes('already used') || msg.includes('already uploaded');
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

const ROW_GRID = 'grid-cols-[minmax(0,1.3fr)_170px_170px_120px_190px]';

export const DocumentUpload = () => {
  const { token: pathToken } = useParams();
  const [searchParams] = useSearchParams();
  const token = pathToken || searchParams.get('token');

  // null = loading; 'ready' | 'invalid' | 'error' | 'no-token'
  const [pageState, setPageState] = useState(token ? null : 'no-token');
  const [requestInfo, setRequestInfo] = useState(null);
  const [loadError, setLoadError] = useState(null);

  const [search, setSearch] = useState('');
  // Locally staged (not-yet-uploaded) files, keyed by batch_user_id — lifted
  // up here (rather than kept inside each row) so one combined submit can
  // upload every staged row's file in one action.
  const [pendingFiles, setPendingFiles] = useState({});
  // Locally staged (not-yet-submitted) approve/reject decisions, keyed by
  // batch_user_id: { status: 'approved'|'rejected', reason? }. Clicking
  // Approve/Reject only stages the decision here — nothing is sent to the
  // backend until "Submit Reports" is clicked, same as an attached file.
  // That way upload + review always land together in one submit, matching
  // what a verifier actually expects: attach it, decide on it, submit it.
  const [pendingDecisions, setPendingDecisions] = useState({});
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  // Once an upload attempt comes back "already used", the token's one
  // upload call is spent for good — stop offering "Upload File" anywhere.
  const [uploadLinkUsed, setUploadLinkUsed] = useState(false);

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
    if (search.trim() && !(u.full_name || '').toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });

  const stagedIds = Object.keys(pendingFiles);

  const stageFile = (batchUserId, file) => {
    if (!file) return;
    setPendingFiles((prev) => ({ ...prev, [batchUserId]: file }));
  };
  const clearStagedFile = (batchUserId) => {
    setPendingFiles((prev) => {
      const next = { ...prev };
      delete next[batchUserId];
      return next;
    });
  };

  const decisionIds = Object.keys(pendingDecisions);

  // Approve/Reject only stage the decision locally — nothing is sent until
  // Submit Reports fires. Matches the flow the verifier actually follows:
  // attach the file, decide on it, then submit both together.
  const stageApprove = (batchUserId) => {
    setPendingDecisions((prev) => ({ ...prev, [batchUserId]: { status: 'approved' } }));
  };
  const stageReject = (batchUserId, reason) => {
    setPendingDecisions((prev) => ({ ...prev, [batchUserId]: { status: 'rejected', reason } }));
  };
  const clearStagedDecision = (batchUserId) => {
    setPendingDecisions((prev) => {
      const next = { ...prev };
      delete next[batchUserId];
      return next;
    });
  };

  // The upload link is single-use per token: the backend accepts exactly
  // ONE call to POST /verification/manual/upload/{token} and rejects every
  // call after it with "Link already used", even for a different record.
  // Firing one call per row (or racing several in parallel) let the first
  // one claim the token and broke every other row's upload. So every staged
  // file goes up together, in this one call, tagged by the parallel
  // batch_user_ids array — never as separate calls. Decisions submit as
  // their own combined call, sequenced after the upload rather than in
  // parallel: if the upload succeeds its staged files are cleared right
  // away (the link is consumed either way), independently of whether the
  // decisions call that follows succeeds — so a decisions failure never
  // leaves a record trying to re-upload against an already-used link.
  const handleSubmitReports = async () => {
    const fileTargets = stagedIds;
    const decisionTargets = decisionIds;
    if (fileTargets.length === 0 && decisionTargets.length === 0) {
      toast.error('Attach a report or make a decision first');
      return;
    }
    setBulkSubmitting(true);
    let uploadFailed = false;
    let decisionsFailed = false;

    if (fileTargets.length > 0) {
      try {
        const files = fileTargets.map((id) => pendingFiles[id]);
        await verificationAPI.uploadManualReport(token, files, fileTargets);
        setPendingFiles({});
      } catch (err) {
        uploadFailed = true;
        if (isLinkAlreadyUsedError(err)) {
          // The link is spent for good — stop holding files nobody can
          // ever attach now, and stop offering the option on any row.
          setUploadLinkUsed(true);
          setPendingFiles({});
        }
        toast.error(getApiError(err, 'Upload failed — the link may have already been used. Please contact the admin if this persists.'));
      }
    }

    if (decisionTargets.length > 0) {
      try {
        const decisions = decisionTargets.map((id) => ({
          batch_user_id: id,
          status: pendingDecisions[id].status,
          ...(pendingDecisions[id].status === 'rejected' ? { reason: pendingDecisions[id].reason } : {}),
        }));
        await verificationAPI.verifyManualVerificationRequest(token, decisions);
        setPendingDecisions({});
      } catch (err) {
        decisionsFailed = true;
        toast.error(getApiError(err, 'Failed to submit decisions'));
      }
    }

    if (!uploadFailed && !decisionsFailed) {
      const parts = [];
      if (fileTargets.length) parts.push(`${fileTargets.length} report${fileTargets.length === 1 ? '' : 's'} uploaded`);
      if (decisionTargets.length) parts.push(`${decisionTargets.length} decision${decisionTargets.length === 1 ? '' : 's'} submitted`);
      toast.success(parts.join(' · '));
    }
    await loadRequestInfo();
    setBulkSubmitting(false);
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

            {uploadLinkUsed && (
              <div className="rounded-2xl border border-orange-100 bg-orange-50 px-5 py-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                  <AlertTriangle size={18} className="text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-orange-800 font-inter">Upload link already used</p>
                  <p className="text-xs text-orange-700 font-inter">Reports can no longer be attached on this link. You can still approve or reject records below — contact the admin if you need to upload another file.</p>
                </div>
              </div>
            )}

            {/* Assigned Records table */}
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
                <p className="text-sm font-semibold text-brand-dark font-inter">Assigned Records ({users.length})</p>
                <div className="flex items-center gap-3 flex-wrap">
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
                        const stagedDecision = pendingDecisions[id];
                        const decided = status === 'approved' || status === 'rejected';

                        return (
                          <div key={id}>
                            <div className={`grid ${ROW_GRID} items-center gap-x-2 px-4 py-3`}>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-brand-dark font-inter">{row.full_name || 'Assigned record'}</p>
                              </div>

                              {/* Upload Report — local staged file, pre-submit.
                                  Once a record is decided, or the upload
                                  link itself has already been used, there is
                                  no upload option left to offer here. */}
                              <div className="min-w-0">
                                {decided || uploadLinkUsed ? (
                                  <span className="text-xs text-gray-300 font-inter">—</span>
                                ) : staged ? (
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
                                {decided ? (
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
                                ) : stagedDecision ? (
                                  // Staged locally, not yet sent — same
                                  // "ready to submit" idea as a staged file,
                                  // with an undo before it goes out for real.
                                  <div className="flex items-center gap-1.5">
                                    <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold font-inter ${stagedDecision.status === 'approved' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                                      {stagedDecision.status === 'approved' ? <CheckCircle size={11} /> : <XCircle size={11} />}
                                      {stagedDecision.status === 'approved' ? 'Approved' : 'Rejected'} (pending)
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => clearStagedDecision(id)}
                                      className="shrink-0 text-gray-400 hover:text-red-500"
                                      title="Undo"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => stageApprove(id)}
                                      className="flex items-center gap-1 rounded-lg bg-green-500 px-2.5 py-1.5 text-[11px] font-semibold text-white font-inter hover:bg-green-600"
                                    >
                                      <CheckCircle size={11} />
                                      Approve
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => { setRejectingId(id); setRejectReason(''); }}
                                      className="flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-[11px] font-semibold text-red-500 font-inter hover:bg-red-50"
                                    >
                                      <XCircle size={11} /> Reject
                                    </button>
                                  </div>
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

                            {/* Inline reject-reason panel — only this one
                                record, independent of every sibling row.
                                Confirm stages the decision locally; nothing
                                is sent until Submit Reports fires. */}
                            {rejectingId === id && !decided && (
                              <div className="px-4 pb-3">
                                <div className="space-y-2 rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                                  <input
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="Reason for rejection (required)"
                                    autoFocus
                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-inter focus:outline-none focus:ring-2 focus:ring-red-200"
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      disabled={!rejectReason.trim()}
                                      onClick={() => {
                                        stageReject(id, rejectReason.trim());
                                        setRejectingId(null);
                                        setRejectReason('');
                                      }}
                                      className="flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white font-inter hover:bg-red-600 disabled:opacity-50"
                                    >
                                      <XCircle size={12} />
                                      Confirm Reject
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => { setRejectingId(null); setRejectReason(''); }}
                                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 font-inter hover:bg-gray-50"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
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

            <button
              type="button"
              onClick={handleSubmitReports}
              disabled={bulkSubmitting || (stagedIds.length === 0 && decisionIds.length === 0)}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-blue py-3 text-sm font-semibold text-white font-inter hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {bulkSubmitting ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
              {bulkSubmitting
                ? 'Submitting…'
                : stagedIds.length > 0 || decisionIds.length > 0
                  ? `Submit Reports (${stagedIds.length + decisionIds.length})`
                  : 'Submit Reports'}
            </button>
            <p className="text-[11px] text-gray-400 font-inter text-center -mt-2">
              Upload a file and/or approve or reject each record — nothing is sent until you submit.
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
