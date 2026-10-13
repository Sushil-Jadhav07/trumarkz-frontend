// Local file staging may control the UI, but never authorizes an approval.
// Match the row controls: only approved/rejected are final review decisions.
// Upload/workflow statuses are still awaiting the verifier's decision.
export const manualReviewStatus = (user) => {
  const status = String(user?.status || '').trim().toLowerCase();
  return status === 'approved' || status === 'rejected' ? status : 'pending';
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
    manualReviewStatus(user) === 'pending' &&
    (hasTaggedFiles ? user.file_index != null : sharedReportConfirmed)
  ).map((user) => String(user.batch_user_id)));
};

export const filterManualDecisions = (decisions, info, uploadContext) => {
  const eligible = manualApprovalEligibleIds(info, uploadContext);
  return Object.keys(decisions).filter((id) =>
    decisions[id].status !== 'approved' || eligible.has(String(id))
  );
};
