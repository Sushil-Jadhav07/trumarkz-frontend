import test from 'node:test';
import assert from 'node:assert/strict';
import { automaticChecks, canRetryAutomatic, missingAutomaticReports, retryOutcome, startAutomaticPolling } from './automaticVerification.js';

const batch = { batch_type: 'human', credential_visibility: 'private' };
const record = { consent_status: 'accepted', verification_type_status: { licence: { label: 'automatic', status: 'pending', report_url: null }, address: { label: 'manual', status: 'pending' } } };
test('retry eligibility uses the actual check category and report — never holder consent', () => {
  assert.equal(automaticChecks(record).length, 1);
  assert.equal(canRetryAutomatic(record, batch), true);
  // Permission Required controls report access only; it never blocks verification work.
  for (const consent_status of ['pending', 'rejected', 'expired', null, undefined]) assert.equal(canRetryAutomatic({ ...record, consent_status }, batch), true);
  for (const batch_type of ['product', 'warranty']) assert.equal(canRetryAutomatic(record, { ...batch, batch_type }), false);
  assert.equal(canRetryAutomatic({ verification_type_status: { address: { label: 'manual', status: 'failed' } } }, { ...batch, credential_visibility: 'public' }), false);
  assert.equal(canRetryAutomatic(record, { ...batch, credential_visibility: 'public' }), true);
  assert.equal(canRetryAutomatic({ ...record, verification_type_status: { licence: { label: 'automatic', status: 'approved', report_url: 'gs://private/report.pdf' } } }, batch), false);
  assert.equal(missingAutomaticReports({ verification_type_status: { licence: { label: 'automatic', status: 'failed', report_url: 'old-report' } } }).length, 0);
});
test('final automatic decisions disable retry even when their report is missing', () => {
  for (const status of ['approved', 'rejected', 'verified', 'completed', ' APPROVED ']) {
    const final = { ...record, verification_type_status: { licence: { label: 'automatic', status, report_url: null } } };
    assert.equal(canRetryAutomatic(final, batch), false, status);
    assert.equal(missingAutomaticReports(final).length, 0, status);
  }
});
test('only a missing unfinished automatic report can be retried; manual decisions do not block it', () => {
  for (const status of ['pending', 'failed', 'error']) {
    const eligible = { ...record, verification_type_status: { licence: { label: 'automatic', status, report_url: null }, address: { label: 'manual', status: 'approved', report_url: 'manual.pdf' } } };
    assert.equal(canRetryAutomatic(eligible, batch), true, status);
    assert.equal(canRetryAutomatic({ ...eligible, verification_type_status: { licence: { label: 'automatic', status, report_url: 'automatic.pdf' } } }, batch), false, status);
  }
});
test('person-wide retry cannot rerun a completed automatic sibling check', () => {
  const mixed = { ...record, verification_type_status: { licence: { label: 'automatic', status: 'failed', report_url: null }, other: { label: 'automatic', status: 'approved', report_url: null } } };
  assert.equal(canRetryAutomatic(mixed, batch), false);
});
test('retry acknowledges scheduling and in-progress without claiming completion or inventing fields', () => {
  assert.match(retryOutcome({ batch_user_id: 'a', scheduled: true }, 'a'), /scheduled.*Waiting/);
  assert.match(retryOutcome({ batch_user_id: 'a', scheduled: false, already_in_progress: true }, 'a'), /already in progress/);
  assert.equal(retryOutcome({ batch_user_id: 'a', scheduled: false, message: 'Not scheduled' }, 'a'), 'Not scheduled');
  for (const data of [{ scheduled: true }, { batch_user_id: 'wrong', scheduled: true }, { batch_user_id: 'a', scheduled: 'true' }, { batch_user_id: 'a', scheduled: true, already_in_progress: 'yes' }]) assert.throws(() => retryOutcome(data, 'a'));
});

const turn = () => new Promise((resolve) => setImmediate(resolve));
const polling = (overrides = {}) => {
  const values = [], errors = [], queue = []; let timeouts = 0;
  const stop = startAutomaticPolling({ read: async () => ({ watch: true }), onValue: (value) => values.push(value), onError: (error) => errors.push(error), onTimeout: () => { timeouts += 1; }, setTimer: (fn) => { queue.push(fn); return fn; }, clearTimer: (fn) => { const index = queue.indexOf(fn); if (index >= 0) queue.splice(index, 1); }, maxReads: 3, ...overrides });
  return { stop, values, errors, queue, timeouts: () => timeouts };
};
test('polling reads sequentially, stops when reports arrive and never submits a retry', async () => {
  let reads = 0;
  const f = polling({ read: async () => ({ watch: ++reads < 2, report: reads === 2 ? 'report.pdf' : null }) });
  await turn(); assert.equal(reads, 1); assert.equal(f.queue.length, 1);
  await f.queue.shift()(); assert.equal(reads, 2); assert.equal(f.queue.length, 0); assert.equal(f.values[1].report, 'report.pdf');
  f.stop();
});
test('polling is bounded and exposes a timeout instead of spinning forever', async () => {
  const f = polling(); await turn();
  await f.queue.shift()(); await f.queue.shift()();
  assert.equal(f.values.length, 3); assert.equal(f.timeouts(), 1); assert.equal(f.queue.length, 0); f.stop();
});
test('poll errors stop reads for auth, consent, invalid targets and network failures', async () => {
  for (const status of [401, 403, 404, 422, 500]) {
    const error = Object.assign(new Error('Unavailable'), { response: { status } });
    const f = polling({ read: async () => { throw error; } }); await turn();
    assert.equal(f.errors[0], error); assert.equal(f.queue.length, 0); f.stop();
  }
});
test('closing or switching record ignores an in-flight result and clears timers', async () => {
  let resolve;
  const f = polling({ read: () => new Promise((done) => { resolve = done; }) });
  f.stop(); resolve({ watch: true }); await turn();
  assert.equal(f.values.length, 0); assert.equal(f.queue.length, 0);
  const scheduled = polling(); await turn(); scheduled.stop(); assert.equal(scheduled.queue.length, 0);
});
test('hidden tabs pause network reads without consuming the polling budget', async () => {
  let visible = false, reads = 0;
  const f = polling({ isVisible: () => visible, read: async () => { reads += 1; return { watch: false }; } });
  assert.equal(reads, 0); await f.queue.shift()(); assert.equal(reads, 0);
  visible = true; await f.queue.shift()(); assert.equal(reads, 1); assert.equal(f.timeouts(), 0); f.stop();
});
