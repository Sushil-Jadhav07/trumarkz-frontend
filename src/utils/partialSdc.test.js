import test from 'node:test';
import assert from 'node:assert/strict';
import {
  authorizableHolders, authorizationIsStale, buildAuthorizationBody, bulkDeleteReady, describeGenerateError,
  dhiwaySchemaForPayload, groupSchemaWarnings, holderAuthorizationState, outputMapSource, parseAuthorizationErrors,
  parseDhiwaySchemaText, schemaImageProblem, shareResultMessage,
} from './partialSdc.js';

const record = (id, types) => ({ id, full_name: `H${id}`, verification_type_status: Object.fromEntries(Object.entries(types).map(([k, s]) => [k, { status: s }])) });

test('a holder with some approved and some pending types can be authorized for the approved ones', () => {
  const state = holderAuthorizationState(record('1', { PAN: 'approved', Passport: 'pending', Aadhar: 'rejected' }));
  assert.deepEqual(state.approvedTypes, ['PAN']);
  assert.equal(state.canAuthorize, true);
  assert.equal(state.fullyVerified, false);
});

test('fully verified holders and holders with nothing approved are not offered', () => {
  assert.equal(holderAuthorizationState(record('1', { PAN: 'approved', Aadhar: 'approved' })).canAuthorize, false);
  assert.equal(holderAuthorizationState(record('2', { PAN: 'pending' })).canAuthorize, false);
  const list = authorizableHolders([
    record('1', { PAN: 'approved', Aadhar: 'approved' }),
    record('2', { PAN: 'approved', Passport: 'pending' }),
    record('3', { PAN: 'rejected', Passport: 'approved' }),
  ]);
  assert.deepEqual(list.map((h) => h.id), ['2', '3']);
});

test('the request body keeps only holders with a type and de-duplicates types', () => {
  assert.equal(buildAuthorizationBody({}), null);
  assert.equal(buildAuthorizationBody({ a: new Set() }), null);
  assert.deepEqual(buildAuthorizationBody({ a: new Set(['PAN']), b: ['X', 'X'], c: [] }), {
    holders: [{ batch_user_id: 'a', verification_types: ['PAN'] }, { batch_user_id: 'b', verification_types: ['X'] }],
  });
});

test('400 errors are split per holder', () => {
  const err = { response: { data: { detail: { message: 'Invalid', holders: [{ batch_user_id: 'a', errors: ['not approved'] }] } } } };
  assert.deepEqual(parseAuthorizationErrors(err), { message: 'Invalid', byHolder: { a: ['not approved'] } });
  assert.deepEqual(parseAuthorizationErrors({ response: { data: { detail: 'plain' } } }), { message: 'plain', byHolder: {} });
});

test('a changed verification result marks an active authorization stale', () => {
  assert.equal(authorizationIsStale({ status: 'active', is_valid: false, stale_verification_types: [] }), true);
  assert.equal(authorizationIsStale({ status: 'active', is_valid: true, stale_verification_types: ['PAN'] }), true);
  assert.equal(authorizationIsStale({ status: 'active', is_valid: true, stale_verification_types: [] }), false);
  assert.equal(authorizationIsStale({ status: 'consumed', is_valid: false }), false);
});

test('generate errors are told apart', () => {
  const e = (status, detail) => ({ response: { status, data: { detail } } });
  assert.equal(describeGenerateError(e(403, { message: 'm', unauthorized_user_ids: ['1'] })).kind, 'unauthorized');
  assert.equal(describeGenerateError(e(403, 'Only a SuperAdmin can generate SDCs.')).kind, 'forbidden');
  assert.equal(describeGenerateError(e(409, { message: 'm', stale_authorizations: [{ batch_user_id: '1' }] })).kind, 'stale');
  assert.equal(describeGenerateError(e(409, { message: 'm', partial_authorization_ids: ['x'] })).kind, 'ids');
  assert.equal(describeGenerateError(e(409, { message: 'legacy', batch_user_ids: ['1'] })).kind, 'legacy');
  assert.equal(describeGenerateError(e(409, 'An authorization in this selection is already being used')).kind, 'busy');
  assert.equal(describeGenerateError(e(422, 'bad')).kind, 'validation');
  assert.equal(describeGenerateError(e(502, 'x')).kind, 'dhiway');
  assert.equal(describeGenerateError(e(500, 'boom')).kind, 'other');
});

test('share results map every email status', () => {
  assert.match(shareResultMessage({ email_status: 'sent', organization_email: 'o@x.in', attached_certificate_count: 2, emailed_certificate_count: 3 }).text, /o@x.in \(2 of 3 attached\)/);
  assert.equal(shareResultMessage({ email_status: 'failed', email_error: 'SMTP down' }).retry, true);
  assert.match(shareResultMessage({ email_status: 'no_email' }).text, /no registered email/);
  assert.match(shareResultMessage({ email_status: 'no_certificates' }).text, /No issued SDCs/);
  assert.match(shareResultMessage({ email_status: 'in_progress' }).text, /already being sent/);
  assert.match(shareResultMessage({ email_status: 'already_sent' }).text, /already emailed/);
});

