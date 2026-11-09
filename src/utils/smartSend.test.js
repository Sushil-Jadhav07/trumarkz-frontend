import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canSendToVerifier, checkStatusOf, summarizeSmartSend, smartSendHeadline, emailAccepted, resultKind, describeUserRef, requestIdOf,
} from './smartSend.js';

const amit = { user_id: 'u1', verification_status: 'approved', verification_type_status: { 'Address Verification': { status: 'approved' }, 'Company Verification': { status: 'approved' } } };
const amaan = { user_id: 'u2', verification_status: 'pending', verification_type_status: { 'Address Verification': { status: 'approved' }, 'Company Verification': { status: 'pending' } } };

test('Send to Verifier is offered per verification type, not per overall status', () => {
  assert.equal(canSendToVerifier(amit, 'Company Verification'), false);
  assert.equal(canSendToVerifier(amaan, 'Company Verification'), true);
  assert.equal(canSendToVerifier(amaan, 'Address Verification'), false, 'approved on this type');
  assert.equal(canSendToVerifier(amaan, 'Passport Verification'), false, 'a type the user does not have');
});

test('pending, awaiting-upload and rejected checks are eligible; automatic checks are not', () => {
  const user = { verification_type_status: {
    A: { status: 'rejected' }, B: { status: 'awaiting_upload' }, C: 'pending', D: { status: 'pending', label: 'automatic' }, E: { status: 'verified' },
  } };
  assert.deepEqual(['A', 'B', 'C', 'D', 'E'].map((t) => canSendToVerifier(user, t)), [true, true, true, false, false]);
  assert.equal(checkStatusOf(user, 'a'), 'rejected', 'type names compare loosely');
  assert.equal(checkStatusOf(user, 'zzz'), null);
});

test('a sent response shows the verifier email and only claims what the response supports', () => {
  const data = { total_sent: 1, total_failed: 0, results: [{ status: 'sent', request_id: 'r1', verifier_email: 'v@x.in', verification_type_name: 'Company Verification', email_status: 'sent' }] };
  const summary = summarizeSmartSend(data);
  assert.equal(summary.totals.sent, 1);
  assert.equal(emailAccepted(summary.sent[0]), true);
  assert.equal(emailAccepted({ status: 'sent', request_id: 'r1' }), false, 'no flag, no "accepted" claim');
  assert.equal(smartSendHeadline(summary), '1 request created');
  assert.doesNotMatch(smartSendHeadline(summary), /deliver/i);
});

test('already-open requests are surfaced (with a request id to resend), not silently dropped', () => {
  const data = { total_sent: 0, already_open_requests: [{ request_id: 'r9', verifier_email: 'v@x.in', verification_type_name: 'Company Verification', batch_user_ids: ['u2'] }], results: [] };
  const summary = summarizeSmartSend(data);
  assert.equal(summary.totals.alreadyOpen, 1);
  assert.equal(requestIdOf(summary.alreadyOpen[0]), 'r9');
  assert.deepEqual(summary.resendable.map(requestIdOf), ['r9']);
  assert.equal(smartSendHeadline(summary), '1 already open');
});

test('an email failure keeps the created request id so it can be resent; the real error is kept', () => {
  const data = { total_sent: 0, total_failed: 1, results: [{ status: 'failed', request_id: 'r3', error: 'SMTP 550 mailbox unavailable', verifier_email: 'v@x.in' }] };
  const summary = summarizeSmartSend(data);
  assert.equal(summary.failed[0].error, 'SMTP 550 mailbox unavailable');
  assert.deepEqual(summary.resendable.map(requestIdOf), ['r3']);
  assert.equal(resultKind(summary.failed[0]), 'failed');
  assert.equal(smartSendHeadline(summary), '1 failed');
});

test('totals come from the response; skipped users are listed', () => {
  const summary = summarizeSmartSend({ total_sent: 2, total_failed: 0, total_skipped: 3, skipped_users: [{ batch_user_id: 'u1', reason: 'already approved' }], results: [{ status: 'sent' }, { status: 'sent' }] });
  assert.equal(summary.totals.skipped, 3, 'total_skipped wins over the list length');
  assert.equal(summary.skippedUsers.length, 1);
  assert.equal(smartSendHeadline(summary), '2 requests created · 3 skipped');
  assert.deepEqual(describeUserRef(summary.skippedUsers[0], { u1: 'Amit Chopra' }), { id: 'u1', name: 'Amit Chopra', reason: 'already approved' });
  assert.deepEqual(describeUserRef('u2', { u2: 'Amaan Chopra' }), { id: 'u2', name: 'Amaan Chopra', reason: '' });
});

test('missing optional fields never throw', () => {
  assert.deepEqual(summarizeSmartSend(null).totals, { sent: 0, failed: 0, skipped: 0, alreadyOpen: 0 });
  assert.equal(smartSendHeadline(summarizeSmartSend({})), 'Nothing was sent');
});
