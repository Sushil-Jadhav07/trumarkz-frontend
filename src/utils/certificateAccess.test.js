import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isProtectedMode, isHumanBatch, grantStatusMeta, canRevokeGrant, visitorStatusView, isValidEmail, formatAccessDate,
} from './certificateAccess.js';

test('only holder_approval counts as protected', () => {
  assert.equal(isProtectedMode('holder_approval'), true);
  assert.equal(isProtectedMode('public'), false);
  assert.equal(isProtectedMode(undefined), false);
});

test('only Human (or untyped legacy) batches have an access mode to manage', () => {
  assert.equal(isHumanBatch('human'), true);
  assert.equal(isHumanBatch(null), true);
  assert.equal(isHumanBatch('product'), false);
  assert.equal(isHumanBatch('warranty'), false);
});

test('finished grants cannot be revoked; live ones can', () => {
  for (const status of ['pending_email', 'pending_approval', 'approved']) assert.equal(canRevokeGrant({ id: 'g', status }), true, status);
  for (const status of ['rejected', 'revoked', 'expired']) assert.equal(canRevokeGrant({ id: 'g', status }), false, status);
  assert.equal(canRevokeGrant({ status: 'approved' }), false);
});

test('unknown statuses still render a readable label', () => {
  assert.equal(grantStatusMeta('some_new_state').label, 'some new state');
});

test('visitor screens follow the documented status meanings', () => {
  assert.equal(visitorStatusView('pending_email'), 'waiting');
  assert.equal(visitorStatusView('pending_approval'), 'waiting');
  assert.equal(visitorStatusView('approved'), 'approved');
  assert.equal(visitorStatusView('expired'), 'expired');
  assert.equal(visitorStatusView('revoked'), 'revoked');
  assert.equal(visitorStatusView('rejected'), 'rejected');
});

test('email check and date formatting', () => {
  assert.equal(isValidEmail(' a@b.co '), true);
  assert.equal(isValidEmail('a@b'), false);
  assert.equal(formatAccessDate(null), '—');
  assert.equal(formatAccessDate('nope'), '—');
});

test('Open batches never offer the switch; unknown visibility leaves it to the server', async () => {
  const { canRequireHolderApproval } = await import('./certificateAccess.js');
  assert.equal(canRequireHolderApproval('public'), false);
  assert.equal(canRequireHolderApproval('open_search'), false);
  assert.equal(canRequireHolderApproval('permission_required'), true);
  assert.equal(canRequireHolderApproval(''), true);
});
