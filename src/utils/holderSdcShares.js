// Individual SDC sharing (new web changes, D4): GET / POST /sdc/batches/{id}/holder-shares.
// "shared" and "email_accepted" mean the mail server accepted the email, never that it was delivered.

export const HOLDER_SHARE_LIMIT = 25;

export const SDC_STATUS_META = {
  generated:           { label: 'Generated',               tone: 'bg-green-50 text-green-700' },
  not_generated:       { label: 'Not generated',           tone: 'bg-gray-100 text-gray-600' },
  mapping_unavailable: { label: 'Certificate not matched', tone: 'bg-amber-50 text-amber-700' },
  mapping_ambiguous:   { label: 'Match unclear',           tone: 'bg-amber-50 text-amber-700' },
};

export const SHARING_STATUS_META = {
  not_available: { label: 'Not available',      tone: 'bg-gray-100 text-gray-500' },
  not_shared:    { label: 'Not shared',         tone: 'bg-gray-100 text-gray-700' },
  in_progress:   { label: 'Sending…',           tone: 'bg-blue-50 text-brand-blue' },
  shared:        { label: 'Email accepted',     tone: 'bg-green-50 text-green-700' },
  failed:        { label: 'Failed',             tone: 'bg-red-50 text-red-700' },
};

const fallbackMeta = (value) => ({ label: String(value || 'Unknown').replace(/_/g, ' '), tone: 'bg-gray-100 text-gray-600' });
export const sdcStatusMeta = (status) => SDC_STATUS_META[status] || fallbackMeta(status);
export const sharingStatusMeta = (status) => SHARING_STATUS_META[status] || fallbackMeta(status);

// One result line per holder (POST response results[].status).
export const RESULT_META = {
  email_accepted:      { label: 'Email accepted by mail server', tone: 'text-green-700', ok: true },
  already_shared:      { label: 'Already shared',                tone: 'text-gray-600' },
  recently_sent:       { label: 'Sent recently — try again later', tone: 'text-amber-700' },
  in_progress:         { label: 'An email is already being sent', tone: 'text-blue-700' },
  not_generated:       { label: 'No SDC generated yet',          tone: 'text-gray-600' },
  mapping_unavailable: { label: 'Certificate could not be matched', tone: 'text-amber-700' },
  mapping_ambiguous:   { label: 'Certificate match is unclear',  tone: 'text-amber-700' },
  no_email:            { label: 'No valid email on record',      tone: 'text-amber-700' },
  daily_limit_reached: { label: 'Daily limit reached for this holder', tone: 'text-amber-700' },
  failed:              { label: 'Failed',                        tone: 'text-red-700' },
};

export const resultMeta = (status) => RESULT_META[status] || { ...fallbackMeta(status), tone: 'text-gray-600' };

export const ERROR_CODE_TEXT = {
  sdc_unavailable: 'The certificate could not be loaded.',
  sdc_not_issued: 'The certificate is not issued yet.',
  mapping_mismatch: 'The certificate does not belong to this holder.',
  pdf_unavailable: 'The certificate PDF could not be prepared.',
  unexpected_error: 'Something went wrong while sending.',
  stale_claim: 'An earlier attempt did not finish. Try again.',
};

// The line shown under a failed result: the server's own error first, then a known code.
export const resultDetail = (result) => result?.error || ERROR_CODE_TEXT[result?.error_code] || (result?.error_code ? String(result.error_code).replace(/_/g, ' ') : '');

export const canSendHolder = (holder) => holder?.can_send === true && !!holder?.user_id;
export const eligibleHolders = (holders) => (Array.isArray(holders) ? holders : []).filter(canSendHolder);

// Select-all picks eligible holders only, up to the per-call limit.
export const selectAllEligible = (holders) => new Set(eligibleHolders(holders).slice(0, HOLDER_SHARE_LIMIT).map((h) => h.user_id));

export const toggleHolder = (selected, holders, userId) => {
  const holder = (holders || []).find((h) => h.user_id === userId);
  if (!canSendHolder(holder)) return selected;
  const next = new Set(selected);
  if (next.has(userId)) next.delete(userId);
  else if (next.size < HOLDER_SHARE_LIMIT) next.add(userId);
  return next;
};

// Only still-eligible holders go out (a stale selection never sends to someone who became ineligible).
export const idsToSend = (selected, holders) => eligibleHolders(holders).filter((h) => selected.has(h.user_id)).map((h) => h.user_id).slice(0, HOLDER_SHARE_LIMIT);

export const shareTotals = (response) => {
  const results = Array.isArray(response?.results) ? response.results : [];
  const accepted = Number.isFinite(Number(response?.email_accepted)) ? Number(response.email_accepted) : results.filter((r) => r.status === 'email_accepted').length;
  return { requested: Number.isFinite(Number(response?.requested)) ? Number(response.requested) : results.length, accepted, results };
};

export const shareErrorMessage = (status, serverMessage) => {
  if (status === 400) return serverMessage || 'One of the selected holders is not in this batch. Nothing was sent.';
  if (status === 403) return 'Sharing with individual holders is not available for this batch yet.';
  if (status === 404) return 'This batch could not be found.';
  if (status === 422) return 'Select at least one holder.';
  if (status === 429) return 'Too many sends from this account. Please wait a while and try again.';
  return serverMessage || 'The SDCs could not be sent. Please try again.';
};

export const lastActivityText = (holder) => {
  if (holder?.sharing_status === 'failed' && holder?.last_error) return holder.last_error;
  if (holder?.last_shared_at) return `Last accepted ${new Date(holder.last_shared_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })}${holder.share_count > 1 ? ` · ${holder.share_count} times` : ''}`;
  return '';
};
