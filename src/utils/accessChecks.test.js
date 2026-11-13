import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeChecks, isSelectableCheck, toggleCheckSelection, selectedCheckIds, legacyNote, permissionRequestMessage, permissionErrorMessage,
  approvedReportsWithExpiry, normalizeStatusChecks, expiryText, normalizeHolderChecks, setHolderDecision, buildCheckDecisions,
  applyCheckDecisions, cachedTokenFor, writeAccessCache, readAccessCache, hasApprovedChecks, checkStatusMeta, statusErrorKind,
} from './accessChecks.js';
import { accessNextStep, validateAccessRequestStatus } from './certificateAccess.js';

const checksResponse = { checks: [
  { check_id: 'type:Address Verification', name: 'Address Verification', status: 'approved', scanned: true, shares_report_with: [], independent_report: true, expires_at: '2026-11-19T10:00:00Z' },
  { check_id: 'type:Company Verification', name: 'Company Verification', status: 'available', scanned: false, shares_report_with: [], independent_report: true, expires_at: null },
  { check_id: 'type:Criminal Background', name: 'Criminal Background', status: 'requested', shares_report_with: [], independent_report: true },
  { check_id: 'type:Driving License', name: 'Driving License', status: 'available', shares_report_with: ['Photo'], independent_report: false },
  { check_id: 'type:Photo', name: 'Photo', status: 'available', shares_report_with: ['Driving License'], independent_report: false },
  { name: 'no id' },
] };

test('checks are read by id; rows without a check_id are dropped', () => {
  const checks = normalizeChecks(checksResponse);
  assert.deepEqual(checks.map((c) => c.name), ['Address Verification', 'Company Verification', 'Criminal Background', 'Driving License', 'Photo']);
  assert.equal(checks[0].expiresAt, '2026-11-19T10:00:00Z');
  assert.deepEqual(normalizeChecks(null), []);
});

test('only available checks can be selected; approved and requested ones never are', () => {
  const checks = normalizeChecks(checksResponse);
  assert.deepEqual(checks.map(isSelectableCheck), [false, true, false, true, true]);
  const picked = toggleCheckSelection(new Set(), checks, 'type:Address Verification');
  assert.equal(picked.size, 0, 'approved: no-op');
  assert.equal(toggleCheckSelection(new Set(), checks, 'type:Criminal Background').size, 0, 'requested: no-op');
});

test('legacy combined reports toggle together and explain themselves', () => {
  const checks = normalizeChecks(checksResponse);
  const on = toggleCheckSelection(new Set(), checks, 'type:Driving License');
  assert.deepEqual([...on].sort(), ['type:Driving License', 'type:Photo']);
  assert.equal(toggleCheckSelection(on, checks, 'type:Photo').size, 0, 'turning one off turns the group off');
  assert.match(legacyNote(checks[3]), /also covers Photo/);
  assert.equal(legacyNote(checks[1]), '');
});

test('the request carries only selectable ids, at most 50', () => {
  const checks = normalizeChecks(checksResponse);
  const ids = selectedCheckIds(new Set(['type:Company Verification', 'type:Address Verification']), checks);
  assert.deepEqual(ids, ['type:Company Verification']);
  const many = Array.from({ length: 60 }, (_, i) => ({ id: `c${i}`, name: `C${i}`, status: 'available', independent: true, sharesWith: [] }));
  assert.equal(selectedCheckIds(new Set(many.map((c) => c.id)), many).length, 50);
  assert.equal(hasApprovedChecks(checks), true);
});

test('permission request messages never promise delivery and cover the already-waiting case', () => {
  assert.match(permissionRequestMessage({ holder_notified: true, requested_checks: ['a', 'b'], added_checks: ['a', 'b'] }), /about 2 checks/);
  assert.match(permissionRequestMessage({ holder_notified: false, added_checks: ['a'] }), /not emailed again/);
  assert.match(permissionErrorMessage(409, ''), /already have a request/);
  assert.equal(permissionErrorMessage(422, 'bad check'), 'bad check');
  assert.match(permissionErrorMessage(404, ''), /Verify your email again/);
});

