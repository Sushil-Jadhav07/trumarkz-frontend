// Share SDC via Email (human sdc email sharing web changes): already-generated Human SDC PDFs are emailed to any
// address the user types. Nothing here generates or changes an SDC. "Accepted" means our mail server accepted the
// email, never that it reached the inbox.

export const SDC_EMAIL_DEFAULT_LIMITS = {
  max_sdcs_per_request: 50,
  max_recipients_per_request: 100,
  max_emails_per_request: 200,
  max_attachments_per_email: 10,
  daily_email_limit: 1000,
};

export const normalizeLimits = (limits) => {
  const out = { ...SDC_EMAIL_DEFAULT_LIMITS };
  Object.keys(out).forEach((key) => {
    const value = Number(limits?.[key]);
    if (Number.isFinite(value) && value > 0) out[key] = value;
  });
  return out;
};

// ── Holders ───────────────────────────────────────────────────────────────────────────────────────

// GET …/sdc-email-shares → [{ id, name, sdcStatus, certificateId, canShare, reason }]
export const normalizeShareHolders = (data) =>
  (Array.isArray(data?.holders) ? data.holders : [])
    .filter((h) => h && h.user_id)
    .map((h) => ({
      id: String(h.user_id),
      name: h.full_name || 'Holder',
      sdcStatus: h.sdc_status || 'not_generated',
      certificateId: h.certificate_id || null,
      canShare: h.can_share === true,
      reason: h.reason || '',
    }));

export const shareableHolders = (holders) => holders.filter((h) => h.canShare);

// ── Email addresses ───────────────────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@,;<>"']+@[^\s@,;<>"']+\.[^\s@,;<>"']+$/;
export const EMAIL_MAX_LENGTH = 254;
export const isEmailLike = (value) => typeof value === 'string' && value.length <= EMAIL_MAX_LENGTH && EMAIL_RE.test(value);

