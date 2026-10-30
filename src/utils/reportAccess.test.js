import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseReportReference, reportUrlFromReference, isGatedReportUrl, reportAuthHeaders,
  fetchReport, ReportAccessError, retryAfterText,
} from './reportAccess.js';

const API = 'https://api.trumarkz.test';

test('parses both report routes and nothing else', () => {
  assert.deepEqual(parseReportReference(`${API}/verification/documents/doc-1/view`), { document_id: 'doc-1' });
  assert.deepEqual(parseReportReference(`${API}/verification/manual/reports/req-9/view/2`), { request_id: 'req-9', file_index: 2 });
  assert.equal(parseReportReference(`${API}/verification/manual/reports/req-9/download/2`), null);
  assert.equal(parseReportReference('gs://bucket/report.pdf'), null);
  assert.equal(parseReportReference(''), null);
});

test('round-trips a reference back into the report link', () => {
  assert.equal(reportUrlFromReference({ document_id: 'a b' }, `${API}/`), `${API}/verification/documents/a%20b/view`);
  assert.equal(reportUrlFromReference({ request_id: 'r', file_index: 0 }, API), `${API}/verification/manual/reports/r/view/0`);
  assert.equal(reportUrlFromReference({ request_id: 'r', file_index: -1 }, API), null);
});

test('never attaches a credential to another host or a non-report URL', () => {
  const opts = { sessionToken: 'session', allowedOrigins: [API] };
  assert.deepEqual(reportAuthHeaders(`${API}/verification/documents/d/view`, opts), { Authorization: 'Bearer session' });
  assert.deepEqual(reportAuthHeaders('https://storage.googleapis.com/b/verification/documents/d/view?X-Goog-Signature=1', opts), {});
  assert.deepEqual(reportAuthHeaders(`${API}/auth/me`, opts), {});
  assert.equal(isGatedReportUrl(`${API}/verification/documents/d/view`, [API]), true);
});

test('a visitor token wins over the session and uses its own header', () => {
  const headers = reportAuthHeaders(`${API}/verification/documents/d/view`, { sessionToken: 's', accessToken: 'visitor', allowedOrigins: [API] });
  assert.deepEqual(headers, { 'X-Certificate-Access-Token': 'visitor' });
});

const response = (status, body, type = 'application/json', headers = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: (k) => headers[k] ?? null },
  json: async () => body,
  blob: async () => ({ type, size: 10 }),
});

test('returns the blob and sends the header on success', async () => {
  let seen;
  const blob = await fetchReport(`${API}/verification/documents/d/view`, {
    sessionToken: 'tok', allowedOrigins: [API],
    fetchImpl: async (url, init) => { seen = init; return response(200, null, 'application/pdf'); },
  });
  assert.equal(blob.type, 'application/pdf');
  assert.equal(seen.headers.Authorization, 'Bearer tok');
  assert.equal(seen.credentials, 'omit');
});

test('surfaces the server 403 message and Retry-After on 429', async () => {
  await assert.rejects(
    fetchReport(`${API}/verification/documents/d/view`, { fetchImpl: async () => response(403, { detail: "Access to this report requires the certificate holder's approval." }) }),
    (err) => err instanceof ReportAccessError && err.status === 403 && /holder's approval/.test(err.message),
  );
  await assert.rejects(
    fetchReport(`${API}/verification/documents/d/view`, { fetchImpl: async () => response(429, {}, 'application/json', { 'Retry-After': '120' }) }),
    (err) => err.status === 429 && err.retryAfter === 120,
  );
});

test('an error page served with 200 is not treated as a report', async () => {
  await assert.rejects(
    fetchReport(`${API}/verification/documents/d/view`, { fetchImpl: async () => response(200, null, 'text/html') }),
    ReportAccessError,
  );
});

test('formats Retry-After for people', () => {
  assert.equal(retryAfterText(1), 'Try again in 1 second.');
  assert.equal(retryAfterText(90), 'Try again in 2 minutes.');
  assert.equal(retryAfterText(7200), 'Try again in 2 hours.');
  assert.equal(retryAfterText(null), 'Please try again later.');
});
