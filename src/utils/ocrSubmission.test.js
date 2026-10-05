import test from 'node:test';
import assert from 'node:assert/strict';
import { extractOcrDraft, submitOcrDraft } from './ocrSubmission.js';

const makeProgress = () => ({ response: null, completedIds: [], photoSavedIds: [], savedAttachments: {} });
const makeDraft = () => ({ records: [1, 2, 3].map((index) => ({
  localId: `local-${index}`, file: { name: `source-${index}.png` }, photo: { name: `photo-${index}.png` },
  attachment: { label: 'supporting_document', file: { name: `extra-${index}.pdf` } },
  payload: { full_name: `Corrected ${index}`, mark_reviewed: true, custom_fields: { gender: 'Male' } },
})) });

test('review extraction reads three documents without creating a batch or uploading attachments', async () => {
  const unexpectedWrite = async () => assert.fail('No writes before costing');
  const api = {
    extractOcrDocument: async () => ({ data: { document_type: 'pan', extracted: { name: 'OCR name' } } }),
    bulkUploadDocuments: unexpectedWrite, uploadOcrPhoto: unexpectedWrite,
    uploadHumanDocument: unexpectedWrite, updateBatchUser: unexpectedWrite,
  };
  const records = await extractOcrDraft(makeDraft().records.map((record) => ({ id: record.localId, file: record.file })), api);
  assert.equal(records.length, 3);
  assert.equal(records[0].id, 'local-1');
  assert.equal(records[0].document_type, 'pan');
});

test('final submission creates one batch, saves all files with the correct server IDs, and preserves reviewed corrections', async () => {
  const calls = [];
  const draft = makeDraft();
  const api = {
    bulkUploadDocuments: async (files) => {
      calls.push(['batch']);
      return { data: { batch_id: 'batch', successful_users: files.map((file, index) => ({ id: `server-${index + 1}`, file: file.name })) } };
    },
    uploadOcrPhoto: async (id, file) => { calls.push(['photo', id, file.name]); return { data: { document_id: `photo-${id}` } }; },
    uploadHumanDocument: async (id, label, file) => { calls.push(['extra', id, file.name]); return { data: { document_id: `extra-${id}`, user_id: id } }; },
    updateBatchUser: async (id, payload) => { calls.push(['review', id, payload.full_name]); },
  };
  const progress = makeProgress();
  const options = { draft, api, progress, checkpoint: () => {}, batchName: 'Approved batch' };
  await submitOcrDraft(options);
  await submitOcrDraft(options);
  assert.equal(calls.filter(([kind]) => kind === 'batch').length, 1);
  for (const kind of ['photo', 'extra', 'review']) assert.equal(calls.filter(([callKind]) => callKind === kind).length, 3);
  assert.deepEqual(calls.filter(([kind]) => kind === 'extra').map(([, id, file]) => [id, file]),
    [['server-1', 'extra-1.pdf'], ['server-2', 'extra-2.pdf'], ['server-3', 'extra-3.pdf']]);
  assert.deepEqual(calls.filter(([kind]) => kind === 'review').map(([, id, name]) => [id, name]),
    [['server-1', 'Corrected 1'], ['server-2', 'Corrected 2'], ['server-3', 'Corrected 3']]);
});

test('retrying a failed final save reuses the existing batch, photo, and attachment', async () => {
  let batches = 0, photos = 0, extras = 0, updates = 0;
  const draft = makeDraft();
  draft.records = draft.records.slice(0, 1);
  const api = {
    bulkUploadDocuments: async () => { batches += 1; return { data: { successful_users: [{ id: 'server-1', file: 'source-1.png' }] } }; },
    uploadOcrPhoto: async () => { photos += 1; return { data: { document_id: 'photo' } }; },
    uploadHumanDocument: async () => { extras += 1; return { data: { document_id: 'extra' } }; },
    updateBatchUser: async () => { updates += 1; if (updates === 1) throw new Error('Temporary failure'); },
  };
  const options = { draft, api, progress: makeProgress(), checkpoint: () => {}, batchName: 'Approved batch' };
  await assert.rejects(submitOcrDraft(options), /Temporary failure/);
  await submitOcrDraft(options);
  assert.deepEqual([batches, photos, extras, updates], [1, 1, 1, 2]);
});

test('extraction failures stop the draft before batch creation', async () => {
  await assert.rejects(extractOcrDraft([{ id: 'local', file: {} }], {
    extractOcrDocument: async () => { throw new Error('OCR failed'); },
  }), /No batch was created/);
});
