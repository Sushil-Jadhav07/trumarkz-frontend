import test from 'node:test';
import assert from 'node:assert/strict';
import { trackBatchOrigin, batchOrigin, isBatchWizardPath, DEFAULT_BATCH_ORIGIN } from './batchOrigin.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };

test('Back returns to the page the batch was started from', () => {
  const s = memory();
  trackBatchOrigin('/org/batch-status', s);
  trackBatchOrigin('/org/create-batch', s);
  trackBatchOrigin('/org/verifications', s);
  assert.equal(batchOrigin(s), '/org/batch-status');
  trackBatchOrigin('/org/dashboard', s);
  trackBatchOrigin('/org/create-batch', s);
  assert.equal(batchOrigin(s), '/org/dashboard');
});

test('wizard pages never become the origin; with nothing recorded it falls back to the dashboard', () => {
  const s = memory();
  for (const p of ['/org/create-batch', '/org/industry', '/org/verifications', '/org/permissions', '/org/template', '/org/costing', '/org/product/sector']) {
    assert.equal(isBatchWizardPath(p), true, p);
    trackBatchOrigin(p, s);
  }
  assert.equal(batchOrigin(s), DEFAULT_BATCH_ORIGIN);
  assert.equal(batchOrigin(null), DEFAULT_BATCH_ORIGIN);
});

test('an unexpected stored value is ignored', () => {
  const s = memory();
  s.setItem('trumarkz_batch_origin', 'https://evil.example/');
  assert.equal(batchOrigin(s), DEFAULT_BATCH_ORIGIN);
});
