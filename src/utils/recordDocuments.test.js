import test from 'node:test';
import assert from 'node:assert/strict';
import { getDocumentViewUrl, getDocumentViewCandidates, fetchDocumentFile, getRecordDocuments } from './recordDocuments.js';

test('the backend document URL is preserved, including signed query strings', () => {
  const url = 'https://files.example/image.png?signature=one%2Ftwo&expires=123';
  assert.equal(getDocumentViewUrl({ id: 'pan-1', document_url: url }), url);
  assert.equal(getDocumentViewUrl({ document_url: '/verification/documents/one/view' }), '/verification/documents/one/view');
  assert.equal(getDocumentViewUrl({ id: 'extra-1' }), '/verification/documents/extra-1/view');
  assert.equal(getDocumentViewUrl({ document_url: 'gs://private/source.png' }), null);
  assert.equal(getDocumentViewUrl({ document_url: 'javascript:alert(1)' }), null);
});

test('all three private OCR file types resolve via the backend document viewer', () => {
  for (const document_label of ['supporting_document', 'photo', 'driving_license']) {
    assert.equal(getDocumentViewUrl({ id: `id-${document_label}`, document_label, document_url: `gs://private/${document_label}.png` }, 'https://api.example/'),
      `https://api.example/verification/documents/id-${document_label}/view`);
  }
});

test('a stale direct link falls back to the stored-document viewer and returns its actual image', async () => {
  const urls = getDocumentViewCandidates({ id: 'photo-1', document_url: 'https://expired.example/photo.png' }, 'https://api.example');
  const calls = [];
  const file = new Blob(['image bytes'], { type: 'image/png' });
  const result = await fetchDocumentFile(urls, async (url) => {
    calls.push(url);
    return { ok: url === urls[1], blob: async () => file };
  });
  assert.deepEqual(calls, urls);
  assert.equal(result.blob, file);
  assert.equal(result.viewUrl, 'https://api.example/verification/documents/photo-1/view');
});

test('cancelled preview requests do not continue to fetch another user document', async () => {
  const controller = new AbortController();
  let calls = 0;
  await assert.rejects(fetchDocumentFile(['one', 'two'], async () => {
    calls += 1; controller.abort(); throw new Error('Aborted');
  }, controller.signal), /Aborted/);
  assert.equal(calls, 1);
});

test('three people retain all nine saved source, photo, and additional documents', () => {
  const people = [1, 2, 3].map((person) => ({
    id: `person-${person}`, photo_url: `https://files.example/photo-${person}.png`,
    documents: ['pan', 'photo', 'supporting_document'].map((document_label) => ({ id: `${person}-${document_label}`, document_label, document_url: `https://files.example/${person}/${document_label}.png` })),
  }));
  assert.equal(people.flatMap(getRecordDocuments).length, 9);
  for (const person of people) {
    const documents = getRecordDocuments(person);
    assert.equal(documents.length, 3);
    assert.ok(documents.every((document) => getDocumentViewUrl(document).includes(`/${person.id.slice(-1)}/`)));
  }
});

test('the complete document collection is not supplemented with synthetic photo entries', () => {
  const source = { id: 'source', document_label: 'pan' };
  const documents = getRecordDocuments({ photo_url: 'https://api.example/photo.png', documents: [source] });
  assert.deepEqual(documents, [source]);
  assert.deepEqual(getRecordDocuments({ documents: [], photo_url: 'https://files.example/photo.png' }), []);
});

test('arbitrary labels and older versions remain visible only for their owning selected user', () => {
  const userA = { id: 'a', documents: ['aadhaar', 'photo', 'certificate', 'custom_extra'].map((document_label, index) => ({
    id: `a-${index}`, document_label, document_url: `https://files.example/a-${index}`, version: 1,
  })) };
  userA.documents.push({ ...userA.documents[3], id: 'a-new', version: 2 });
  const userB = { id: 'b', documents: [{ id: 'b-1', document_label: 'another_label', document_url: 'https://files.example/b-1' }] };
  assert.deepEqual(getRecordDocuments(userA), userA.documents);
  assert.equal(getRecordDocuments(userA).length, 5);
  assert.deepEqual(getRecordDocuments(userB), userB.documents);
  assert.ok(getRecordDocuments(userB).every((doc) => doc.id.startsWith('b-')));
});
