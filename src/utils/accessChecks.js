// Per-check certificate access (new web changes, sections A, D1, D2).
// Every check in a holder's SDC has its own report and its own permission. These helpers only read the
// server's answers: nothing here decides who may see what.

export const CHECK_STATUS_META = {
  available:     { label: 'Available',               tone: 'bg-blue-50 text-brand-blue' },
  requested:     { label: 'Waiting for the holder',  tone: 'bg-amber-100 text-amber-800' },
  approved:      { label: 'Approved',                tone: 'bg-green-100 text-green-700' },
  rejected:      { label: 'Declined',                tone: 'bg-red-50 text-red-700' },
  expired:       { label: 'Expired',                 tone: 'bg-gray-100 text-gray-600' },
  not_requested: { label: 'Not requested',           tone: 'bg-gray-100 text-gray-500' },
};

export const checkStatusMeta = (status) =>
  CHECK_STATUS_META[status] || { label: String(status || 'Unknown').replace(/_/g, ' '), tone: 'bg-gray-100 text-gray-600' };

const asList = (value) => (Array.isArray(value) ? value : []);
const norm = (value) => String(value || '').trim().toLowerCase();

// ── Visitor: GET /requests/{id}/checks ─────────────────────────────────────────────────────

// -> [{ id, name, status, scanned, sharesWith, independent, expiresAt }]
export const normalizeChecks = (data) =>
  asList(data?.checks)
    .filter((c) => c && typeof c.check_id === 'string' && c.check_id)
    .map((c) => ({
      id: c.check_id,
      name: c.name || c.check_id.replace(/^type:/, ''),
      status: norm(c.status) || 'available',
      scanned: !!c.scanned,
      sharesWith: asList(c.shares_report_with).map(String),
      independent: c.independent_report !== false && asList(c.shares_report_with).length === 0,
      expiresAt: c.expires_at || null,
    }));

// Only a check that is still available can be requested. Requested and approved ones are already in play;
// rejected / expired ones need a new request, not a retry here.
export const isSelectableCheck = (check) => check?.status === 'available';

// The checks that must be toggled together with this one: the legacy combined report (shares_report_with).
export const checkGroup = (checks, check) => {
  if (!check || check.independent) return check ? [check] : [];
  const names = new Set([check.name, ...check.sharesWith].map(norm));
  return checks.filter((c) => names.has(norm(c.name)));
};

export const toggleCheckSelection = (selected, checks, checkId) => {
  const check = checks.find((c) => c.id === checkId);
  if (!check || !isSelectableCheck(check)) return selected;
  const group = checkGroup(checks, check).filter(isSelectableCheck);
  const next = new Set(selected);
  const turningOn = !next.has(checkId);
  group.forEach((c) => (turningOn ? next.add(c.id) : next.delete(c.id)));
  return next;
};

// "This older combined report also covers X and Y" for a legacy check, else ''.
export const legacyNote = (check) => {
  if (!check || check.independent || check.sharesWith.length === 0) return '';
  return `This older combined report also covers ${check.sharesWith.join(', ')}. They are requested together.`;
};

// Selected ids in the order shown, limited to what can still be requested (the API takes 1–50).
export const selectedCheckIds = (selected, checks) =>
  checks.filter((c) => selected.has(c.id) && isSelectableCheck(c)).map((c) => c.id).slice(0, 50);

export const hasApprovedChecks = (checks) => checks.some((c) => c.status === 'approved');

// A permission-request answer in one line for the visitor.
export const permissionRequestMessage = (data) => {
  const added = asList(data?.added_checks).length;
  const requested = asList(data?.requested_checks).length;
  if (data?.holder_notified === false) {
    return added > 0
      ? `${added} check${added === 1 ? '' : 's'} added. The certificate holder was not emailed again — your earlier request is still open.`
      : 'These checks are already part of your open request.';
  }
  return `We emailed the certificate holder about ${requested || added} check${(requested || added) === 1 ? '' : 's'}. You’ll be emailed their decision.`;
};

export const permissionErrorMessage = (status, serverMessage) => {
  if (status === 404) return 'This request is no longer available. Verify your email again to continue.';
  if (status === 409) return serverMessage || 'You already have a request waiting for this certificate holder.';
  if (status === 422) return serverMessage || 'One of the selected checks can’t be requested. Refresh the list and try again.';
  if (status === 429) return 'Too many requests. Please wait a while and try again.';
  if (status === 503) return 'This service is temporarily unavailable. Please try again in a few minutes.';
  return serverMessage || 'We couldn’t send the request. Please try again.';
};

// ── Visitor: GET /requests/{id}/status → approved reports with their expiry ───────────────────

// -> [{ key, label, url, checks:[names], expiresAt }] — only what the holder approved is ever listed.
export const approvedReportsWithExpiry = (data, apiBaseUrl = '') => {
  const base = String(apiBaseUrl || '').replace(/\/$/, '');
  return asList(data?.approved_reports)
    .filter((r) => r && typeof r.view_path === 'string' && r.view_path)
    .map((r, i) => ({
      key: r.report_ref || r.view_path,
      label: r.label || `Report ${i + 1}`,
      checks: asList(r.checks).map(String),
      expiresAt: r.expires_at || null,
      url: /^https?:\/\//i.test(r.view_path) ? r.view_path : `${base}${r.view_path.startsWith('/') ? '' : '/'}${r.view_path}`,
    }));
};

