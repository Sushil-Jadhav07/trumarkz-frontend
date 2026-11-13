// Smart Send (POST /verification/manual/smart-send) helpers for the SuperAdmin screens.
// Request schema is unchanged: { batch_id, verification_assignments: [{ verification_type_name,
// verifiers: [{ verifier_id, email_subject, email_body, user_ids }] }] }. The response is the source of truth:
// results[], already_open_requests, skipped_users, total_sent / total_failed / total_skipped. Every field is
// additive and optional, so each one is read defensively and none is invented.

const DONE_STATUSES = new Set(['approved', 'verified', 'completed', 'verification_completed']);
const REJECTED_STATUSES = new Set(['rejected', 'failed']);
const norm = (value) => String(value || '').trim().toLowerCase();
const typeKey = (value) => norm(value).replace(/[\s_-]+/g, '_');

export const checkStatusOf = (record, typeName) => {
  const entry = Object.entries(record?.verification_type_status || {}).find(([name]) => typeKey(name) === typeKey(typeName));
  if (!entry) return null;
  const value = entry[1];
  return norm(typeof value === 'string' ? value : value?.status) || 'pending';
};

// "Send to Verifier" is offered only while THIS check is still pending (pending / awaiting upload …): it exists,
// is a manual one, and is neither approved nor rejected (rejected checks go through "Resend Rejected").
// The user's overall status is never consulted.
export const canSendToVerifier = (record, typeName) => {
  const entry = Object.entries(record?.verification_type_status || {}).find(([name]) => typeKey(name) === typeKey(typeName));
  if (!entry) return false;
  const value = entry[1];
  if (value && typeof value === 'object' && norm(value.label) === 'automatic') return false;
  const status = checkStatusOf(record, typeName);
  return !DONE_STATUSES.has(status) && !REJECTED_STATUSES.has(status);
};

export const batchUserIdOf = (record) => record?.id || record?.user_id || record?.entity_id || '';

// Whether the response says the mail server accepted the message. Never claims delivery.
export const emailAccepted = (entry) =>
  entry?.email_sent === true || ['sent', 'accepted'].includes(norm(entry?.email_status));

// -> 'sent' | 'already_open' | 'failed' | 'skipped'
export const resultKind = (entry) => {
  const status = norm(entry?.status);
  if (status === 'failed' || status === 'error' || (entry?.error && status !== 'already_open')) return 'failed';
  if (status === 'already_open' || entry?.already_open === true) return 'already_open';
  if (status === 'skipped') return 'skipped';
  return 'sent';
};

const asList = (value) => (Array.isArray(value) ? value : []);

// One normalized view of a smart-send response.
export const summarizeSmartSend = (data) => {
  const results = asList(data?.results);
  const sent = results.filter((r) => resultKind(r) === 'sent');
  const failed = results.filter((r) => resultKind(r) === 'failed');
  const openFromResults = results.filter((r) => resultKind(r) === 'already_open');
  const alreadyOpen = [...asList(data?.already_open_requests), ...openFromResults];
  const skippedUsers = asList(data?.skipped_users);
  const num = (value, fallback) => (Number.isFinite(Number(value)) && value != null ? Number(value) : fallback);
  return {
    sent, failed, alreadyOpen, skippedUsers,
    perVerifier: results,
    totals: {
      sent: num(data?.total_sent, sent.length),
      failed: num(data?.total_failed, failed.length),
      skipped: num(data?.total_skipped, skippedUsers.length),
      alreadyOpen: alreadyOpen.length,
    },
    // A request exists server-side (even if its email failed): its id lets the admin Resend.
    resendable: [...sent, ...failed, ...alreadyOpen].filter((r) => r?.request_id || r?.token),
  };
};

// What to tell the admin in one line (never "delivered").
export const smartSendHeadline = (summary) => {
  const { totals } = summary;
  const parts = [];
  if (totals.sent) parts.push(`${totals.sent} request${totals.sent === 1 ? '' : 's'} created`);
  if (totals.alreadyOpen) parts.push(`${totals.alreadyOpen} already open`);
  if (totals.skipped) parts.push(`${totals.skipped} skipped`);
  if (totals.failed) parts.push(`${totals.failed} failed`);
  return parts.join(' · ') || 'Nothing was sent';
};

// How a user is shown from skipped_users / already-open lists: strings or objects.
export const describeUserRef = (item, recordsById = {}) => {
  if (typeof item === 'string') return { id: item, name: recordsById[item] || item, reason: '' };
  const id = item?.batch_user_id || item?.user_id || item?.id || '';
  return { id, name: item?.full_name || item?.name || recordsById[id] || id || 'User', reason: item?.reason || item?.error || item?.message || '' };
};

export const requestIdOf = (entry) => entry?.request_id || entry?.token || '';

// ── Resend (POST /verification/manual/resend/{request_id}) ───────────────────────────────────────
// Several holders can share one request: one button per request, with the holders listed under it.
export const groupByRequest = (entries, recordsById = {}) => {
  const groups = new Map();
  (Array.isArray(entries) ? entries : []).forEach((entry, i) => {
    const id = requestIdOf(entry);
    const key = id || `no-request-${i}`;
    if (!groups.has(key)) groups.set(key, { requestId: id, entry, holders: [] });
    const group = groups.get(key);
    const holderIds = Array.isArray(entry?.batch_user_ids) ? entry.batch_user_ids : [entry?.user_id || entry?.batch_user_id].filter(Boolean);
    const named = entry?.full_name ? [entry.full_name] : holderIds.map((hid) => recordsById[hid] || hid);
    named.forEach((name) => { if (name && !group.holders.includes(name)) group.holders.push(name); });
  });
  return [...groups.values()];
};

// The line shown after a successful resend call. 200 means the request was reissued; whether the mail server
// accepted the email is reported separately (email_sent / email_error). Never claims delivery.
export const resendResultNote = (data, fallbackEmail = '') => {
  const email = data?.verifier_email || fallbackEmail || 'the verifier';
  if (data?.email_sent === false) return { ok: false, text: data?.email_error ? `Email failed: ${data.email_error}` : 'The email could not be sent. Try again.' };
  if (data?.email_sent === true) return { ok: true, text: `Email accepted by the mail server for ${email}. They got a fresh link; the old link no longer works.` };
  return { ok: true, text: `A fresh link was issued for ${email}.` };
};

export const resendErrorMessage = (status, serverMessage = '') => {
  if (status === 400) return 'The verifier has already uploaded the report, so this request is completed and can’t be resent.';
  if (status === 404) return 'This request could not be found. Refresh the batch and try again.';
  return serverMessage || 'Failed to resend the verification link';
};
