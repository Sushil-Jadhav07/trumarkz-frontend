import test from 'node:test';
import assert from 'node:assert/strict';
import {
  splitEmailText, addEmails, isEmailLike, validEmails, invalidEmails, normalizeShareHolders, shareableHolders, normalizeLimits,
  validateBulk, buildBulkPayload, buildHolderWisePayload, validateHolderWise, estimateEmails, remainingAfterBulk, remainingAfterHolderWise,
  summaryParts, resultTone, sendErrorMessage, errorText, recipientStatusMeta, holderStatusMeta, normalizeHistory, SDC_EMAIL_DEFAULT_LIMITS,
} from './sdcEmailShare.js';

test('pasted text with commas, semicolons, spaces and new lines becomes lower-case addresses, once each', () => {
  assert.deepEqual(splitEmailText('HR@Client.com, audit@client.com;ops@client.com\n  <boss@x.in>  "q@y.io".'), ['hr@client.com', 'audit@client.com', 'ops@client.com', 'boss@x.in', 'q@y.io']);
  const first = addEmails([], 'a@x.com b@x.com');
  const second = addEmails(first.list, 'A@x.com, c@x.com');
  assert.deepEqual(second.list, ['a@x.com', 'b@x.com', 'c@x.com']);
  assert.equal(second.duplicates, 1);
});

test('invalid addresses are kept and told apart from valid ones', () => {
  const list = addEmails([], 'ok@x.com not-an-email a@b @x.com').list;
  assert.deepEqual(validEmails(list), ['ok@x.com']);
  assert.deepEqual(invalidEmails(list), ['not-an-email', 'a@b', '@x.com']);
  assert.equal(isEmailLike(`${'a'.repeat(250)}@x.com`), false, 'longer than 254');
});

const holdersData = { holders: [
  { user_id: 'h1', full_name: 'Asha', sdc_status: 'generated', certificate_id: 'c1', can_share: true, reason: null },
  { user_id: 'h2', full_name: 'Vikram', sdc_status: 'generated', certificate_id: 'c2', can_share: true, reason: null },
  { user_id: 'h3', full_name: 'Meera', sdc_status: 'not_generated', certificate_id: null, can_share: false, reason: 'No SDC has been generated for this holder.' },
  { user_id: 'h4', full_name: 'Old', sdc_status: 'mapping_unavailable', can_share: false, reason: 'legacy' },
] };

test('only holders the server marks can_share can be selected', () => {
  const holders = normalizeShareHolders(holdersData);
  assert.equal(holders.length, 4);
  assert.deepEqual(shareableHolders(holders).map((h) => h.id), ['h1', 'h2']);
  assert.equal(holders[2].reason, 'No SDC has been generated for this holder.');
  assert.deepEqual(normalizeShareHolders(null), []);
});

test('bulk payload carries exactly one of select_all or user_ids, never both', () => {
  const ids = ['h1', 'h2'];
  assert.deepEqual(buildBulkPayload({ selectedIds: new Set(ids), shareableIds: ids, emails: ['a@x.com'] }), { select_all: true, emails: ['a@x.com'] });
  const partial = buildBulkPayload({ selectedIds: new Set(['h1']), shareableIds: ids, emails: ['a@x.com', 'bad'] });
  assert.deepEqual(partial, { user_ids: ['h1'], emails: ['a@x.com', 'bad'] });
  assert.ok(!('select_all' in partial));
  assert.ok(!('user_ids' in buildBulkPayload({ selectedIds: new Set(ids), shareableIds: ids, emails: [] })));
});

test('bulk is checked against the limits before anything is sent', () => {
  const limits = normalizeLimits({ max_sdcs_per_request: 50, max_recipients_per_request: 100, max_emails_per_request: 200, max_attachments_per_email: 10 });
  assert.match(validateBulk({ selectedCount: 0, emails: ['a@x.com'], limits }), /Select at least one holder/);
  assert.match(validateBulk({ selectedCount: 2, emails: ['bad'], limits }), /at least one valid email/);
  assert.match(validateBulk({ selectedCount: 51, emails: ['a@x.com'], limits }), /up to 50 SDCs/);
  const many = Array.from({ length: 101 }, (_, i) => `u${i}@x.com`);
  assert.match(validateBulk({ selectedCount: 1, emails: many, limits }), /up to 100 recipients/);
  const sixty = Array.from({ length: 50 }, (_, i) => `u${i}@x.com`);
  assert.equal(estimateEmails(50, 50, 10), 250);
  assert.match(validateBulk({ selectedCount: 50, emails: sixty, limits }), /about 250 emails/);
  assert.equal(validateBulk({ selectedCount: 2, emails: ['a@x.com', 'b@x.com'], limits }), '');
  assert.deepEqual(normalizeLimits(undefined), SDC_EMAIL_DEFAULT_LIMITS);
});

test('holder-wise sends only rows that have addresses, and needs at least one valid address', () => {
  const rowsById = { h1: ['a@x.com', 'b@x.com'], h2: [], h5: ['c@x.com'] };
  assert.deepEqual(buildHolderWisePayload(rowsById), { rows: [{ user_id: 'h1', emails: ['a@x.com', 'b@x.com'] }, { user_id: 'h5', emails: ['c@x.com'] }] });
  const limits = normalizeLimits();
  assert.match(validateHolderWise({ rowsById: { h1: [], h2: [] }, limits }), /at least one valid email/);
  assert.match(validateHolderWise({ rowsById: { h1: ['bad'] }, limits }), /at least one valid email/);
  assert.equal(validateHolderWise({ rowsById, limits }), '');
});

