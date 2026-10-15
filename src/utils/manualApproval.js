// Whether THIS specific request can still accept an upload — the backend's
// authoritative, request-level signal (GET /manual/request-info's
// can_submit_evidence). Falls back to `not used` for older/mock responses
// that don't carry the field yet, exactly as documented — never falls back
// to reading any user's own status.
export const canSubmitEvidenceFor = (info) =>
  typeof info?.can_submit_evidence === 'boolean' ? info.can_submit_evidence : info?.used !== true;

// Local file staging may control the UI, but never authorizes an approval.
// Match the row controls: only approved/rejected are final review decisions.
// Upload/workflow statuses are still awaiting the verifier's decision.
//
// `info` (optional) is this call's own request-info response. Omitted, this
// reads purely the user's own historical decision — every internal caller
// in this file keeps doing exactly that, unchanged. A caller that passes
// `info` additionally reinterprets a historical 'rejected' as still
// 'pending' when `info.allow_reverification` is true — a resend-rejected /
// reverification request — so the user's rejection on an earlier, different
// request must not read as this request's own dead end.
//
// This deliberately keys off `allow_reverification`, NOT `canSubmitEvidenceFor`
// — the two cover different lifecycle moments. `can_submit_evidence` turns
// false the instant evidence is uploaded (it's purely an upload-eligibility
// flag), well before the verifier has had any chance to actually decide —
// gating the DECISION buttons on it too would lock Approve/Reject shut right
// after the one upload the whole reverification flow exists to collect,
// before a decision was ever made (confirmed live: a real reverification
// request came back `used: true, can_submit_evidence: false,
// allow_reverification: true` immediately post-upload, with the historical
// `status: "rejected"` still sitting there and no decision yet). Only an
// `approved` status is ever treated as unconditionally final here — once a
// verifier submits a genuine new decision through this exact token, that
// freshly-written status takes over on the next refresh regardless.
//
// Known tradeoff: because nothing in this response distinguishes "rejected,
// carried over, not yet re-decided" from "rejected again, through THIS
// token, genuinely final," a re-rejection on a reverification request will
// keep displaying as reopened/pending rather than a locked final state.
// The backend remains the real enforcement boundary either way.
export const manualReviewStatus = (user, info) => {
  const status = String(user?.status || '').trim().toLowerCase();
  if (status === 'approved') return 'approved';
  if (status === 'rejected') {
    if (info?.allow_reverification) return 'pending';
    return 'rejected';
  }
  return 'pending';
};

export const stagedManualApprovalUsers = (info, pendingFiles = {}) => {
  const users = Array.isArray(info?.users) ? info.users : [];
  if (info?.used !== true && Object.keys(pendingFiles).length === 0) return [];
  const hasOwnReport = (user) => user.file_index != null || !!pendingFiles[user.batch_user_id];
  const hasTaggedFiles = users.some(hasOwnReport);
  return users.filter((user) => manualReviewStatus(user) === 'pending' &&
    (!hasTaggedFiles || hasOwnReport(user)));
};

export const successfulManualUploadCount = (upload) => {
  if (!upload || upload.used === false) return 0;
  const results = Array.isArray(upload.file_results) ? upload.file_results : [];
  const succeeded = results.filter((result) =>
    result.success === true || ['uploaded', 'success', 'matched'].includes(result.status)
  ).length;
  // An explicit zero takes precedence over any other response fields.
  if (upload.files_uploaded != null) {
    const count = Number(upload.files_uploaded);
    if (!Number.isFinite(count) || count <= 0) return 0;
    // Do not accept a response whose individual results all report failure.
    if (results.length && results.every((result) =>
      result.success === false || ['failed', 'error', 'unmatched', 'duplicate', 'skipped'].includes(result.status)
    )) return 0;
    return count;
  }
  return succeeded;
};

// This is the SUBMIT-TIME safety gate `handleSubmitReports` runs every
// staged decision through — including a decision the verifier clicked
// individually, not just a bulk "Approve All" sweep. It MUST pass `info`
// into manualReviewStatus (not call it bare) so a reverification request's
// carried-over 'rejected' status is recognized as still-open here too —
// omitting it silently drops every fresh reverification approval before it
// ever reaches POST /manual/verify/{token}: confirmed live, a verifier
// clicking Approve then Submit Reports on a resend-rejected request never
// actually called the decide endpoint at all, because this function alone
// decided the user wasn't "eligible" and filterManualDecisions below
// filtered their approval out before the network call was even built.
// (stagedManualApprovalUsers above intentionally keeps calling
// manualReviewStatus WITHOUT `info` — that one drives the bulk "Approve
// All" button, which should still require the verifier's own individual
// click for a reopened row. This function is the opposite case: it must
// let an individual click through, never silently veto it.)
export const manualApprovalEligibleIds = (info, { uploadAttempted = false, upload = null } = {}) => {
  if (info?.used !== true) return new Set();
  const users = Array.isArray(info.users) ? info.users : [];
  const successfulUpload = successfulManualUploadCount(upload) > 0;
  if (uploadAttempted && !successfulUpload) return new Set();
  const hasTaggedFiles = users.some((user) => user.file_index != null);
  // For an earlier shared upload, the fresh server report URL confirms that
  // a report exists. A consumed token alone does not establish eligibility.
  const sharedReportConfirmed = successfulUpload || users.some((user) => !!user.report_url);
  return new Set(users.filter((user) =>
    manualReviewStatus(user, info) === 'pending' &&
    (hasTaggedFiles ? user.file_index != null : sharedReportConfirmed)
  ).map((user) => String(user.batch_user_id)));
};

export const filterManualDecisions = (decisions, info, uploadContext) => {
  const eligible = manualApprovalEligibleIds(info, uploadContext);
  return Object.keys(decisions).filter((id) =>
    decisions[id].status !== 'approved' || eligible.has(String(id))
  );
};
