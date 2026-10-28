import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { buildOcrAssignments, validateOcrAssignments, applyOcrAssignmentsToPreview } from './ocrAssignments.js';

const entries = ['a', 'b', 'c'].map((id) => ({ id, file: { name: `${id}.png` } }));
const groups = [
  { entryIds: ['a', 'b'], gender: 'Male' },
  { entryIds: ['b'], gender: 'Female' },
  { entryIds: ['a', 'c'], nationality: 'Indian' },
];
test('multiple groups serialize independent fields using zero-based upload positions, including index zero', () => {
  assert.deepEqual(buildOcrAssignments(groups, entries), [
    { file_indices: [0, 1], gender: 'Male' }, { file_indices: [1], gender: 'Female' }, { file_indices: [0, 2], nationality: 'Indian' },
  ]);
  assert.deepEqual(buildOcrAssignments([{ entryIds: ['a'], gender: 'female', nationality: 'indian' }], entries), [{ file_indices: [0], gender: 'Female', nationality: 'Indian' }]);
});
test('reordering or removing files never reassigns a group to the next person', () => {
  assert.deepEqual(buildOcrAssignments([{ entryIds: ['a'], gender: 'Male' }], [entries[2], entries[0]]), [{ file_indices: [1], gender: 'Male' }]);
  assert.throws(() => buildOcrAssignments(groups, [entries[1], entries[2]]), /outside/);
  assert.throws(() => buildOcrAssignments(groups, [entries[0], entries[0]]), /identities/);
});
test('preview uses last matching field independently without overwriting unrelated OCR data', () => {
  const raw = entries.map((entry) => ({ id: entry.id, extracted: { gender: 'Other', dl_number: entry.id } }));
  const preview = applyOcrAssignmentsToPreview(raw, entries, groups);
  assert.equal(preview[0].gender, 'Male'); assert.equal(preview[0].nationality, 'Indian');
  assert.equal(preview[1].gender, 'Female'); assert.equal(preview[1].nationality, undefined);
  assert.equal(preview[2].gender, undefined); assert.equal(preview[2].nationality, 'Indian');
  assert.deepEqual(preview.map((row) => row.extracted), raw.map((row) => row.extracted));
  assert.equal(raw[0].gender, undefined);
});
test('malformed groups, unsupported keywords and invalid indices fail before upload', () => {
  for (const assignment of [
    {}, { file_indices: [] }, { file_indices: [0] }, { file_indices: [3], gender: 'Male' },
    { file_indices: [-1], gender: 'Male' }, { file_indices: ['0'], gender: 'Male' },
    { file_indices: [false], gender: 'Male' }, { file_indices: [0.5], gender: 'Male' },
    { file_indices: [0], gender: 'All' }, { file_indices: [0], nationality: ' all ' },
    { file_indices: [0], gender: 'Male,Female' }, { file_indices: [0], nationality: 'Indian,American' },
  ]) assert.throws(() => validateOcrAssignments([assignment], 3));
  assert.throws(() => validateOcrAssignments('{}', 3), /array/);
  assert.deepEqual(validateOcrAssignments(undefined, 3), []);
});

test('email assignments require a valid individual address and exactly one file, including index zero', () => {
  assert.deepEqual(validateOcrAssignments([
    { file_indices: [0], email: ' first@example.test ' },
    { file_indices: [1], email: 'second@example.test', gender: 'female' },
  ], 2), [
    { file_indices: [0], email: 'first@example.test' },
    { file_indices: [1], gender: 'Female', email: 'second@example.test' },
  ]);
  for (const group of [
    { file_indices: [0, 1], email: 'first@example.test' },
    { file_indices: [0, 0], email: 'first@example.test' },
    ...['', ' ', 'bad', 'a@example.test,b@example.test', null, 123].map((email) => ({ file_indices: [0], email })),
  ]) assert.throws(() => validateOcrAssignments([group], 2));
});
test('actual API includes assignments and ordered images together, omits empty groups, and never sends removed Excel fields', async () => {
  const require = createRequire(import.meta.url), axios = require('axios'), calls = [];
  const old = axios.defaults.adapter;
  const result = await build({ entryPoints: [fileURLToPath(new URL('../services/api.js', import.meta.url))], bundle: true, write: false, platform: 'node', format: 'cjs', external: ['axios'], alias: { '@': fileURLToPath(new URL('../', import.meta.url)) }, define: { 'import.meta.env': '{}' } });
  const module = { exports: {} };
  axios.defaults.adapter = async (config) => { calls.push(config); return { data: { successful_users: [{ gender: 'Female', nationality: 'Indian' }] }, status: 200, statusText: 'OK', headers: {}, config }; };
  try { vm.runInNewContext(result.outputFiles[0].text, { module, exports: module.exports, require, FormData, URLSearchParams, AbortController, localStorage: { getItem: () => 'test-token' }, window: { location: { pathname: '/org/costing' } } }); } finally { axios.defaults.adapter = old; }
  const api = module.exports.verificationAPI;
  const files = ['a', 'b', 'c'].map((name) => new File([name], `${name}.png`));
  const assignments = [...buildOcrAssignments(groups, entries),
    { file_indices: [0], email: 'first@example.test' },
    { file_indices: [1], email: 'second@example.test' },
  ];
  const response = await api.bulkUploadDocuments(files, 'Batch', { batchType: 'human', credentialVisibility: 'private', assignments });
  assert.equal(calls[0].url, '/verification/bulk-upload/documents');
  assert.deepEqual(calls[0].data.getAll('files').map((file) => file.name), ['a.png', 'b.png', 'c.png']);
  assert.deepEqual(JSON.parse(calls[0].data.get('assignments')), assignments);
  assert.equal(calls[0].data.getAll('assignments').length, 1);
  assert.equal(response.data.successful_users[0].gender, 'Female');
  await api.bulkUploadDocuments(files, 'Unchanged', { assignments: [] });
  assert.equal(calls[1].data.has('assignments'), false);
  await api.bulkUpload(files[0], 'Excel', '', { bulkGender: ['Male'], bulk_nationality: 'Indian', assignments });
  for (const key of ['bulk_gender', 'bulk_nationality', 'assignments']) assert.equal(calls[2].data.has(key), false);
  await api.bulkUploadDocuments(files, 'Product', { batchType: 'product', assignments });
  assert.equal(calls[3].data.has('assignments'), false);
  assert.throws(() => api.bulkUploadDocuments(files, 'Bad', { assignments: [{ file_indices: [9], gender: 'Male' }] }), /outside/);
  assert.equal(calls.length, 4);
});
