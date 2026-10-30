import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const bundle = await build({
  entryPoints: [fileURLToPath(new URL('./api.js', import.meta.url))], bundle: true, write: false,
  platform: 'node', format: 'cjs', external: ['axios'],
  alias: { '@': fileURLToPath(new URL('../', import.meta.url)) },
  define: { 'import.meta.env': JSON.stringify({ VITE_API_BASE_URL: 'https://api.example.test' }) },
});

const load = (status, { blocked = false, detail = "Access to this report requires the certificate holder's approval." } = {}) => {
  const seen = { fetches: [], opens: [], assigned: [], closed: false, objectUrls: 0 };
  const tab = { document: { body: { style: {} } }, location: {}, close: () => { seen.closed = true; } };
  const module = { exports: {} };
  class TestURL extends URL {
    static createObjectURL() { seen.objectUrls++; return 'blob:test-report'; }
    static revokeObjectURL() {}
  }
  vm.runInNewContext(bundle.outputFiles[0].text, {
    module, exports: module.exports, require: createRequire(import.meta.url), FormData, URLSearchParams,
    URL: TestURL, AbortController, setTimeout: () => {},
    localStorage: { getItem: () => 'test-account-token' },
    window: {
      location: { pathname: '/org/record/test', origin: 'https://frontend.example.test', assign: (url) => seen.assigned.push(url) },
      open: (url) => { seen.opens.push(url); return blocked ? null : tab; },
    },
    fetch: async (url, options) => {
      seen.fetches.push({ url, options });
      return { ok: status === 200, status, headers: { get: () => null }, json: async () => ({ detail }), blob: async () => ({ type: 'application/pdf' }) };
    },
  });
  return { openReport: module.exports.openReport, seen, tab };
};

test('holder-approval denial opens visitor entry with index zero and never copies token query/fragment', async () => {
  const { openReport, seen, tab } = load(403);
  await openReport('https://api.example.test/verification/manual/reports/request-one/view/0?access_token=secret#secret');
  assert.equal(tab.location.href, '/certificate-access/request?request_id=request-one&file_index=0');
  assert.equal(seen.closed, false); assert.equal(seen.objectUrls, 0);
  assert.equal(seen.fetches[0].options.headers.Authorization, 'Bearer test-account-token');
});

test('popup blocked during approval denial navigates the current tab to visitor entry', async () => {
  const { openReport, seen } = load(403, { blocked: true });
  await openReport('https://api.example.test/verification/documents/document-one/view');
  assert.deepEqual(seen.assigned, ['/certificate-access/request?document_id=document-one']);
});

test('successful reports keep their existing blob flow and external Product/Warranty links open directly', async () => {
  const { openReport, seen, tab } = load(200);
  await openReport('https://api.example.test/verification/documents/document-one/view');
  assert.equal(tab.location.href, 'blob:test-report'); assert.equal(seen.objectUrls, 1);
  await openReport('https://storage.example.test/warranty.pdf');
  assert.equal(seen.fetches.length, 1);
  assert.equal(seen.opens.at(-1), 'https://storage.example.test/warranty.pdf');
  assert.equal(seen.assigned.length, 0);
});

test('authentication, missing reports and unrelated forbidden errors do not silently become approval requests', async () => {
  for (const status of [401, 404, 503, 403]) {
    const { openReport, seen, tab } = load(status, { detail: 'Unrelated access error' });
    await assert.rejects(openReport('https://api.example.test/verification/documents/d/view'), (error) => error.status === status);
    assert.equal(tab.location.href, undefined); assert.equal(seen.closed, true);
    assert.equal(seen.assigned.length, 0);
  }
});
