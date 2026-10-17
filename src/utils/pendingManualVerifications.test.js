import test from 'node:test';
import assert from 'node:assert/strict';
import { pendingManualUsers } from './pendingManualVerifications.js';

test('two completed checks are omitted while the remaining check stays eligible', () => {
  const records = [{ user_id: 'a', verification_type_status: {
    address_verification: { status: 'approved' }, education_verification: { status: 'verified' }, drug_test: { status: 'pending' },
  } }];
  assert.deepEqual(pendingManualUsers(records, 'address_verification'), []);
  assert.deepEqual(pendingManualUsers(records, 'education_verification'), []);
  assert.deepEqual(pendingManualUsers(records, 'drug_test').map((user) => user.id), ['a']);
});
test('mixed types include only their own pending users, independent of overall status', () => {
  const records = [
    { id: 'a', verification_status: 'pending', verification_type_status: { address_verification: { status: 'approved' } } },
    { id: 'b', verification_status: 'approved', verification_type_status: { address_verification: { status: 'pending', report_url: 'https://report.test' } } },
    { id: 'c', verification_type_status: { education_verification: { status: 'pending' } } },
  ];
  assert.deepEqual(pendingManualUsers(records, 'Address Verification').map((user) => user.id), ['b']);
});
test('final decisions do not get re-emailed through ordinary Smart Send', () => {
  for (const status of ['approved', 'VERIFIED', 'completed', 'verification_completed', 'rejected', 'failed']) {
    assert.deepEqual(pendingManualUsers([{ id: 'a', verification_type_status: { check: { status } } }], 'check'), []);
  }
});
test('in-progress and review states remain pending even when a report already exists', () => {
  for (const status of ['pending', 'processing', 'doc_uploaded', 'awaiting_review', 'verification_in_progress']) {
    assert.equal(pendingManualUsers([{ id: 'a', verification_type_status: { check: { status } } }], 'check').length, 1);
  }
});
test('absent checks, absent identities and duplicate users cannot receive extra assignments', () => {
  const user = { entity_id: 'product-a', product_name: 'Product A', verification_type_status: { check: 'pending' } };
  assert.deepEqual(pendingManualUsers([{}, { id: 'other' }, user, user], 'check'), [{ id: 'product-a', name: 'Product A' }]);
  assert.deepEqual(pendingManualUsers(null, 'check'), []);
});
