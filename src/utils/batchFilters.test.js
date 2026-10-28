import test from 'node:test';
import assert from 'node:assert/strict';
import { batchDateError, batchDatePresets, batchMatchesDate, batchHasVerification, loadBatchVerificationMetadata } from './batchFilters.js';

process.env.TZ = 'Asia/Kolkata';
test('created-date range includes both local calendar-day boundaries', () => {
  for (const createdAt of ['2026-10-24T18:30:00.000Z', '2026-10-25T18:29:59.999Z']) assert.equal(batchMatchesDate({ createdAt }, '2026-10-25', '2026-10-25'), true);
  for (const createdAt of ['2026-10-24T18:29:59.999Z', '2026-10-25T18:30:00.000Z', null, 'bad']) assert.equal(batchMatchesDate({ createdAt }, '2026-10-25', '2026-10-25'), false);
  assert.equal(batchMatchesDate({ createdAt: null }, '', ''), true);
  assert.equal(batchMatchesDate({ createdAt: '2026-10-25T00:00:00Z' }, '', '2026-10-25'), true);
});
test('invalid/reversed calendar ranges fail explicitly instead of silently filtering with NaN', () => {
  assert.match(batchDateError('2026-10-26', '2026-10-25'), /on or before/);
  assert.match(batchDateError('2026-02-30', ''), /valid/);
  assert.match(batchDateError('not-a-date', ''), /valid/);
  assert.equal(batchDateError('2026-10-25', '2026-10-25'), '');
});
test('date presets use inclusive calendar days across month boundaries', () => {
  const presets = batchDatePresets(new Date(2026, 9, 3, 14));
  assert.deepEqual(presets.map(({ from, to }) => [from, to]), [['2026-10-03', '2026-10-03'], ['2026-09-27', '2026-10-03'], ['2026-09-04', '2026-10-03'], ['2026-10-01', '2026-10-03']]);
});
test('verification filtering uses actual IDs or names, never automatic/manual category labels', () => {
  assert.equal(batchHasVerification([{ id: 'uuid', name: 'Address Verification', label: 'manual' }], { id: 'uuid', name: 'address_verification' }), true);
  assert.equal(batchHasVerification(['address_verification'], { name: 'Address Verification' }), true);
  assert.equal(batchHasVerification([{ id: 'other', name: 'Other', label: 'manual' }], { name: 'manual' }), false);
  assert.equal(batchHasVerification([], { id: 'uuid' }), false);
});
test('metadata reads have bounded concurrency and cached batches are reused', async () => {
  const batches = Array.from({ length: 9 }, (_, i) => ({ id: String(i) }));
  const cache = new Map([['0', []]]); let active = 0, maximum = 0, calls = 0;
  const read = async (id) => { calls++; active++; maximum = Math.max(maximum, active); await new Promise((resolve) => setImmediate(resolve)); active--; return { data: { batch_id: id, verification_types: [{ id: 'type' }] } }; };
  const controller = new AbortController();
  await loadBatchVerificationMetadata({ batches, cache, read, signal: controller.signal });
  assert.equal(calls, 8); assert.ok(maximum <= 3); assert.equal(cache.size, 9);
  await loadBatchVerificationMetadata({ batches, cache, read, signal: controller.signal }); assert.equal(calls, 8);
});
test('failed/invalid metadata is not cached as an empty successful result and can be retried', async () => {
  const cache = new Map(), signal = new AbortController().signal;
  await assert.rejects(loadBatchVerificationMetadata({ batches: [{ id: 'a' }], cache, signal, read: async () => ({ data: { batch_id: 'wrong' } }) }), /Could not load/);
  assert.equal(cache.size, 0);
  await loadBatchVerificationMetadata({ batches: [{ id: 'a' }], cache, signal, read: async () => ({ data: { batch_id: 'a', verification_types: [{ id: 'x' }] } }) });
  assert.equal(cache.size, 1);
});
test('changing filters cancels queued work and late reads cannot populate the old cache', async () => {
  let complete; const cache = new Map(), controller = new AbortController(); let calls = 0;
  const request = loadBatchVerificationMetadata({ batches: [{ id: 'a' }, { id: 'b' }], cache, concurrency: 1, signal: controller.signal,
    read: (id) => { calls++; return new Promise((resolve) => { complete = () => resolve({ data: { batch_id: id, verification_types: [] } }); }); } });
  controller.abort(); complete(); await request;
  assert.equal(calls, 1); assert.equal(cache.size, 0);
});
