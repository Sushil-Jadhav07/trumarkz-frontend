import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeCertificatesByUser, certificatePublicIdFor, certificateEntriesByUser, certificateEntryFor,
  certificateDisplay, buildCertificateEntry, recordUserIds,
} from './sdcCertificates.js';

const amit = { user_id: 'u-amit', full_name: 'Amit Chopra', email: 'family@example.com' };
const amaan = { user_id: 'u-amaan', full_name: 'Amaan Chopra', email: 'family@example.com' };

test('the mapping is read by exact batch_user_id: Amit has a credential, Amaan does not', () => {
  const { known, byUser } = normalizeCertificatesByUser({ certificates_by_user: { 'u-amit': 'pub-amit' }, sdc_status: 'sdc_created' });
  assert.equal(known, true);
  assert.equal(certificatePublicIdFor(byUser, amit), 'pub-amit');
  assert.equal(certificatePublicIdFor(byUser, amaan), '', 'sharing an email never lends a certificate');
  const entries = certificateEntriesByUser(byUser, {});
  assert.equal(certificateDisplay(certificateEntryFor(entries, amit)).status, 'ready');
  assert.deepEqual(certificateDisplay(certificateEntryFor(entries, amaan)), { status: 'not_issued', label: 'Not Issued', badge: 'default', canView: false, canDownload: false });
});

test('two users with the same name or email each resolve only their own entry', () => {
  const twinA = { user_id: 'a', full_name: 'Sam Roy', email: 'sam@x.in' };
  const twinB = { user_id: 'b', full_name: 'Sam Roy', email: 'sam@x.in' };
  const { byUser } = normalizeCertificatesByUser({ certificates_by_user: { a: 'pub-a', b: 'pub-b' } });
  assert.equal(certificatePublicIdFor(byUser, twinA), 'pub-a');
  assert.equal(certificatePublicIdFor(byUser, twinB), 'pub-b');
});

test('list position never matters: reordered records still resolve by id', () => {
  const { byUser } = normalizeCertificatesByUser({ certificates_by_user: { 'u-amaan': 'pub-amaan', 'u-amit': 'pub-amit' } });
  const entries = certificateEntriesByUser(byUser, {});
  assert.equal(certificateEntryFor(entries, amit).publicId, 'pub-amit');
  assert.equal(certificateEntryFor(entries, amaan).publicId, 'pub-amaan');
});

test('a batch-level sdc_created status or certificate_ids alone does not make anyone Ready', () => {
  const data = { sdc_status: 'sdc_created', certificate_ids: ['pub-amit'], done: true, ready: 1, total: 2, certificates_by_user: {} };
  const { known, byUser } = normalizeCertificatesByUser(data);
  assert.equal(certificateDisplay(certificateEntryFor(certificateEntriesByUser(byUser, {}), amit), known).status, 'not_issued');
});

test('an older backend without the field is "unavailable", not "not issued", and never guesses', () => {
  const { known, byUser } = normalizeCertificatesByUser({ sdc_status: 'sdc_created', certificate_ids: ['pub-amit'] });
  assert.equal(known, false);
  assert.deepEqual(byUser, {});
  assert.equal(certificateDisplay(null, known).status, 'unavailable');
  assert.equal(certificateDisplay(null, known).canDownload, false);
  assert.deepEqual(normalizeCertificatesByUser(null), { known: false, byUser: {} });
});

test('values may be a public id string or an object; arrays of pairs are accepted too', () => {
  assert.deepEqual(normalizeCertificatesByUser({ certificates_by_user: { a: { public_id: 'p1' }, b: { publicId: 'p2' }, c: 'p3', d: null, e: '' } }).byUser, { a: 'p1', b: 'p2', c: 'p3' });
  assert.deepEqual(normalizeCertificatesByUser({ certificates_by_user: [{ batch_user_id: 'x', public_id: 'p9' }, { batch_user_id: '', public_id: 'p0' }] }).byUser, { x: 'p9' });
});

test('metadata is looked up by the confirmed public id only; a revoked credential is not downloadable', () => {
  const meta = { 'pub-amit': { id: 'r1', title: 'Someone Else', recipients: ['x@y.in'], anchorTime: '2026-11-01', revoked: false }, 'pub-old': { revoked: true } };
  assert.equal(buildCertificateEntry('pub-amit', meta).anchorTime, '2026-11-01');
  assert.equal(buildCertificateEntry('pub-unknown', meta).issued, true, 'confirmed by the mapping even before Dhiway metadata is known');
  const revoked = certificateDisplay(buildCertificateEntry('pub-old', meta));
  assert.deepEqual([revoked.status, revoked.canDownload], ['revoked', false]);
});

test('every exact identifier of a record is tried, nothing else', () => {
  assert.deepEqual(recordUserIds({ batch_user_id: 'b', user_id: 'u', id: 'i', email: 'e', full_name: 'n' }), ['b', 'u', 'i']);
  assert.equal(certificateEntryFor({ e: { publicId: 'x' } }, { email: 'e' }), null);
});
