import test from 'node:test';
import assert from 'node:assert/strict';
import { humanPhoneRequired, humanPhoneError, normalizeHumanPhone, resolveHumanPermission, withHumanPhoneField, validateHumanExcelPhones, humanPhoneBackendMessage } from './humanPhone.js';
import { submitOcrDraft } from './ocrSubmission.js';

test('Human permission defaults remain required until explicitly Open, including organization defaults', () => {
  for (const mode of [undefined, null, '', 'private', 'permission_required', 'Permission Required', 'holder_approval']) assert.equal(humanPhoneRequired(mode), true);
  for (const mode of ['public', 'open', 'open_search', 'Open Search']) assert.equal(humanPhoneRequired(mode), false);
  assert.equal(resolveHumanPermission(undefined, 'permission_required'), 'private');
  assert.equal(resolveHumanPermission(undefined, 'open'), 'public');
  assert.equal(resolveHumanPermission('public', 'permission_required'), 'public');
  assert.equal(resolveHumanPermission('private', 'public'), 'private');
  for (const type of ['product', 'warranty']) assert.equal(humanPhoneRequired('private', type), false);
});

test('mobile validation removes only documented separators and accepts optional + with 10–15 digits', () => {
  for (const value of ['9876543210', '+91 98765-43210', '+91 (987) 654.3210', '[987] 654 3210', '123456789012345']) assert.equal(humanPhoneError(value, 'private'), '', value);
  assert.equal(normalizeHumanPhone(' +91 [987] (654)-3210. '), '+919876543210');
  for (const value of ['123456789', '1234567890123456', '++919876543210', '919+876543210', 'call9876543210', '98765/43210', '1e10']) assert.match(humanPhoneError(value, 'private'), /10–15 digits/, value);
  assert.match(humanPhoneError('', 'private'), /required/);
  assert.equal(humanPhoneError('', 'public'), '');
  assert.match(humanPhoneError('bad', 'public'), /valid/);
  assert.equal(humanPhoneError('bad', 'private', 'product'), '');
});

test('all OCR layouts get exactly one conditional phone field with backend aliases', () => {
  for (const fields of [[{ key: 'full_name' }, { key: 'email' }], [{ key: 'phone_number', required: true }]]) {
    for (const mode of ['private', 'public']) {
      const result = withHumanPhoneField(fields, mode).filter((f) => f.key === 'phone_number');
      assert.equal(result.length, 1); assert.equal(result[0].required, mode === 'private');
      assert.deepEqual(result[0].aliases, ['phone_number', 'phone', 'mobile', 'mobile_number']);
    }
  }
});

test('Excel enforces every populated private row, recognizes aliases and schema columns, and skips blank rows', () => {
  for (const header of ['phone_number', 'phone', 'mobile', 'Mobile Number']) {
    assert.doesNotThrow(() => validateHumanExcelPhones([['Name', header], ['A', '+91 (98765) 43210'], []], 'private'));
    assert.throws(() => validateHumanExcelPhones([['Name', header], ['A', '9876543210'], ['B', '']], 'private'), /row 3/);
  }
  assert.throws(() => validateHumanExcelPhones([['Name'], ['A']], 'private'), /phone_number column is required/);
  assert.throws(() => validateHumanExcelPhones([['Name', 'phone'], ['A', 'invalid']], 'private'), /row 2/);
  assert.doesNotThrow(() => validateHumanExcelPhones([['Name', 'Contact No'], ['A', 9876543210]], 'private', { phoneColumns: ['contact_no'] }));
});

test('Open Human allows blank/missing phones and other entity uploads remain unchanged', () => {
  assert.doesNotThrow(() => validateHumanExcelPhones([['Name'], ['A']], 'public'));
  assert.doesNotThrow(() => validateHumanExcelPhones([['Name', 'mobile'], ['A', '']], 'public'));
  for (const batchType of ['product', 'warranty']) assert.doesNotThrow(() => validateHumanExcelPhones([['Name'], ['A']], 'private', { batchType }));
});

test('backend phone field errors become inline-friendly messages without changing unrelated errors', () => {
  assert.match(humanPhoneBackendMessage({ response: { data: { detail: [{ loc: ['body', 'phone_number'], msg: 'Field required' }] } } }), /Phone Number: Field required/);
  assert.equal(humanPhoneBackendMessage({ response: { data: { detail: 'phone_number is invalid' } } }), 'Phone Number is invalid');
  assert.match(humanPhoneBackendMessage({ response: { data: { errors: [{ row: 4, field: 'phone_number', error: 'Invalid mobile' }] } } }), /row 4/);
  assert.equal(humanPhoneBackendMessage({ response: { data: { detail: 'Not authorized' } } }), '');
});

test('final OCR phone guard blocks all writes, supports Open and attaches a valid phone to the exact file', async () => {
  const draft = { records: [{ localId: 'a', file: { name: 'a.png' }, payload: { full_name: 'A', email: 'a@example.test' } }] };
  let uploads = 0;
  const api = { bulkUploadDocuments: async (files, name, options) => {
    uploads++;
    const phoneAssignments = options.assignments.filter((entry) => Object.hasOwn(entry, 'phone_number'));
    assert.deepEqual(phoneAssignments, draft.records[0].payload.phone_number ? [{ file_index: 0, phone_number: '+91 98765 43210' }] : []);
    assert.deepEqual(options.assignments[0].file_indices, [0]);
    return { data: { successful_users: [{ id: 'server', file: 'a.png' }] } };
  }, updateBatchUser: async () => {} };
  const request = (mode) => ({ draft, options: { credentialVisibility: mode }, api, progress: { response: null, completedIds: [], photoSavedIds: [], savedAttachments: {} }, checkpoint() {} });
  await assert.rejects(submitOcrDraft(request('private')), /Phone Number/); assert.equal(uploads, 0);
  draft.records[0].payload.phone_number = 'bad'; await assert.rejects(submitOcrDraft(request('private')), /Phone Number/); assert.equal(uploads, 0);
  draft.records[0].payload.phone_number = ''; await submitOcrDraft(request('public')); assert.equal(uploads, 1);
  draft.records[0].payload.phone_number = '+91 98765 43210'; await submitOcrDraft(request('private')); assert.equal(uploads, 2);
});