// Status-page checks (GET /status → checks:[{check_id, name, status, requested_at, decided_at, expires_at}]).
export const normalizeStatusChecks = (data) =>
  asList(data?.checks)
    .filter((c) => c && (c.check_id || c.name))
    .map((c) => ({
      id: c.check_id || c.name,
      name: c.name || String(c.check_id).replace(/^type:/, ''),
      status: norm(c.status) || 'requested',
      requestedAt: c.requested_at || null,
      decidedAt: c.decided_at || null,
      expiresAt: c.expires_at || null,
    }));

// "2 days left" / "Expires today" / "Expired" for a report or check period.
export const expiryText = (expiresAt, now = Date.now()) => {
  if (!expiresAt) return '';
  const end = Date.parse(expiresAt);
  if (!Number.isFinite(end)) return '';
  const ms = end - now;
  if (ms <= 0) return 'Expired';
  const days = Math.floor(ms / 86_400_000);
  if (days >= 1) return `${days} day${days === 1 ? '' : 's'} left`;
  const hours = Math.max(1, Math.floor(ms / 3_600_000));
  return `${hours} hour${hours === 1 ? '' : 's'} left`;
};

// ── Holder: GET /approvals/{token} → checks ────────────────────────────────────────────────────

// -> [{ id|null, key, name, status, sharesWith, requestedAt, decidedAt }]
export const normalizeHolderChecks = (data) =>
  asList(data?.checks)
    .filter((c) => c && (c.name || c.check_key))
    .map((c) => ({
      id: c.check_id || null,
      key: c.check_key || c.check_id || c.name,
      name: c.name || String(c.check_key).replace(/^type:/, ''),
      status: norm(c.status) || 'not_requested',
      sharesWith: asList(c.shares_report_with).map(String),
      requestedAt: c.requested_at || null,
      decidedAt: c.decided_at || null,
    }));

export const holderDecidable = (check) => check?.status === 'requested' && !!check.id;
export const holderWaiting = (checks) => checks.filter(holderDecidable);

// Decisions are staged per check; a legacy combined report is decided together.
export const setHolderDecision = (decisions, checks, checkKey, decision) => {
  const check = checks.find((c) => c.key === checkKey);
  if (!check || !holderDecidable(check)) return decisions;
  const names = new Set([check.name, ...check.sharesWith].map(norm));
  const group = check.sharesWith.length ? checks.filter((c) => names.has(norm(c.name)) && holderDecidable(c)) : [check];
  const next = { ...decisions };
  // Choosing the same decision again clears it.
  const off = decision == null || decisions[checkKey] === decision;
  group.forEach((c) => { if (off) delete next[c.key]; else next[c.key] = decision; });
  return next;
};

// -> [{ check_id, decision }] for the staged decisions that can be sent.
export const buildCheckDecisions = (decisions, checks) =>
  holderWaiting(checks)
    .filter((c) => decisions[c.key] === 'approve' || decisions[c.key] === 'reject')
    .map((c) => ({ check_id: c.id, decision: decisions[c.key] }));

// Applies POST /approvals/{token}/checks → { status, checks }; with no list, decided ones are updated locally.
export const applyCheckDecisions = (checks, response, sent) => {
  const fromServer = normalizeHolderChecks({ checks: response?.checks });
  if (fromServer.length) return fromServer;
  const byId = Object.fromEntries((sent || []).map((d) => [d.check_id, d.decision]));
  return checks.map((c) => (c.id && byId[c.id]
    ? { ...c, status: byId[c.id] === 'approve' ? 'approved' : 'rejected', decidedAt: new Date().toISOString() }
    : c));
};

// ── Persistent access: only a convenience cache of the last token (never a permission) ─────────

export const ACCESS_CACHE_KEY = 'trumarkz_certificate_access';

const safeStorage = () => { try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; } };

export const readAccessCache = (storage = safeStorage()) => {
  try {
    const value = JSON.parse(storage?.getItem(ACCESS_CACHE_KEY) || 'null');
    return value && typeof value === 'object' ? value : null;
  } catch { return null; }
};

export const writeAccessCache = (value, storage = safeStorage()) => {
  try {
    if (!storage) return;
    if (value) storage.setItem(ACCESS_CACHE_KEY, JSON.stringify(value));
    else storage.removeItem(ACCESS_CACHE_KEY);
  } catch { /* storage blocked: the page still works for this view */ }
};

// The cached token for exactly this request, or null.
export const cachedTokenFor = (requestId, storage = safeStorage()) => {
  const cached = readAccessCache(storage);
  return cached && cached.requestId === requestId && typeof cached.accessToken === 'string' && cached.accessToken ? cached : null;
};

// What to say when a status/checks call fails.
export const statusErrorKind = (status) => (status === 404 ? 'verify_again' : status === 429 ? 'rate_limited' : status === 503 ? 'unavailable' : 'error');