const bulkResponse = {
  recipients: [
    { email: 'hr@client.com', status: 'email_accepted' },
    { email: 'audit@client.com', status: 'email_accepted' },
    { email: 'ops@client.com', status: 'failed', error_code: 'smtp_rejected', error: 'The email server rejected the message.' },
    { email: 'half@client.com', status: 'partially_accepted' },
  ],
  invalid_emails: [{ value: 'not-an-email', reason: 'invalid_format' }],
  duplicate_emails: [],
};

test('after a bulk send, accepted addresses are cleared and everything else stays for another try', () => {
  const sent = ['hr@client.com', 'audit@client.com', 'ops@client.com', 'half@client.com', 'not-an-email', 'never-mentioned@x.com'];
  assert.deepEqual(remainingAfterBulk(sent, bulkResponse), ['ops@client.com', 'half@client.com', 'not-an-email', 'never-mentioned@x.com']);
});

test('after a holder-wise send, each row keeps only what was not accepted; an unavailable holder keeps everything', () => {
  const rows = { h1: ['a@x.com', 'b@x.com', 'oops'], h2: ['c@x.com'], h3: ['d@x.com'] };
  const response = { holders: [
    { user_id: 'h1', status: 'partially_accepted', recipients: [{ email: 'a@x.com', status: 'email_accepted' }, { email: 'b@x.com', status: 'failed' }], invalid_emails: [{ value: 'oops' }] },
    { user_id: 'h2', status: 'email_accepted', recipients: [{ email: 'c@x.com', status: 'email_accepted' }], invalid_emails: [] },
    { user_id: 'h3', status: 'unavailable', error_code: 'sdc_revoked', recipients: [], invalid_emails: [] },
  ] };
  assert.deepEqual(remainingAfterHolderWise(rows, response), { h1: ['b@x.com', 'oops'], h2: [], h3: ['d@x.com'] });
  assert.deepEqual(remainingAfterHolderWise({ h9: ['z@x.com'] }, response), { h9: ['z@x.com'] });
});

test('wording never says delivered; failures keep the server text, then a known code', () => {
  assert.equal(recipientStatusMeta('email_accepted').label, 'Accepted by mail server');
  for (const s of ['email_accepted', 'partially_accepted', 'failed', 'not_sent']) assert.doesNotMatch(recipientStatusMeta(s).label, /deliver/i);
  assert.equal(holderStatusMeta('unavailable').label, 'SDC unavailable');
  assert.equal(holderStatusMeta('mystery').label, 'mystery');
  assert.equal(errorText({ error: 'rejected', error_code: 'smtp_rejected' }), 'rejected');
  assert.match(errorText({ error_code: 'sdc_revoked' }), /revoked/);
  assert.match(errorText({ error_code: 'pdf_changed' }), /changed/);
});

test('result summary and tone', () => {
  const parts = summaryParts({ emails_accepted: 2, emails_failed: 1, invalid_emails: 1, duplicate_emails_removed: 1, holders_unavailable: 1 });
  assert.deepEqual(parts, ['2 emails accepted', '1 failed', '1 SDC unavailable', '1 invalid address', '1 duplicate removed']);
  assert.equal(resultTone({ summary: { emails_accepted: 3 } }), 'success');
  assert.equal(resultTone({ summary: { emails_accepted: 2, emails_failed: 1 } }), 'partial');
  assert.equal(resultTone({ summary: { emails_accepted: 0, emails_failed: 2 } }), 'none');
});

test('error messages per status', () => {
  assert.equal(sendErrorMessage(400, 'ids not in this batch'), 'ids not in this batch');
  assert.match(sendErrorMessage(403), /send the batch to the organization first/);
  assert.match(sendErrorMessage(429, 'Daily limit reached.', '120'), /about 120 seconds.*Nothing was sent/);
  assert.match(sendErrorMessage(503), /try again/i);
  assert.match(sendErrorMessage(422), /not valid/);
});

test('history is one row per email, newest first, with a readable mode', () => {
  const h = normalizeHistory({ total: 2, items: [
    { delivery_id: 'd1', share_id: 's1', mode: 'holder_wise', recipient_email: 'a@x.com', user_ids: ['u1'], status: 'email_accepted', requested_by_role: 'organization', created_at: '2026-11-16T10:00:00Z' },
    { delivery_id: 'd2', share_id: 's2', mode: 'bulk', recipient_email: 'b@x.com', user_ids: ['u1', 'u2'], status: 'failed', error_code: 'smtp_rejected', error: 'rejected', created_at: '2026-11-16T09:00:00Z' },
  ] });
  assert.equal(h.total, 2);
  assert.deepEqual(h.items.map((i) => [i.mode, i.holders, i.status]), [['Holder-wise', 1, 'email_accepted'], ['Bulk', 2, 'failed']]);
  assert.equal(h.items[1].error, 'rejected');
  assert.deepEqual(normalizeHistory(null), { total: 0, items: [] });
});
