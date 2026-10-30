// Human Secure Certificate Access (web change report §4): report links on a
// `holder_approval` batch only open with the owning org / SuperAdmin session
// (Authorization: Bearer) or an approved visitor's X-Certificate-Access-Token.
// A plain <a href> carries neither, so these helpers fetch the file with the
// right header and hand back a blob to display.

// The only two routes that return a Human report's content (§4g).
const DOCUMENT_VIEW = /\/verification\/documents\/([^/?#]+)\/view\/?$/;
const MANUAL_VIEW = /\/verification\/manual\/reports\/([^/?#]+)\/view\/(\d+)\/?$/;

const parseUrl = (url) => {
  if (typeof url !== 'string' || !url.trim()) return null;
  try {
    return new URL(url.trim(), typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
  } catch {
    return null;
  }
};

// { document_id } or { request_id, file_index } for a TruMarkZ report link, else null.
export const parseReportReference = (url) => {
  const parsed = parseUrl(url);
  if (!parsed || !['http:', 'https:'].includes(parsed.protocol)) return null;
  try {
    const doc = parsed.pathname.match(DOCUMENT_VIEW);
    if (doc) return { document_id: decodeURIComponent(doc[1]) };
    const manual = parsed.pathname.match(MANUAL_VIEW);
    if (manual && Number.isSafeInteger(Number(manual[2]))) return { request_id: decodeURIComponent(manual[1]), file_index: Number(manual[2]) };
  } catch { /* Malformed percent encoding is invalid input, not a page crash. */ }
  return null;
};

// Accept exactly one reference shape. Invalid or ambiguous URL parameters must
// never silently resume a different report or turn an empty index into file 0.
export const referenceFromParams = (params) => {
  const keys = ['document_id', 'request_id', 'file_index', 'report'];
  if (keys.some((key) => params.getAll(key).length > 1)) return null;
  if (params.has('document_id')) {
    if (keys.slice(1).some((key) => params.has(key))) return null;
    const id = params.get('document_id').trim();
    return id ? { document_id: id } : null;
  }
  if (params.has('request_id') || params.has('file_index')) {
    if (params.has('report')) return null;
    const id = params.get('request_id')?.trim();
    const rawIndex = params.get('file_index');
    const index = Number(rawIndex);
    return id && /^\d+$/.test(rawIndex ?? '') && Number.isSafeInteger(index)
      ? { request_id: id, file_index: index } : null;
  }
  return params.has('report') ? parseReportReference(params.get('report')) : null;
};

// Rebuilds the report link from a reference (visitor page opened with query params).
export const reportUrlFromReference = (ref, apiBaseUrl = '') => {
  const base = String(apiBaseUrl || '').replace(/\/$/, '');
  if (ref?.document_id) return `${base}/verification/documents/${encodeURIComponent(ref.document_id)}/view`;
  if (ref?.request_id && Number.isInteger(ref.file_index) && ref.file_index >= 0) {
    return `${base}/verification/manual/reports/${encodeURIComponent(ref.request_id)}/view/${ref.file_index}`;
  }
  return null;
};

// Only non-secret report identity travels to the public entry page. Discard
// source query strings/fragments so credentials never become permanent URLs.
export const certificateAccessPath = (url) => {
  const reference = parseReportReference(url);
  return reference ? `/certificate-access/request?${new URLSearchParams(reference)}` : null;
};

// A credential is only ever attached to a TruMarkZ report route on one of our own
// API origins — never to a signed storage URL or any other host.
export const isGatedReportUrl = (url, allowedOrigins = []) => {
  const parsed = parseUrl(url);
  if (!parsed || !parseReportReference(url)) return false;
  const origins = allowedOrigins.filter(Boolean).map((o) => parseUrl(o)?.origin).filter(Boolean);
  return origins.length === 0 || origins.includes(parsed.origin);
};

export const reportAuthHeaders = (url, { sessionToken, accessToken, allowedOrigins } = {}) => {
  if (!isGatedReportUrl(url, allowedOrigins)) return {};
  if (accessToken) return { 'X-Certificate-Access-Token': accessToken };
  if (sessionToken) return { Authorization: `Bearer ${sessionToken}` };
  return {};
};

export class ReportAccessError extends Error {
  constructor(message, status, retryAfter = null) {
    super(message);
    this.name = 'ReportAccessError';
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

const DEFAULT_MESSAGES = {
  401: 'Your session has expired. Sign in again to view this report.',
  403: "Access to this report requires the certificate holder's approval.",
  404: 'This report could not be found.',
  429: 'Too many attempts. Please wait a moment and try again.',
  503: 'Report access is temporarily unavailable. Please try again shortly.',
};

const readDetail = async (response) => {
  try {
    const body = await response.json();
    const detail = body?.detail;
    if (typeof detail === 'string') return detail;
    if (detail && typeof detail === 'object' && detail.message) return detail.message;
  } catch { /* not JSON */ }
  return null;
};

// Fetches a report as a Blob. Throws ReportAccessError with the server's own
// message (e.g. the 403 holder-approval text) so callers can show it as-is.
export const fetchReport = async (url, { fetchImpl = fetch, sessionToken, accessToken, allowedOrigins, signal } = {}) => {
  const response = await fetchImpl(url, {
    signal,
    credentials: 'omit',
    headers: reportAuthHeaders(url, { sessionToken, accessToken, allowedOrigins }),
  });
  if (!response.ok) {
    const retryAfter = Number(response.headers?.get?.('Retry-After')) || null;
    const message = (await readDetail(response)) || DEFAULT_MESSAGES[response.status] || 'This report could not be opened.';
    throw new ReportAccessError(message, response.status, retryAfter);
  }
  const blob = await response.blob();
  if (blob.type.includes('application/json') || blob.type.includes('text/html')) {
    throw new ReportAccessError('The server returned an error instead of a report.', response.status);
  }
  return blob;
};

// "Try again in 2 minutes" from a Retry-After value in seconds.
export const retryAfterText = (seconds) => {
  const s = Number(seconds);
  if (!Number.isFinite(s) || s <= 0) return 'Please try again later.';
  if (s < 60) return `Try again in ${Math.ceil(s)} second${Math.ceil(s) === 1 ? '' : 's'}.`;
  const m = Math.ceil(s / 60);
  if (m < 60) return `Try again in ${m} minute${m === 1 ? '' : 's'}.`;
  const h = Math.ceil(m / 60);
  return `Try again in ${h} hour${h === 1 ? '' : 's'}.`;
};
