import test from 'node:test';
import assert from 'node:assert/strict';
import { matchOcrEntries, saveOcrReviewRecord } from './ocrReview.js';

test('skipped or failed documents do not shift source images and photos', () => {
  const entries = ['a.png', 'b.png', 'c.png'].map((name) => ({ file: { name }, photo: name }));
  for (const outcome of ['skipped_users', 'errors']) {
    const matches = matchOcrEntries({ successful_users: [{ id: 'a' }, { id: 'c' }], [outcome]: [{ file: 'b.png' }] }, entries);
    assert.equal(matches.a, entries[0]);
    assert.equal(matches.c, entries[2]);
  }
  assert.deepEqual(matchOcrEntries({ successful_users: [{ id: 'a' }], errors: [{ error: 'Unknown source' }] }, entries), {});
});

test('the attachment is uploaded to the same record before confirming its fields', async () => {
  const calls = [];
  const attachment = { file: { name: 'back.png' }, label: ' aadhaar_back ', uploaded: false };
  const payload = { full_name: 'Corrected name', mark_reviewed: true };
  await saveOcrReviewRecord({
    userId: 'record-2', payload, attachment,
    uploadDocument: async (...args) => { calls.push(['document', ...args]); return { data: { document_id: 'extra-2', user_id: 'record-2' } }; },
    updateUser: async (...args) => calls.push(['review', ...args]),
  });
  assert.deepEqual(calls, [['document', 'record-2', 'aadhaar_back', attachment.file], ['review', 'record-2', payload]]);
  assert.equal(attachment.uploaded, true);
});

test('failed attachment uploads keep the record unconfirmed and retryable', async () => {
  let updates = 0;
  const attachment = { file: {}, label: 'supporting_document', uploaded: false };
  await assert.rejects(saveOcrReviewRecord({
    userId: 'record-1', payload: {}, attachment,
    uploadDocument: async () => { throw new Error('Upload failed'); },
    updateUser: async () => { updates += 1; },
  }), /Upload failed/);
  assert.equal(updates, 0);
  assert.equal(attachment.uploaded, false);
});

test('retrying a failed correction save does not upload the same attachment twice', async () => {
  let uploads = 0;
  let updates = 0;
  const attachment = { file: {}, label: 'supporting_document', uploaded: false };
  const options = {
    userId: 'record-1', payload: {}, attachment,
    uploadDocument: async () => { uploads += 1; return { data: { document_id: 'extra-1' } }; },
    updateUser: async () => { updates += 1; if (updates === 1) throw new Error('Save failed'); },
  };
  await assert.rejects(saveOcrReviewRecord(options), /Save failed/);
  await saveOcrReviewRecord(options);
  assert.equal(uploads, 1);
  assert.equal(updates, 2);
});

test('empty document labels prevent upload and confirmation', async () => {
  const unexpectedCall = async () => assert.fail('No API call should be made');
  await assert.rejects(saveOcrReviewRecord({
    userId: 'record-1', payload: {}, attachment: { file: {}, label: '   ' },
    uploadDocument: unexpectedCall, updateUser: unexpectedCall,
  }), /Enter a label/);
});

test('additional documents are optional', async () => {
  let updatedId;
  await saveOcrReviewRecord({
    userId: 'record-1', payload: {},
    uploadDocument: async () => assert.fail('No attachment to upload'),
    updateUser: async (id) => { updatedId = id; },
  });
  assert.equal(updatedId, 'record-1');
});

test('an incomplete upload response cannot mark an attachment or record saved', async () => {
  const attachment = { file: {}, label: 'supporting_document', uploaded: false };
  await assert.rejects(saveOcrReviewRecord({
    userId: 'record-1', payload: {}, attachment,
    uploadDocument: async () => ({ data: { message: 'Unexpected response' } }),
    updateUser: async () => assert.fail('Cannot confirm without a saved document'),
  }), /did not confirm/);
  assert.equal(attachment.uploaded, false);
});