test('bulk delete needs the exact word and 1-50 batches', () => {
  assert.equal(bulkDeleteReady('DELETE', ['a']), true);
  assert.equal(bulkDeleteReady('delete', ['a']), false);
  assert.equal(bulkDeleteReady('DELETE', []), false);
  assert.equal(bulkDeleteReady('DELETE', Array.from({ length: 51 }, (_, i) => i)), false);
});

test('warnings group by severity and unknown codes still show', () => {
  const g = groupSchemaWarnings([
    { code: 'SCHEMA_PROPERTY_UNSOURCED', severity: 'warning', fields: ['a'] },
    { code: 'SAMPLE_EMPTY', severity: 'info' },
    { code: 'BRAND_NEW', severity: 'warning', message: 'Something new' },
  ]);
  assert.equal(g.warning.length, 2);
  assert.equal(g.info.length, 1);
  assert.equal(g.warning[1].title, 'Something new');
  assert.equal(groupSchemaWarnings(undefined, ['old advisory']).info[0].title, 'old advisory');
});

test('the Dhiway schema box accepts a schema, a wrapped schema and refuses the rest', () => {
  assert.equal(parseDhiwaySchemaText('').kind, 'empty');
  assert.equal(parseDhiwaySchemaText('{bad').kind, 'invalid');
  assert.equal(parseDhiwaySchemaText('[1]').kind, 'invalid');
  assert.equal(parseDhiwaySchemaText('{"required":["a"]}').kind, 'invalid');
  assert.equal(parseDhiwaySchemaText('{"properties":{"a":{"type":"string"}}}').kind, 'ok');
  assert.equal(parseDhiwaySchemaText('{"schema":{"properties":{"a":{}}}}').kind, 'ok');
});

test('dhiway_schema is omitted when unchanged, null when cleared, an object when replaced', () => {
  const stored = '{"properties":{"a":{}}}';
  assert.deepEqual(dhiwaySchemaForPayload(stored, stored), { send: false });
  assert.deepEqual(dhiwaySchemaForPayload('', stored), { send: false }, 'a blank box keeps the stored schema');
  assert.deepEqual(dhiwaySchemaForPayload('{"properties":{"b":{}}}', stored), { send: true, value: { properties: { b: {} } } });
  assert.equal(dhiwaySchemaForPayload('{oops', '').error.startsWith('Not valid JSON'), true);
  assert.deepEqual(dhiwaySchemaForPayload('', ''), { send: false });
});

test('output map entries are labelled automatic or manual', () => {
  const config = { output_map_sources: { name: 'automatic', custom: 'manual' } };
  assert.equal(outputMapSource(config, 'name'), 'automatic');
  assert.equal(outputMapSource(config, 'custom'), 'manual');
  assert.equal(outputMapSource({}, 'x'), 'manual');
});

test('schema images: type and size are pre-checked', () => {
  assert.equal(schemaImageProblem({ type: 'image/png', size: 100 }), '');
  assert.match(schemaImageProblem({ type: 'image/svg+xml', size: 100 }), /PNG, JPEG or WebP/);
  assert.match(schemaImageProblem({ type: 'image/png', size: 6 * 1024 * 1024 }), /5 MB/);
  assert.match(schemaImageProblem(null), /Choose/);
});

test('the SuperAdmin sees which holders the organization authorized, which are outdated and which were used', async () => {
  const { authorizationsByHolder, authorizationDisplay } = await import('./partialSdc.js');
  const list = [
    { id: 'a1', batch_user_id: 'u1', status: 'superseded', created_at: '2026-11-14T10:00:00Z', items: [] },
    { id: 'a2', batch_user_id: 'u1', status: 'active', is_valid: true, stale_verification_types: [], created_at: '2026-11-14T11:00:00Z', items: [{ verification_type_name: 'Allergy Testing' }] },
    { id: 'a3', batch_user_id: 'u2', status: 'active', is_valid: false, stale_verification_types: ['PAN'], created_at: '2026-11-14T11:00:00Z', items: [{ verification_type_name: 'PAN' }] },
    { id: 'a4', batch_user_id: 'u3', status: 'consumed', created_at: '2026-11-13T11:00:00Z', items: [] },
    { id: 'a5', batch_user_id: 'u3', status: 'cancelled', created_at: '2026-11-14T09:00:00Z', items: [] },
  ];
  const map = authorizationsByHolder(list);
  assert.equal(map.u1.id, 'a2', 'the active one wins over an older replaced one');
  assert.equal(authorizationDisplay(map.u1).kind, 'authorized');
  assert.deepEqual(authorizationDisplay(map.u1).types, ['Allergy Testing']);
  assert.equal(authorizationDisplay(map.u2).kind, 'outdated');
  assert.deepEqual(authorizationDisplay(map.u2).stale, ['PAN']);
  assert.equal(map.u3.id, 'a5', 'with nothing active, the newest wins');
  assert.equal(authorizationDisplay(null), null);
  assert.equal(authorizationDisplay({ status: 'consumed', items: [] }).kind, 'used');
  assert.deepEqual(authorizationsByHolder(null), {});
});
