import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { createConsentGuard } from './consentGuard.js';
import { consentAllowsProcessing, consentRequiredForBatch } from '../utils/consent.js';
import { pendingManualUsers } from '../utils/pendingManualVerifications.js';

const batch = { batch_id: 'batch-a', batch_type: 'human', credential_visibility: 'private', users: [{ user_id: 'a', verification_type_status: { address: 'pending' } }, { user_id: 'b', verification_type_status: { address: 'pending' } }] };
const fixture = (statuses = ['accepted', 'pending']) => {
  const users = statuses.map((consent_status, i) => ({ id: i ? 'b' : 'a', batch_id: 'batch-a', consent_status }));
  const calls = [];
  const deps = {
    getBatch: async () => ({ data: batch }),
    getUsers: async (filters) => { calls.push(filters); return { data: { users } }; },
    getUser: async (id) => ({ data: users.find((user) => user.id === id) }),
    getAssignments: async () => ({ data: { assignments: [{ request_id: 'request', users: [{ batch_user_id: 'a' }] }] } }),
  };
  return { deps, calls, users, guard: createConsentGuard(deps) };
};

test('only accepted users enter pending verifier assignments in a private Human batch', async () => {
  const f = fixture();
  const hydrated = await f.guard.loadBatch('batch-a');
  assert.deepEqual(pendingManualUsers(hydrated.users, 'address').map((user) => user.id), ['a']);
  assert.deepEqual(f.calls, [{ batchId: 'batch-a', limit: 100, offset: 0 }]);
  await f.guard.assertBatch('batch-a', ['a']);
  await assert.rejects(f.guard.assertBatch('batch-a', ['a', 'b']), { code: 'CONSENT_REQUIRED' });
});

test('pending, rejected, automatically expired, null and missing statuses never authorize private Human processing', async () => {
  for (const status of ['pending', 'rejected', null, undefined]) {
    const f = fixture([status, status]);
    await assert.rejects(f.guard.assertBatch('batch-a'), { code: 'CONSENT_REQUIRED' });
    await assert.rejects(f.guard.assertUser('a'), { code: 'CONSENT_REQUIRED' });
  }
  assert.equal(consentAllowsProcessing({ consent_status: 'rejected', consent_auto_expired: true }, batch), false);
  assert.equal(consentAllowsProcessing({ consent_status: 'accepted', consent_deadline: '2020-01-01T00:00:00Z' }, batch), true);
});

test('public batch override, Product and Warranty remain unaffected without consent reads', async () => {
  for (const changed of [{ ...batch, credential_visibility: 'public', permission_mode: 'permission_required' }, { ...batch, batch_type: 'product' }, { ...batch, batch_type: 'warranty' }]) {
    const f = fixture(); f.deps.getBatch = async () => ({ data: changed });
    const guard = createConsentGuard(f.deps);
    assert.equal(consentRequiredForBatch(changed), false);
    await guard.assertBatch('batch-a', ['b']); await guard.assertUser('b');
    const hydrated = await guard.loadBatch('batch-a');
    assert.equal(pendingManualUsers(hydrated.users, 'address').length, 2);
    assert.equal(f.calls.length, 0);
  }
});

test('missing, wrong-batch, duplicate or partial API data fails closed', async () => {
  for (const response of [{}, { users: [] }, { users: [{ id: 'a', batch_id: 'other', consent_status: 'accepted' }] }, { users: [{ id: 'a', batch_id: 'batch-a' }, { id: 'a', batch_id: 'batch-a' }] }]) {
    const f = fixture(); f.deps.getUsers = async () => ({ data: response });
    await assert.rejects(createConsentGuard(f.deps).assertBatch('batch-a'), { code: 'CONSENT_UNAVAILABLE' });
  }
});

test('consent reads paginate within the chosen batch rather than fetching per user', async () => {
  const users = Array.from({ length: 101 }, (_, i) => ({ id: String(i), batch_id: 'batch-a', consent_status: 'accepted' }));
  const offsets = [];
  const guard = createConsentGuard({ getBatch: async () => ({ data: { ...batch, users: users.map((user) => ({ user_id: user.id })) } }), getUsers: async ({ offset, batchId }) => { assert.equal(batchId, 'batch-a'); offsets.push(offset); return { data: { users: users.slice(offset, offset + 100) } }; } });
  const result = await guard.assertBatch('batch-a');
  assert.equal(result.eligibleIds.length, 101);
  assert.deepEqual(offsets, [0, 100]);
});

test('resending checks the actual request assignment and blocks a non-accepted assigned user', async () => {
  const f = fixture(); await f.guard.assertRequest('request', 'batch-a');
  f.users[0].consent_status = 'rejected';
  await assert.rejects(f.guard.assertRequest('request', 'batch-a'), { code: 'CONSENT_REQUIRED' });
  await assert.rejects(f.guard.assertRequest('unknown-request', 'batch-a'), { code: 'CONSENT_REQUIRED' });
});

