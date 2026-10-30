import test from 'node:test';
import assert from 'node:assert/strict';
import { humanEmailRequired, humanEmailError, withHumanEmailField, validateHumanExcelEmails } from './humanEmail.js';
import { submitOcrDraft } from './ocrSubmission.js';

test('Permission Required needs email; explicit Open Search accepts no email', () => {
  for (const mode of ['private', 'permission_required', undefined]) {
    assert.equal(humanEmailRequired(mode), true); assert.match(humanEmailError('', mode), /required/);
  }
  for (const mode of ['public', 'open_search']) { assert.equal(humanEmailRequired(mode), false); assert.equal(humanEmailError('', mode), ''); }
  assert.equal(humanEmailError(' user@example.test ', 'private'), '');
  assert.match(humanEmailError('not-email', 'public'), /valid/);
});
test('every OCR field layout includes email exactly once with the effective requirement', () => {
  for (const fields of [[{ key: 'full_name' }, { key: 'gender' }], [{ key: 'email', required: false }, { key: 'full_name' }]]) {
    for (const mode of ['private', 'public']) {
      const result = withHumanEmailField(fields, mode);
      assert.equal(result.filter((field) => field.key === 'email').length, 1);
      assert.equal(result.find((field) => field.key === 'email').required, mode === 'private');
    }
  }
});
test('Excel requires an email column and non-empty valid email on every populated private row', () => {
  assert.throws(() => validateHumanExcelEmails([['full_name'], ['Test']], 'private'), /Email column/);
  assert.throws(() => validateHumanExcelEmails([['full_name', 'email'], ['A', 'a@example.test'], [], ['B', '']], 'private'), /row 4/);
  assert.throws(() => validateHumanExcelEmails([['full_name', 'email'], ['A', 'bad']], 'private'), /row 2/);
  assert.doesNotThrow(() => validateHumanExcelEmails([['full_name', 'email'], ['A', 'a@example.test'], ['', '']], 'private'));
});
test('Open Excel permits missing column or empty cells but checks an entered email', () => {
  assert.doesNotThrow(() => validateHumanExcelEmails([['full_name'], ['A']], 'public'));
  assert.doesNotThrow(() => validateHumanExcelEmails([['full_name', 'email'], ['A', '']], 'public'));
  assert.throws(() => validateHumanExcelEmails([['full_name', 'email'], ['A', 'bad']], 'public'), /valid email/);
});
test('OCR submission fails before any write for a missing private email; Open proceeds without one', async () => {
  const draft = { records: [{ localId: 'a', file: { name: 'a.png' }, payload: { full_name: 'Test' } }] };
  let uploads = 0, edits = 0;
  const api = { bulkUploadDocuments: async () => { uploads++; return { data: { successful_users: [{ id: 'server', file: 'a.png' }] } }; }, updateBatchUser: async () => { edits++; } };
  const request = (mode) => ({ draft, options: { batchType: 'human', credentialVisibility: mode }, api, batchName: 'Test', progress: { response: null, completedIds: [], photoSavedIds: [], savedAttachments: {} }, checkpoint() {} });
  await assert.rejects(submitOcrDraft(request('private')), /valid email is required/);
  assert.equal(uploads, 0); assert.equal(edits, 0);
  await submitOcrDraft(request('public')); assert.equal(uploads, 1); assert.equal(edits, 1);
  draft.records[0].payload.email = 'user@example.test';
  draft.records[0].payload.phone_number = '9876543210';
  await submitOcrDraft(request('private')); assert.equal(uploads, 2); assert.equal(edits, 2);
});

test('a schema\'s mapped email column is recognised; with a schema an unknown column is left to the server', async () => {
  const { validateHumanExcelEmails } = await import('./humanEmail.js');
  const rows = [['Employee Name', 'Work Email'], ['A', 'bad-email']];
  assert.throws(() => validateHumanExcelEmails(rows, 'private'), /Email column is required/);
  assert.throws(() => validateHumanExcelEmails(rows, 'private', { emailColumns: ['work_email'], schemaApplies: true }), /valid email in Excel row 2/);
  assert.doesNotThrow(() => validateHumanExcelEmails([['Employee Name'], ['A']], 'private', { schemaApplies: true }));
  assert.doesNotThrow(() => validateHumanExcelEmails([['Name', 'Work Email'], ['A', 'a@x.in']], 'private', { emailColumns: ['work_email'], schemaApplies: true }));
});