test('approved reports carry their label, checks and expiry; only listed ones count', () => {
  const list = approvedReportsWithExpiry({ approved_reports: [
    { report_ref: 'manual:5b:0', view_path: '/verification/manual/reports/5b/view/0', label: 'Address Verification report', checks: ['Address Verification'], expires_at: '2026-11-19T10:00:00Z' },
    { label: 'no path' },
  ] }, 'https://api.example.com/');
  assert.equal(list.length, 1);
  assert.equal(list[0].url, 'https://api.example.com/verification/manual/reports/5b/view/0');
  assert.deepEqual(list[0].checks, ['Address Verification']);
  assert.deepEqual(approvedReportsWithExpiry({}, ''), []);
});

test('expiry text', () => {
  const now = Date.parse('2026-11-12T10:00:00Z');
  assert.equal(expiryText('2026-11-19T10:00:00Z', now), '7 days left');
  assert.equal(expiryText('2026-11-12T15:00:00Z', now), '5 hours left');
  assert.equal(expiryText('2026-11-12T09:00:00Z', now), 'Expired');
  assert.equal(expiryText(null, now), '');
});

test('status checks and statuses read safely', () => {
  assert.equal(normalizeStatusChecks({ checks: [{ check_id: 'type:X', name: 'X', status: 'EXPIRED' }] })[0].status, 'expired');
  assert.equal(checkStatusMeta('weird').label, 'weird');
  assert.equal(statusErrorKind(404), 'verify_again');
  assert.equal(statusErrorKind(429), 'rate_limited');
});

const holderInfo = { checks: [
  { check_id: 'a', check_key: 'type:Address', name: 'Address', status: 'requested', shares_report_with: [] },
  { check_id: 'd', check_key: 'type:Driving', name: 'Driving License', status: 'requested', shares_report_with: ['Photo'] },
  { check_id: 'p', check_key: 'type:Photo', name: 'Photo', status: 'requested', shares_report_with: ['Driving License'] },
  { check_id: null, check_key: 'type:Company', name: 'Company', status: 'not_requested', shares_report_with: [] },
] };

test('holder checks: per-check decisions, legacy groups decided together, not-requested ones untouched', () => {
  const checks = normalizeHolderChecks(holderInfo);
  let d = setHolderDecision({}, checks, 'type:Address', 'approve');
  d = setHolderDecision(d, checks, 'type:Driving', 'reject');
  assert.deepEqual(d, { 'type:Address': 'approve', 'type:Driving': 'reject', 'type:Photo': 'reject' });
  assert.deepEqual(setHolderDecision(d, checks, 'type:Address', 'approve'), { 'type:Driving': 'reject', 'type:Photo': 'reject' }, 'same choice again clears it');
  assert.deepEqual(setHolderDecision({}, checks, 'type:Company', 'approve'), {}, 'not requested: no-op');
  assert.deepEqual(buildCheckDecisions(d, checks), [
    { check_id: 'a', decision: 'approve' }, { check_id: 'd', decision: 'reject' }, { check_id: 'p', decision: 'reject' },
  ]);
});

test('decisions apply from the server answer, or locally when it sends no list', () => {
  const checks = normalizeHolderChecks(holderInfo);
  const local = applyCheckDecisions(checks, {}, [{ check_id: 'a', decision: 'approve' }]);
  assert.deepEqual(local.map((c) => c.status), ['approved', 'requested', 'requested', 'not_requested']);
  const server = applyCheckDecisions(checks, { checks: [{ check_id: 'a', check_key: 'type:Address', name: 'Address', status: 'rejected' }] }, []);
  assert.equal(server.length, 1);
});

test('the browser cache only holds the last token for exactly that request', () => {
  const store = (() => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; })();
  assert.equal(cachedTokenFor('r1', store), null);
  writeAccessCache({ requestId: 'r1', accessToken: 'tok', email: 'v@x.in' }, store);
  assert.equal(cachedTokenFor('r1', store).accessToken, 'tok');
  assert.equal(cachedTokenFor('r2', store), null, 'another request id never reuses it');
  writeAccessCache(null, store);
  assert.equal(readAccessCache(store), null);
  assert.equal(cachedTokenFor('r1', { getItem() { throw new Error('blocked'); } }), null);
});

test('select_checks is the third-party next step', () => {
  assert.equal(accessNextStep({ next_step: 'select_checks', identity_type: 'third_party' }), 'select_checks');
  assert.throws(() => accessNextStep({ next_step: 'select_checks', identity_type: 'holder' }));
  assert.equal(validateAccessRequestStatus({ request_id: 'r', status: 'pending_approval', access_token: 't', next_step: 'select_checks', identity_type: 'third_party' }, 'r', { verified: true }).status, 'pending_approval');
});