// Pasted text may hold several addresses separated by commas, semicolons, spaces or new lines.
export const splitEmailText = (text) =>
  String(text ?? '')
    .split(/[\s,;]+/)
    .map((token) => token.replace(/^[<"'(]+|[>"'),.]+$/g, '').trim().toLowerCase())
    .filter(Boolean);

// Adds the addresses in `text` to the list. Addresses are lower-cased; one already in the list is not added twice.
// Invalid ones are kept (highlighted in the UI) so the user can fix them.
export const addEmails = (list, text) => {
  const next = [...list];
  let duplicates = 0;
  splitEmailText(text).forEach((email) => {
    if (next.includes(email)) duplicates += 1;
    else next.push(email);
  });
  return { list: next, duplicates };
};

export const validEmails = (list) => list.filter(isEmailLike);
export const invalidEmails = (list) => list.filter((e) => !isEmailLike(e));

// ── Limits and payloads ───────────────────────────────────────────────────────────────────────────

// The server counts the real emails after checking the PDFs (a split email carries at most 10 PDFs and 15 MB). This is a
// floor used only to warn before sending.
export const estimateEmails = (sdcCount, recipientCount, perEmail = 10) =>
  recipientCount * Math.max(1, Math.ceil(sdcCount / Math.max(1, perEmail)));

export const validateBulk = ({ selectedCount, emails, limits }) => {
  const valid = validEmails(emails);
  if (selectedCount === 0) return 'Select at least one holder.';
  if (valid.length === 0) return 'Add at least one valid email address.';
  if (selectedCount > limits.max_sdcs_per_request) return `Select up to ${limits.max_sdcs_per_request} SDCs per send (you selected ${selectedCount}).`;
  if (valid.length > limits.max_recipients_per_request) return `Add up to ${limits.max_recipients_per_request} recipients per send (you added ${valid.length}).`;
  const emailsNeeded = estimateEmails(selectedCount, valid.length, limits.max_attachments_per_email);
  if (emailsNeeded > limits.max_emails_per_request) {
    return `This would need about ${emailsNeeded} emails; the limit is ${limits.max_emails_per_request} per send. Split it into smaller sends.`;
  }
  return '';
};

// select_all when every shareable holder is selected, else the chosen user_ids. Never both.
export const buildBulkPayload = ({ selectedIds, shareableIds, emails }) => {
  const ids = [...selectedIds];
  const all = ids.length > 0 && ids.length === shareableIds.length && shareableIds.every((id) => selectedIds.has(id));
  return all ? { select_all: true, emails: [...emails] } : { user_ids: ids, emails: [...emails] };
};

// rowsById: { user_id: [emails…] }. Rows with no address are left out.
export const buildHolderWisePayload = (rowsById) => ({
  rows: Object.entries(rowsById || {})
    .filter(([, emails]) => Array.isArray(emails) && emails.length > 0)
    .map(([user_id, emails]) => ({ user_id, emails: [...emails] })),
});

export const validateHolderWise = ({ rowsById, limits }) => {
  const rows = Object.entries(rowsById || {}).filter(([, emails]) => Array.isArray(emails) && emails.length > 0);
  const valid = rows.reduce((n, [, emails]) => n + validEmails(emails).length, 0);
  if (valid === 0) return 'Enter at least one valid email address for a holder.';
  if (rows.length > limits.max_sdcs_per_request) return `Fill in up to ${limits.max_sdcs_per_request} holders per send (you filled ${rows.length}).`;
  const unique = new Set(rows.flatMap(([, emails]) => validEmails(emails))).size;
  if (unique > limits.max_recipients_per_request) return `Use up to ${limits.max_recipients_per_request} different recipients per send (you used ${unique}).`;
  if (valid > limits.max_emails_per_request) return `This would send ${valid} emails; the limit is ${limits.max_emails_per_request} per send. Split it into smaller sends.`;
  return '';
};

// ── Results ───────────────────────────────────────────────────────────────────────────────────────

export const RECIPIENT_STATUS_META = {
  email_accepted: { label: 'Accepted by mail server', tone: 'bg-green-50 text-green-700', ok: true },
  partially_accepted: { label: 'Partly accepted', tone: 'bg-amber-50 text-amber-800' },
  failed: { label: 'Failed', tone: 'bg-red-50 text-red-700' },
  not_sent: { label: 'Not sent', tone: 'bg-gray-100 text-gray-700' },
  sending: { label: 'Sending…', tone: 'bg-blue-50 text-brand-blue' },
};

export const HOLDER_STATUS_META = {
  ...RECIPIENT_STATUS_META,
  skipped: { label: 'Skipped', tone: 'bg-gray-100 text-gray-600' },
  unavailable: { label: 'SDC unavailable', tone: 'bg-amber-50 text-amber-800' },
};

const fallbackMeta = (value) => ({ label: String(value || 'Unknown').replace(/_/g, ' '), tone: 'bg-gray-100 text-gray-600' });
export const recipientStatusMeta = (status) => RECIPIENT_STATUS_META[status] || fallbackMeta(status);
export const holderStatusMeta = (status) => HOLDER_STATUS_META[status] || fallbackMeta(status);

// Why a holder's SDC could not be attached (holders[].error_code when "unavailable"). The server's own `error` text wins.
export const UNAVAILABLE_TEXT = {
  not_generated: 'No SDC has been generated for this holder.',
  mapping_unavailable: 'No exact per-holder certificate record exists (older batch).',
  mapping_ambiguous: 'The certificate record is ambiguous.',
  sdc_unavailable: 'The registry could not return the SDC.',
  sdc_not_issued: 'The SDC is not issued yet.',
  mapping_mismatch: 'The certificate does not match this holder.',
  pdf_unavailable: 'The PDF could not be retrieved.',
  pdf_too_large: 'The PDF is too large to email.',
  sdc_revoked: 'Dhiway lists this credential as revoked.',
  pdf_changed: 'The PDF changed while sending, so it was not sent.',
  no_available_sdc: 'None of the selected SDCs could be attached.',
  no_recipients: 'No recipient email address was entered for this holder.',
};

export const errorText = (item) => item?.error || UNAVAILABLE_TEXT[item?.error_code] || (item?.error_code ? String(item.error_code).replace(/_/g, ' ') : '');

export const summaryParts = (summary = {}) => {
  const parts = [];
  if (summary.emails_accepted) parts.push(`${summary.emails_accepted} email${summary.emails_accepted === 1 ? '' : 's'} accepted`);
  if (summary.emails_failed) parts.push(`${summary.emails_failed} failed`);
  if (summary.holders_unavailable) parts.push(`${summary.holders_unavailable} SDC${summary.holders_unavailable === 1 ? '' : 's'} unavailable`);
  if (summary.holders_skipped) parts.push(`${summary.holders_skipped} skipped`);
  if (summary.invalid_emails) parts.push(`${summary.invalid_emails} invalid address${summary.invalid_emails === 1 ? '' : 'es'}`);
  if (summary.duplicate_emails_removed) parts.push(`${summary.duplicate_emails_removed} duplicate${summary.duplicate_emails_removed === 1 ? '' : 's'} removed`);
  return parts;
};

export const resultTone = (response) => {
  const s = response?.summary || {};
  if (s.emails_accepted && !s.emails_failed && !s.recipients_not_sent && !s.recipients_partially_accepted && !s.holders_unavailable && !s.invalid_emails) return 'success';
  if (s.emails_accepted) return 'partial';
  return 'none';
};

// Which addresses stay in the form after a send: the accepted ones are cleared; failed, partly accepted, not sent and
// invalid ones stay so they can be corrected and sent again. An address the server never mentioned stays (safe side).
const stateOf = (email, recipients, invalid) => {
  if (invalid.has(email)) return 'keep';
  const hit = (recipients || []).find((r) => String(r.email || '').toLowerCase() === email);
  if (!hit) return 'keep';
  return hit.status === 'email_accepted' ? 'clear' : 'keep';
};

export const remainingAfterBulk = (sent, response) => {
  const invalid = new Set((response?.invalid_emails || []).map((i) => String(i.value || '').toLowerCase()));
  return sent.filter((email) => stateOf(email, response?.recipients, invalid) === 'keep');
};

// rowsById: { user_id: [emails…] } → what stays per holder.
export const remainingAfterHolderWise = (rowsById, response) => {
  const byHolder = Object.fromEntries((response?.holders || []).map((h) => [String(h.user_id), h]));
  const next = {};
  Object.entries(rowsById || {}).forEach(([userId, emails]) => {
    const holder = byHolder[userId];
    if (!holder) { next[userId] = [...emails]; return; }
    const invalid = new Set((holder.invalid_emails || []).map((i) => String(i.value || '').toLowerCase()));
    next[userId] = emails.filter((email) => stateOf(email, holder.recipients, invalid) === 'keep');
  });
  return next;
};

export const sendErrorMessage = (status, detail, retryAfter) => {
  const text = typeof detail === 'string' ? detail : detail?.message || '';
  if (status === 400) return text || 'This request can’t be sent. Check the selection and the limits.';
  if (status === 403) return 'Sharing by email isn’t available for this batch yet. For an organization, the SuperAdmin must send the batch to the organization first.';
  if (status === 404) return 'This batch could not be found.';
  if (status === 422) return 'The request was not valid. Reload the page and try again.';
  if (status === 429) return `${text || 'Too many sends from this account.'}${retryAfter ? ` Try again in about ${retryAfter} seconds.` : ''} Nothing was sent.`;
  if (status === 503) return 'The service is temporarily unavailable. Please try again in a moment. Nothing was sent.';
  return text || 'The SDC could not be sent. Please try again.';
};

// History (GET …/sdc-email-shares/history): one item per email, newest first.
export const normalizeHistory = (data) => ({
  total: Number(data?.total) || 0,
  items: (Array.isArray(data?.items) ? data.items : []).map((i) => ({
    id: i.delivery_id || `${i.share_id}-${i.recipient_email}-${i.created_at}`,
    mode: i.mode === 'holder_wise' ? 'Holder-wise' : 'Bulk',
    email: i.recipient_email,
    holders: Array.isArray(i.user_ids) ? i.user_ids.length : 0,
    status: i.status,
    error: errorText(i),
    by: i.requested_by_role,
    at: i.created_at,
  })),
});
