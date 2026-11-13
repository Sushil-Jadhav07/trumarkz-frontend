import test from 'node:test';
import assert from 'node:assert/strict';
import {
  eligibleHolders, selectAllEligible, toggleHolder, idsToSend, shareTotals, shareErrorMessage, resultMeta, resultDetail,
  sharingStatusMeta, sdcStatusMeta, HOLDER_SHARE_LIMIT, lastActivityText,
} from './holderSdcShares.js';

const holders = [
  { user_id: 'a', full_name: 'A', can_send: true, sdc_status: 'generated', sharing_status: 'not_shared' },
  { user_id: 'b', full_name: 'B', can_send: false, sdc_status: 'not_generated', sharing_status: 'not_available' },
  { user_id: 'c', full_name: 'C', can_send: true, sdc_status: 'generated', sharing_status: 'failed', last_error: 'SMTP 550' },
];

test('only holders with can_send can be ticked; select-all picks eligible ones only', () => {
  assert.deepEqual(eligibleHolders(holders).map((h) => h.user_id), ['a', 'c']);
  assert.deepEqual([...selectAllEligible(holders)], ['a', 'c']);
  assert.equal(toggleHolder(new Set(), holders, 'b').size, 0);
  assert.deepEqual([...toggleHolder(new Set(), holders, 'a')], ['a']);
  assert.equal(toggleHolder(new Set(['a']), holders, 'a').size, 0);
});

test('a call carries at most 25 holders', () => {
  const many = Array.from({ length: 40 }, (_, i) => ({ user_id: `u${i}`, can_send: true }));
  assert.equal(selectAllEligible(many).size, HOLDER_SHARE_LIMIT);
  let selected = new Set();
  many.forEach((h) => { selected = toggleHolder(selected, many, h.user_id); });
  assert.equal(selected.size, HOLDER_SHARE_LIMIT);
  assert.equal(idsToSend(new Set(many.map((h) => h.user_id)), many).length, HOLDER_SHARE_LIMIT);
});

test('a stale selection never sends to someone who became ineligible', () => {
  assert.deepEqual(idsToSend(new Set(['a', 'b', 'zzz']), holders), ['a']);
});

test('statuses never claim delivery', () => {
  assert.equal(sharingStatusMeta('shared').label, 'Email accepted');
  assert.equal(resultMeta('email_accepted').label, 'Email accepted by mail server');
  for (const s of ['shared', 'email_accepted']) assert.doesNotMatch(`${sharingStatusMeta(s).label} ${resultMeta(s).label}`, /deliver/i);
  assert.equal(sdcStatusMeta('mapping_ambiguous').label, 'Match unclear');
  assert.equal(resultMeta('something_new').label, 'something new');
});

test('failures keep the server text, then a known code', () => {
  assert.equal(resultDetail({ error: 'SMTP 550 mailbox unavailable', error_code: 'smtp_550' }), 'SMTP 550 mailbox unavailable');
  assert.match(resultDetail({ error_code: 'mapping_mismatch' }), /does not belong/);
  assert.equal(resultDetail({ error_code: 'smtp_timeout' }), 'smtp timeout');
});

test('per-holder results are counted from the response', () => {
  const t = shareTotals({ requested: 3, email_accepted: 1, results: [{ status: 'email_accepted' }, { status: 'failed' }, { status: 'no_email' }] });
  assert.deepEqual([t.requested, t.accepted, t.results.length], [3, 1, 3]);
  assert.equal(shareTotals({ results: [{ status: 'email_accepted' }] }).accepted, 1);
});

test('errors', () => {
  assert.match(shareErrorMessage(403), /not available/);
  assert.match(shareErrorMessage(429), /Too many/);
  assert.equal(shareErrorMessage(400, 'user x not in batch'), 'user x not in batch');
  assert.match(lastActivityText(holders[2]), /SMTP 550/);
  assert.equal(lastActivityText({}), '');
});
