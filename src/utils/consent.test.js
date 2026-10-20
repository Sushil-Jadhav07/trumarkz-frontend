import test from 'node:test';
import assert from 'node:assert/strict';
import { consentDisplay, humanConsentMeta, formatConsentDeadline } from './consent.js';

test('only a server-confirmed pending and unexpired request offers decisions', () => {
  assert.equal(consentDisplay({ consent_status: 'pending', expired: false }), 'pending');
  assert.equal(consentDisplay({ consent_status: 'pending', expired: true }), 'expired');
  assert.equal(consentDisplay({ consent_status: 'pending' }), 'unavailable');
  assert.equal(consentDisplay(null), 'unavailable');
});
test('accepted decisions stay final; swept rejection is displayed as expired', () => {
  assert.equal(consentDisplay({ consent_status: 'accepted', expired: true }), 'accepted');
  assert.equal(consentDisplay({ consent_status: 'rejected', expired: false }), 'rejected');
  assert.equal(consentDisplay({ consent_status: 'rejected', expired: true }), 'expired');
});
test('Human badges use explicit consent status and distinguish automatic expiry', () => {
  for (const [status, label] of [['pending', 'Pending Consent'], ['accepted', 'Consent Accepted'], ['rejected', 'Consent Rejected']]) {
    assert.equal(humanConsentMeta({ entity_type: 'human', consent_status: status }).label, label);
  }
  assert.equal(humanConsentMeta({ full_name: 'Aarav', consent_status: 'rejected', consent_auto_expired: true }).label, 'Consent Expired');
  assert.equal(humanConsentMeta({ entity_type: 'human', full_name: 'Aarav', custom_fields: {}, consent_status: 'pending' }).label, 'Pending Consent');
});
test('Product, Warranty, Open Search and missing data never gain consent UI', () => {
  for (const record of [null, {}, { entity_type: 'human', consent_status: null }, { entity_type: 'product', full_name: 'Record', consent_status: 'pending' }, { batch_type: 'warranty', entity_type: 'human', consent_status: 'accepted' }, { product_name: 'Product', consent_status: 'rejected' }]) {
    assert.equal(humanConsentMeta(record), null);
  }
});
test('deadline formatting uses the provided date and handles missing/invalid values', () => {
  assert.equal(formatConsentDeadline(null), 'Not available');
  assert.equal(formatConsentDeadline('invalid'), 'Not available');
  assert.notEqual(formatConsentDeadline('2026-10-22T09:00:00Z'), 'Not available');
});
