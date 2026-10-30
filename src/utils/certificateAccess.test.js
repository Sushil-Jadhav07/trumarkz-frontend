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
  assert.equal(visitorStatusView('failed'), 'failed');
  assert.equal(visitorStatusView('unknown'), 'failed');
  assert.equal(visitorStatusView(undefined), 'failed');
});

test('access responses must confirm the visitor request identity, scoped token and known state', async () => {
  const { validateAccessRequestCreated, validateAccessRequestStatus } = await import('./certificateAccess.js');
  assert.equal(validateAccessRequestCreated({ request_id: 'visitor-id' }).request_id, 'visitor-id');
  for (const data of [{}, { request_id: '' }, { request_id: 7 }]) assert.throws(() => validateAccessRequestCreated(data));
  assert.equal(validateAccessRequestStatus({ request_id: 'visitor-id', status: 'pending_approval', access_token: 'scoped' }, 'visitor-id', { verified: true }).status, 'pending_approval');
  for (const data of [
    { request_id: 'report-id', status: 'approved', access_token: 'scoped' },
    { request_id: 'visitor-id', status: 'unknown', access_token: 'scoped' },
    { request_id: 'visitor-id', status: 'approved' },
    { request_id: 'visitor-id', status: 'approved', access_token: '' },
  ]) assert.throws(() => validateAccessRequestStatus(data, 'visitor-id', { verified: true }));
});

test('holder details and decisions never assume success from incomplete or contradictory responses', async () => {
  const { validateHolderInfo, validateHolderDecision } = await import('./certificateAccess.js');
  const info = { visitor_email: 'visitor@example.test', requires_phone_number: true, approval_deadline: '2030-01-01T00:00:00Z' };
  assert.equal(validateHolderInfo(info), info);
  for (const data of [{}, { ...info, requires_phone_number: undefined }, { ...info, approval_deadline: 'invalid' }]) assert.throws(() => validateHolderInfo(data));
  assert.equal(validateHolderDecision({ status: 'approved' }, 'approve').status, 'approved');
  assert.equal(validateHolderDecision({ status: 'rejected' }, 'reject').status, 'rejected');
  for (const data of [{}, { status: 'pending_approval' }, { status: 'rejected' }]) assert.throws(() => validateHolderDecision(data, 'approve'));
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
