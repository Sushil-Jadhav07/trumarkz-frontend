import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

test('public access APIs preserve reference/visitor ID separation and never attach account auth or URL tokens', async () => {
  const require = createRequire(import.meta.url), axios = require('axios'), calls = [];
  const bundle = await build({ entryPoints: [fileURLToPath(new URL('./api.js', import.meta.url))], bundle: true,
    write: false, platform: 'node', format: 'cjs', external: ['axios'],
    alias: { '@': fileURLToPath(new URL('../', import.meta.url)) }, define: { 'import.meta.env': '{}' } });
  const module = { exports: {} }, originalAdapter = axios.defaults.adapter;
  axios.defaults.adapter = async (config) => { calls.push(config); return { data: {}, status: 200, statusText: 'OK', headers: {}, config }; };
  try {
    vm.runInNewContext(bundle.outputFiles[0].text, { module, exports: module.exports, require, FormData, URLSearchParams, AbortController,
      localStorage: { getItem: () => 'unrelated-account-token' }, window: { location: { pathname: '/certificate-access/request' } } });
  } finally { axios.defaults.adapter = originalAdapter; }
  const api = module.exports.certificateAccessAPI;
  await api.requestAccess({ visitor_email: 'visitor@example.test', request_id: 'manual-report-id', file_index: 0 });
  await api.requestAccess({ visitor_email: 'visitor@example.test', document_id: 'auto-document-id' });
  await api.verifyRequest('visitor-request-id', '123456');
  await api.getRequestStatus('visitor-request-id', 'scoped-token');
  await api.getApproval('holder-token');
  await api.decideApproval('holder-token', { decision: 'approve', dob: '1990-01-01', phone_number: '9876543210' });
  assert.deepEqual(JSON.parse(calls[0].data), { visitor_email: 'visitor@example.test', request_id: 'manual-report-id', file_index: 0 });
  assert.deepEqual(JSON.parse(calls[1].data), { visitor_email: 'visitor@example.test', document_id: 'auto-document-id' });
  assert.equal(calls[2].url, '/verification/certificate-access/requests/visitor-request-id/verify');
  assert.deepEqual(JSON.parse(calls[2].data), { otp_code: '123456' });
  assert.equal(calls[3].url, '/verification/certificate-access/requests/visitor-request-id/status');
  assert.equal(calls[3].headers.get('X-Certificate-Access-Token'), 'scoped-token');
  assert.equal(calls[4].url, '/verification/certificate-access/approvals/holder-token');
  assert.deepEqual(JSON.parse(calls[5].data), { decision: 'approve', dob: '1990-01-01', phone_number: '9876543210' });
  for (const call of calls) {
    assert.equal(call.headers.get('Authorization'), undefined);
    assert.equal(call.url.includes('scoped-token'), false);
    assert.equal(call.url.includes('access_token='), false);
  }
});