test('a fresh acceptance unlocks the next submission; failed refresh cannot reuse old accepted data', async () => {
  const f = fixture(['pending', 'pending']);
  await assert.rejects(f.guard.assertBatch('batch-a', ['a']), { code: 'CONSENT_REQUIRED' });
  f.users[0].consent_status = 'accepted'; await f.guard.assertBatch('batch-a', ['a']);
  f.deps.getUsers = async () => { throw new Error('offline'); };
  await assert.rejects(createConsentGuard(f.deps).assertBatch('batch-a', ['a']), /offline/);
});

test('actual centralized action helpers never POST before consent and preserve accepted payloads', async () => {
  const require = createRequire(import.meta.url);
  const axios = require('axios');
  const requests = [];
  const oldAdapter = axios.defaults.adapter;
  const result = await build({ entryPoints: [fileURLToPath(new URL('./api.js', import.meta.url))], bundle: true, write: false, platform: 'node', format: 'cjs', external: ['axios'], alias: { '@': fileURLToPath(new URL('../', import.meta.url)) }, define: { 'import.meta.env': '{}' } });
  axios.defaults.adapter = async (config) => { requests.push({ method: config.method, url: config.url, data: config.data }); return { data: {}, status: 200, statusText: 'OK', headers: {}, config }; };
  const module = { exports: {} };
  try {
    vm.runInNewContext(result.outputFiles[0].text, { module, exports: module.exports, require, URLSearchParams, AbortController, console, localStorage: { getItem: () => 'test-auth', removeItem: () => {} }, window: { location: { pathname: '/admin/batch-monitor' } } });
  } finally { axios.defaults.adapter = oldAdapter; }
  const { verificationAPI: api, sdcAPI } = module.exports;
  const f = fixture(['pending', 'pending']);
  api.getBatchDetails = f.deps.getBatch; api.getAllVerifications = f.deps.getUsers; api.getUserVerification = f.deps.getUser; api.getManualAssignments = f.deps.getAssignments;
  const smartPayload = { batch_id: 'batch-a', verification_assignments: [{ verification_type_name: 'address', verifiers: [{ verifier_id: 'verifier', user_ids: ['a'] }] }] };
  const operations = [
    () => api.requestManualVerification({ batch_id: 'batch-a' }),
    () => api.sendBulkManualVerification({ batch_id: 'batch-a' }),
    () => api.smartSendManualVerification(smartPayload),
    () => api.resendRejectedForVerification({ batch_id: 'batch-a', batch_user_ids: ['a'] }),
    () => api.resendManualVerification('request', 'batch-a'),
    () => api.runAutoVerification('address', 'a'),
    () => api.generateQRAndCertificate('a'),
    () => api.retryAutomaticVerification('a'),
    () => sdcAPI.generateBatchSDC('batch-a', { user_ids: ['a'] }),
    () => sdcAPI.issueBatchSDC('batch-a'),
  ];
  for (const operation of operations) await assert.rejects(operation(), { code: 'CONSENT_REQUIRED' });
  assert.deepEqual(requests, []);
  f.users[0].consent_status = 'accepted';
  await api.smartSendManualVerification(smartPayload);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, '/verification/manual/smart-send');
  assert.deepEqual(JSON.parse(requests[0].data), smartPayload);
  await sdcAPI.generateBatchSDC('batch-a', { user_ids: [] });
  assert.equal(requests.length, 2);
  assert.equal(requests[1].url, '/sdc/batches/batch-a/generate');
  assert.equal(JSON.parse(requests[1].data).user_ids, undefined);
  api.getBatchDetails = async () => ({ data: { ...batch, users: batch.users.map((row) => ({ ...row, verification_type_status: { licence: { label: 'automatic', status: 'failed', report_url: null } } })) } });
  await api.retryAutomaticVerification('a');
  assert.equal(requests[2].url, '/verification/batch-users/a/retry-automatic-verification');
  assert.equal(requests[2].data, undefined);
  // The row can finish after the modal loaded. The action must read again
  // and stop before POST even if the old UI was still offering retry.
  for (const check of [
    { label: 'automatic', status: 'approved', report_url: null },
    { label: 'automatic', status: 'rejected', report_url: null },
    { label: 'automatic', status: 'failed', report_url: 'existing.pdf' },
    { label: 'manual', status: 'failed', report_url: null },
  ]) {
    api.getBatchDetails = async () => ({ data: { ...batch, users: batch.users.map((row) => ({ ...row, verification_type_status: { licence: check } })) } });
    await assert.rejects(api.retryAutomaticVerification('a'), /Retry is unavailable/);
    assert.equal(requests.length, 3);
  }
  await assert.rejects(api.smartSendManualVerification({ ...smartPayload, verification_assignments: [{ verifiers: [{ user_ids: ['b'] }] }] }), { code: 'CONSENT_REQUIRED' });
  assert.equal(requests.length, 3);
});
